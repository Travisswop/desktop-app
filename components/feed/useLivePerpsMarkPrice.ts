'use client';

import { useEffect, useMemo, useState } from 'react';

interface NormalizedPerpsCoin {
  requestCoin: string;
  dex?: string;
  displayCoin: string;
}

function maybeFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

type LivePerpsMarkPriceFetchResult = {
  degraded: boolean;
  price: number | null;
};

export type LivePerpsMarkPriceState = {
  lastUpdatedAt: number | null;
  price: number | null;
  stale: boolean;
};

export const INITIAL_LIVE_PERPS_MARK_PRICE_STATE: LivePerpsMarkPriceState = {
  lastUpdatedAt: null,
  price: null,
  stale: false,
};

export function normalizePerpsCoin(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  if (!trimmed.includes(':')) {
    const displayCoin = trimmed.toUpperCase();
    if (displayCoin === 'SPCX' || displayCoin === 'SPACEX') {
      return {
        requestCoin: 'xyz:SPCX',
        dex: 'xyz',
        displayCoin: 'SPCX',
      } satisfies NormalizedPerpsCoin;
    }

    return {
      requestCoin: displayCoin,
      displayCoin,
    } satisfies NormalizedPerpsCoin;
  }

  const [rawDex, ...assetParts] = trimmed.split(':');
  const dex = rawDex.trim().toLowerCase();
  const displayCoin = assetParts.join(':').trim().toUpperCase();
  if (!dex || !displayCoin) return null;

  return {
    requestCoin: `${dex}:${displayCoin}`,
    dex,
    displayCoin,
  } satisfies NormalizedPerpsCoin;
}

function findMarketContext(
  data: unknown,
  normalized: NormalizedPerpsCoin,
) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const [meta, contexts] = data as [
    { universe?: Array<{ name?: string }> },
    Array<Record<string, unknown> | undefined>,
  ];
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  const marketIndex = universe.findIndex((asset) => {
    const name = String(asset?.name || '');
    return (
      name === normalized.requestCoin ||
      name.toUpperCase() === normalized.requestCoin.toUpperCase() ||
      name.toUpperCase() === normalized.displayCoin
    );
  });

  if (marketIndex < 0) return null;
  return contexts?.[marketIndex] || null;
}

async function fetchLivePerpsMarkPrice(
  normalized: NormalizedPerpsCoin,
  signal?: AbortSignal,
): Promise<LivePerpsMarkPriceFetchResult> {
  const response = await fetch('/api/hyperliquid/mainnet/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'metaAndAssetCtxs',
      ...(normalized.dex ? { dex: normalized.dex } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      degraded: true,
      price: maybeFiniteNumber(payload?.price),
    };
  }

  const data = await response.json().catch(() => null);
  const context = findMarketContext(data, normalized);
  return {
    degraded: false,
    price:
      maybeFiniteNumber(context?.markPx) ?? maybeFiniteNumber(context?.midPx),
  };
}

export function resolveLivePerpsMarkPriceState(
  previous: LivePerpsMarkPriceState,
  result: LivePerpsMarkPriceFetchResult,
): LivePerpsMarkPriceState {
  if (result.degraded) {
    return {
      ...previous,
      stale: true,
    };
  }

  if (result.price === null) {
    return INITIAL_LIVE_PERPS_MARK_PRICE_STATE;
  }

  return {
    lastUpdatedAt: Date.now(),
    price: result.price,
    stale: false,
  };
}

type LivePerpsMarkPriceFetcher = (
  normalized: NormalizedPerpsCoin,
  signal?: AbortSignal,
) => Promise<LivePerpsMarkPriceFetchResult>;

interface LivePerpsMarkPricePollingOptions {
  fetchPrice?: LivePerpsMarkPriceFetcher;
  intervalMs?: number;
  setIntervalFn?: typeof globalThis.setInterval;
  clearIntervalFn?: typeof globalThis.clearInterval;
}

export function startLivePerpsMarkPricePolling(
  normalized: NormalizedPerpsCoin,
  onResult: (result: LivePerpsMarkPriceFetchResult) => void,
  options: LivePerpsMarkPricePollingOptions = {},
) {
  const {
    fetchPrice = fetchLivePerpsMarkPrice,
    intervalMs = 15_000,
    setIntervalFn = globalThis.setInterval.bind(globalThis),
    clearIntervalFn = globalThis.clearInterval.bind(globalThis),
  } = options;

  let stopped = false;
  let inFlightController: AbortController | null = null;

  const load = async () => {
    if (stopped || inFlightController) return;

    const controller = new AbortController();
    inFlightController = controller;

    try {
      const nextResult = await fetchPrice(normalized, controller.signal).catch(
        (): LivePerpsMarkPriceFetchResult => ({
          degraded: true,
          price: null,
        }),
      );
      if (!stopped) onResult(nextResult);
    } finally {
      if (inFlightController === controller) {
        inFlightController = null;
      }
    }
  };

  void load();
  const interval = setIntervalFn(() => {
    void load();
  }, intervalMs);

  return {
    stop() {
      stopped = true;
      clearIntervalFn(interval);
      inFlightController?.abort();
      inFlightController = null;
    },
  };
}

export function useLivePerpsMarkPriceState(
  coin: string | null | undefined,
  enabled = true,
) {
  const normalized = useMemo(() => normalizePerpsCoin(coin), [coin]);
  const [state, setState] = useState<LivePerpsMarkPriceState>(
    INITIAL_LIVE_PERPS_MARK_PRICE_STATE,
  );

  useEffect(() => {
    if (!enabled || !normalized) {
      setState(INITIAL_LIVE_PERPS_MARK_PRICE_STATE);
      return;
    }

    const poller = startLivePerpsMarkPricePolling(normalized, (result) => {
      setState((previous) => resolveLivePerpsMarkPriceState(previous, result));
    });

    return () => poller.stop();
  }, [enabled, normalized]);

  return state;
}

export function useLivePerpsMarkPrice(
  coin: string | null | undefined,
  enabled = true,
) {
  return useLivePerpsMarkPriceState(coin, enabled).price;
}
