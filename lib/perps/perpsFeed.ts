'use client';

import { useModalStore } from '@/zustandStore/modalstore';

export type PerpsPositionFeedEvent =
  | 'open'
  | 'add'
  | 'reduce'
  | 'close'
  | 'liquidate';
export type PerpsPositionFeedStatus = 'open' | 'closed' | 'liquidated';

export interface PerpsPositionFeedContent {
  provider: 'hyperliquid';
  positionKey: string;
  coin: string;
  side: 'long' | 'short';
  status: PerpsPositionFeedStatus;
  event: PerpsPositionFeedEvent;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  entryPrice: number;
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
  orderId?: string;
  masterAddress?: string | null;
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

export interface PerpsFillLike {
  coin?: string | null;
  side?: string | null;
  sz?: string | number | null;
  px?: string | number | null;
  time?: string | number | null;
  startPosition?: string | number | null;
  oid?: string | number | null;
  orderId?: string | number | null;
}

export interface PerpsPositionLike {
  coin?: string | null;
  szi?: string | number | null;
}

export interface PerpsOpenFillSnapshot {
  timestamp: string;
  orderId?: string;
  price?: number;
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
  markPricesByCoin?: Record<string, string | number | null | undefined>;
  liquidationsByCoin?: Record<
    string,
    PerpsLiquidationFillSnapshot | null | undefined
  >;
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
}: {
  userId?: string | null;
  masterAddress?: string | null;
  coin: string;
}) {
  return `hyperliquid:${masterAddress || userId || 'unknown'}:${coin.toUpperCase()}`;
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

function fillTimeMs(fill: PerpsFillLike) {
  const rawTime = maybePerpsFeedNumber(fill.time);
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

export function inferPerpsPositionOpenedFill(
  position: PerpsPositionLike,
  fills: PerpsFillLike[] = [],
): PerpsOpenFillSnapshot | null {
  const coin = normalizePerpsCoin(position.coin);
  const currentSize = maybePerpsFeedNumber(position.szi);
  if (!coin || currentSize === undefined || currentSize === 0) return null;

  const isLong = currentSize > 0;
  const sameCoinFills = fills
    .filter((fill) => normalizePerpsCoin(fill.coin) === coin)
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
  markPricesByCoin,
  liquidationsByCoin,
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
        markPricesByCoin,
        liquidationsByCoin,
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
