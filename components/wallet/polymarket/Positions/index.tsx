'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPositions, type PolymarketPosition } from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useTrading } from '@/providers/polymarket';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import PositionCard from './PositionCard';
import PositionFilters from './PositionFilters';

import { DUST_THRESHOLD } from '@/constants/polymarket';

export default function UserPositions() {
  const { eoaAddress } = usePolymarketWallet();
  const { submitOrder, isSubmitting } = useTrading();
  const queryClient = useQueryClient();

  const { data: positions, isLoading, error } = useUserPositions(eoaAddress);

  const [hideDust, setHideDust] = useState(true);
  const [sellingAsset, setSellingAsset] = useState<string | null>(null);
  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(null);

  const handleMarketSell = async (position: PolymarketPosition) => {
    if (!position.ammMarketId || !position.ammPoolAddress) return;
    setSellingAsset(position.asset);
    try {
      await submitOrder({
        marketId: position.ammMarketId as `0x${string}`,
        isYes: position.outcome.toLowerCase() === 'yes',
        isBuy: false,
        amount: position.size,
        minOut: position.size * position.curPrice * 0.95,
      });
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
    } catch (err) {
      console.error('Failed to sell position:', err);
    } finally {
      setSellingAsset(null);
    }
  };

  const handleRedeem = async (position: PolymarketPosition) => {
    if (!position.ammPoolAddress) return;
    setRedeemingAsset(position.asset);
    try {
      // Dynamic import to avoid loading resolution hook globally
      const { useMarketResolution } = await import('@/hooks/polymarket/useMarketResolution');
      console.log('Redeem triggered for pool', position.ammPoolAddress, useMarketResolution);
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
    } catch (err) {
      console.error('Failed to redeem position:', err);
    } finally {
      setRedeemingAsset(null);
    }
  };

  const activePositions = useMemo(() => {
    if (!positions) return [];
    let filtered = positions.filter((p) => p.size >= DUST_THRESHOLD);
    if (hideDust) filtered = filtered.filter((p) => p.currentValue >= DUST_THRESHOLD);
    return filtered;
  }, [positions, hideDust]);

  if (isLoading) return <LoadingState message="Loading positions..." />;
  if (error) return <ErrorState error={error} title="Error loading positions" />;
  if (!positions || activePositions.length === 0) {
    return <EmptyState title="No Open Positions" message="You don't have any open positions." />;
  }

  return (
    <div className="space-y-4">
      <PositionFilters
        positionCount={activePositions.length}
        hideDust={hideDust}
        onToggleHideDust={() => setHideDust(!hideDust)}
      />

      {hideDust && positions.length > activePositions.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-amber-700 text-sm">
            Hiding {positions.length - activePositions.length} dust position(s)
            (value &lt; ${DUST_THRESHOLD.toFixed(2)})
          </p>
        </div>
      )}

      <div className="space-y-3">
        {activePositions.map((position) => (
          <PositionCard
            key={`${position.conditionId}-${position.outcomeIndex}`}
            position={position}
            onRedeem={handleRedeem}
            onSell={handleMarketSell}
            isSelling={sellingAsset === position.asset}
            isRedeeming={redeemingAsset === position.asset}
            isPendingVerification={false}
            isSubmitting={isSubmitting}
            canSell={!!eoaAddress && !!position.ammMarketId}
            canRedeem={!!position.ammPoolAddress && position.redeemable}
          />
        ))}
      </div>
    </div>
  );
}
