'use client';

import PerpsPositionFeedCard, {
  type PerpsEntryMarker,
} from './PerpsPositionFeedCard';
import type {
  PerpsPositionFeedContent,
  PerpsPositionFeedEvent,
  PerpsPositionFeedStatus,
} from '@/lib/perps/perpsFeed';

type PerpsContent = {
  platform?: string;
  marketId?: string;
  marketName?: string;
  coin?: string;
  side?: 'LONG' | 'SHORT' | 'long' | 'short';
  orderType?: 'market' | 'limit' | 'tpsl' | 'close';
  marginMode?: 'cross' | 'isolated';
  leverage?: number;
  sizeCoins?: number;
  sizeUsd?: number;
  entryPrice?: number;
  limitPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  marginRequired?: number;
  estFees?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  orderId?: string;
  status?: string;
  event?: string;
  openedAt?: string;
  updatedAt?: string;
  closedAt?: string;
};

interface PerpsFeedCardProps {
  content: PerpsContent;
  userName?: string;
  userImage?: string;
  createdAt?: string;
}

function maybeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(values: unknown[], fallback = 0) {
  for (const value of values) {
    const number = maybeNumber(value);
    if (number !== null) return number;
  }
  return fallback;
}

function normalizeLegacySide(side: PerpsContent['side']): 'long' | 'short' {
  return String(side || '').toLowerCase() === 'short' ? 'short' : 'long';
}

function normalizeLegacyLifecycle(
  content: PerpsContent,
): { status: PerpsPositionFeedStatus; event: PerpsPositionFeedEvent } {
  const status = String(content.status || '').toLowerCase();
  const event = String(content.event || '').toLowerCase();

  if (status === 'closed' || event === 'close' || content.orderType === 'close') {
    return { status: 'closed', event: 'close' };
  }

  if (status === 'limit' || event === 'limit' || content.orderType === 'limit') {
    return { status: 'limit', event: 'limit' };
  }

  return { status: 'open', event: 'open' };
}

function adaptLegacyPerpsContent(
  content: PerpsContent,
  createdAt?: string,
): Partial<PerpsPositionFeedContent> & { entries?: PerpsEntryMarker[] } {
  const side = normalizeLegacySide(content.side);
  const { status, event } = normalizeLegacyLifecycle(content);
  const leverage = Math.max(1, Math.round(firstNumber([content.leverage], 1)));
  const entryPrice = firstNumber(
    [content.entryPrice, content.limitPrice, content.markPrice],
    0,
  );
  const markPrice = firstNumber([content.markPrice, content.entryPrice], entryPrice);
  const sizeCoins = Math.abs(firstNumber([content.sizeCoins], 0));
  const notionalUsd = firstNumber(
    [content.sizeUsd, sizeCoins > 0 && entryPrice > 0 ? sizeCoins * entryPrice : null],
    0,
  );
  const collateralUsd = firstNumber(
    [content.marginRequired, notionalUsd > 0 ? notionalUsd / leverage : null],
    0,
  );
  const timestamp = content.openedAt || content.updatedAt || createdAt;
  const rawReturn =
    entryPrice > 0 && markPrice > 0
      ? ((side === 'long' ? markPrice - entryPrice : entryPrice - markPrice) /
          entryPrice) *
        leverage *
        100
      : 0;
  const entryMarker =
    timestamp && entryPrice > 0
      ? [
          {
            event: 'open' as const,
            orderId: content.orderId,
            price: entryPrice,
            sizeCoins,
            notionalUsd,
            timestamp,
          },
        ]
      : [];

  return {
    provider: 'hyperliquid',
    positionKey:
      content.marketId || content.orderId
        ? `legacy:${content.marketId || content.orderId}`
        : undefined,
    coin: content.coin || 'BTC',
    side,
    status,
    event,
    leverage,
    marginMode: content.marginMode || 'cross',
    entryPrice,
    limitPrice: status === 'limit' ? firstNumber([content.limitPrice, entryPrice]) : undefined,
    markPrice,
    exitPrice: status === 'closed' ? markPrice : undefined,
    liquidationPrice: maybeNumber(content.liquidationPrice),
    collateralUsd,
    notionalUsd,
    sizeCoins,
    returnPct: rawReturn,
    unrealizedPnl: notionalUsd * (rawReturn / 100) / leverage,
    feeUsd: maybeNumber(content.estFees) ?? undefined,
    takeProfitPrice: maybeNumber(content.takeProfitPrice),
    stopLossPrice: maybeNumber(content.stopLossPrice),
    orderId: content.orderId,
    openedAt: status === 'open' ? timestamp : undefined,
    limitPlacedAt: status === 'limit' ? timestamp : undefined,
    updatedAt: content.updatedAt || timestamp,
    closedAt: status === 'closed' ? content.closedAt || timestamp : undefined,
    entries: entryMarker,
  };
}

export default function PerpsFeedCard({
  content,
  userName,
  userImage,
  createdAt,
}: PerpsFeedCardProps) {
  return (
    <PerpsPositionFeedCard
      feed={{
        content: adaptLegacyPerpsContent(content, createdAt),
        smartsiteDetails: {
          name: userName,
          profilePic: userImage,
        },
        smartsiteUserName: userName,
        smartsiteProfilePic: userImage,
        createdAt,
      }}
    />
  );
}
