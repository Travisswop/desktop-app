'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsActiveLimitOrderSnapshot,
  buildPerpsPositionKey,
  buildPerpsReconcileSnapshotKey,
  inferPerpsCloseFillsByCoin,
  inferPerpsPositionRiskPrices,
  inferPerpsPositionOpenedFill,
  qualifyPerpsPositionCoin,
  type PerpsLiquidationFillSnapshot,
  type PerpsFillLike,
  type PerpsActiveLimitOrderSnapshot,
  reconcilePerpsPositionFeed,
  resolvePerpsFeedSmartsiteId,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
} from '@/lib/perps/perpsFeed';
import {
  getStoredEvmWalletAddress,
  selectPreferredWallet,
  shouldPreferEmbeddedWallets,
} from '@/components/wallet/hooks/useWalletData';
import { useHyperliquidMarkets } from '@/components/wallet/perps/hooks/useHyperliquidMarkets';
import { useHyperliquidPortfolio } from '@/components/wallet/perps/hooks/useHyperliquidPortfolio';
import type { HLPosition } from '@/services/hyperliquid/types';

interface HyperliquidUserFill extends PerpsFillLike {
  coin?: string;
  px?: string;
  time?: number;
  side?: 'B' | 'A';
  sz?: string;
  startPosition?: string;
  closedPnl?: string;
  fee?: string;
  oid?: number | string;
  liquidation?: {
    markPx?: string;
  };
}

function isActiveLimitOrderSnapshot(
  order: PerpsActiveLimitOrderSnapshot | null,
): order is PerpsActiveLimitOrderSnapshot {
  return order !== null;
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

async function fetchRecentUserFills(masterAddress: string) {
  const response = await fetch('/api/hyperliquid/mainnet/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'userFills', user: masterAddress }),
  });

  if (!response.ok) return [];

  const fills = await response.json();
  return Array.isArray(fills) ? (fills as HyperliquidUserFill[]) : [];
}

