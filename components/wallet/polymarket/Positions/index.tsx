"use client";

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClobOrder, useRedeemPosition, useUserPositions, PolymarketPosition } from "@/hooks/polymarket";
import { usePolymarketWallet } from "@/providers/polymarket";
import { useTrading } from "@/providers/polymarket";

import ErrorState from "../shared/ErrorState";
import EmptyState from "../shared/EmptyState";
import LoadingState from "../shared/LoadingState";
import PositionCard from "./PositionCard";
import PositionFilters from "./PositionFilters";

import { createPollingInterval } from "@/lib/polymarket/polling";
import { DUST_THRESHOLD, POLLING_DURATION, POLLING_INTERVAL } from "@/constants/polymarket";

export default function UserPositions() {
  const { clobClient, relayClient, safeAddress } = useTrading();
  const { eoaAddress } = usePolymarketWallet();

  const {
    data: positions,
    isLoading,
    error,
  } = useUserPositions(safeAddress as string | undefined);

  const [hideDust, setHideDust] = useState(true);
  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(null);

  const { redeemPosition, isRedeeming } = useRedeemPosition();
  const { submitOrder, isSubmitting } = useClobOrder(clobClient, eoaAddress);
  const [sellingAsset, setSellingAsset] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState<
    Map<string, number>
  >(new Map());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!positions || pendingVerification.size === 0) return;

    const stillPending = new Map<string, number>();

    pendingVerification.forEach((originalSize, asset) => {
      const currentPosition = positions.find((p) => p.asset === asset);
      const currentSize = currentPosition?.size || 0;
      const sizeChanged = currentSize < originalSize;

      if (!sizeChanged) {
        stillPending.set(asset, originalSize);
      }
    });

    if (stillPending.size !== pendingVerification.size) {
      setPendingVerification(stillPending);
    }
  }, [positions, pendingVerification]);

  const handleMarketSell = async (position: PolymarketPosition) => {
    setSellingAsset(position.asset);
    try {
      await submitOrder({
        tokenId: position.asset,
        size: position.size,
        side: "SELL",
        negRisk: position.negativeRisk,
        isMarketOrder: true,
      });

      setPendingVerification((prev) =>
        new Map(prev).set(position.asset, position.size)
      );

      queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });

      createPollingInterval(
        () => {
          queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
        },
        POLLING_INTERVAL,
        POLLING_DURATION
      );

      setTimeout(() => {
        setPendingVerification((prev) => {
          const next = new Map(prev);
          next.delete(position.asset);
          return next;
        });
      }, POLLING_DURATION);
    } catch (err) {
      console.error("Failed to sell position:", err);
    } finally {
      setSellingAsset(null);
    }
  };

  const handleRedeem = async (position: PolymarketPosition) => {
    if (!relayClient) {
      return;
    }

    setRedeemingAsset(position.asset);
    try {
      await redeemPosition(relayClient, {
        conditionId: position.conditionId,
        outcomeIndex: position.outcomeIndex,
        negativeRisk: position.negativeRisk,
        size: position.size,
      });

      queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
      queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });

      createPollingInterval(
        () => {
          queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
          queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
        },
        POLLING_INTERVAL,
        POLLING_DURATION
      );
    } catch (err) {
      console.error("Failed to redeem position:", err);
    } finally {
      setRedeemingAsset(null);
    }
  };

  const activePositions = useMemo(() => {
    if (!positions) return [];

    let filtered = positions.filter((p) => p.size >= DUST_THRESHOLD);

    if (hideDust) {
      filtered = filtered.filter((p) => p.currentValue >= DUST_THRESHOLD);
    }

    return filtered;
  }, [positions, hideDust]);

  if (isLoading) {
    return <LoadingState message="Loading positions..." />;
  }

  if (error) {
    return <ErrorState error={error} title="Error loading positions" />;
  }

  if (!positions || activePositions.length === 0) {
    return (
      <EmptyState
        title="No Open Positions"
        message="You don't have any open positions."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Position Count and Dust Toggle */}
      <PositionFilters
        positionCount={activePositions.length}
        hideDust={hideDust}
        onToggleHideDust={() => setHideDust(!hideDust)}
      />

      {/* Dust Warning Banner */}
      {hideDust && positions && positions.length > activePositions.length && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-300 text-sm">
            Hiding {positions.length - activePositions.length} dust position(s)
            (value &lt; ${DUST_THRESHOLD.toFixed(2)})
          </p>
        </div>
      )}

      {/* Positions List */}
      <div className="space-y-3">
        {activePositions.map((position) => (
          <PositionCard
            key={`${position.conditionId}-${position.outcomeIndex}`}
            position={position}
            onRedeem={handleRedeem}
            onSell={handleMarketSell}
            isSelling={sellingAsset === position.asset}
            isRedeeming={redeemingAsset === position.asset}
            isPendingVerification={pendingVerification.has(position.asset)}
            isSubmitting={isSubmitting}
            canSell={!!clobClient}
            canRedeem={!!relayClient}
          />
        ))}
      </div>
    </div>
  );
}
