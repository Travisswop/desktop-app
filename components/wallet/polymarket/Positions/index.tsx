'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useClobOrder,
  useRedeemPosition,
  useUserPositions,
  useActiveOrders,
  usePolygonBalances,
  PolymarketPosition,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useTrading } from '@/providers/polymarket';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import PositionCard from './PositionCard';
import OrderCard from '../Orders/OrderCard';
import OrderPlacementModal from '../OrderModal';
import MarketDetailModal from '../Markets/MarketDetailModal';

import { createPollingInterval } from '@/lib/polymarket/polling';
import {
  DUST_THRESHOLD,
  POLLING_DURATION,
  POLLING_INTERVAL,
} from '@/constants/polymarket';

/** Build a synthetic PolymarketMarket from a position so the detail modal can render it. */
function positionToMarket(position: PolymarketPosition): PolymarketMarket {
  // outcomeIndex 0 = user holds the "Yes" / first outcome
  const isYesPos = position.outcomeIndex === 0;

  const yesTokenId = isYesPos ? position.asset : position.oppositeAsset;
  const noTokenId = isYesPos ? position.oppositeAsset : position.asset;
  const yesOutcomeName = isYesPos ? position.outcome : position.oppositeOutcome;
  const noOutcomeName = isYesPos ? position.oppositeOutcome : position.outcome;
  const yesPrice = isYesPos ? position.curPrice : 1 - position.curPrice;
  const noPrice = isYesPos ? 1 - position.curPrice : position.curPrice;

  return {
    id: position.conditionId,
    question: position.title,
    slug: position.slug,
    active: !position.redeemable,
    closed: position.redeemable,
    icon: position.icon,
    eventSlug: position.eventSlug,
    outcomes: JSON.stringify([yesOutcomeName, noOutcomeName]),
    outcomePrices: JSON.stringify([String(yesPrice), String(noPrice)]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    negRisk: position.negativeRisk,
    endDateIso: position.endDate,
  };
}

export default function UserPositions() {
  const { clobClient, relayClient, safeAddress } = useTrading();
  const { eoaAddress } = usePolymarketWallet();

  const {
    data: positions,
    isLoading,
    error,
  } = useUserPositions(safeAddress as string | undefined);

  const { usdcBalance } = usePolygonBalances(safeAddress);

  // Limit orders are placed from the Safe (proxy) wallet, so maker_address matches
  // safeAddress — not eoaAddress.  Using eoaAddress here would always return [].
  const { data: activeOrders = [] } = useActiveOrders(clobClient, safeAddress);

  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(null);
  const [sellingAsset, setSellingAsset] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [buyMorePosition, setBuyMorePosition] = useState<PolymarketPosition | null>(null);
  const [detailPosition, setDetailPosition] = useState<PolymarketPosition | null>(null);

  const { redeemPosition, isRedeeming } = useRedeemPosition();
  const { submitOrder, cancelOrder, isSubmitting } = useClobOrder(clobClient, eoaAddress);

  const [pendingVerification, setPendingVerification] = useState<Map<string, number>>(new Map());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!positions || pendingVerification.size === 0) return;
    const stillPending = new Map<string, number>();
    pendingVerification.forEach((originalSize, asset) => {
      const current = positions.find((p) => p.asset === asset);
      if ((current?.size || 0) >= originalSize) stillPending.set(asset, originalSize);
    });
    if (stillPending.size !== pendingVerification.size) setPendingVerification(stillPending);
  }, [positions, pendingVerification]);

  const handleMarketSell = async (position: PolymarketPosition) => {
    setSellingAsset(position.asset);
    try {
      await submitOrder({
        tokenId: position.asset,
        size: position.size,
        side: 'SELL',
        negRisk: position.negativeRisk,
        isMarketOrder: true,
      });
      setPendingVerification((prev) => new Map(prev).set(position.asset, position.size));
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      createPollingInterval(
        () => queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] }),
        POLLING_INTERVAL,
        POLLING_DURATION,
      );
      setTimeout(() => {
        setPendingVerification((prev) => { const n = new Map(prev); n.delete(position.asset); return n; });
      }, POLLING_DURATION);
    } catch (err) {
      console.error('Failed to sell position:', err);
    } finally {
      setSellingAsset(null);
    }
  };

  const handleRedeem = async (position: PolymarketPosition) => {
    if (!relayClient) return;
    setRedeemingAsset(position.asset);
    try {
      await redeemPosition(relayClient, {
        conditionId: position.conditionId,
        outcomeIndex: position.outcomeIndex,
        negativeRisk: position.negativeRisk,
        size: position.size,
      });
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
      createPollingInterval(
        () => {
          queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
          queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
        },
        POLLING_INTERVAL,
        POLLING_DURATION,
      );
    } catch (err) {
      console.error('Failed to redeem position:', err);
    } finally {
      setRedeemingAsset(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await cancelOrder(orderId);
    } catch (err) {
      console.error('Failed to cancel order:', err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const activePositions = useMemo(() => {
    if (!positions) return [];
    return positions
      .filter((p) => p.size >= DUST_THRESHOLD)
      .filter((p) => p.redeemable || p.currentValue >= DUST_THRESHOLD);
  }, [positions]);

  // ── Market title lookup (asset_id → market question) ────────────────────
  // Used to enrich O/U and spread outcome labels in OrderCard
  const titleByAsset = useMemo(() => {
    const map = new Map<string, string>();
    (positions || []).forEach((p) => {
      if (p.asset) map.set(p.asset, p.title);
      if (p.oppositeAsset) map.set(p.oppositeAsset, p.title);
    });
    return map;
  }, [positions]);

  // ── Portfolio stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!activePositions.length) return { portfolioPct: 0, lifetimeEarned: 0, inOrdersValue: 0 };

    const totalInitial = activePositions.reduce((s, p) => s + (p.initialValue || p.avgPrice * p.size), 0);
    const totalPnl = activePositions.reduce((s, p) => s + p.cashPnl, 0);
    const portfolioPct = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;
    const lifetimeEarned = activePositions.reduce((s, p) => s + p.cashPnl + p.realizedPnl, 0);

    const inOrdersValue = activeOrders
      .filter((o) => o.side === 'BUY')
      .reduce((s, o) => {
        const remaining = parseFloat(o.original_size) - parseFloat(o.size_matched);
        return s + remaining * parseFloat(o.price);
      }, 0);

    return { portfolioPct, lifetimeEarned, inOrdersValue };
  }, [activePositions, activeOrders]);

  if (isLoading) return <LoadingState message="Loading positions..." />;
  if (error) return <ErrorState error={error} title="Error loading positions" />;

  if (!positions || activePositions.length === 0) {
    // If the user has pending limit orders but no filled positions, surface that
    // context rather than showing a generic "no positions" message.
    if (activeOrders.length > 0) {
      const inOrdersValue = activeOrders
        .filter((o) => o.side === 'BUY')
        .reduce((s, o) => {
          const remaining = parseFloat(o.original_size) - parseFloat(o.size_matched);
          return s + remaining * parseFloat(o.price);
        }, 0);

      return (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {activeOrders.length} limit order{activeOrders.length > 1 ? 's' : ''} pending
            </p>
            <p className="text-xs text-amber-600">
              ${inOrdersValue.toFixed(2)} waiting to be filled. Positions will appear here once your orders match.
            </p>
          </div>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={handleCancelOrder}
                isCancelling={cancellingOrderId === order.id}
                marketTitle={titleByAsset.get(order.asset_id)}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        title="No Open Positions"
        message="You don't have any open positions."
      />
    );
  }

  const isPctPositive = stats.portfolioPct >= 0;

  return (
    <div className="space-y-4">
      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Available */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs text-gray-500">Available</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isPctPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isPctPositive ? '+' : ''}{stats.portfolioPct.toFixed(2)}%
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            ${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Lifetime Earned */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Lifetime Earned</p>
          <p className="text-xl font-bold text-gray-900">
            ${stats.lifetimeEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ── Pending Limit Orders ───────────────────────────────────────── */}
      {activeOrders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Limit Orders
            </h3>
            <span className="text-xs text-gray-400">
              ${stats.inOrdersValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending
            </span>
          </div>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={handleCancelOrder}
                isCancelling={cancellingOrderId === order.id}
                marketTitle={titleByAsset.get(order.asset_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Your Picks ─────────────────────────────────────────────────── */}
      <h3 className="text-lg font-bold text-gray-900 pt-1">Your Picks</h3>

      <div className="space-y-3">
        {activePositions.map((position) => (
          <PositionCard
            key={`${position.conditionId}-${position.outcomeIndex}`}
            position={position}
            onRedeem={handleRedeem}
            onSell={handleMarketSell}
            onBuyMore={(p) => setBuyMorePosition(p)}
            isSelling={sellingAsset === position.asset}
            isRedeeming={redeemingAsset === position.asset}
            isPendingVerification={pendingVerification.has(position.asset)}
            isSubmitting={isSubmitting}
            canSell={!!clobClient}
            canRedeem={!!relayClient}
            onTitleClick={() => setDetailPosition(position)}
          />
        ))}
      </div>

      {/* ── Buy More Modal ─────────────────────────────────────────────── */}
      {buyMorePosition && (
        <OrderPlacementModal
          isOpen={!!buyMorePosition}
          onClose={() => setBuyMorePosition(null)}
          marketTitle={buyMorePosition.title}
          outcome={buyMorePosition.outcome}
          currentPrice={buyMorePosition.curPrice}
          tokenId={buyMorePosition.asset}
          negRisk={buyMorePosition.negativeRisk}
          clobClient={clobClient}
          balance={usdcBalance}
        />
      )}

      {/* ── Market Detail Modal (opened via title click) ──────────────── */}
      {detailPosition && (
        <MarketDetailModal
          isOpen={!!detailPosition}
          onClose={() => setDetailPosition(null)}
          market={positionToMarket(detailPosition)}
          clobClient={clobClient}
          balance={usdcBalance}
          yesShares={detailPosition.outcomeIndex === 0 ? detailPosition.size : 0}
          noShares={detailPosition.outcomeIndex === 1 ? detailPosition.size : 0}
        />
      )}
    </div>
  );
}
