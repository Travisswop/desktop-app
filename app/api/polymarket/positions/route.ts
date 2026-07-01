import { NextRequest, NextResponse } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';
import {
  reconcilePositionsWithEventLive,
  type EventLiveState,
  type PolymarketPositionLike,
} from '@/lib/polymarket/positions-reconciliation';
import {
  applyFreshPositionPrices,
  selectEventSlugsForPositionRefresh,
  selectPositionPriceTokenIds,
  type PositionPriceQuote,
} from '@/lib/polymarket/positions-refresh';

const PARTIAL_DATA_HEADER = 'x-polymarket-partial-data';
const RETRY_AFTER_HEADER = 'retry-after';
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};
const EVENT_LIVE_CACHE_TTL_MS = 60_000;
const EVENT_LIVE_ERROR_CACHE_TTL_MS = 15_000;
const EVENT_LIVE_CACHE_MAX_ENTRIES = 250;
const EVENT_LIVE_CHECK_LIMIT = 24;
const EVENT_LIVE_CHECK_CONCURRENCY = 4;
const POSITION_PRICE_CACHE_TTL_MS = 10_000;
const POSITION_PRICE_CACHE_MAX_ENTRIES = 300;
const POSITION_PRICE_TOKEN_LIMIT = 100;

type TimedCacheEntry<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

const eventLiveCache = new Map<
  string,
  TimedCacheEntry<EventLiveState | null>
>();
const positionPriceCache = new Map<
  string,
  TimedCacheEntry<PositionPriceQuote | null>
>();

function normalizeKey(value: unknown) {
  return String(value ?? '').trim();
}

function buildResponseHeaders(response?: Response) {
  const headers = new Headers(NO_STORE_HEADERS);
  const partialData = response?.headers.get(PARTIAL_DATA_HEADER);
  const retryAfter = response?.headers.get(RETRY_AFTER_HEADER);

  if (partialData) {
    headers.set(PARTIAL_DATA_HEADER, partialData);
  }

  if (retryAfter) {
    headers.set(RETRY_AFTER_HEADER, retryAfter);
  }

  return headers;
}

function buildFailureBody(data: unknown, status: number) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const body = { ...data } as Record<string, unknown>;
    if (typeof body.error !== 'string' || !body.error.trim()) {
      body.error = 'Failed to fetch positions';
    }
    if (typeof body.retryable !== 'boolean') {
      body.retryable = status >= 500;
    }
    return body;
  }

  return {
    error: 'Failed to fetch positions',
    retryable: status >= 500,
  };
}

function buildMalformedSuccessBody() {
  return {
    error: 'Invalid positions response from backend',
    code: 'INVALID_UPSTREAM_RESPONSE',
    dependency: 'polymarket-data',
    retryable: true,
  };
}

function pruneTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  maxEntries: number,
  now = Date.now(),
) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now && !entry.promise) {
      cache.delete(key);
    }
  }

  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    }),
  );

  return results;
}

