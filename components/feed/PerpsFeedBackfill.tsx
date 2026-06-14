'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsPositionKey,
  type PerpsLiquidationFillSnapshot,
  reconcilePerpsPositionFeed,
  resolvePerpsFeedSmartsiteId,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
} from '@/lib/perps/perpsFeed';
import { useHyperliquidAgent } from '@/components/wallet/perps/hooks/useHyperliquidAgent';
import { useHyperliquidMarkets } from '@/components/wallet/perps/hooks/useHyperliquidMarkets';
import { useHyperliquidPositions } from '@/components/wallet/perps/hooks/useHyperliquidPositions';
import type { HLPosition } from '@/services/hyperliquid/types';

interface HyperliquidUserFill {
  coin?: string;
  px?: string;
  time?: number;
  closedPnl?: string;
  fee?: string;
  oid?: number | string;
  liquidation?: {
    markPx?: string;
  };
}

function markPriceFromPosition(position: HLPosition) {
  const sizeCoins = Math.abs(toPerpsFeedNumber(position.szi));
  const notionalUsd = toPerpsFeedNumber(position.positionValue);
  const entryPrice = toPerpsFeedNumber(position.entryPx);

  if (sizeCoins > 0 && notionalUsd > 0) {
    return notionalUsd / sizeCoins;
  }

  return entryPrice;
}

function fillTimestamp(fill: HyperliquidUserFill) {
  const milliseconds = Number(fill.time);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : new Date().toISOString();
}

function liquidationFillsByCoin(fills: unknown) {
  if (!Array.isArray(fills)) return {};

  return fills.reduce<Record<string, PerpsLiquidationFillSnapshot>>(
    (liquidations, fill: HyperliquidUserFill) => {
      if (!fill?.liquidation || !fill.coin) return liquidations;

      const coin = String(fill.coin).trim().toUpperCase();
      if (!coin || liquidations[coin]) return liquidations;

      liquidations[coin] = {
        coin,
        px: toPerpsFeedNumber(fill.px),
        markPx: toPerpsFeedNumber(fill.liquidation.markPx || fill.px),
        closedPnl: toPerpsFeedNumber(fill.closedPnl),
        feeUsd: toPerpsFeedNumber(fill.fee),
        orderId:
          fill.oid === undefined || fill.oid === null
            ? undefined
            : String(fill.oid),
        timestamp: fillTimestamp(fill),
      };

      return liquidations;
    },
    {},
  );
}

async function fetchRecentLiquidationsByCoin(masterAddress: string) {
  const response = await fetch('/api/hyperliquid/mainnet/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'userFills', user: masterAddress }),
  });

  if (!response.ok) return {};

  return liquidationFillsByCoin(await response.json());
}

export default function PerpsFeedBackfill() {
  const { accessToken, user, primaryMicrosite } = useUser();
  const feedSmartsiteId = resolvePerpsFeedSmartsiteId(user, primaryMicrosite);
  const { masterAddress } = useHyperliquidAgent();
  const { data: accountData } = useHyperliquidPositions(masterAddress);
  const { data: markets = [] } = useHyperliquidMarkets({
    enabled: Boolean(masterAddress && accountData),
  });
  const syncedSnapshotsRef = useRef<Set<string>>(new Set());
  const reconciledSnapshotsRef = useRef<Set<string>>(new Set());
  const markPricesByCoin = useMemo(() => {
    return markets.reduce<Record<string, number>>((prices, market) => {
      const price = toPerpsFeedNumber(market.markPrice);
      if (price <= 0) return prices;

      const coin = String(market.coin || '').trim().toUpperCase();
      if (coin) prices[coin] = price;

      const displayCoin = String(market.displayCoin || '').trim().toUpperCase();
      if (displayCoin) prices[displayCoin] = price;

      return prices;
    }, {});
  }, [markets]);

  useEffect(() => {
    const smartsiteId = feedSmartsiteId;
    const positions = accountData?.positions || [];

    if (
      !accountData ||
      !accessToken ||
      !user?._id ||
      !smartsiteId ||
      !masterAddress
    ) {
      return;
    }

    const activePositionKeys = positions.map((position) =>
      buildPerpsPositionKey({
        userId: user._id,
        masterAddress,
        coin: position.coin,
      }),
    );
    const reconcileSnapshotKey = [
      masterAddress,
      Object.keys(markPricesByCoin).length > 0 ? 'marks-ready' : 'marks-pending',
      ...activePositionKeys.map((key) => key.toLowerCase()).sort(),
    ].join(':');

    if (!reconciledSnapshotsRef.current.has(reconcileSnapshotKey)) {
      reconciledSnapshotsRef.current.add(reconcileSnapshotKey);
      fetchRecentLiquidationsByCoin(masterAddress)
        .catch((error) => {
          console.warn('Failed to fetch recent perps liquidations:', error);
          return {};
        })
        .then((liquidationsByCoin) =>
          reconcilePerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            masterAddress,
            activePositionKeys,
            markPricesByCoin,
            liquidationsByCoin,
          }),
        )
        .catch((error) => {
          reconciledSnapshotsRef.current.delete(reconcileSnapshotKey);
          console.warn('Failed to reconcile perps feed cards:', error);
        });
    }

    positions.forEach((position) => {
      const positionKey = buildPerpsPositionKey({
        userId: user._id,
        masterAddress,
        coin: position.coin,
      });
      const snapshotKey = [
        positionKey,
        position.szi,
        position.entryPx,
        position.marginUsed,
        position.leverage.value,
        position.leverage.type,
      ].join(':');

      if (syncedSnapshotsRef.current.has(snapshotKey)) return;
      syncedSnapshotsRef.current.add(snapshotKey);

      const sizeCoins = Math.abs(toPerpsFeedNumber(position.szi));
      const timestamp = new Date().toISOString();

      upsertPerpsPositionFeed({
        token: accessToken,
        userId: user._id,
        smartsiteId,
        content: {
          provider: 'hyperliquid',
          positionKey,
          coin: position.coin,
          side: toPerpsFeedNumber(position.szi) > 0 ? 'long' : 'short',
          status: 'open',
          event: 'open',
          leverage: position.leverage.value,
          marginMode:
            position.leverage.type === 'isolated' ? 'isolated' : 'cross',
          entryPrice: toPerpsFeedNumber(position.entryPx),
          markPrice: markPriceFromPosition(position),
          liquidationPrice: position.liquidationPx
            ? toPerpsFeedNumber(position.liquidationPx)
            : null,
          collateralUsd: toPerpsFeedNumber(position.marginUsed),
          notionalUsd: toPerpsFeedNumber(position.positionValue),
          sizeCoins,
          returnPct: toPerpsFeedNumber(position.returnOnEquity) * 100,
          unrealizedPnl: toPerpsFeedNumber(position.unrealizedPnl),
          masterAddress,
          openedAt: timestamp,
          updatedAt: timestamp,
        },
      }).catch((error) => {
        console.warn('Failed to backfill perps feed card:', error);
      });
    });
  }, [
    accountData,
    accessToken,
    user?._id,
    feedSmartsiteId,
    masterAddress,
    markPricesByCoin,
  ]);

  return null;
}
