'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useUser } from '@/lib/UserContext';
import {
  buildAavePositionFeedContent,
  type DefiFeedAction,
} from '@/lib/defi/defiFeed';
import {
  reconcileAavePositionFeed,
  upsertAavePositionFeed,
} from '@/lib/defi/defiFeedSync';
import { resolvePerpsFeedSmartsiteId } from '@/lib/perps/perpsFeed';
import {
  getStoredEvmWalletAddress,
  selectPreferredWallet,
  shouldPreferEmbeddedWallets,
} from '@/components/wallet/hooks/useWalletData';
import { useAavePositions } from '@/components/wallet/defi/hooks/useAaveData';
import type { AaveChain, AavePosition, AavePositionsData } from '@/types/aave';

type PositionSnapshot = {
  action: DefiFeedAction;
  chain: AaveChain;
  position: AavePosition;
  updatedAt?: string;
};

function collectPositionSnapshots(data?: AavePositionsData): PositionSnapshot[] {
  if (!data) return [];

  const supplies = (data.supplies || []).map((position) => ({
    action: 'supply' as const,
    chain: data.chain,
    position,
    updatedAt: data.updatedAt,
  }));
  const borrows = (data.borrows || []).map((position) => ({
    action: 'borrow' as const,
    chain: data.chain,
    position,
    updatedAt: data.updatedAt,
  }));

  return [...supplies, ...borrows];
}

function roundedSnapshotValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

export default function AaveFeedBackfill() {
  const { accessToken, user, primaryMicrosite } = useUser();
  const { ready: privyReady, user: privyUser } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const syncedSnapshotsRef = useRef<Set<string>>(new Set());
  const reconciledSnapshotsRef = useRef<Set<string>>(new Set());

  const storedEvmAddress = getStoredEvmWalletAddress(user);
  const selectedWallet = selectPreferredWallet(
    privyReady && walletsReady ? wallets : [],
    storedEvmAddress || privyUser?.wallet?.address,
    {
      ...(shouldPreferEmbeddedWallets()
        ? { preferEmbedded: true, embeddedOnly: true }
        : {}),
      preferredAddresses: [storedEvmAddress, privyUser?.wallet?.address],
    },
  );
  const walletAddress =
    storedEvmAddress || selectedWallet?.address || privyUser?.wallet?.address || '';
  const token = accessToken || '';
  const queryOptions = {
    enabled: Boolean(walletAddress && token),
    refetchInterval: 60_000,
  };

  const ethereumPositions = useAavePositions(
    'ethereum',
    walletAddress,
    token,
    queryOptions,
  );
  const polygonPositions = useAavePositions(
    'polygon',
    walletAddress,
    token,
    queryOptions,
  );
  const basePositions = useAavePositions('base', walletAddress, token, queryOptions);
  const arbitrumPositions = useAavePositions(
    'arbitrum',
    walletAddress,
    token,
    queryOptions,
  );

  const smartsiteId = resolvePerpsFeedSmartsiteId(user, primaryMicrosite);
  const snapshots = useMemo(
    () => [
      ...collectPositionSnapshots(ethereumPositions.data),
      ...collectPositionSnapshots(polygonPositions.data),
      ...collectPositionSnapshots(basePositions.data),
      ...collectPositionSnapshots(arbitrumPositions.data),
    ],
    [
      arbitrumPositions.data,
      basePositions.data,
      ethereumPositions.data,
      polygonPositions.data,
    ],
  );
  const positionQueryStates = useMemo(
    () => [
      {
        chain: 'ethereum' as const,
        data: ethereumPositions.data,
        isSuccess: ethereumPositions.isSuccess,
      },
      {
        chain: 'polygon' as const,
        data: polygonPositions.data,
        isSuccess: polygonPositions.isSuccess,
      },
      {
        chain: 'base' as const,
        data: basePositions.data,
        isSuccess: basePositions.isSuccess,
      },
      {
        chain: 'arbitrum' as const,
        data: arbitrumPositions.data,
        isSuccess: arbitrumPositions.isSuccess,
      },
    ],
    [
      arbitrumPositions.data,
      arbitrumPositions.isSuccess,
      basePositions.data,
      basePositions.isSuccess,
      ethereumPositions.data,
      ethereumPositions.isSuccess,
      polygonPositions.data,
      polygonPositions.isSuccess,
    ],
  );

  useEffect(() => {
    if (!token || !user?._id || !smartsiteId || !walletAddress) return;

    snapshots.forEach(({ action, chain, position, updatedAt }) => {
      const content = buildAavePositionFeedContent({
        action,
        chain,
        walletAddress,
        position,
        updatedAt,
      });
      if (!content?.positionKey) return;

      const snapshotKey = [
        content.positionKey,
        roundedSnapshotValue(content.amountUsd),
        Number(content.aaveRate || 0).toFixed(6),
      ].join(':');

      if (syncedSnapshotsRef.current.has(snapshotKey)) return;
      syncedSnapshotsRef.current.add(snapshotKey);

      upsertAavePositionFeed({
        token,
        userId: user._id,
        smartsiteId,
        content,
      }).catch((error) => {
        syncedSnapshotsRef.current.delete(snapshotKey);
        console.warn('Failed to backfill Aave feed card:', error);
      });
    });
  }, [snapshots, smartsiteId, token, user?._id, walletAddress]);

  useEffect(() => {
    if (!token || !user?._id || !smartsiteId || !walletAddress) return;

    positionQueryStates.forEach(({ chain, data, isSuccess }) => {
      if (!isSuccess || !data || data.degraded) return;

      const activePositionKeys = collectPositionSnapshots(data)
        .map(({ action, chain: positionChain, position, updatedAt }) =>
          buildAavePositionFeedContent({
            action,
            chain: positionChain,
            walletAddress,
            position,
            updatedAt,
          })?.positionKey,
        )
        .filter((key): key is string => Boolean(key))
        .sort();
      const reconcileKey = [
        chain,
        walletAddress.toLowerCase(),
        activePositionKeys.join('|'),
      ].join(':');

      if (reconciledSnapshotsRef.current.has(reconcileKey)) return;
      reconciledSnapshotsRef.current.add(reconcileKey);

      reconcileAavePositionFeed({
        token,
        userId: user._id,
        smartsiteId,
        walletAddress,
        chain,
        activePositionKeys,
        updatedAt: data.updatedAt,
      }).catch((error) => {
        reconciledSnapshotsRef.current.delete(reconcileKey);
        console.warn('Failed to reconcile Aave feed cards:', error);
      });
    });
  }, [positionQueryStates, smartsiteId, token, user?._id, walletAddress]);

  return null;
}
