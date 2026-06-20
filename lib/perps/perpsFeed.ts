'use client';

import { useModalStore } from '@/zustandStore/modalstore';

export type PerpsPositionFeedEvent =
  | 'limit'
  | 'open'
  | 'add'
  | 'reduce'
  | 'close'
  | 'liquidate';
export type PerpsPositionFeedStatus =
  | 'limit'
  | 'open'
  | 'closed'
  | 'liquidated';

export interface PerpsPositionFeedContent {
  provider: 'hyperliquid';
  positionKey: string;
  coin: string;
  dex?: string | null;
  side: 'long' | 'short';
  status: PerpsPositionFeedStatus;
  event: PerpsPositionFeedEvent;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  entryPrice: number;
  limitPrice?: number | null;
  markPrice: number;
  exitPrice?: number | null;
  liquidationPrice?: number | null;
  collateralUsd: number;
  notionalUsd: number;
  sizeCoins: number;
  returnPct: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  feeUsd?: number;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
  orderId?: string;
  masterAddress?: string | null;
  limitPlacedAt?: string;
  openedAt?: string;
  updatedAt: string;
  closedAt?: string;
  liquidatedAt?: string;
}

export interface PerpsLiquidationFillSnapshot {
  coin: string;
  px?: number;
  markPx?: number;
  closedPnl?: number;
  feeUsd?: number;
  orderId?: string;
  timestamp?: string;
}

export interface PerpsCloseFillSnapshot {
  coin: string;
  px?: number;
  closedPnl?: number;
  feeUsd?: number;
  orderId?: string;
  timestamp?: string;
}

export interface PerpsFillLike {
  coin?: string | null;
  side?: string | null;
  sz?: string | number | null;
  px?: string | number | null;
  time?: string | number | null;
  startPosition?: string | number | null;
  closedPnl?: string | number | null;
  fee?: string | number | null;
  oid?: string | number | null;
  orderId?: string | number | null;
  liquidation?: unknown;
}

export interface PerpsPositionLike {
  coin?: string | null;
  dex?: string | null;
  szi?: string | number | null;
  entryPx?: string | number | null;
}

export interface PerpsOpenFillSnapshot {
  timestamp: string;
  orderId?: string;
  price?: number;
}

export interface PerpsOpenOrderLike {
  coin?: string | null;
  dex?: string | null;
  side?: string | null;
  oid?: string | number | null;
  sz?: string | number | null;
  timestamp?: string | number | null;
  reduceOnly?: boolean | null;
  triggerPx?: string | number | null;
  limitPx?: string | number | null;
  orderType?: string | null;
}