async function fetchEventLiveUncached(
  eventSlug: string,
): Promise<EventLiveState | null> {
  try {
    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/events/live?slug=${encodeURIComponent(
        eventSlug,
      )}`,
      { cache: 'no-store' },
    );

    if (!response.ok) return null;
    return (await response.json()) as EventLiveState;
  } catch {
    return null;
  }
}

async function fetchEventLive(
  eventSlug: string,
): Promise<EventLiveState | null> {
  const slug = normalizeKey(eventSlug);
  if (!slug) return null;

  const now = Date.now();
  const cached = eventLiveCache.get(slug);
  if (cached && cached.expiresAt > now) {
    if (cached.promise) return cached.promise;
    return cached.value ?? null;
  }

  const promise = fetchEventLiveUncached(slug)
    .then((value) => {
      eventLiveCache.set(slug, {
        value,
        expiresAt:
          Date.now() +
          (value ? EVENT_LIVE_CACHE_TTL_MS : EVENT_LIVE_ERROR_CACHE_TTL_MS),
      });
      pruneTimedCache(eventLiveCache, EVENT_LIVE_CACHE_MAX_ENTRIES);
      return value;
    })
    .catch(() => {
      eventLiveCache.set(slug, {
        value: null,
        expiresAt: Date.now() + EVENT_LIVE_ERROR_CACHE_TTL_MS,
      });
      pruneTimedCache(eventLiveCache, EVENT_LIVE_CACHE_MAX_ENTRIES);
      return null;
    });

  eventLiveCache.set(slug, {
    promise,
    expiresAt: now + EVENT_LIVE_ERROR_CACHE_TTL_MS,
  });
  return promise;
}

async function fetchFreshPositionQuotes(tokenIds: string[]) {
  const uniqueTokenIds = Array.from(
    new Set(tokenIds.map(normalizeKey).filter(Boolean)),
  ).slice(0, POSITION_PRICE_TOKEN_LIMIT);
  const quotes: Record<string, PositionPriceQuote | null> = {};
  if (uniqueTokenIds.length === 0) return quotes;

  const now = Date.now();
  const missingTokenIds: string[] = [];
  for (const tokenId of uniqueTokenIds) {
    const cached = positionPriceCache.get(tokenId);
    if (cached && cached.expiresAt > now && !cached.promise) {
      quotes[tokenId] = cached.value ?? null;
    } else {
      missingTokenIds.push(tokenId);
    }
  }

  if (missingTokenIds.length === 0) return quotes;

  try {
    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/prices`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ tokenIds: missingTokenIds }),
      },
    );

    if (!response.ok) return quotes;

    const data = (await response.json()) as Record<
      string,
      PositionPriceQuote | null | undefined
    >;

    const expiresAt = Date.now() + POSITION_PRICE_CACHE_TTL_MS;
    for (const tokenId of missingTokenIds) {
      const quote = data?.[tokenId] ?? null;
      quotes[tokenId] = quote;
      positionPriceCache.set(tokenId, { value: quote, expiresAt });
    }
    pruneTimedCache(
      positionPriceCache,
      POSITION_PRICE_CACHE_MAX_ENTRIES,
    );
  } catch {
    return quotes;
  }

  return quotes;
}

async function refreshPositionPrices(
  positions: PolymarketPositionLike[],
) {
  const tokenIds = selectPositionPriceTokenIds(positions, {
    limit: POSITION_PRICE_TOKEN_LIMIT,
  });
  if (tokenIds.length === 0) return positions;

  const quotes = await fetchFreshPositionQuotes(tokenIds);
  return applyFreshPositionPrices(positions, quotes);
}

async function reconcilePositions(
  positions: PolymarketPositionLike[],
) {
  const eventSlugs = selectEventSlugsForPositionRefresh(positions, {
    limit: EVENT_LIVE_CHECK_LIMIT,
  });

  if (eventSlugs.length === 0) return positions;

  const eventEntries = await mapWithConcurrency(
    eventSlugs,
    EVENT_LIVE_CHECK_CONCURRENCY,
    async (eventSlug) => [
      eventSlug,
      await fetchEventLive(eventSlug),
    ] as const,
  );

  return reconcilePositionsWithEventLive(
    positions,
    new Map(eventEntries),
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${POLYMARKET_BACKEND_URL}/api/prediction-markets/positions?user=${userAddress}`,
      { cache: 'no-store' },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json(
        buildFailureBody(data, response.status),
        {
          status: response.status,
          headers: buildResponseHeaders(response),
        },
      );
    }

    const data = await response.json().catch(() => undefined);
    if (typeof data === 'undefined' || data === null) {
      return NextResponse.json(buildMalformedSuccessBody(), {
        status: 502,
        headers: buildResponseHeaders(response),
      });
    }

    const positions = Array.isArray(data)
      ? await reconcilePositions(await refreshPositionPrices(data))
      : data;

    return NextResponse.json(positions, {
      headers: buildResponseHeaders(response),
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
