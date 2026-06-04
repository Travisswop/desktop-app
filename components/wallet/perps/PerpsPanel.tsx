'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowDownToLine, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type * as hl from '@nktkas/hyperliquid';

// Hooks
import {
  useHyperliquidMarkets,
  useMarketByCoins,
} from './hooks/useHyperliquidMarkets';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useHyperliquidTrading } from './hooks/useHyperliquidTrading';
import {
  useAllMids,
  useOrderBook,
  useUserFills,
} from './hooks/useHyperliquidWebSocket';
import type { DepositCheckStatus } from './hooks/useHyperliquidBalanceCheck';

// Components
import { AgentSetupModal } from './AgentSetupModal';
import { MarketSelector } from './MarketSelector';
import { OrderBook } from './OrderBook';
import { TradingForm } from './TradingForm';
import { AssetHeader } from './AssetHeader';
import { CandleChart } from './CandleChart';
import { AccountStats } from './AccountStats';
import { FocusedPositionCard } from './FocusedPositionCard';

import type {
  HLMarket,
  HLPosition,
} from '@/services/hyperliquid/types';
import type {
  AgentActionCompletion,
  HyperliquidAgentOrderPrefill,
} from '@/lib/chat/agentActionHandoff';
import { useUser } from '@/lib/UserContext';
import {
  buildPerpsPositionKey,
  reconcilePerpsPositionFeed,
  toPerpsFeedNumber,
  upsertPerpsPositionFeed,
} from '@/lib/perps/perpsFeed';

interface PerpsPanelProps {
  agentClient: hl.ExchangeClient | null;
  masterAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  isReconnecting: boolean;
  agentError: string | null;
  initializeAgent: () => Promise<hl.ExchangeClient | null>;
  onClose: () => void;
  onOpenDeposit: () => void;
  depositStatus: DepositCheckStatus;
  onRecheckBalance: () => void;
  /** Coin to focus on when the panel opens (e.g. user clicked an ETH row in PerpsCard) */
  initialCoin?: string | null;
  /** Approved agent proposal defaults. The ticket still requires user review/confirm. */
  agentOrderPrefill?: HyperliquidAgentOrderPrefill | null;
  onAgentActionComplete?: (completion: AgentActionCompletion) => void;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

interface HyperliquidUserFill {
  coin?: string;
  px?: string;
  sz?: string;
  side?: 'B' | 'A';
  time?: number;
  startPosition?: string;
  closedPnl?: string;
  hash?: string;
  oid?: number | string;
  liquidation?: {
    liquidatedUser?: string;
    markPx?: string;
    method?: string;
  };
}

function getUserEventFills(data: unknown): HyperliquidUserFill[] {
  if (!data || typeof data !== 'object') return [];
  const fills = (data as { fills?: unknown }).fills;
  return Array.isArray(fills) ? (fills as HyperliquidUserFill[]) : [];
}

function getFillTimestamp(fill: HyperliquidUserFill) {
  const milliseconds = Number(fill.time);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : new Date().toISOString();
}

/**
 * PerpsPanel — full-screen perps trading dashboard. Bento layout:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Asset header (full width)                              │
 *   ├──────────┬─────────────────────────────┬───────────────┤
 *   │ Markets  │            Chart             │ Trade ticket │
 *   ├──────────┴───────────────┬─────────────┴───────────────┤
 *   │      Order book          │   Position   │    Account    │
 *   └──────────────────────────┴──────────────┴───────────────┘
 */
export function PerpsPanel({
  agentClient,
  masterAddress,
  isInitialized,
  isInitializing,
  isReconnecting,
  agentError,
  initializeAgent,
  onClose,
  onOpenDeposit,
  depositStatus,
  onRecheckBalance,
  initialCoin,
  agentOrderPrefill,
  onAgentActionComplete,
}: PerpsPanelProps) {
  const { toast } = useToast();
  const { accessToken, user, primaryMicrosite } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const syncedPositionSnapshotsRef = useRef<Set<string>>(new Set());
  const syncedLiquidationFillsRef = useRef<Set<string>>(new Set());
  const reconciledPositionSnapshotsRef = useRef<Set<string>>(new Set());

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(
    initialCoin ?? 'BTC',
  );
  const [closingCoin, setClosingCoin] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] =
    useState<Timeframe>('15m');
  const [tradeLeverage, setTradeLeverage] = useState({
    value: 10,
    isCross: true,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scrollContainerRef.current?.scrollTo({ top: 0 });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const requestedCoin = agentOrderPrefill?.coin || initialCoin;
    if (requestedCoin) setSelectedCoin(requestedCoin);
  }, [agentOrderPrefill?.coin, initialCoin]);

