'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsPositionKey,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
} from '@/lib/perps/perpsFeed';
import { useHyperliquidAgent } from '@/components/wallet/perps/hooks/useHyperliquidAgent';
import { useHyperliquidPositions } from '@/components/wallet/perps/hooks/useHyperliquidPositions';
import type { HLPosition } from '@/services/hyperliquid/types';

function markPriceFromPosition(position: HLPosition) {
  const sizeCoins = Math.abs(toPerpsFeedNumber(position.szi));
  const notionalUsd = toPerpsFeedNumber(position.positionValue);
  const entryPrice = toPerpsFeedNumber(position.entryPx);

  if (sizeCoins > 0 && notionalUsd > 0) {
    return notionalUsd / sizeCoins;
  }

  return entryPrice;
}

export default function PerpsFeedBackfill() {
  const { accessToken, user, primaryMicrosite } = useUser();
  const { masterAddress } = useHyperliquidAgent();
  const { data: accountData } = useHyperliquidPositions(masterAddress);
  const syncedSnapshotsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const smartsiteId = user?.primaryMicrosite || primaryMicrosite;
    const positions = accountData?.positions || [];

    if (
      !positions.length ||
      !accessToken ||
      !user?._id ||
      !smartsiteId ||
      !masterAddress
    ) {
      return;
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
    accountData?.positions,
    accessToken,
    user?._id,
    user?.primaryMicrosite,
    primaryMicrosite,
    masterAddress,
  ]);

  return null;
}
