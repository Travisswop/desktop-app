'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  useAaveAllPositions,
  type AaveAllPositionsData,
} from '@/components/wallet/defi/hooks/useAaveData';
import type { AaveChain, AavePosition, AavePositionsData } from '@/types/aave';

const ALL_AAVE_CHAINS: AaveChain[] = [
  'ethereum',
  'polygon',
  'base',
  'arbitrum',
];

// Keep polling a chain only while it's worth it: chains with live positions, or
// chains we haven't cleanly read yet (still loading / degraded by an RPC error).
// Chains that successfully returned zero positions are dropped, so a wallet with
// no Aave activity stops polling entirely after the first read.
function chainsWorthPolling(data?: AaveAllPositionsData): AaveChain[] {
  if (!data) return ALL_AAVE_CHAINS;
  return ALL_AAVE_CHAINS.filter((chain) => {
    const entry = data[chain];
    if (!entry || entry.degraded) return true;
    return (
      (entry.supplies || []).length > 0 || (entry.borrows || []).length > 0
    );
  });
}

function sameChains(a: AaveChain[], b: AaveChain[]) {
  return a.length === b.length && a.every((chain, i) => chain === b[i]);
}

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

  // One multi-chain request instead of four, polled every 5 minutes, and
  // narrowed to chains actually worth polling after the first read.
  const [activeChains, setActiveChains] =
    useState<AaveChain[]>(ALL_AAVE_CHAINS);
  const allPositions = useAaveAllPositions(activeChains, walletAddress, token, {
    enabled: Boolean(walletAddress && token),
    refetchInterval: 300_000,
  });
  const positionsData = allPositions.data;
  const positionsSuccess = allPositions.isSuccess;

  useEffect(() => {
    if (!positionsSuccess || !positionsData) return;
    const next = chainsWorthPolling(positionsData);
    setActiveChains((prev) => (sameChains(prev, next) ? prev : next));
  }, [positionsData, positionsSuccess]);

  const smartsiteId = resolvePerpsFeedSmartsiteId(user, primaryMicrosite);
  const snapshots = useMemo(
    () =>
      ALL_AAVE_CHAINS.flatMap((chain) =>
        collectPositionSnapshots(positionsData?.[chain]),
      ),
    [positionsData],
  );
  const positionQueryStates = useMemo(
    () =>
      ALL_AAVE_CHAINS.map((chain) => ({
        chain,
        data: positionsData?.[chain],
        isSuccess: positionsSuccess && Boolean(positionsData?.[chain]),
      })),
    [positionsData, positionsSuccess],
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
        publishToFeed: false,
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
