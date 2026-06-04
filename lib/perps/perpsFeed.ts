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