  // Re-open AgentSetupModal once a deposit settles.
  useEffect(() => {
    if (
      depositStatus === 'ready' &&
      !isInitialized &&
      !isInitializing &&
      !isReconnecting
    ) {
      setShowAgentModal(true);
    }
  }, [depositStatus, isInitialized, isInitializing, isReconnecting]);

  // Show setup only after silent rehydrate has had a chance to restore a saved agent.
  useEffect(() => {
    if (isInitialized) {
      setShowAgentModal(false);
      return;
    }
    if (!isInitializing && !isReconnecting) setShowAgentModal(true);
  }, [isInitialized, isInitializing, isReconnecting]);

  const handleOpenDepositFromAgentModal = useCallback(() => {
    setShowAgentModal(false);
    onOpenDeposit();
  }, [onOpenDeposit]);

  // Data
  const { data: markets = [], isLoading: marketsLoading } =
    useHyperliquidMarkets();
  const effectiveMaster = masterAddress;
  const { data: accountData, refetch: refetchPositions } =
    useHyperliquidPositions(effectiveMaster);

  const { mids } = useAllMids(true);
  const { book, connected: bookConnected } = useOrderBook(
    selectedCoin,
    !!selectedCoin,
  );

  useUserFills(
    effectiveMaster,
    useCallback((data: unknown) => {
      const smartsiteId = user?.primaryMicrosite || primaryMicrosite;
      const fills = getUserEventFills(data);

      if (accessToken && user?._id && smartsiteId && masterAddress) {
        fills.forEach((fill) => {
          if (!fill.liquidation || !fill.coin) return;

          const fillKey = [
            fill.hash,
            fill.oid,
            fill.coin,
            fill.time,
            fill.liquidation.markPx,
          ].join(':');
          if (syncedLiquidationFillsRef.current.has(fillKey)) return;
          syncedLiquidationFillsRef.current.add(fillKey);

          const position = accountData?.positions.find(
            (item) => item.coin === fill.coin,
          );
          const startSize = toPerpsFeedNumber(fill.startPosition);
          const isLong =
            position
              ? toPerpsFeedNumber(position.szi) > 0
              : startSize >= 0;
          const exitPrice = toPerpsFeedNumber(
            fill.liquidation.markPx || fill.px || position?.entryPx,
          );
          const entryPrice = toPerpsFeedNumber(
            position?.entryPx || fill.px || exitPrice,
          );
          const leverage = position?.leverage.value || tradeLeverage.value;
          const sizeCoins = Math.abs(
            toPerpsFeedNumber(position?.szi || fill.startPosition || fill.sz),
          );
          const realizedPnl = toPerpsFeedNumber(fill.closedPnl);
          const fallbackReturnPct =
            entryPrice > 0 && exitPrice > 0
              ? ((isLong ? exitPrice - entryPrice : entryPrice - exitPrice) /
                  entryPrice) *
                leverage *
                100
              : 0;
          const returnPct =
            position?.returnOnEquity !== undefined
              ? toPerpsFeedNumber(position.returnOnEquity) * 100
              : fallbackReturnPct;
          const timestamp = getFillTimestamp(fill);

          upsertPerpsPositionFeed({
            token: accessToken,
            userId: user._id,
            smartsiteId,
            content: {
              provider: 'hyperliquid',
              positionKey: buildPerpsPositionKey({
                userId: user._id,
                masterAddress,
                coin: fill.coin,
              }),
              coin: fill.coin,
              side: isLong ? 'long' : 'short',
              status: 'liquidated',
              event: 'liquidate',
              leverage,
              marginMode:
                position?.leverage.type === 'isolated' ? 'isolated' : 'cross',
              entryPrice,
              markPrice: exitPrice,
              exitPrice,
              liquidationPrice: exitPrice,
              collateralUsd: toPerpsFeedNumber(position?.marginUsed),
              notionalUsd:
                toPerpsFeedNumber(position?.positionValue) ||
                sizeCoins * exitPrice,
              sizeCoins,
              returnPct,
              unrealizedPnl: realizedPnl,
              realizedPnl,
              orderId:
                fill.oid === undefined || fill.oid === null
                  ? undefined
                  : String(fill.oid),
              masterAddress,
              updatedAt: timestamp,
              closedAt: timestamp,
              liquidatedAt: timestamp,
            },
          }).catch((feedError) => {
            console.warn(
              'Failed to update liquidated perps feed card:',
              feedError,
            );
          });
        });
      }

      refetchPositions();
    }, [
      accessToken,
      accountData?.positions,
      masterAddress,
      primaryMicrosite,
      refetchPositions,
      tradeLeverage.value,
      user?._id,
      user?.primaryMicrosite,
    ]),
    !!effectiveMaster,
  );

