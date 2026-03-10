'use client';

import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Portal from './shared/Portal';
import PositionCard from './Positions/PositionCard';
import SettledCard from './Positions/SettledCard';
import OrderCard from './Orders/OrderCard';
import OrderPlacementModal from './OrderModal';
import MarketDetailModal from './Markets/MarketDetailModal';
import {
  useClobOrder,
  useRedeemPosition,
  useUserPositions,
  useActiveOrders,
  useOrderHistory,
  usePolygonBalances,
  type PolymarketPosition,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  DUST_THRESHOLD,
  POLLING_DURATION,
  POLLING_INTERVAL,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import { createPollingInterval } from '@/lib/polymarket/polling';

type TabId = 'active' | 'orders' | 'history';

interface PredictionsPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function positionToMarket(
  position: PolymarketPosition,
): PolymarketMarket {
  const isYesPos = position.outcomeIndex === 0;
  const yesTokenId = isYesPos
    ? position.asset
    : position.oppositeAsset;
  const noTokenId = isYesPos
    ? position.oppositeAsset
    : position.asset;
  const yesOutcomeName = isYesPos
    ? position.outcome
    : position.oppositeOutcome;
  const noOutcomeName = isYesPos
    ? position.oppositeOutcome
    : position.outcome;
  const yesPrice = isYesPos
    ? position.curPrice
    : 1 - position.curPrice;
  const noPrice = isYesPos
    ? 1 - position.curPrice
    : position.curPrice;

  return {
    id: position.conditionId,
    question: position.title,
    slug: position.slug,
    active: !position.redeemable,
    closed: position.redeemable,
    icon: position.icon,
    eventSlug: position.eventSlug,
    outcomes: JSON.stringify([yesOutcomeName, noOutcomeName]),
    outcomePrices: JSON.stringify([
      String(yesPrice),
      String(noPrice),
    ]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    negRisk: position.negativeRisk,
    endDateIso: position.endDate,
  };
}

export default function PredictionsPortfolioModal({
  isOpen,
  onClose,
}: PredictionsPortfolioModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(
    null,
  );
  const [sellingAsset, setSellingAsset] = useState<string | null>(
    null,
  );
  const [cancellingOrderId, setCancellingOrderId] = useState<
    string | null
  >(null);
  const [buyMorePosition, setBuyMorePosition] =
    useState<PolymarketPosition | null>(null);
  const [detailPosition, setDetailPosition] =
    useState<PolymarketPosition | null>(null);
  const [pendingVerification, setPendingVerification] = useState<
    Map<string, number>
  >(new Map());

  const { clobClient, relayClient, safeAddress } = useTrading();
  const { eoaAddress } = usePolymarketWallet();
  const queryClient = useQueryClient();

  const { data: positions } = useUserPositions(
    safeAddress as string | undefined,
  );
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: activeOrders = [] } = useActiveOrders(
    clobClient,
    safeAddress,
  );
  const { data: orderHistory = [] } = useOrderHistory(
    clobClient,
    safeAddress,
  );

  const { redeemPosition } = useRedeemPosition();
  const { submitOrder, cancelOrder, isSubmitting } = useClobOrder(
    clobClient,
    eoaAddress,
  );

  // Sync pending verification against latest positions
  useEffect(() => {
    if (!positions || pendingVerification.size === 0) return;
    const stillPending = new Map<string, number>();
    pendingVerification.forEach((originalSize, asset) => {
      const current = positions.find((p) => p.asset === asset);
      if ((current?.size || 0) >= originalSize)
        stillPending.set(asset, originalSize);
    });
    if (stillPending.size !== pendingVerification.size)
      setPendingVerification(stillPending);
  }, [positions, pendingVerification]);

  // All positions for stats (includes settled losses for accurate P&L history)
  const activePositions = useMemo(() => {
    if (!positions) return [];
    return positions
      .filter((p) => p.size >= DUST_THRESHOLD)
      .filter(
        (p) => p.redeemable || p.currentValue >= DUST_THRESHOLD,
      );
  }, [positions]);

  // Active Picks: only live/open positions (not yet resolved)
  const actionablePositions = useMemo(
    () => activePositions.filter((p) => !p.redeemable),
    [activePositions],
  );

  // Settled history: ALL resolved positions — winners (redeemable) + losers
  // (redeemable=false, effectively worth nothing). Sourced from the full raw
  // positions array so losers that were filtered from activePositions are included.
  const settledHistory = useMemo(() => {
    if (!positions) return [];
    return positions.filter(
      (p) =>
        p.size >= DUST_THRESHOLD &&
        (p.redeemable || p.curPrice < DUST_THRESHOLD),
    );
  }, [positions]);

  const stats = useMemo(() => {
    const inOrdersValue = activeOrders
      .filter((o) => o.side === 'BUY')
      .reduce((s, o) => {
        const remaining =
          parseFloat(o.original_size) - parseFloat(o.size_matched);
        return s + remaining * parseFloat(o.price);
      }, 0);

    if (!activePositions.length)
      return { portfolioPct: 0, lifetimeEarned: 0, inOrdersValue };

    // portfolioPct reflects only open/live positions (not yet settled).
    // Settled positions should not distort the current portfolio percentage.
    const openPositions = activePositions.filter(
      (p) => !p.redeemable,
    );
    const totalInitial = openPositions.reduce(
      (s, p) => s + (p.initialValue || p.avgPrice * p.size),
      0,
    );
    const totalPnl = openPositions.reduce((s, p) => s + p.cashPnl, 0);
    const portfolioPct =
      totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;

    // Lifetime P&L: sum cashPnl + realizedPnl across all API positions.
    // cashPnl already correctly reflects losses (negative) and open gains.
    const allApiPositions = positions || [];
    const lifetimeEarned = allApiPositions.reduce(
      (s, p) => s + p.cashPnl + p.realizedPnl,
      0,
    );

    return { portfolioPct, lifetimeEarned, inOrdersValue };
  }, [positions, activePositions, activeOrders]);

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
      setPendingVerification((prev) =>
        new Map(prev).set(position.asset, position.size),
      );
      queryClient.invalidateQueries({
        queryKey: ['polymarket-positions'],
      });
      createPollingInterval(
        () =>
          queryClient.invalidateQueries({
            queryKey: ['polymarket-positions'],
          }),
        POLLING_INTERVAL,
        POLLING_DURATION,
      );
      setTimeout(() => {
        setPendingVerification((prev) => {
          const n = new Map(prev);
          n.delete(position.asset);
          return n;
        });
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

      // Optimistically add the redeemed USDC to the displayed balance immediately.
      // The on-chain redemption has already confirmed (redeemPosition awaits the tx),
      // so this reflects reality. The subsequent polling will reconcile any drift.
      const redeemValue =
        position.curPrice > 0 ? position.currentValue : position.size;
      queryClient.setQueryData<bigint>(
        ['usdcBalance', safeAddress as string],
        (prev) => {
          if (prev === undefined) return prev;
          const addedUnits = BigInt(
            Math.floor(redeemValue * 10 ** USDC_E_DECIMALS),
          );
          return prev + addedUnits;
        },
      );

      queryClient.invalidateQueries({
        queryKey: ['polymarket-positions'],
      });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
      createPollingInterval(
        () => {
          queryClient.invalidateQueries({
            queryKey: ['polymarket-positions'],
          });
          queryClient.invalidateQueries({
            queryKey: ['usdcBalance'],
          });
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

  if (!isOpen) return null;

  const isPctPositive = stats.portfolioPct >= 0;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active Picks' },
    { id: 'orders', label: 'Limit Orders' },
    { id: 'history', label: 'Order History' },
  ];

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pt-6">
            {/* Stats: Available + Lifetime Earned */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-gray-500">
                    Available
                  </span>
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isPctPositive
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {isPctPositive ? '+' : ''}
                    {stats.portfolioPct.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  $
                  {usdcBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">
                  {stats.lifetimeEarned >= 0
                    ? 'Lifetime Earned'
                    : 'Lifetime P&L'}
                </p>
                <p
                  className={`text-xl font-bold ${
                    stats.lifetimeEarned >= 0
                      ? 'text-gray-900'
                      : 'text-red-500'
                  }`}
                >
                  {stats.lifetimeEarned < 0 ? '-' : ''}$
                  {Math.abs(stats.lifetimeEarned).toLocaleString(
                    'en-US',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </p>
              </div>
            </div>

            {/* Balance In Orders */}
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-sm font-semibold text-gray-700">
                  In Orders
                </p>
              </div>
              {clobClient ? (
                <p className="text-xl font-bold text-gray-900">
                  $
                  {stats.inOrdersValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              ) : (
                <p className="text-sm text-gray-400 font-medium">
                  Start trading to view
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Picks tab */}
            {activeTab === 'active' && (
              <div className="space-y-3">
                {actionablePositions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      No open positions.
                    </p>
                  </div>
                ) : (
                  actionablePositions.map((position) => (
                    <PositionCard
                      key={`${position.conditionId}-${position.outcomeIndex}`}
                      position={position}
                      onRedeem={handleRedeem}
                      onSell={handleMarketSell}
                      onBuyMore={(p) => setBuyMorePosition(p)}
                      isSelling={sellingAsset === position.asset}
                      isRedeeming={redeemingAsset === position.asset}
                      isPendingVerification={pendingVerification.has(
                        position.asset,
                      )}
                      isSubmitting={isSubmitting}
                      canSell={!!clobClient}
                      canRedeem={!!relayClient}
                      onTitleClick={() => setDetailPosition(position)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Limit Orders tab */}
            {activeTab === 'orders' && (
              <div className="space-y-3">
                {!clobClient ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      Start trading to view your limit orders.
                    </p>
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      No open limit orders.
                    </p>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancelOrder}
                      isCancelling={cancellingOrderId === order.id}
                    />
                  ))
                )}
              </div>
            )}

            {/* Order History tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {/* Settled positions — winners and losers */}
                {settledHistory.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">
                      Settled ({settledHistory.length})
                    </p>
                    {settledHistory.map((position) => (
                      <SettledCard
                        key={`${position.conditionId}-${position.outcomeIndex}`}
                        position={position}
                        onRedeem={handleRedeem}
                        isRedeeming={
                          redeemingAsset === position.asset
                        }
                        canRedeem={!!relayClient}
                      />
                    ))}
                  </>
                )}

                {/* Trade execution history */}
                {!clobClient ? (
                  settledHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">
                        No history available.
                      </p>
                    </div>
                  )
                ) : orderHistory.length > 0 ? (
                  <>
                    {settledHistory.length > 0 && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">
                        Trades
                      </p>
                    )}
                    {orderHistory.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onCancel={() => {}}
                        isCancelling={false}
                        showCancel={false}
                      />
                    ))}
                  </>
                ) : (
                  settledHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">
                        No history available.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Done button */}
          <div className="p-4 border-t border-gray-100 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Buy More Modal */}
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

      {/* Market Detail Modal */}
      {detailPosition && (
        <MarketDetailModal
          isOpen={!!detailPosition}
          onClose={() => setDetailPosition(null)}
          market={positionToMarket(detailPosition)}
          clobClient={clobClient}
          balance={usdcBalance}
          yesShares={
            detailPosition.outcomeIndex === 0
              ? detailPosition.size
              : 0
          }
          noShares={
            detailPosition.outcomeIndex === 1
              ? detailPosition.size
              : 0
          }
        />
      )}
    </Portal>
  );
}
