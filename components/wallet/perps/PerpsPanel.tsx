'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Zap, ArrowDownToLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Hooks
import { useHyperliquidAgent } from './hooks/useHyperliquidAgent';
import { useHyperliquidMarkets, useMarketByCoins } from './hooks/useHyperliquidMarkets';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useHyperliquidTrading } from './hooks/useHyperliquidTrading';
import { useAllMids, useOrderBook, useUserFills } from './hooks/useHyperliquidWebSocket';

// Components
import { AgentSetupModal } from './AgentSetupModal';
import { MarketSelector } from './MarketSelector';
import { FundingRateBar } from './FundingRateBar';
import { OrderBook } from './OrderBook';
import { TradingForm } from './TradingForm';
import { PositionsList } from './PositionsList';

import type { HLMarket, HLPosition } from '@/services/hyperliquid/types';

interface PerpsPanelProps {
  /** The user's external wallet address = Hyperliquid master account */
  masterAddress: string | undefined;
  onClose: () => void;
  onOpenDeposit: () => void;
}

type PanelView = 'trading' | 'markets';

/**
 * PerpsPanel
 *
 * Full-screen trading panel that integrates:
 *  - Agent wallet initialization (one-time approval)
 *  - Market selector (left column)
 *  - Live order book (centre column)
 *  - Trading form (right column)
 *  - Positions list (bottom panel)
 *
 * Layout (desktop):
 *  ┌──────────┬────────────────┬──────────────┐
 *  │ Markets  │   Order Book   │ Trade Form   │
 *  ├──────────┴────────────────┴──────────────┤
 *  │          Open Positions / Orders         │
 *  └──────────────────────────────────────────┘
 */
