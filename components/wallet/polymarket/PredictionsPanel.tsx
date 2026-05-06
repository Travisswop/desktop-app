'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpFromLine,
  Plus,
  ListOrdered,
  Clock3,
  History,
  Download,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useClobOrder,
  useRedeemPosition,
  useUserPositions,
  useActiveOrders,
  usePolygonBalances,
  useNetDeposits,
  type PolymarketPosition,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import { useSportsMeta } from '@/hooks/polymarket/useSportsMeta';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  DUST_THRESHOLD,
  POLLING_DURATION,
  POLLING_INTERVAL,
  USDC_E_DECIMALS,
  CATEGORIES,
  SPORT_SUBCATEGORIES,
  type CategoryId,
  type SportSubcategoryId,
  getCategoryById,
  getSportSubcategoryById,
} from '@/constants/polymarket';
import { createPollingInterval } from '@/lib/polymarket/polling';

import HighVolumeMarkets from './Markets';
import SportsTableView from './Markets/SportsTableView';
import TradeHistory from './Orders/TradeHistory';
import PositionCard from './Positions/PositionCard';
import OrderCard from './Orders/OrderCard';
import MarketDetailModal from './Markets/MarketDetailModal';
import BrowseMarketsBento from './BrowseMarketsBento';

/**
 * Top-level views inside the predictions panel. The panel has no tab nav —
 * each chip on the bento hero drills down to one of these views, and the
 * back button returns to 'main' (or, on 'main', closes the panel).
 */
export type PredictionsPanelView =
  | 'main'
  | 'orders'
  | 'bets'
  | 'history';

// Apple-clean palette mirroring the wireframe "A · Bento hero + feed":
// warm cream canvas, white cards with hairline borders + soft shadows, a
// single dark "LIVE NOW" tile as the only inverted surface.
const CANVAS = '#ecebe6';
const HAIR = 'rgba(0,0,0,0.06)';
const POS_GREEN = '#19a974';
const NEG_RED = '#e5484d';
const LIVE_RED = '#ff5a5f';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

interface PredictionsPanelProps {
  initialView?: PredictionsPanelView;
  onClose: () => void;
  /** Open the deposit/withdraw modal pre-set to a tab */
  onOpenTransfer: (tab: 'deposit' | 'withdraw') => void;
  /**
   * When true, render in-flow inside the page layout (preserving the
   * global Header) instead of as a fixed full-screen overlay. Used by
   * the dedicated /prediction route.
   */
  embedded?: boolean;
}

/**
 * PredictionsPanel — full-screen overlay covering the predictions
 * wireframe screens 1-6 (A · feed, A2 · sports, A3/A3L · ticket via
 * MarketDetailModal, A4 · open orders, A5 · history). The panel has no
 * tab nav — drill-downs are triggered by the chips inside the bento
 * balance hero (Open orders / My bets / History), and each drill-down
 * view has its own back button that returns to 'main'.
 */