  // Trading
  const {
    placeMarketOrder,
    placeLimitOrder,
    placeTpSlOrder,
    updateLeverage,
    closePosition,
    isSubmitting,
    error: tradeError,
    clearError,
  } = useHyperliquidTrading(agentClient);

  const selectedMarket = useMarketByCoins(markets, selectedCoin);
  const liveMarkPrice = selectedCoin
    ? (mids[selectedCoin] ?? selectedMarket?.markPrice ?? '0')
    : '0';

  const existingPosition = accountData?.positions.find(
    (p) => p.coin === selectedCoin,
  );

  useEffect(() => {
    const positions = accountData?.positions || [];
    const smartsiteId = user?.primaryMicrosite || primaryMicrosite;

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
      Object.keys(mids).length > 0 ? 'mids-ready' : 'mids-pending',
      ...activePositionKeys.map((key) => key.toLowerCase()).sort(),
    ].join(':');

    if (!reconciledPositionSnapshotsRef.current.has(reconcileSnapshotKey)) {
      reconciledPositionSnapshotsRef.current.add(reconcileSnapshotKey);
      reconcilePerpsPositionFeed({
        token: accessToken,
        userId: user._id,
        smartsiteId,
        masterAddress,
        activePositionKeys,
        markPricesByCoin: mids,
      }).catch((feedError) => {
        reconciledPositionSnapshotsRef.current.delete(reconcileSnapshotKey);
        console.warn('Failed to reconcile perps feed cards:', feedError);
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
        position.positionValue,
        position.leverage.value,
        position.leverage.type,
      ].join(':');

      if (syncedPositionSnapshotsRef.current.has(snapshotKey)) return;
      syncedPositionSnapshotsRef.current.add(snapshotKey);

      const isLong = toPerpsFeedNumber(position.szi) > 0;
      const markPrice = toPerpsFeedNumber(
        mids[position.coin] || position.entryPx,
      );
      const timestamp = new Date().toISOString();

      upsertPerpsPositionFeed({
        token: accessToken,
        userId: user._id,
        smartsiteId,
        content: {
          provider: 'hyperliquid',
          positionKey,
          coin: position.coin,
          side: isLong ? 'long' : 'short',
          status: 'open',
          event: 'open',
          leverage: position.leverage.value,
          marginMode:
            position.leverage.type === 'isolated' ? 'isolated' : 'cross',
          entryPrice: toPerpsFeedNumber(position.entryPx),
          markPrice,
          liquidationPrice: position.liquidationPx
            ? toPerpsFeedNumber(position.liquidationPx)
            : null,
          collateralUsd: toPerpsFeedNumber(position.marginUsed),
          notionalUsd: toPerpsFeedNumber(position.positionValue),
          sizeCoins: Math.abs(toPerpsFeedNumber(position.szi)),
          returnPct: toPerpsFeedNumber(position.returnOnEquity) * 100,
          unrealizedPnl: toPerpsFeedNumber(position.unrealizedPnl),
          masterAddress,
          openedAt: timestamp,
          updatedAt: timestamp,
        },
      }).catch((feedError) => {
        console.warn('Failed to backfill perps feed card:', feedError);
      });
    });
  }, [
    accountData,
    accessToken,
    user?._id,
    user?.primaryMicrosite,
    primaryMicrosite,
    masterAddress,
    mids,
  ]);

  const handleMarketSelect = useCallback((market: HLMarket) => {
    setSelectedCoin(market.coin);
  }, []);

  const handleClosePosition = useCallback(
    async (position: HLPosition) => {
      setClosingCoin(position.coin);
      try {
        const isLong = parseFloat(position.szi) > 0;
        const livePrice = mids[position.coin] ?? liveMarkPrice;
        const orderResult = await closePosition(
          markets.find((m) => m.coin === position.coin)?.index ?? 0,
          Math.abs(parseFloat(position.szi)).toString(),
          isLong,
          livePrice,
        );
        const timestamp = new Date().toISOString();
        upsertPerpsPositionFeed({
          token: accessToken,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite || primaryMicrosite,
          content: {
            provider: 'hyperliquid',
            positionKey: buildPerpsPositionKey({
              userId: user?._id,
              masterAddress,
              coin: position.coin,
            }),
            coin: position.coin,
            side: isLong ? 'long' : 'short',
            status: 'closed',
            event: 'close',
            leverage: position.leverage.value,
            marginMode:
              position.leverage.type === 'isolated' ? 'isolated' : 'cross',
            entryPrice: toPerpsFeedNumber(position.entryPx),
            markPrice: toPerpsFeedNumber(livePrice || position.entryPx),
            exitPrice: toPerpsFeedNumber(livePrice || position.entryPx),
            liquidationPrice: position.liquidationPx
              ? toPerpsFeedNumber(position.liquidationPx)
              : null,
            collateralUsd: toPerpsFeedNumber(position.marginUsed),
            notionalUsd: toPerpsFeedNumber(position.positionValue),
            sizeCoins: Math.abs(toPerpsFeedNumber(position.szi)),
            returnPct: toPerpsFeedNumber(position.returnOnEquity) * 100,
            unrealizedPnl: toPerpsFeedNumber(position.unrealizedPnl),
            orderId: extractPerpsOrderId(orderResult),
            masterAddress,
            updatedAt: timestamp,
            closedAt: timestamp,
          },
        }).catch((feedError) => {
          console.warn('Failed to update perps feed card:', feedError);
        });
        toast({
          title: 'Position closed',
          description: `${isLong ? 'Long' : 'Short'} ${position.coin} position closed successfully`,
        });
        refetchPositions();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Close failed',
          description:
            err instanceof Error
              ? err.message
              : 'Failed to close position',
        });
      } finally {
        setClosingCoin(null);
      }
    },
    [
      closePosition,
      markets,
      mids,
      liveMarkPrice,
      toast,
      refetchPositions,
      accessToken,
      user?._id,
      user?.primaryMicrosite,
      primaryMicrosite,
      masterAddress,
    ],
  );

  const handleInitAgent = useCallback(async () => {
    try {
      await initializeAgent();
      setShowAgentModal(false);
      toast({
        title: 'Trading enabled',
        description:
          'Agent wallet connected. You can now place orders instantly.',
      });
    } catch {
      // surfaced in modal
    }
  }, [initializeAgent, toast]);

  useEffect(() => {
    if (tradeError) {
      toast({
        variant: 'destructive',
        title: 'Order failed',
        description: tradeError,
      });
    }
  }, [tradeError, toast]);

  const markPriceNum = parseFloat(liveMarkPrice) || 0;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex h-dvh flex-col overflow-hidden"
        style={{ background: '#ecebe6' }}
      >
        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-shrink-0 items-center justify-between bg-white px-5 py-3 border-b border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Back to wallet"
              className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-black/[0.06] text-[12.5px] font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDeposit}
              className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit
            </button>
            {isReconnecting ? (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                Reconnecting…
              </span>
            ) : isInitialized ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
            ) : (
              <button
                onClick={() => setShowAgentModal(true)}
                className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full font-medium transition-colors"
              >
                <Zap className="w-3 h-3" />
                Enable Trading
              </button>
            )}
          </div>
        </div>

        {/* ── Bento body (scrollable) ─────────────────────────── */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="max-w-[1380px] mx-auto px-5 py-5 space-y-3">
            {/* Asset header */}
            <AssetHeader
              market={selectedMarket ?? null}
              markPrice={liveMarkPrice}
            />

            {/* Row 1 — markets · chart · ticket */}
            <div className="grid gap-3 grid-cols-[220px_minmax(0,1fr)_320px]">
              <Card
                pad="p-2.5"
                className="h-[460px] self-start overflow-hidden"
              >
                <MarketSelector
                  markets={markets}
                  selectedCoin={selectedCoin}
                  onSelect={handleMarketSelect}
                  liveMids={mids}
                  isLoading={marketsLoading}
                />
              </Card>

              <Card
                pad="p-0"
                className="overflow-hidden flex flex-col h-[460px]"
              >
                <ChartToolbar
                  coin={selectedCoin ?? ''}
                  active={activeTimeframe}
                  onPick={setActiveTimeframe}
                  markPrice={markPriceNum}
                />
                <div className="relative flex-1 min-h-0">
                  <CandleChart coin={selectedCoin} interval={activeTimeframe} />
                </div>
              </Card>

              <Card pad="p-[18px]">
                <TradingForm
                  market={selectedMarket ?? null}
                  markPrice={liveMarkPrice}
                  existingPosition={existingPosition}
                  accountValue={accountData?.accountValue ?? '0'}
                  availableMargin={accountData?.withdrawable ?? '0'}
                  isAgentReady={isInitialized}
                  isSubmitting={isSubmitting}
                  error={tradeError}
                  onLeverageChange={(value, isCross) =>
                    setTradeLeverage({ value, isCross })
                  }
                  onPlaceMarket={placeMarketOrder}
                  onPlaceLimit={placeLimitOrder}
                  onPlaceTpSl={placeTpSlOrder}
                  onUpdateLeverage={updateLeverage}
                  onClearError={clearError}
                  onOpenDeposit={onOpenDeposit}
                  onAgentActionComplete={onAgentActionComplete}
                  agentOrderPrefill={agentOrderPrefill}
                  masterAddress={masterAddress}
                />
              </Card>
            </div>

            {/* Row 2 — order book · position · account */}
            <div className="grid gap-3 grid-cols-[1fr_1.2fr_0.9fr] min-h-[360px]">
              <Card pad="p-0" className="overflow-hidden">
                <OrderBook
                  book={book}
                  coin={selectedCoin}
                  connected={bookConnected}
                />
              </Card>

              <FocusedPositionCard
                position={existingPosition}
                markPrice={liveMarkPrice}
                isClosing={closingCoin === existingPosition?.coin}
                onClose={handleClosePosition}
              />

              <AccountStats
                accountValue={accountData?.accountValue ?? '0'}
                unrealizedPnl={accountData?.unrealizedPnl ?? '0'}
                marginUsed={accountData?.marginUsed ?? '0'}
                withdrawable={accountData?.withdrawable ?? '0'}
                leverage={tradeLeverage.value}
                isCross={tradeLeverage.isCross}
              />
            </div>
          </div>
        </div>
      </div>

      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onConfirm={handleInitAgent}
        isInitializing={isInitializing}
        error={agentError}
        depositStatus={depositStatus}
        onOpenDeposit={handleOpenDepositFromAgentModal}
        onRecheckBalance={onRecheckBalance}
      />
    </>
  );
}