export interface PerpsRiskPrices {
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

interface UpsertPerpsPositionFeedParams {
  token: string | null | undefined;
  userId: string | null | undefined;
  smartsiteId: string | null | undefined;
  content: PerpsPositionFeedContent;
}

interface ReconcilePerpsPositionFeedParams {
  token: string | null | undefined;
  userId: string | null | undefined;
  smartsiteId: string | null | undefined;
  masterAddress: string | null | undefined;
  activePositionKeys: string[];
  activeLimitOrders?: PerpsActiveLimitOrderSnapshot[];
  observedDexes?: Array<string | null | undefined>;
  markPricesByCoin?: Record<string, string | number | null | undefined>;
  liquidationsByCoin?: Record<
    string,
    PerpsLiquidationFillSnapshot | null | undefined
  >;
  closedFillsByCoin?: Record<
    string,
    PerpsCloseFillSnapshot | null | undefined
  >;
}

export interface PerpsActiveLimitOrderSnapshot {
  positionKey: string;
  coin: string;
  dex?: string | null;
  side: 'long' | 'short';
  orderId?: string;
  limitPrice: number;
  markPrice: number;
  sizeCoins: number;
  notionalUsd: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  limitPlacedAt?: string;
  updatedAt?: string;
}

type IdLike = {
  _id?: unknown;
  id?: unknown;
  toString?: () => string;
};

type PerpsFeedUserLike = {
  primaryMicrosite?: unknown;
  microsites?: Array<{
    _id?: unknown;
    id?: unknown;
    primary?: boolean;
  }>;
};

function normalizePerpsFeedId(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (typeof value !== 'object') return '';

  const idLike = value as IdLike;
  const nestedId =
    normalizePerpsFeedId(idLike._id) || normalizePerpsFeedId(idLike.id);
  if (nestedId) return nestedId;

  if (
    typeof idLike.toString === 'function' &&
    idLike.toString !== Object.prototype.toString
  ) {
    const stringValue = idLike.toString().trim();
    return stringValue === '[object Object]' ? '' : stringValue;
  }

  return '';
}

export function resolvePerpsFeedSmartsiteId(
  user?: PerpsFeedUserLike | null,
  fallback?: unknown,
) {
  const primaryMicrosite = normalizePerpsFeedId(user?.primaryMicrosite);
  if (primaryMicrosite) return primaryMicrosite;

  const fallbackMicrosite = normalizePerpsFeedId(fallback);
  if (fallbackMicrosite) return fallbackMicrosite;

  const microsites = Array.isArray(user?.microsites) ? user.microsites : [];
  const primary = microsites.find((microsite) => microsite?.primary);
  return normalizePerpsFeedId(primary) || normalizePerpsFeedId(microsites[0]);
}

export function buildPerpsPositionKey({
  userId,
  masterAddress,
  coin,
  dex,
}: {
  userId?: string | null;
  masterAddress?: string | null;
  coin: string;
  dex?: string | null;
}) {
  return `hyperliquid:${masterAddress || userId || 'unknown'}:${qualifyPerpsPositionCoin({ coin, dex })}`;
}

export function toPerpsFeedNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function maybePerpsFeedNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizePerpsCoin(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function normalizePerpsDex(value: unknown) {
  return String(value || '').trim();
}

export function qualifyPerpsPositionCoin({
  coin,
  dex,
}: {
  coin: string;
  dex?: string | null;
}) {
  const normalizedCoin = normalizePerpsCoin(coin);
  const normalizedDex = normalizePerpsDex(dex);

  if (!normalizedCoin || !normalizedDex || normalizedCoin.includes(':')) {
    return normalizedCoin;
  }

  return `${normalizedDex}:${normalizedCoin}`.toUpperCase();
}

function fillTimeMs(fill: PerpsFillLike) {
  const rawTime = maybePerpsFeedNumber(fill.time);
  if (rawTime === undefined || rawTime <= 0) return undefined;
  return rawTime < 1_000_000_000_000 ? rawTime * 1000 : rawTime;
}

function orderTimeMs(order: PerpsOpenOrderLike) {
  const rawTime = maybePerpsFeedNumber(order.timestamp);
  if (rawTime === undefined || rawTime <= 0) return undefined;
  return rawTime < 1_000_000_000_000 ? rawTime * 1000 : rawTime;
}

function fillSignedSize(fill: PerpsFillLike) {
  const size = maybePerpsFeedNumber(fill.sz);
  if (size === undefined || size <= 0) return undefined;

  const side = String(fill.side || '').toUpperCase();
  if (side === 'B') return size;
  if (side === 'A') return -size;
  return undefined;
}

function fillOrderId(fill: PerpsFillLike) {
  const orderId = fill.orderId ?? fill.oid;
  return orderId === undefined || orderId === null ? undefined : String(orderId);
}

function orderId(order: PerpsOpenOrderLike) {
  const rawOrderId = order.oid;
  return rawOrderId === undefined || rawOrderId === null
    ? undefined
    : String(rawOrderId);
}

export function isPerpsEntryLimitOrder(order: PerpsOpenOrderLike) {
  if (!order || order.reduceOnly) return false;

  const coin = normalizePerpsCoin(order.coin);
  const size = maybePerpsFeedNumber(order.sz);
  const limitPrice = maybePerpsFeedNumber(order.limitPx);
  const triggerPrice = maybePerpsFeedNumber(order.triggerPx);
  if (!coin || !size || size <= 0 || !limitPrice || limitPrice <= 0) {
    return false;
  }

  const type = String(order.orderType || '').toLowerCase();
  if (triggerPrice && triggerPrice > 0) return false;
  return !type.includes('trigger');
}

export function buildPerpsActiveLimitOrderSnapshot({
  order,
  userId,
  masterAddress,
  markPricesByCoin = {},
  openOrders = [],
}: {
  order: PerpsOpenOrderLike;
  userId?: string | null;
  masterAddress?: string | null;
  markPricesByCoin?: Record<string, string | number | null | undefined>;
  openOrders?: PerpsOpenOrderLike[];
}): PerpsActiveLimitOrderSnapshot | null {
  if (!isPerpsEntryLimitOrder(order)) return null;

  const rawCoin = normalizePerpsCoin(order.coin);
  const qualifiedCoin = qualifyPerpsPositionCoin({
    coin: rawCoin,
    dex: order.dex,
  });
  const limitPrice = maybePerpsFeedNumber(order.limitPx);
  const sizeCoins = maybePerpsFeedNumber(order.sz);
  if (!rawCoin || !qualifiedCoin || !limitPrice || !sizeCoins) return null;

  const side = String(order.side || '').toUpperCase() === 'A' ? 'short' : 'long';
  const markPrice =
    maybePerpsFeedNumber(markPricesByCoin[qualifiedCoin]) ||
    maybePerpsFeedNumber(markPricesByCoin[rawCoin]) ||
    limitPrice;
  const timeMs = orderTimeMs(order);
  const timestamp =
    timeMs && timeMs <= Date.now() + 5 * 60 * 1000
      ? new Date(timeMs).toISOString()
      : undefined;
  const riskPrices = inferPerpsPositionRiskPrices(
    {
      coin: rawCoin,
      dex: order.dex,
      szi: side === 'long' ? sizeCoins : -sizeCoins,
      entryPx: limitPrice,
    },
    openOrders,
  );

  return {
    positionKey: buildPerpsPositionKey({
      userId,
      masterAddress,
      coin: rawCoin,
      dex: order.dex,
    }),
    coin: qualifiedCoin,
    dex: order.dex || null,
    side,
    ...(orderId(order) ? { orderId: orderId(order) } : {}),
    limitPrice,
    markPrice,
    sizeCoins,
    notionalUsd: Math.abs(sizeCoins) * limitPrice,
    ...(riskPrices.takeProfitPrice
      ? { takeProfitPrice: riskPrices.takeProfitPrice }
      : {}),
    ...(riskPrices.stopLossPrice
      ? { stopLossPrice: riskPrices.stopLossPrice }
      : {}),
    ...(timestamp ? { limitPlacedAt: timestamp, updatedAt: timestamp } : {}),
  };
}

function isTerminalCloseFill(fill: PerpsFillLike) {
  const startPosition = maybePerpsFeedNumber(fill.startPosition);
  const signedSize = fillSignedSize(fill);

  if (
    startPosition === undefined ||
    signedSize === undefined ||
    Math.abs(startPosition) <= 0
  ) {
    return false;
  }

  if (Math.sign(startPosition) === Math.sign(signedSize)) return false;

  const endPosition = startPosition + signedSize;
  const tolerance = Math.max(Math.abs(startPosition) * 0.000001, 0.000000001);
  return (
    Math.abs(endPosition) <= tolerance ||
    Math.sign(endPosition) !== Math.sign(startPosition)
  );
}

export function inferPerpsCloseFillsByCoin(
  fills: PerpsFillLike[] = [],
): Record<string, PerpsCloseFillSnapshot> {
  return fills.reduce<Record<string, PerpsCloseFillSnapshot>>(
    (closedFills, fill) => {
      if (fill?.liquidation || !isTerminalCloseFill(fill)) return closedFills;

      const coin = normalizePerpsCoin(fill.coin);
      const timeMs = fillTimeMs(fill);
      if (!coin || !timeMs || timeMs > Date.now() + 5 * 60 * 1000) {
        return closedFills;
      }

      const timestamp = new Date(timeMs).toISOString();
      const existingTime = Date.parse(closedFills[coin]?.timestamp || '');
      if (Number.isFinite(existingTime) && existingTime >= timeMs) {
        return closedFills;
      }

      const price = maybePerpsFeedNumber(fill.px);
      const closedPnl = maybePerpsFeedNumber(fill.closedPnl);
      const feeUsd = maybePerpsFeedNumber(fill.fee);
      const orderId = fillOrderId(fill);

      closedFills[coin] = {
        coin,
        ...(price !== undefined ? { px: price } : {}),
        ...(closedPnl !== undefined ? { closedPnl } : {}),
        ...(feeUsd !== undefined ? { feeUsd } : {}),
        ...(orderId ? { orderId } : {}),
        timestamp,
      };

      return closedFills;
    },
    {},
  );
}

export function inferPerpsPositionRiskPrices(
  position: PerpsPositionLike,
  openOrders: PerpsOpenOrderLike[] = [],
): PerpsRiskPrices {
  const rawCoin = normalizePerpsCoin(position.coin);
  const qualifiedCoin = qualifyPerpsPositionCoin({
    coin: rawCoin,
    dex: position.dex,
  });
  const positionDex = normalizePerpsDex(position.dex).toLowerCase();
  const signedSize = maybePerpsFeedNumber(position.szi);
  const entryPrice = maybePerpsFeedNumber(position.entryPx);
  if (!rawCoin || signedSize === undefined || signedSize === 0) return {};

  const isLong = signedSize > 0;
  return openOrders.reduce<PerpsRiskPrices>((prices, order) => {
    if (!order?.reduceOnly) return prices;

    const orderCoin = normalizePerpsCoin(order.coin);
    if (orderCoin !== rawCoin && orderCoin !== qualifiedCoin) return prices;

    const orderDex = normalizePerpsDex(order.dex).toLowerCase();
    if (positionDex && orderDex && orderDex !== positionDex) return prices;

    const orderType = String(order.orderType || '').toLowerCase();
    const triggerPrice = maybePerpsFeedNumber(order.triggerPx);
    const limitPrice = maybePerpsFeedNumber(order.limitPx);
    const price = triggerPrice || limitPrice;
    if (!price || price <= 0) return prices;

    const explicitTakeProfit =
      orderType.includes('take') || orderType.includes('profit');
    const explicitStopLoss = orderType.includes('stop') || orderType.includes('loss');
    const isTakeProfit =
      explicitTakeProfit ||
      (!explicitStopLoss &&
        entryPrice !== undefined &&
        (isLong ? price > entryPrice : price < entryPrice));
    const isStopLoss =
      explicitStopLoss ||
      (!explicitTakeProfit &&
        entryPrice !== undefined &&
        (isLong ? price < entryPrice : price > entryPrice));

    if (isTakeProfit) prices.takeProfitPrice = price;
    if (isStopLoss) prices.stopLossPrice = price;
    return prices;
  }, {});
}

export function inferPerpsPositionOpenedFill(
  position: PerpsPositionLike,
  fills: PerpsFillLike[] = [],
): PerpsOpenFillSnapshot | null {
  const coin = qualifyPerpsPositionCoin({
    coin: String(position.coin || ''),
    dex: position.dex,
  });
  const rawCoin = normalizePerpsCoin(position.coin);
  const currentSize = maybePerpsFeedNumber(position.szi);
  if (!coin || currentSize === undefined || currentSize === 0) return null;

  const isLong = currentSize > 0;
  const sameCoinFills = fills
    .filter((fill) => {
      const fillCoin = normalizePerpsCoin(fill.coin);
      return fillCoin === coin || (rawCoin ? fillCoin === rawCoin : false);
    })
    .map((fill) => {
      const timeMs = fillTimeMs(fill);
      const signedSize = fillSignedSize(fill);
      const startPosition = maybePerpsFeedNumber(fill.startPosition);
      return { fill, timeMs, signedSize, startPosition };
    })
    .filter(
      (entry) =>
        entry.timeMs !== undefined &&
        entry.signedSize !== undefined &&
        entry.timeMs <= Date.now() + 5 * 60 * 1000,
    )
    .sort((a, b) => (a.timeMs || 0) - (b.timeMs || 0));

  if (sameCoinFills.length === 0) return null;

  const crossingFill = [...sameCoinFills].reverse().find((entry) => {
    if (entry.startPosition === undefined || entry.signedSize === undefined) {
      return false;
    }
    const endPosition = entry.startPosition + entry.signedSize;
    return isLong
      ? entry.startPosition <= 0 && endPosition > 0
      : entry.startPosition >= 0 && endPosition < 0;
  });

  const directionSide = isLong ? 'B' : 'A';
  const fallbackFill =
    crossingFill ||
    sameCoinFills.find(
      (entry) => String(entry.fill.side || '').toUpperCase() === directionSide,
    );

  if (!fallbackFill?.timeMs) return null;

  const price = maybePerpsFeedNumber(fallbackFill.fill.px);
  return {
    timestamp: new Date(fallbackFill.timeMs).toISOString(),
    orderId: fillOrderId(fallbackFill.fill),
    ...(price !== undefined ? { price } : {}),
  };
}

export async function upsertPerpsPositionFeed({
  token,
  userId,
  smartsiteId,
  content,
}: UpsertPerpsPositionFeedParams) {
  if (!token || !userId || !smartsiteId || !content.positionKey) {
    const missingFields = [
      !token ? 'token' : null,
      !userId ? 'userId' : null,
      !smartsiteId ? 'smartsiteId' : null,
      !content.positionKey ? 'positionKey' : null,
    ].filter(Boolean);

    console.warn(
      `Skipping perps feed sync; missing ${missingFields.join(', ')}`,
    );
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/perps-position`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postType: 'perpsPosition',
        smartsiteId,
        userId,
        content,
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to update perps feed card (${response.status})`,
    );
  }

  useModalStore.getState().triggerFeedRefetch();

  return data;
}

export async function reconcilePerpsPositionFeed({
  token,
  userId,
  smartsiteId,
  masterAddress,
  activePositionKeys,
  activeLimitOrders,
  observedDexes,
  markPricesByCoin,
  liquidationsByCoin,
  closedFillsByCoin,
}: ReconcilePerpsPositionFeedParams) {
  if (!token || !userId || !smartsiteId || !masterAddress) {
    const missingFields = [
      !token ? 'token' : null,
      !userId ? 'userId' : null,
      !smartsiteId ? 'smartsiteId' : null,
      !masterAddress ? 'masterAddress' : null,
    ].filter(Boolean);

    console.warn(
      `Skipping perps feed reconciliation; missing ${missingFields.join(', ')}`,
    );
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/perps-position/reconcile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        smartsiteId,
        userId,
        masterAddress,
        activePositionKeys,
        activeLimitOrders,
        observedDexes,
        markPricesByCoin,
        liquidationsByCoin,
        closedFillsByCoin,
        updatedAt: new Date().toISOString(),
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Failed to reconcile perps feed cards (${response.status})`,
    );
  }

  if (data?.data?.updatedCount > 0) {
    useModalStore.getState().triggerFeedRefetch();
  }

  return data;
}
