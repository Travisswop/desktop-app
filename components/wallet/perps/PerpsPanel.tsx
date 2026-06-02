'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowDownToLine, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type * as hl from '@nktkas/hyperliquid';
import { useUser } from '@/lib/UserContext';
import { postFeed } from '@/actions/postFeed';
import Cookies from 'js-cookie';

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
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type PerpsFeedOrder = {
  market: HLMarket;
  isBuy: boolean;
  orderType: 'market' | 'limit' | 'tpsl';
  size: string;
  entryPrice: string;
  markPrice: string;
  limitPrice?: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  result: unknown;
};

function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function extractHyperliquidOrderId(result: unknown): string | undefined {
  const statuses = (result as any)?.response?.data?.statuses;
  if (!Array.isArray(statuses)) return undefined;

  for (const status of statuses) {
    const oid =
      status?.resting?.oid ??
      status?.filled?.oid ??
      status?.error?.oid ??
      status?.oid;
    if (oid !== undefined && oid !== null) return String(oid);
  }

  return undefined;
}

function hasAcceptedHyperliquidOrder(result: unknown): boolean {
  const statuses = (result as any)?.response?.data?.statuses;
  if (!Array.isArray(statuses)) return (result as any)?.status === 'ok';
  return statuses.some((status) => status?.resting || status?.filled);
}

function sanitizeOrderResult(result: unknown) {
  try {
    return JSON.parse(JSON.stringify(result));
  } catch {
    return undefined;
  }
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
}: PerpsPanelProps) {
  const { toast } = useToast();
  const { user, accessToken: userAccessToken }: any = useUser();

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

  // Re-open AgentSetupModal once a deposit settles.
  useEffect(() => {
    if (depositStatus === 'ready' && !isInitialized)
      setShowAgentModal(true);
  }, [depositStatus, isInitialized]);

  // Show agent modal on first open if not yet initialized
  useEffect(() => {
    if (!isInitialized) setShowAgentModal(true);
  }, [isInitialized]);

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
    useCallback(() => {
      refetchPositions();
    }, [refetchPositions]),
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

  const handleMarketSelect = useCallback((market: HLMarket) => {
    setSelectedCoin(market.coin);
  }, []);

  const handleClosePosition = useCallback(
    async (position: HLPosition) => {
      setClosingCoin(position.coin);
      try {
        const isLong = parseFloat(position.szi) > 0;
        const livePrice = mids[position.coin] ?? liveMarkPrice;
        await closePosition(
          markets.find((m) => m.coin === position.coin)?.index ?? 0,
          Math.abs(parseFloat(position.szi)).toString(),
          isLong,
          livePrice,
        );
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
    ],
  );

  const postPerpsOrderToFeed = useCallback(
    (details: PerpsFeedOrder) => {
      if (!user?.primaryMicrosite || !user?._id) return;
      if (!hasAcceptedHyperliquidOrder(details.result)) return;

      const entryPrice = finiteNumber(details.entryPrice);
      const markPrice = finiteNumber(details.markPrice);
      const sizeCoins = finiteNumber(details.size);
      const leverage = tradeLeverage.value;

      if (!entryPrice || !sizeCoins) return;

      const sizeUsd = sizeCoins * entryPrice;
      const liquidationPrice = leverage
        ? details.isBuy
          ? entryPrice * (1 - 1 / leverage)
          : entryPrice * (1 + 1 / leverage)
        : undefined;

      const token = Cookies.get('access-token') || userAccessToken;
      if (!token) return;

      Promise.resolve(
        postFeed(
          {
            postType: 'perps',
            smartsiteId: user.primaryMicrosite,
            userId: user._id,
            content: {
              platform: 'hyperliquid',
              marketId: String(details.market.index),
              marketName: details.market.name,
              coin: details.market.coin,
              side: details.isBuy ? 'LONG' : 'SHORT',
              orderType: details.orderType,
              marginMode: tradeLeverage.isCross ? 'cross' : 'isolated',
              leverage,
              sizeCoins,
              sizeUsd,
              entryPrice,
              limitPrice: finiteNumber(details.limitPrice),
              markPrice,
              liquidationPrice,
              marginRequired: leverage ? sizeUsd / leverage : undefined,
              estFees: sizeUsd * 0.0007,
              takeProfitPrice: finiteNumber(details.takeProfitPrice),
              stopLossPrice: finiteNumber(details.stopLossPrice),
              orderId: extractHyperliquidOrderId(details.result),
              orderResult: sanitizeOrderResult(details.result),
            },
          },
          token,
        ),
      ).catch((err) =>
        console.error('Failed to post perps order to feed:', err),
      );
    },
    [
      tradeLeverage.isCross,
      tradeLeverage.value,
      userAccessToken,
      user?._id,
      user?.primaryMicrosite,
    ],
  );

  const handlePlaceMarketOrder = useCallback(
    async (
      assetIndex: number,
      isBuy: boolean,
      size: string,
      markPrice: string,
    ) => {
      const result = await placeMarketOrder(
        assetIndex,
        isBuy,
        size,
        markPrice,
      );
      const market = markets.find((m) => m.index === assetIndex);
      if (market) {
        postPerpsOrderToFeed({
          market,
          isBuy,
          orderType: 'market',
          size,
          entryPrice: markPrice,
          markPrice,
          result,
        });
      }
      return result;
    },
    [markets, placeMarketOrder, postPerpsOrderToFeed],
  );

  const handlePlaceLimitOrder = useCallback(
    async (params: Parameters<typeof placeLimitOrder>[0]) => {
      const result = await placeLimitOrder(params);
      const market = markets.find((m) => m.index === params.assetIndex);
      if (market) {
        postPerpsOrderToFeed({
          market,
          isBuy: params.isBuy,
          orderType: 'limit',
          size: params.size,
          entryPrice: params.price,
          limitPrice: params.price,
          markPrice: mids[market.coin] ?? market.markPrice,
          result,
        });
      }
      return result;
    },
    [markets, mids, placeLimitOrder, postPerpsOrderToFeed],
  );

  const handlePlaceTpSlOrder = useCallback(
    async (params: Parameters<typeof placeTpSlOrder>[0]) => {
      const result = await placeTpSlOrder(params);
      const market = markets.find((m) => m.index === params.assetIndex);
      if (market) {
        postPerpsOrderToFeed({
          market,
          isBuy: params.isBuy,
          orderType: 'tpsl',
          size: params.size,
          entryPrice: params.entryPrice,
          limitPrice: params.entryPrice,
          markPrice: mids[market.coin] ?? market.markPrice,
          takeProfitPrice: params.takeProfitPrice,
          stopLossPrice: params.stopLossPrice,
          result,
        });
      }
      return result;
    },
    [markets, mids, placeTpSlOrder, postPerpsOrderToFeed],
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
        className="fixed inset-0 z-40 flex flex-col"
        style={{ background: '#ecebe6' }}
      >
        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-black/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
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
        <div className="flex-1 overflow-y-auto">
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
                  isAgentReady={isInitialized}
                  isSubmitting={isSubmitting}
                  error={tradeError}
                  onLeverageChange={(value, isCross) =>
                    setTradeLeverage({ value, isCross })
                  }
                  onPlaceMarket={handlePlaceMarketOrder}
                  onPlaceLimit={handlePlaceLimitOrder}
                  onPlaceTpSl={handlePlaceTpSlOrder}
                  onUpdateLeverage={updateLeverage}
                  onClearError={clearError}
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