export function PerpsPanel({ masterAddress, onClose, onOpenDeposit }: PerpsPanelProps) {
  const { toast } = useToast();

  // ── Agent setup state ──────────────────────────────────────────────
  const [showAgentModal, setShowAgentModal] = useState(false);

  const {
    agentClient,
    masterAddress: agentMaster,
    isInitialized,
    isInitializing,
    error: agentError,
    initializeAgent,
  } = useHyperliquidAgent();

  // ── Market selection ───────────────────────────────────────────────
  const [selectedCoin, setSelectedCoin] = useState<string | null>('BTC');
  const [view, setView] = useState<PanelView>('trading');
  const [closingCoin, setClosingCoin] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────
  const { data: markets = [], isLoading: marketsLoading } = useHyperliquidMarkets();

  const effectiveMaster = agentMaster ?? masterAddress ?? null;

  const {
    data: accountData,
    isLoading: positionsLoading,
    refetch: refetchPositions,
  } = useHyperliquidPositions(effectiveMaster);

  // ── WebSocket ──────────────────────────────────────────────────────
  const { mids, connected: midsConnected } = useAllMids(true);
  const { book, connected: bookConnected } = useOrderBook(selectedCoin, !!selectedCoin);

  // Listen for fills and auto-refresh positions
  useUserFills(
    effectiveMaster,
    useCallback(() => {
      refetchPositions();
    }, [refetchPositions]),
    !!effectiveMaster,
  );

  // ── Trading ────────────────────────────────────────────────────────
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

  // ── Selected market ────────────────────────────────────────────────
  const selectedMarket = useMarketByCoins(markets, selectedCoin);

  // Live mark price: prefer WS, fallback to React Query
  const liveMarkPrice = selectedCoin
    ? (mids[selectedCoin] ?? selectedMarket?.markPrice ?? '0')
    : '0';

  // Existing position for selected market
  const existingPosition = accountData?.positions.find(
    (p) => p.coin === selectedCoin,
  );

  // ── Handle market select ───────────────────────────────────────────
  const handleMarketSelect = useCallback((market: HLMarket) => {
    setSelectedCoin(market.coin);
    setView('trading');
  }, []);

  // ── Handle close position ──────────────────────────────────────────
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
          description: err instanceof Error ? err.message : 'Failed to close position',
        });
      } finally {
        setClosingCoin(null);
      }
    },
    [closePosition, markets, mids, liveMarkPrice, toast, refetchPositions],
  );

  // ── Agent init ─────────────────────────────────────────────────────
  const handleInitAgent = useCallback(async () => {
    try {
      await initializeAgent();
      setShowAgentModal(false);
      toast({
        title: 'Trading enabled',
        description: 'Agent wallet connected. You can now place orders instantly.',
      });
    } catch (err) {
      // error shown in modal
    }
  }, [initializeAgent, toast]);

  // Show agent modal if no external wallet address passed
  useEffect(() => {
    if (!masterAddress && !isInitialized) {
      setShowAgentModal(true);
    }
  }, [masterAddress, isInitialized]);

  // ── Notify on trade error ──────────────────────────────────────────
  useEffect(() => {
    if (tradeError) {
      toast({ variant: 'destructive', title: 'Order failed', description: tradeError });
    }
  }, [tradeError, toast]);

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-40 bg-white flex flex-col">
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-800">Perps</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Hyperliquid
              </span>
            </div>
          </div>

          {/* Top-bar actions */}
          <div className="flex items-center gap-2">
            {/* Deposit button — always visible */}
            <button
              onClick={onOpenDeposit}
              className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit
            </button>

            {/* Agent status */}
            {isInitialized ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Agent Active
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

        {/* ── Main Layout ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex">

          {/* ── Left: Market Selector ─────────────────────────────── */}
          <div className="w-52 border-r border-gray-100 flex-shrink-0 overflow-hidden">
            <MarketSelector
              markets={markets}
              selectedCoin={selectedCoin}
              onSelect={handleMarketSelect}
              liveMids={mids}
              isLoading={marketsLoading}
            />
          </div>

          {/* ── Centre: Order Book + Funding Rate ─────────────────── */}
          <div className="flex-1 border-r border-gray-100 flex flex-col overflow-hidden min-w-0">
            {/* Funding rate + mark price bar */}
            {selectedMarket && (
              <FundingRateBar
                coin={selectedMarket.coin}
                fundingRate={selectedMarket.fundingRate}
                markPrice={liveMarkPrice}
                openInterest={selectedMarket.openInterest}
              />
            )}
            {/* Order Book */}
            <div className="flex-1 overflow-hidden">
              <OrderBook
                book={book}
                coin={selectedCoin}
                connected={bookConnected}
              />
            </div>
          </div>

          {/* ── Right: Trading Form ───────────────────────────────── */}
          <div className="w-72 flex-shrink-0 overflow-hidden border-l border-gray-100">
            <TradingForm
              market={selectedMarket ?? null}
              markPrice={liveMarkPrice}
              existingPosition={existingPosition}
              accountValue={accountData?.accountValue ?? '0'}
              isAgentReady={isInitialized}
              isSubmitting={isSubmitting}
              error={tradeError}
              onPlaceMarket={placeMarketOrder}
              onPlaceLimit={placeLimitOrder}
              onPlaceTpSl={placeTpSlOrder}
              onUpdateLeverage={updateLeverage}
              onClearError={clearError}
            />
          </div>
        </div>

        {/* ── Bottom: Positions ────────────────────────────────────── */}
        <div className="h-64 border-t border-gray-200 flex-shrink-0 overflow-hidden">
          <PositionsList
            positions={accountData?.positions ?? []}
            openOrders={accountData?.openOrders ?? []}
            accountValue={accountData?.accountValue ?? '0'}
            unrealizedPnl={accountData?.unrealizedPnl ?? '0'}
            withdrawable={accountData?.withdrawable ?? '0'}
            marginUsed={accountData?.marginUsed ?? '0'}
            liveMids={mids}
            isLoading={positionsLoading}
            closingCoin={closingCoin}
            onClosePosition={handleClosePosition}
            onRefresh={refetchPositions}
          />
        </div>
      </div>

      {/* Agent Setup Modal */}
      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onConfirm={handleInitAgent}
        masterAddress={masterAddress ?? null}
        isInitializing={isInitializing}
        error={agentError}
      />
    </>
  );
}
