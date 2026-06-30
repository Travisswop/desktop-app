import type { PolymarketPositionLike } from './positions-reconciliation';

const DEFAULT_EVENT_LIVE_CHECK_LIMIT = 24;
const DEFAULT_PRICE_TOKEN_LIMIT = 100;
const EVENT_LIVE_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
const EVENT_LIVE_NEAR_CLOSE_MS = 2 * 60 * 60 * 1000;
const ZERO_PRICE_THRESHOLD = 0.005;
const RESOLVED_PRICE_THRESHOLD = 0.995;

export type PositionPriceQuote = {
  bid?: number | string | null;
  ask?: number | string | null;
};

type RankedSlug = {
  slug: string;
  score: number;
};

function finiteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function parseProbabilityPrice(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 && price <= 1
    ? price
    : null;
}

function positionCost(position: PolymarketPositionLike) {
  const initialValue = finiteNumber(position.initialValue);
  if (initialValue > 0) return initialValue;
  return Math.max(
    0,
    finiteNumber(position.avgPrice) * finiteNumber(position.size),
  );
}

function looksLikeSportsEvent(position: PolymarketPositionLike) {
  const text = [
    position.title,
    position.slug,
    position.eventSlug,
  ]
    .map(normalizeText)
    .join(' ')
    .toLowerCase();

  return /(?:\bvs\.?\b|\bv\.?\b|@)/i.test(text);
}

function eventLiveRefreshScore(
  position: PolymarketPositionLike,
  now: number,
) {
  if (position.redeemable) return null;
  if (!normalizeText(position.eventSlug)) return null;

  let score = 1;
  const sportsLike = looksLikeSportsEvent(position);
  const endMs = Date.parse(normalizeText(position.endDate));
  const curPrice = finiteNumber(position.curPrice, Number.NaN);
  const currentValue = finiteNumber(position.currentValue, Number.NaN);

  if (position.marketClosed || position.marketResolutionPending) {
    score += 100;
  }

  if (!Number.isFinite(endMs)) {
    score += 35;
  } else if (endMs <= now) {
    score += 90;
  } else if (endMs - now <= EVENT_LIVE_NEAR_CLOSE_MS) {
    score += 75;
  } else if (sportsLike && endMs - now <= EVENT_LIVE_LOOKAHEAD_MS) {
    score += 60;
  }

  if (
    Number.isFinite(curPrice) &&
    (curPrice <= ZERO_PRICE_THRESHOLD ||
      curPrice >= RESOLVED_PRICE_THRESHOLD)
  ) {
    score += 35;
  }

  if (
    Number.isFinite(curPrice) &&
    curPrice <= ZERO_PRICE_THRESHOLD &&
    Number.isFinite(currentValue) &&
    currentValue <= ZERO_PRICE_THRESHOLD
  ) {
    score += 20;
  }

  if (sportsLike) score += 10;
  return score;
}

export function selectEventSlugsForPositionRefresh(
  positions: PolymarketPositionLike[],
  options: { now?: number; limit?: number } = {},
) {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? DEFAULT_EVENT_LIVE_CHECK_LIMIT;
  const bySlug = new Map<string, RankedSlug>();

  for (const position of positions) {
    const slug = normalizeText(position.eventSlug);
    const score = eventLiveRefreshScore(position, now);
    if (!slug || score == null) continue;

    const existing = bySlug.get(slug);
    if (!existing || score > existing.score) {
      bySlug.set(slug, { slug, score });
    }
  }

  return Array.from(bySlug.values())
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, Math.max(0, limit))
    .map((item) => item.slug);
}

export function selectPositionPriceTokenIds(
  positions: PolymarketPositionLike[],
  options: { limit?: number } = {},
) {
  const limit = options.limit ?? DEFAULT_PRICE_TOKEN_LIMIT;
  const byToken = new Map<
    string,
    { tokenId: string; value: number; size: number }
  >();

  for (const position of positions) {
    if (position.redeemable) continue;

    const tokenId = normalizeText(position.asset);
    if (!tokenId) continue;

    const size = Math.max(0, finiteNumber(position.size));
    if (size <= 0) continue;

    const value = Math.max(0, finiteNumber(position.currentValue));
    const existing = byToken.get(tokenId);
    if (!existing || value > existing.value) {
      byToken.set(tokenId, { tokenId, value, size });
    }
  }

  return Array.from(byToken.values())
    .sort((a, b) => b.value - a.value || b.size - a.size)
    .slice(0, Math.max(0, limit))
    .map((item) => item.tokenId);
}

export function applyFreshPositionPrices<T extends PolymarketPositionLike>(
  positions: T[],
  quotesByTokenId: Record<string, PositionPriceQuote | null | undefined>,
): T[] {
  return positions.map((position) => {
    if (position.redeemable) return position;

    const tokenId = normalizeText(position.asset);
    const quote = tokenId ? quotesByTokenId[tokenId] : null;
    const freshBid = parseProbabilityPrice(quote?.bid);
    if (freshBid == null) return position;

    const size = Math.max(0, finiteNumber(position.size));
    const currentValue = size * freshBid;
    const cost = positionCost(position);
    const cashPnl = currentValue - cost;
    const percentPnl = cost > 0 ? (cashPnl / cost) * 100 : 0;

    return {
      ...position,
      curPrice: freshBid,
      currentPrice: freshBid,
      currentValue,
      cashPnl,
      percentPnl,
    };
  });
}