// ─── Local layout helpers ───────────────────────────────────────────────────

function Card({
  children,
  pad = 'p-[18px]',
  className = '',
}: {
  children: React.ReactNode;
  pad?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-black/[0.06] rounded-[20px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${pad} ${className}`}
    >
      {children}
    </div>
  );
}

function ChartToolbar({
  coin,
  active,
  onPick,
  markPrice,
}: {
  coin: string;
  active: Timeframe;
  onPick: (tf: Timeframe) => void;
  markPrice: number;
}) {
  const high = markPrice * 1.005;
  const low = markPrice * 0.995;

  return (
    <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-[#f4f4f1] rounded-full">
          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-blue-500 to-blue-300 flex items-center justify-center text-white text-[10px] font-bold">
            {coin?.charAt(0) ?? '?'}
          </div>
          <span className="text-[11.5px] font-semibold tracking-tight text-gray-900">
            {coin ? `${coin}-PERP` : '—'}
          </span>
        </div>
        <span className="w-px h-4 bg-black/10" />
        <div className="flex gap-0.5 p-0.5 bg-[#f4f4f1] rounded-lg">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onPick(tf)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                active === tf
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <span className="w-px h-4 bg-black/10" />
        <Chip>＋ Indicators</Chip>
        <Chip>⌗ Drawing</Chip>
      </div>
      <div className="flex gap-3 text-[11px] text-gray-500 font-mono font-semibold tracking-wide">
        <Ohlc label="O" value={markPrice} />
        <Ohlc label="H" value={high} color="text-emerald-600" />
        <Ohlc label="L" value={low} color="text-red-500" />
        <Ohlc label="C" value={markPrice} />
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex items-center gap-1 px-2.5 h-7 bg-white border border-black/[0.06] rounded-full text-[12px] font-medium text-gray-900 hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}

function Ohlc({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span>
      {label}{' '}
      <span className={`tabular-nums ${color}`}>
        {value.toFixed(2)}
      </span>
    </span>
  );
}

function extractPerpsOrderId(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const text = JSON.stringify(value);
  const oidMatch = text.match(/"oid"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  if (oidMatch?.[1]) return oidMatch[1];
  const orderIdMatch = text.match(/"orderId"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  return orderIdMatch?.[1];
}