export default function PerpsFeedBackfill() {
  const { accessToken, user, primaryMicrosite } = useUser();
  const {
    ready: privyReady,
    user: privyUser,
  } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const feedSmartsiteId = resolvePerpsFeedSmartsiteId(user, primaryMicrosite);
  const storedMasterAddress = getStoredEvmWalletAddress(user);
  const useEmbeddedWalletProvider = shouldPreferEmbeddedWallets();
  const selectedMasterWallet = selectPreferredWallet(
    privyReady && walletsReady ? wallets : [],
    storedMasterAddress || privyUser?.wallet?.address,
    {
      ...(useEmbeddedWalletProvider
        ? { preferEmbedded: true, embeddedOnly: true }
        : {}),
      preferredAddresses: [storedMasterAddress, privyUser?.wallet?.address],
    },
  );
  // Backfill reads public Hyperliquid account state; it should not depend on
  // rehydrating the local trading agent key.
  const masterAddress =
    storedMasterAddress ||
    selectedMasterWallet?.address ||
    privyUser?.wallet?.address ||
    null;
  const { data: markets = [] } = useHyperliquidMarkets({
    enabled: Boolean(masterAddress),
  });
  const builderDexes = useMemo(() => {
    const set = new Set<string>();
    for (const market of markets) {
      const dex = market.dex?.trim();
      if (dex) set.add(dex);
    }
    return Array.from(set);
  }, [markets]);
  const { data: portfolio } = useHyperliquidPortfolio(
    masterAddress,
    builderDexes,
    {
      enabled: Boolean(masterAddress && markets.length > 0),
    },
  );
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
    const positions = portfolio?.positions || [];
    const openOrders = portfolio?.openOrders || [];
    const observedDexes = Object.keys(portfolio?.perDex || {});

    if (
      !portfolio ||
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
        dex: position.dex,
      }),
    );
    const activePositionKeySet = new Set(
      activePositionKeys.map((key) => key.toLowerCase()),
    );
    const activeLimitOrders = openOrders
      .map((order) =>
        buildPerpsActiveLimitOrderSnapshot({
          order,
          userId: user._id,
          masterAddress,
          markPricesByCoin,
          openOrders,
        }),
      )
      .filter(
        (order): order is PerpsActiveLimitOrderSnapshot =>
          isActiveLimitOrderSnapshot(order) &&
          !activePositionKeySet.has(order.positionKey.toLowerCase()),
      );

    let cancelled = false;

    fetchRecentUserFills(masterAddress)
      .catch((error) => {
        console.warn('Failed to fetch recent perps fills:', error);
        return [] as HyperliquidUserFill[];
      })
      .then((recentFills) => {
        if (cancelled) return;

        const closedFillsByCoin = inferPerpsCloseFillsByCoin(recentFills);
        const liquidationsByCoin = liquidationFillsByCoin(recentFills);
        const reconcileSnapshotKey = buildPerpsReconcileSnapshotKey({
          masterAddress,
          priceMapState:
            Object.keys(markPricesByCoin).length > 0
              ? 'marks-ready'
              : 'marks-pending',
          observedDexes,
          activePositionKeys,
          activeLimitOrders,
          liquidationsByCoin,
          closedFillsByCoin,
        });

        if (!reconciledSnapshotsRef.current.has(reconcileSnapshotKey)) {
          reconciledSnapshotsRef.current.add(reconcileSnapshotKey);
          reconcilePerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            masterAddress,
            activePositionKeys,
            activeLimitOrders,
            observedDexes,
            markPricesByCoin,
            liquidationsByCoin,
            closedFillsByCoin,
          }).catch((error) => {
            reconciledSnapshotsRef.current.delete(reconcileSnapshotKey);
            console.warn('Failed to reconcile perps feed cards:', error);
          });
        }

        positions.forEach((position) => {
          const riskPrices = inferPerpsPositionRiskPrices(
            position,
            portfolio.openOrders,
          );
          const positionKey = buildPerpsPositionKey({
            userId: user._id,
            masterAddress,
            coin: position.coin,
            dex: position.dex,
          });
          const feedCoin = qualifyPerpsPositionCoin({
            coin: position.coin,
            dex: position.dex,
          });
          const openedFill = inferPerpsPositionOpenedFill(
            position,
            recentFills,
          );
          const eventTimestamp =
            openedFill?.timestamp || new Date().toISOString();
          const snapshotKey = [
            positionKey,
            openedFill?.timestamp || 'no-open-fill',
            position.szi,
            position.entryPx,
            position.marginUsed,
            position.leverage.value,
            position.leverage.type,
          ].join(':');

          if (syncedSnapshotsRef.current.has(snapshotKey)) return;
          syncedSnapshotsRef.current.add(snapshotKey);

          const sizeCoins = Math.abs(toPerpsFeedNumber(position.szi));

          upsertPerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            content: {
              provider: 'hyperliquid',
              positionKey,
              coin: feedCoin,
              dex: position.dex || null,
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
              takeProfitPrice: riskPrices.takeProfitPrice,
              stopLossPrice: riskPrices.stopLossPrice,
              orderId: openedFill?.orderId,
              masterAddress,
              openedAt: eventTimestamp,
              updatedAt: eventTimestamp,
            },
          }).catch((error) => {
            console.warn('Failed to backfill perps feed card:', error);
          });
        });

        activeLimitOrders.forEach((order) => {
          const snapshotKey = [
            order.positionKey,
            order.orderId || '',
            order.limitPrice,
            order.limitPlacedAt || '',
          ].join(':');
          if (syncedSnapshotsRef.current.has(snapshotKey)) return;
          syncedSnapshotsRef.current.add(snapshotKey);

          const timestamp =
            order.limitPlacedAt || order.updatedAt || new Date().toISOString();
          upsertPerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            content: {
              provider: 'hyperliquid',
              positionKey: order.positionKey,
              coin: order.coin,
              dex: order.dex || null,
              side: order.side,
              status: 'limit',
              event: 'limit',
              leverage: 1,
              marginMode: 'cross',
              entryPrice: order.limitPrice,
              limitPrice: order.limitPrice,
              markPrice: order.markPrice,
              liquidationPrice: null,
              collateralUsd: 0,
              notionalUsd: order.notionalUsd,
              sizeCoins: order.sizeCoins,
              returnPct: 0,
              unrealizedPnl: 0,
              takeProfitPrice: order.takeProfitPrice,
              stopLossPrice: order.stopLossPrice,
              orderId: order.orderId,
              masterAddress,
              limitPlacedAt: timestamp,
              updatedAt: timestamp,
            },
          }).catch((error) => {
            console.warn('Failed to backfill perps limit card:', error);
          });
        });
      })
      .catch((error) => {
        console.warn('Failed to sync perps feed cards:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    user?._id,
    feedSmartsiteId,
    masterAddress,
    markPricesByCoin,
    portfolio,
  ]);

  return null;
}
