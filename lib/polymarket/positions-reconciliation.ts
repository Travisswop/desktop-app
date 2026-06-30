const RESOLVED_PRICE_THRESHOLD = 0.995;
const ZERO_PRICE_THRESHOLD = 0.005;

export type PolymarketPositionLike = {
  asset?: string | number | null;
  conditionId?: string | null;
  size?: number | null;
  avgPrice?: number | null;
  initialValue?: number | null;
  currentValue?: number | null;
  cashPnl?: number | null;
  percentPnl?: number | null;
  curPrice?: number | null;
  currentPrice?: number | null;
  redeemable?: boolean | null;
  eventSlug?: string | null;
  slug?: string | null;
  title?: string | null;
  endDate?: string | null;
  outcomeIndex?: number | null;
  marketClosed?: boolean;
  marketResolutionPending?: boolean;
};

export type EventLiveMarket = {
  conditionId?: string | null;
  closed?: boolean | null;
  active?: boolean | null;
  outcomePrices?: unknown;
  clobTokenIds?: unknown;
};

export type EventLiveState = {
  closed?: boolean | null;
  ended?: boolean | null;
  markets?: EventLiveMarket[] | null;
};

type EventMap =
  | Map<string, EventLiveState | null | undefined>
  | Record<string, EventLiveState | null | undefined>;

export type MarketResolutionFields = {
  marketClosed?: boolean;
  marketResolutionPending?: boolean;
  marketResolutionSource?: 'event-live';
  resolvedOutcomeIndex?: number;
  resolvedOutcomePrice?: number;
};

function finiteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeId(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseNumberArray(value: unknown) {
  return parseArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parseStringArray(value: unknown) {
  return parseArray(value).map((item) => normalizeId(item));
}

function positionCost(position: PolymarketPositionLike) {
  const initialValue = finiteNumber(position.initialValue);
  if (initialValue > 0) return initialValue;
  return Math.max(
    0,
    finiteNumber(position.avgPrice) * finiteNumber(position.size),
  );
}

function isMarketClosed(market: EventLiveMarket) {
  return Boolean(market.closed || market.active === false);
}

function getHeldOutcomeIndex(
  position: PolymarketPositionLike,
  market: EventLiveMarket,
) {
  const positionAsset = normalizeId(position.asset);
  const tokenIds = parseStringArray(market.clobTokenIds);
  const tokenIndex = tokenIds.findIndex((tokenId) => tokenId === positionAsset);
  if (tokenIndex >= 0) return tokenIndex;

  const outcomeIndex = finiteNumber(position.outcomeIndex, Number.NaN);
  return Number.isInteger(outcomeIndex) && outcomeIndex >= 0
    ? outcomeIndex
    : null;
}

function getResolvedWinnerIndex(market: EventLiveMarket) {
  const prices = parseNumberArray(market.outcomePrices);
  if (prices.length === 0) return null;

  let winnerIndex = -1;
  let winnerPrice = -Infinity;
  prices.forEach((price, index) => {
    if (price > winnerPrice) {
      winnerPrice = price;
      winnerIndex = index;
    }
  });

  const hasZeroedOutcome = prices.some(
    (price) => price <= ZERO_PRICE_THRESHOLD,
  );
  if (
    winnerIndex < 0 ||
    winnerPrice < RESOLVED_PRICE_THRESHOLD ||
    !hasZeroedOutcome
  ) {
    return null;
  }

  return winnerIndex;
}

function getEventForSlug(eventsBySlug: EventMap, slug: string) {
  return eventsBySlug instanceof Map
    ? eventsBySlug.get(slug)
    : eventsBySlug[slug];
}

function findMatchingMarket(
  position: PolymarketPositionLike,
  event: EventLiveState,
) {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const positionConditionId = normalizeId(position.conditionId);
  const positionAsset = normalizeId(position.asset);

  return markets.find((market) => {
    if (
      positionConditionId &&
      normalizeId(market.conditionId) === positionConditionId
    ) {
      return true;
    }

    return parseStringArray(market.clobTokenIds).includes(positionAsset);
  });
}

export function reconcilePositionWithEventLive<
  T extends PolymarketPositionLike,
>(
  position: T,
  event: EventLiveState | null | undefined,
): T & MarketResolutionFields {
  if (!event) return position;

  const market = findMatchingMarket(position, event);
  const eventClosed = Boolean(event.closed || event.ended);
  if (!market || (!eventClosed && !isMarketClosed(market))) {
    return position;
  }

  const heldOutcomeIndex = getHeldOutcomeIndex(position, market);
  const winnerIndex = getResolvedWinnerIndex(market);

  if (heldOutcomeIndex == null || winnerIndex == null) {
    return {
      ...position,
      marketClosed: true,
      marketResolutionPending: true,
      marketResolutionSource: 'event-live',
    };
  }

  const won = heldOutcomeIndex === winnerIndex;
  const size = Math.max(0, finiteNumber(position.size));
  const currentValue = won ? size : 0;
  const cost = positionCost(position);
  const cashPnl = currentValue - cost;
  const percentPnl = cost > 0 ? (cashPnl / cost) * 100 : 0;

  return {
    ...position,
    redeemable: true,
    curPrice: won ? 1 : 0,
    currentValue,
    cashPnl,
    percentPnl,
    marketClosed: true,
    marketResolutionPending: false,
    marketResolutionSource: 'event-live',
    resolvedOutcomeIndex: winnerIndex,
    resolvedOutcomePrice: won ? 1 : 0,
  };
}

export function reconcilePositionsWithEventLive<
  T extends PolymarketPositionLike,
>(
  positions: T[],
  eventsBySlug: EventMap,
): Array<T & MarketResolutionFields> {
  return positions.map((position) => {
    const eventSlug = normalizeId(position.eventSlug);
    if (!eventSlug) return position;
    return reconcilePositionWithEventLive(
      position,
      getEventForSlug(eventsBySlug, eventSlug),
    );
  });
}