export default function PredictionsPanel({
  initialView = 'main',
  onClose,
  onOpenTransfer,
  embedded = false,
}: PredictionsPanelProps) {
  const [view, setView] = useState<PredictionsPanelView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const { eoaAddress } = usePolymarketWallet();
  const { clobClient, safeAddress } = useTrading();
  const queryClient = useQueryClient();

  const { data: positions } = useUserPositions(safeAddress);
  const { data: activeOrders = [] } = useActiveOrders(
    clobClient,
    safeAddress,
  );
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: netDeposits } = useNetDeposits(
    safeAddress as string | undefined,
  );

  const { redeemPosition } = useRedeemPosition();
  const { submitOrder, cancelOrder, isSubmitting } = useClobOrder(
    clobClient,
    eoaAddress,
  );

  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(
    null,
  );
  const [sellingAsset, setSellingAsset] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<
    string | null
  >(null);
  const [pendingVerification, setPendingVerification] = useState<
    Map<string, number>
  >(new Map());
  const [detailPosition, setDetailPosition] =
    useState<PolymarketPosition | null>(null);
  const [detailMarket, setDetailMarket] =
    useState<PolymarketMarket | null>(null);
  const [detailInitialOutcome, setDetailInitialOutcome] = useState<
    'yes' | 'no' | undefined
  >(undefined);

  // Markets drill-down — null = bento overview; otherwise the panel renders
  // a category detail view (matches wireframe screen A2).
  type MarketsDrillDown =
    | { kind: 'sports'; sub: SportSubcategoryId }
    | { kind: 'category'; id: CategoryId }
    | null;
  const [drillDown, setDrillDown] = useState<MarketsDrillDown>(null);

  const handleBentoOutcomeClick = useCallback(
    (
      market: PolymarketMarket,
      _outcome: string,
      _price: number,
      tokenId: string,
    ) => {
      const ids = (() => {
        try {
          return JSON.parse(market.clobTokenIds ?? '[]') as string[];
        } catch {
          return [] as string[];
        }
      })();
      const yesTokenId = ids[0] ?? tokenId;
      setDetailInitialOutcome(tokenId === yesTokenId ? 'yes' : 'no');
      setDetailMarket(market);
    },
    [],
  );

  // Sync pending verification against latest positions (mirrors the
  // PortfolioModal logic — once the on-chain state catches up, drop the
  // optimistic flag so the row refreshes).
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

  const activePositions = useMemo(() => {
    if (!positions) return [];
    return positions
      .filter((p) => p.size >= DUST_THRESHOLD)
      .filter(
        (p) => p.redeemable || p.currentValue >= DUST_THRESHOLD,
      );
  }, [positions]);

  const actionablePositions = useMemo(
    () => activePositions.filter((p) => !p.redeemable),
    [activePositions],
  );

  const summary = useMemo(() => {
    const inOrdersValue = activeOrders
      .filter((o) => o.side === 'BUY')
      .reduce((s, o) => {
        const remaining =
          parseFloat(o.original_size) - parseFloat(o.size_matched);
        return s + remaining * parseFloat(o.price);
      }, 0);

    const deposited = netDeposits?.totalDeposited ?? 0;
    const withdrawn = netDeposits?.totalWithdrawn ?? 0;

    const openPositionsValue = activePositions
      .filter((p) => !p.redeemable)
      .reduce((s, p) => s + p.currentValue, 0);

    const lifetimeEarned =
      usdcBalance + openPositionsValue + withdrawn - deposited;

    const totalPnl = activePositions
      .filter((p) => !p.redeemable)
      .reduce((s, p) => s + p.cashPnl, 0);

    const totalCost = activePositions
      .filter((p) => !p.redeemable)
      .reduce((s, p) => s + (p.initialValue || p.avgPrice * p.size), 0);

    const portfolioPct =
      totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      inOrdersValue,
      lifetimeEarned,
      totalPnl,
      portfolioPct,
      portfolioValue: usdcBalance + openPositionsValue,
    };
  }, [activePositions, activeOrders, netDeposits, usdcBalance]);

  const handleMarketSell = useCallback(
    async (position: PolymarketPosition) => {
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
    },
    [submitOrder, queryClient],
  );

  const handleRedeem = useCallback(
    async (position: PolymarketPosition) => {
      if (!clobClient || !safeAddress) return;
      setRedeemingAsset(position.asset);
      try {
        await redeemPosition({
          conditionId: position.conditionId,
          outcomeIndex: position.outcomeIndex,
          negativeRisk: position.negativeRisk,
          size: position.size,
          safeAddress,
        });

        const redeemValue =
          position.curPrice > 0
            ? position.currentValue
            : position.size;
        queryClient.setQueryData<bigint>(
          ['pusdBalance', safeAddress],
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
        queryClient.invalidateQueries({ queryKey: ['pusdBalance'] });
        createPollingInterval(
          () => {
            queryClient.invalidateQueries({
              queryKey: ['polymarket-positions'],
            });
            queryClient.invalidateQueries({
              queryKey: ['pusdBalance'],
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
    },
    [clobClient, safeAddress, redeemPosition, queryClient],
  );

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      setCancellingOrderId(orderId);
      try {
        await cancelOrder(orderId);
      } catch (err) {
        console.error('Failed to cancel order:', err);
      } finally {
        setCancellingOrderId(null);
      }
    },
    [cancelOrder],
  );

  // Format the balance with quieter cents (matches the wireframe).
  const [intPart, decPart] = useMemo(() => {
    const formatted = summary.portfolioValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dotIdx = formatted.lastIndexOf('.');
    return dotIdx === -1
      ? [formatted, '00']
      : [formatted.slice(0, dotIdx), formatted.slice(dotIdx + 1)];
  }, [summary.portfolioValue]);

  // The header is intentionally minimal — just the back button. The
  // wireframe places drill-down chrome (page title + filters) inside the
  // body rather than in a sticky bar. Going back from a drill-down view
  // returns to 'main'; going back from 'main' closes the panel entirely.
  const goBack = useCallback(() => {
    if (view !== 'main') {
      setView('main');
      return;
    }
    if (drillDown !== null) {
      setDrillDown(null);
      return;
    }
    onClose();
  }, [view, drillDown, onClose]);

  return (
    <>
      <div
        className={
          embedded
            ? 'relative -m-6 min-h-[calc(100vh-6rem)] flex flex-col'
            : 'fixed inset-0 z-50 flex flex-col'
        }
        style={{ background: CANVAS }}
      >
        {/* ── Body (scrollable) — header is intentionally just an
             inline back button at the top of the content. ───────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-5 py-5 space-y-5">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border text-[12.5px] font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors w-fit"
              style={{ borderColor: HAIR }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {view === 'main' && drillDown === null && (
              <>
                <BentoHero
                  intPart={intPart}
                  decPart={decPart}
                  portfolioPct={summary.portfolioPct}
                  totalPnl={summary.totalPnl}
                  openBets={activePositions.length}
                  openOrders={activeOrders.length}
                  inOrdersValue={summary.inOrdersValue}
                  topPicks={[...activePositions]
                    .filter((p) => !p.redeemable)
                    .sort((a, b) => b.currentValue - a.currentValue)
                    .slice(0, 3)}
                  onDeposit={() => onOpenTransfer('deposit')}
                  onWithdraw={() => onOpenTransfer('withdraw')}
                  onOpenOrders={() => setView('orders')}
                  onMyBets={() => setView('bets')}
                  onHistory={() => setView('history')}
                  onPickClick={(p) => setDetailPosition(p)}
                />
                <BrowseMarketsBento
                  onMarketClick={(m) => {
                    setDetailInitialOutcome('yes');
                    setDetailMarket(m);
                  }}
                  onSportsOutcomeClick={handleBentoOutcomeClick}
                  onBrowseSports={(sub) =>
                    setDrillDown({ kind: 'sports', sub })
                  }
                  onBrowseCategory={(id) =>
                    setDrillDown({ kind: 'category', id })
                  }
                />
              </>
            )}

            {view === 'main' && drillDown !== null && (
              <CategoryDetailView
                drillDown={drillDown}
                onBack={() => setDrillDown(null)}
                onChangeDrillDown={setDrillDown}
              />
            )}

            {view === 'orders' && (
              <OpenOrdersView
                orders={activeOrders}
                onCancel={handleCancelOrder}
                cancellingOrderId={cancellingOrderId}
                inOrdersValue={summary.inOrdersValue}
                onSeeHistory={() => setView('history')}
              />
            )}

            {view === 'bets' && (
              <MyBetsView
                actionable={actionablePositions}
                redeemable={activePositions.filter((p) => p.redeemable)}
                onRedeem={handleRedeem}
                onSell={handleMarketSell}
                onBuyMore={(p) => setDetailPosition(p)}
                onTitleClick={(p) => setDetailPosition(p)}
                sellingAsset={sellingAsset}
                redeemingAsset={redeemingAsset}
                pendingVerification={pendingVerification}
                isSubmitting={isSubmitting}
                canTrade={!!clobClient}
              />
            )}

            {view === 'history' && safeAddress && (
              <BetHistoryView safeAddress={safeAddress} />
            )}
            {view === 'history' && !safeAddress && (
              <BentoEmpty
                title="No history yet"
                message="Your settled bets and order fills will appear here."
              />
            )}
          </div>
        </div>
      </div>

      {detailMarket && (
        <MarketDetailModal
          isOpen={!!detailMarket}
          onClose={() => {
            setDetailMarket(null);
            setDetailInitialOutcome(undefined);
          }}
          market={detailMarket}
          balance={usdcBalance}
          yesShares={0}
          noShares={0}
          initialOutcome={detailInitialOutcome}
        />
      )}

      {detailPosition && (
        <MarketDetailModal
          isOpen={!!detailPosition}
          onClose={() => setDetailPosition(null)}
          market={positionToDetailMarket(detailPosition)}
          balance={usdcBalance}
          yesShares={
            detailPosition.outcomeIndex === 0 ? detailPosition.size : 0
          }
          noShares={
            detailPosition.outcomeIndex === 1 ? detailPosition.size : 0
          }
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Drill-down views — match wireframes A4 (Open orders), A5 (Bet history)
// and the parallel "My bets" surface for active picks.
// ────────────────────────────────────────────────────────────────────

function PageTitle({
  eyebrow,
  title,
  caption,
  action,
}: {
  eyebrow?: string;
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div
            className="text-[10.5px] font-bold tracking-[1.4px] uppercase text-gray-500"
            style={{ fontFamily: MONO }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.6px] leading-tight text-gray-900 mt-2">
          {title}
        </h1>
        {caption && (
          <div className="text-[12.5px] text-gray-500 mt-1.5 tracking-[-0.1px]">
            {caption}
          </div>
        )}
      </div>
      {action && <div className="flex gap-1.5">{action}</div>}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

// ── A4 · Open orders ────────────────────────────────────────────────

interface OpenOrdersViewProps {
  orders: ReturnType<typeof useActiveOrders>['data'];
  onCancel: (id: string) => void;
  cancellingOrderId: string | null;
  inOrdersValue: number;
  onSeeHistory: () => void;
}

function OpenOrdersView({
  orders = [],
  onCancel,
  cancellingOrderId,
  inOrdersValue,
  onSeeHistory,
}: OpenOrdersViewProps) {
  const activeCount = orders.length;
  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="Open orders"
        caption={`${activeCount} active limit${
          activeCount === 1 ? '' : 's'
        } · $${inOrdersValue.toFixed(2)} reserved`}
        action={
          <>
            <FilterChip active>Active · {activeCount}</FilterChip>
            <FilterChip onClick={onSeeHistory}>Filled</FilterChip>
            <FilterChip onClick={onSeeHistory}>Cancelled</FilterChip>
          </>
        }
      />

      {orders.length === 0 ? (
        <BentoEmpty
          title="No open orders"
          message="Limit orders you place will appear here with cancel and edit controls."
        />
      ) : (
        <div
          className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: HAIR }}
        >
          <div className="space-y-0">
            {orders.map((o, i) => (
              <div
                key={o.id}
                className={i === 0 ? '' : 'border-t'}
                style={i === 0 ? undefined : { borderColor: HAIR }}
              >
                <OrderCard
                  order={o}
                  onCancel={onCancel}
                  isCancelling={cancellingOrderId === o.id}
                />
              </div>
            ))}
          </div>
          <div
            className="px-4 py-3 flex items-center justify-between border-t"
            style={{
              borderColor: HAIR,
              background: '#fafafa',
            }}
          >
            <span className="text-[11.5px] text-gray-500">
              Filled and cancelled orders move to{' '}
              <span className="font-semibold text-gray-900">History</span>{' '}
              automatically.
            </span>
            <button
              onClick={onSeeHistory}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 transition"
              style={{ borderColor: HAIR }}
            >
              View history →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My bets — A5-style page header for active picks ────────────────

interface MyBetsViewProps {
  actionable: PolymarketPosition[];
  redeemable: PolymarketPosition[];
  onRedeem: (p: PolymarketPosition) => void;
  onSell: (p: PolymarketPosition) => void;
  onBuyMore: (p: PolymarketPosition) => void;
  onTitleClick: (p: PolymarketPosition) => void;
  sellingAsset: string | null;
  redeemingAsset: string | null;
  pendingVerification: Map<string, number>;
  isSubmitting: boolean;
  canTrade: boolean;
}

function MyBetsView({
  actionable,
  redeemable,
  onRedeem,
  onSell,
  onBuyMore,
  onTitleClick,
  sellingAsset,
  redeemingAsset,
  pendingVerification,
  isSubmitting,
  canTrade,
}: MyBetsViewProps) {
  const total = actionable.length + redeemable.length;
  const totalStaked = actionable.reduce(
    (s, p) => s + p.size * p.avgPrice,
    0,
  );
  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="My bets"
        caption={`${total} live position${
          total === 1 ? '' : 's'
        } · $${totalStaked.toFixed(2)} staked`}
        action={
          <>
            <FilterChip active>All · {total}</FilterChip>
            {redeemable.length > 0 && (
              <FilterChip>Redeemable · {redeemable.length}</FilterChip>
            )}
            <FilterChip>Live · {actionable.length}</FilterChip>
          </>
        }
      />

      {total === 0 ? (
        <BentoEmpty
          title="No active bets"
          message="When you place a market or limit order, your active picks will appear here."
        />
      ) : (
        <div className="space-y-6">
          {redeemable.length > 0 && (
            <section>
              <BentoSectionHeader
                title="Ready to redeem"
                caption={`${redeemable.length} settled position${
                  redeemable.length === 1 ? '' : 's'
                } — claim your winnings`}
              />
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                {redeemable.map((p) => (
                  <PositionCard
                    key={`${p.conditionId}-${p.outcomeIndex}`}
                    position={p}
                    onRedeem={onRedeem}
                    onSell={onSell}
                    onBuyMore={onBuyMore}
                    isSelling={sellingAsset === p.asset}
                    isRedeeming={redeemingAsset === p.asset}
                    isPendingVerification={pendingVerification.has(p.asset)}
                    isSubmitting={isSubmitting}
                    canSell={canTrade}
                    canRedeem={canTrade}
                    onTitleClick={() => onTitleClick(p)}
                  />
                ))}
              </div>
            </section>
          )}
          {actionable.length > 0 && (
            <section>
              <BentoSectionHeader
                title="Active picks"
                caption={`${actionable.length} live position${
                  actionable.length === 1 ? '' : 's'
                }`}
              />
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                {actionable.map((p) => (
                  <PositionCard
                    key={`${p.conditionId}-${p.outcomeIndex}`}
                    position={p}
                    onRedeem={onRedeem}
                    onSell={onSell}
                    onBuyMore={onBuyMore}
                    isSelling={sellingAsset === p.asset}
                    isRedeeming={redeemingAsset === p.asset}
                    isPendingVerification={pendingVerification.has(p.asset)}
                    isSubmitting={isSubmitting}
                    canSell={canTrade}
                    canRedeem={canTrade}
                    onTitleClick={() => onTitleClick(p)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── A5 · Bet history ────────────────────────────────────────────────

function BetHistoryView({ safeAddress }: { safeAddress: string }) {
  return (
    <div className="space-y-4">
      <PageTitle
        eyebrow="Predictions"
        title="Bet history"
        caption="Settled bets, fills and cancellations"
        action={
          <FilterChip>
            <Download className="w-3 h-3" />
            Export CSV
          </FilterChip>
        }
      />
      <div
        className="bg-white rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: HAIR }}
      >
        <TradeHistory walletAddress={safeAddress} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Bento helpers — match the wireframe screen 1 (A · Bento hero + feed).
// Apple-clean cream canvas with white cards; the dark "LIVE NOW" tile is
// the only inverted surface and lives inside the BentoHero.
// ────────────────────────────────────────────────────────────────────

function BentoSectionHeader({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-2.5 px-1">
      <div>
        <div className="text-[20px] font-semibold tracking-[-0.4px] text-gray-900">
          {title}
        </div>
        {caption && (
          <div className="text-[13px] text-gray-500 mt-0.5">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}

function BentoEmpty({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white border py-12 px-6 flex flex-col items-center justify-center text-center"
      style={{ borderColor: HAIR }}
    >
      <span className="text-[15px] font-semibold text-gray-900 mb-1">
        {title}
      </span>
      <span className="text-[12.5px] text-gray-500 max-w-md">
        {message}
      </span>
    </div>
  );
}

/**
 * Pill-shaped action chip used in the bento hero. Active state inverts to
 * solid black to match the "Deposit" chip in the wireframe.
 */
function HeroChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black hover:bg-gray-800'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Sparkline reflecting the sign of cumulative PnL.
 */
function HeroSpark({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const path =
    trend === 'down'
      ? 'M0,8 C20,14 35,10 50,18 C70,24 85,18 100,24 C120,30 135,26 150,32'
      : trend === 'flat'
        ? 'M0,20 C25,18 50,22 75,20 C100,18 125,22 150,20'
        : 'M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8';
  const color =
    trend === 'down' ? NEG_RED : trend === 'flat' ? '#9ca3af' : POS_GREEN;
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      className="w-full h-12 block mt-3"
    >
      <defs>
        <linearGradient
          id={`predspark-${trend}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L150,40 L0,40 Z`} fill={`url(#predspark-${trend})`} />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BentoHeroProps {
  intPart: string;
  decPart: string;
  portfolioPct: number;
  totalPnl: number;
  openBets: number;
  openOrders: number;
  inOrdersValue: number;
  topPicks: PolymarketPosition[];
  onDeposit: () => void;
  onWithdraw: () => void;
  onOpenOrders: () => void;
  onMyBets: () => void;
  onHistory: () => void;
  onPickClick: (p: PolymarketPosition) => void;
}

/**
 * 1.35fr / 1fr bento — left card is the predictions balance hero (light),
 * right card is the dark "Active picks" tile listing live positions. Maps
 * directly to wire-a-feed.jsx WireA. The chip row at the bottom of the
 * left card is the panel's only navigation: Deposit / Withdraw open the
 * transfer modal, Open orders / My bets / History drill into A4/A5 views.
 */
function BentoHero({
  intPart,
  decPart,
  portfolioPct,
  totalPnl,
  openBets,
  openOrders,
  inOrdersValue,
  topPicks,
  onDeposit,
  onWithdraw,
  onOpenOrders,
  onMyBets,
  onHistory,
  onPickClick,
}: BentoHeroProps) {
  const isPctPositive = portfolioPct >= 0;
  const trend: 'up' | 'down' | 'flat' =
    totalPnl > 0.01 ? 'up' : totalPnl < -0.01 ? 'down' : 'flat';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-3.5">
      {/* Left: balance hero */}
      <div
        className="bg-white rounded-2xl border p-6"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-[12.5px] text-gray-500 font-medium tracking-[-0.1px]">
            Predictions balance
          </span>
          {Number.isFinite(portfolioPct) && portfolioPct !== 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                isPctPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}
              style={{ fontFamily: MONO }}
            >
              <span className="text-[9px]">
                {isPctPositive ? '▲' : '▼'}
              </span>
              {isPctPositive ? '+' : ''}
              {portfolioPct.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="mt-2 leading-none tabular-nums">
          <span className="text-[44px] font-semibold tracking-[-1.8px] text-gray-900">
            ${intPart}
          </span>
          <span className="text-[30px] font-semibold tracking-[-1px] text-gray-400">
            .{decPart}
          </span>
        </div>

        <HeroSpark trend={trend} />

        {/* P/L stat strip */}
        <div
          className="grid grid-cols-3 mt-4 pt-3.5 border-t"
          style={{ borderColor: HAIR }}
        >
          <StatCell
            label="Total P/L"
            value={`${totalPnl >= 0 ? '+' : '−'}$${Math.abs(totalPnl).toFixed(2)}`}
            tone={totalPnl >= 0 ? 'pos' : totalPnl < 0 ? 'neg' : 'neutral'}
          />
          <StatCell
            label="In orders"
            value={`$${inOrdersValue.toFixed(2)}`}
            divider
          />
          <StatCell
            label="Open bets"
            value={String(openBets)}
            sub={openOrders > 0 ? `· ${openOrders} orders` : undefined}
            divider
          />
        </div>

        {/* Action chip row — matches wire-a-feed.jsx WireA bento. */}
        <div className="flex flex-wrap gap-2 mt-4">
          <HeroChip active onClick={onDeposit}>
            <Plus className="w-3 h-3" />
            Deposit
          </HeroChip>
          <HeroChip onClick={onWithdraw}>
            <ArrowUpFromLine className="w-3 h-3" />
            Withdraw
          </HeroChip>
          <HeroChip onClick={onOpenOrders}>
            <ListOrdered className="w-3 h-3" />
            Open orders · {openOrders}
          </HeroChip>
          <HeroChip onClick={onMyBets}>
            <Clock3 className="w-3 h-3" />
            My bets · {openBets}
          </HeroChip>
          <HeroChip onClick={onHistory}>
            <History className="w-3 h-3" />
            History
          </HeroChip>
        </div>
      </div>

      {/* Right: dark "Active picks" tile (the only dark surface — matches
          the LIVE NOW tile from the wireframe). */}
      <div
        className="rounded-2xl overflow-hidden text-white"
        style={{
          background: '#0a0a0c',
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[1.2px] font-bold"
            style={{ color: LIVE_RED, fontFamily: MONO }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: LIVE_RED,
                boxShadow: `0 0 0 3px rgba(255,90,95,0.18)`,
              }}
            />
            ACTIVE PICKS
          </span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: MONO,
            }}
          >
            {openBets} {openBets === 1 ? 'bet' : 'bets'}
          </span>
        </div>
        <div className="px-5 py-2">
          {topPicks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-white/60 font-medium">
                No active picks yet
              </p>
              <button
                onClick={onDeposit}
                className="mt-2 text-xs text-white/90 underline-offset-4 hover:underline"
              >
                Deposit to start trading
              </button>
            </div>
          ) : (
            topPicks.map((pick, i) => {
              const positive = pick.cashPnl >= 0;
              return (
                <button
                  key={pick.asset}
                  onClick={() => onPickClick(pick)}
                  className={`w-full text-left py-2.5 ${
                    i === 0 ? '' : 'border-t border-white/5'
                  } hover:bg-white/[0.02] transition-colors`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold tracking-tight truncate">
                        {pick.title}
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide"
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontFamily: MONO,
                        }}
                      >
                        <span className="truncate">{pick.outcome}</span>
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>
                          ·
                        </span>
                        <span className="tabular-nums">
                          {pick.size.toFixed(0)} sh
                        </span>
                      </div>
                    </div>
                    <div
                      className="text-right shrink-0"
                      style={{ fontFamily: MONO }}
                    >
                      <div className="text-[13px] font-semibold tabular-nums">
                        ${pick.currentValue.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10.5px] font-semibold tabular-nums mt-0.5 ${
                          positive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {positive ? '+' : '−'}$
                        {Math.abs(pick.cashPnl).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Category drill-down view — wireframe screen A2 (Sports market depth)
// adapted to also handle non-sports categories.
//
// Layout (matches wire-a2-sports.jsx):
//   • Breadcrumb (Browse › <label>)
//   • Page title (32px, weight 600, tracking -1.1px) + stats subtitle
//     + right-side action chips (My picks · n / Filters)
//   • Single white card with vertical hairline-divided rows:
//       1. League / category tab row — pills with mono counts;
//          active pill = solid black.
//       2. Sub-filter row (#fafafa bg) — Game lines / Futures / Live
//          + "Sort" chip on the right.
//       3. Date strip — Today / Tomorrow / Tue … tile-pills.
//       4. Markets content (HighVolumeMarkets, internal tabs hidden).
// ────────────────────────────────────────────────────────────────────

type DrillDown =
  | { kind: 'sports'; sub: SportSubcategoryId }
  | { kind: 'category'; id: CategoryId };

interface CategoryDetailViewProps {
  drillDown: DrillDown;
  onBack: () => void;
  /** Lets the league/category tab row swap the active drill-down without
   *  bouncing back to the bento. */
  onChangeDrillDown: (next: DrillDown) => void;
}

/** Five rolling weekday tiles starting at "Today". Each tile carries the
 *  inclusive [start, end) ISO range so the backend can filter events whose
 *  startDate falls inside it. */
interface DateTileSpec {
  label: string;
  sub: string;
  /** Inclusive lower bound (ISO timestamp) — start of local day. */
  fromIso: string;
  /** Exclusive upper bound (ISO timestamp) — start of next local day. */
  toIso: string;
}

function buildDateStrip(count = 5): DateTileSpec[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() + i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const weekday = start.toLocaleDateString('en-US', {
      weekday: 'short',
    });
    const sub = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday;
    return {
      label,
      sub,
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
    };
  });
}

function CategoryDetailView({
  drillDown,
  onBack,
  onChangeDrillDown,
}: CategoryDetailViewProps) {
  const isSports = drillDown.kind === 'sports';
  const label = isSports
    ? getSportSubcategoryById(drillDown.sub)?.label ?? 'Sports'
    : getCategoryById(drillDown.id)?.label ?? 'Markets';

  // Filter state — wired to the backend through SportsTableView (sports)
  // or HighVolumeMarkets (other categories).
  // 0 → Game lines / All markets   (default — no extra filter)
  // 1 → Futures / Trending         (kind=futures for sports)
  // 2 → Live / Closing soon        (live=true for sports)
  const [filterIdx, setFilterIdx] = useState(0);
  const dateStrip = useMemo(() => buildDateStrip(5), []);
  // Default to "Today" — matches the A2 wireframe's active tile.
  const [activeDateIdx, setActiveDateIdx] = useState(0);

  // Resolve the live Polymarket tag ID for the active sport sub. Falls back
  // to the static constant when the live /sports endpoint hasn't responded.
  const { data: sportsMeta } = useSportsMeta();
  const sportTagId = useMemo(() => {
    if (!isSports) return undefined;
    if (drillDown.sub === 'all') {
      return (
        sportsMeta?.tagIdBySlug.get('sports') ??
        getCategoryById('sports')?.tagId ??
        100639
      );
    }
    const liveTagId = sportsMeta?.tagIdBySlug.get(
      drillDown.sub.toLowerCase(),
    );
    if (liveTagId != null) return liveTagId;
    return (
      getSportSubcategoryById(drillDown.sub)?.tagId ??
      getCategoryById('sports')?.tagId ??
      undefined
    );
  }, [isSports, drillDown, sportsMeta]);

  // Filter chip → backend params. Default ("Game lines") sends no kind so
  // the backend's market-level team detection handles every event. We only
  // narrow on explicit Futures or Live picks.
  const liveOnly = isSports && filterIdx === 2;
  const kind: 'futures' | undefined =
    isSports && filterIdx === 1 ? 'futures' : undefined;
  const activeDate = dateStrip[activeDateIdx] ?? dateStrip[0];

  const titleText = isSports
    ? `${label === 'All Sports' ? 'Sports' : label} markets`
    : `${label} markets`;
  const subtitleText = isSports
    ? 'Moneyline · Spread · Totals · Live'
    : 'Tap any market for full odds, or any pill to bet directly.';

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Browse</span>
        <span style={{ color: '#d7d7d3' }}>›</span>
        <span className="font-semibold text-gray-900">{label}</span>
      </button>

      {/* ── Page title + action chips (matches A2) ──────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-1.1px] leading-[1.05] text-gray-900">
            {titleText}
          </h1>
          <div className="text-[13px] text-gray-500 mt-1.5">
            {subtitleText}
          </div>
        </div>
        <div className="flex gap-1.5">
          <FilterChip>My picks</FilterChip>
          <FilterChip>
            <SlidersHorizontal className="w-3 h-3" />
            Filters
          </FilterChip>
        </div>
      </div>

      {/* ── A2 card — chrome rows + markets content ────────── */}
      <div
        className="bg-white rounded-2xl border overflow-hidden"
        style={{
          borderColor: HAIR,
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        {/* Row 1 — League / category pill tabs */}
        <div
          className="flex gap-1 px-2.5 py-2 overflow-x-auto border-b"
          style={{ borderColor: HAIR }}
        >
          {isSports
            ? SPORT_SUBCATEGORIES.map((s) => (
                <LeaguePill
                  key={s.id}
                  active={drillDown.sub === s.id}
                  label={s.label === 'All Sports' ? 'All' : s.label}
                  onClick={() =>
                    onChangeDrillDown({ kind: 'sports', sub: s.id })
                  }
                />
              ))
            : CATEGORIES.filter((c) => c.id !== 'sports').map((c) => (
                <LeaguePill
                  key={c.id}
                  active={
                    drillDown.kind === 'category' &&
                    drillDown.id === c.id
                  }
                  label={c.label}
                  onClick={() =>
                    onChangeDrillDown({ kind: 'category', id: c.id })
                  }
                />
              ))}
        </div>

        {/* Row 2 — Sub-filter row (#fafafa bg) */}
        <div
          className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-b"
          style={{ borderColor: HAIR, background: '#fafafa' }}
        >
          <div className="flex gap-1.5 flex-wrap">
            <SubFilterChip
              active={filterIdx === 0}
              onClick={() => setFilterIdx(0)}
            >
              {isSports ? 'Game lines' : 'All markets'}
            </SubFilterChip>
            <SubFilterChip
              active={filterIdx === 1}
              onClick={() => setFilterIdx(1)}
            >
              {isSports ? 'Futures' : 'Trending'}
            </SubFilterChip>
            <SubFilterChip
              active={filterIdx === 2}
              onClick={() => setFilterIdx(2)}
            >
              {isSports ? 'Live' : 'Closing soon'}
            </SubFilterChip>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-gray-500 shrink-0">
            <span className="hidden sm:inline">Sort</span>
            <SubFilterChip>
              {isSports ? 'Game time' : 'Volume'}
              <ChevronDown className="w-3 h-3" />
            </SubFilterChip>
          </div>
        </div>

        {/* Row 3 — Date strip. One tile is always active; tapping a tile
              passes [from, to) to the backend so today's games surface. */}
        <div
          className="px-3.5 py-3 flex gap-1.5 overflow-x-auto border-b"
          style={{ borderColor: HAIR }}
        >
          {dateStrip.map((d, i) => (
            <DateTile
              key={i}
              label={d.label}
              sub={d.sub}
              active={i === activeDateIdx}
              onClick={() => setActiveDateIdx(i)}
            />
          ))}
        </div>

        {/* Row 4 — Sportsbook table (sports) or single-column markets list.
              Sports use the dedicated A2 SportsTableView so games render as
              MATCHUP / MONEYLINE / SPREAD / TOTAL rows; non-sports fall back
              to HighVolumeMarkets in single-column mode. */}
        {isSports ? (
          <SportsTableView
            tagId={sportTagId ?? null}
            liveOnly={liveOnly}
            kind={kind}
            dateFrom={activeDate.fromIso}
            dateTo={activeDate.toIso}
          />
        ) : (
          <div className="p-4 sm:p-5">
            <HighVolumeMarkets
              key={`cat-${drillDown.id}`}
              hideMainCategoryTabs
              hideSportSubTabs
              hideSearch
              hideSectionHeader
              singleColumn
              initialCategory={drillDown.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** League / category pill — A2 styling: solid black when active, pure
 *  white with hairline border otherwise. Mono-font count slot is left
 *  for future use once per-category counts are wired. */
function LeaguePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 h-7 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-black text-white'
          : 'bg-transparent text-gray-900 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

/** Compact sub-filter pill used inside the #fafafa row. */
function SubFilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-100'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      {children}
    </button>
  );
}

/** Date tile-pill matching A2's date strip. */
function DateTile({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl px-3.5 py-2 min-w-[88px] transition-colors border ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-900 hover:bg-gray-50'
      }`}
      style={!active ? { borderColor: HAIR } : undefined}
    >
      <div className="text-[12px] font-semibold tracking-[-0.2px] leading-tight">
        {label}
      </div>
      <div
        className={`text-[10px] font-medium tabular-nums mt-0.5 ${
          active ? 'text-white/60' : 'text-gray-500'
        }`}
        style={{ fontFamily: MONO }}
      >
        {sub}
      </div>
    </button>
  );
}

function StatCell({
  label,
  value,
  sub,
  tone = 'neutral',
  divider,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'pos' | 'neg' | 'neutral';
  divider?: boolean;
}) {
  const color =
    tone === 'pos'
      ? POS_GREEN
      : tone === 'neg'
        ? NEG_RED
        : '#0a0a0c';
  return (
    <div
      className={divider ? 'pl-3.5' : ''}
      style={divider ? { borderLeft: `1px solid ${HAIR}` } : undefined}
    >
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-gray-500 font-semibold">
        {label}
      </div>
      <div
        className="flex items-baseline gap-1 mt-1 tabular-nums"
        style={{ fontFamily: MONO }}
      >
        <span
          className="text-[16px] font-semibold tracking-[-0.3px]"
          style={{ color }}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[10.5px] text-gray-500 font-medium">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function positionToDetailMarket(
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
    outcomePrices: JSON.stringify([
      String(yesPrice),
      String(noPrice),
    ]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    negRisk: position.negativeRisk,
    endDateIso: position.endDate,
  };
}

