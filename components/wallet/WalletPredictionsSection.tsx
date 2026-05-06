'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import {
  usePolygonBalances,
  useUserPositions,
  useActiveOrders,
  useWrapUsdcE,
} from '@/hooks/polymarket';
import { formatPolymarketError } from '@/lib/polymarket';
import {
  LayoutList,
  ShieldCheck,
  PenLine,
  Wallet,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  ArrowDownToLine,
  ListOrdered,
  Clock3,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import HighVolumeMarkets from '@/components/wallet/polymarket/Markets';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';
import TransferModal from '@/components/wallet/polymarket/TransferModal';
import PredictionsPortfolioModal from '@/components/wallet/polymarket/PredictionsPortfolioModal';

type PortfolioTab = 'active' | 'orders' | 'history';
type TransferTab = 'deposit' | 'withdraw';

function EnableTradingModal({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-3 pb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Enable Polymarket Trading
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            A one-time setup is needed to activate your trading
            account. Your wallet will ask you to sign — no funds are
            moved.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <PenLine className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Sign to create trading credentials
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  A free signature — no gas fee, no transaction
                  on-chain
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Set up your Smart Wallet
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Deploys a Safe wallet to manage your positions
                  securely
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Approve USDC for trading
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allows the exchange to settle your trades
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors mb-2"
          >
            Sign &amp; Enable Trading
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivateFundsModal({
  balance,
  onConfirm,
  onDismiss,
  onRetry,
  wrapStep,
  activationError,
}: {
  balance: string;
  onConfirm: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  wrapStep: 'idle' | 'approving' | 'wrapping' | 'done' | 'error';
  activationError: string | null;
}) {
  const isProcessing =
    wrapStep === 'approving' || wrapStep === 'wrapping';

  const statusLabel =
    wrapStep === 'approving'
      ? 'Approving USDC.e...'
      : wrapStep === 'wrapping'
        ? 'Wrapping to pUSD...'
        : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-5 pt-5 pb-5">
          {wrapStep === 'done' ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Funds Activated
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Your funds are available to trade!
              </p>
              <button
                onClick={onDismiss}
                className="w-full py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                Start Trading
              </button>
            </>
          ) : wrapStep === 'error' ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Activation Failed
              </h2>
              <p className="text-sm text-red-500 mb-5">
                {formatPolymarketError(activationError || 'Something went wrong.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  className="flex-1 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Activate Funds
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Activate your funds (${balance}) to begin trading.
              </p>
              {isProcessing && statusLabel && (
                <p className="text-xs text-gray-400 mb-3 text-center">
                  {statusLabel}
                </p>
              )}
              <button
                onClick={onConfirm}
                disabled={isProcessing}
                className="w-full py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isProcessing ? statusLabel : 'Continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Decorative sparkline — reflects sign of current PnL. */
function Sparkline({
  trend,
  className = '',
}: {
  trend: 'up' | 'down' | 'flat';
  className?: string;
}) {
  const path =
    trend === 'down'
      ? 'M0,8 C20,14 35,10 50,18 C70,24 85,18 100,24 C120,30 135,26 150,32'
      : trend === 'flat'
        ? 'M0,20 C25,18 50,22 75,20 C100,18 125,22 150,20'
        : 'M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8';
  const color =
    trend === 'down' ? '#e5484d' : trend === 'flat' ? '#9ca3af' : '#19a974';
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      className={`w-full h-12 block ${className}`}
    >
      <defs>
        <linearGradient
          id={`predictions-spark-${trend}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L150,40 L0,40 Z`}
        fill={`url(#predictions-spark-${trend})`}
      />
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

function DeltaTag({ pct }: { pct: number }) {
  if (!Number.isFinite(pct) || pct === 0) return null;
  const positive = pct > 0;
  const Arrow = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
        positive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
    >
      <Arrow className="w-3 h-3" strokeWidth={2.5} />
      {positive ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  );
}

function ChipButton({
  active,
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
        active
          ? 'bg-black text-white border-black hover:bg-gray-800'
          : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export default function WalletPredictionsSection() {
  const { authenticated, isReady, isInitializing, hasWallet } =
    usePolymarketWallet();
  const { accessToken, loading: userLoading } = useUser();
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    safeAddress,
  } = useTrading();

  const {
    usdcBalance,
    legacyUsdcBalance,
    isLoading: balanceLoading,
  } = usePolygonBalances(safeAddress);

  const { data: positions } = useUserPositions(safeAddress);
  const { data: activeOrders = [] } = useActiveOrders(null, safeAddress);

  const { wrap, step: wrapStep, error: wrapError, reset: resetWrap } =
    useWrapUsdcE();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('deposit');
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioTab, setPortfolioTab] =
    useState<PortfolioTab>('active');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [activateFundsOpen, setActivateFundsOpen] = useState(false);

  // Show the consent modal once all pre-conditions are met, instead of
  // silently firing initializeTradingSession and surprising the user with
  // an unexplained wallet signing prompt.
  useEffect(() => {
    if (
      authenticated &&
      isReady &&
      !userLoading &&
      !!accessToken &&
      !!safeAddress &&
      !tradingSession &&
      !isTradingSessionComplete &&
      currentStep === 'idle' &&
      !sessionError &&
      !consentDismissed &&
      !showConsentModal
    ) {
      setShowConsentModal(true);
    }
  }, [
    authenticated,
    isReady,
    userLoading,
    accessToken,
    safeAddress,
    tradingSession,
    isTradingSessionComplete,
    currentStep,
    sessionError,
    consentDismissed,
    showConsentModal,
  ]);

  const handleConsentConfirm = useCallback(() => {
    setShowConsentModal(false);
    initializeTradingSession();
  }, [initializeTradingSession]);

  const handleConsentDismiss = useCallback(() => {
    setShowConsentModal(false);
    setConsentDismissed(true);
  }, []);

  const openTransfer = useCallback((tab: TransferTab) => {
    setTransferTab(tab);
    setTransferModalOpen(true);
  }, []);

  const openPortfolio = useCallback((tab: PortfolioTab) => {
    setPortfolioTab(tab);
    setPortfolioModalOpen(true);
  }, []);

  // ── Derived stats for the balance hero ──────────────────────────────────
  const activePositions = useMemo(
    () => (positions ?? []).filter((p) => p.size > 0 && !p.redeemable),
    [positions],
  );

  const openPositionsValue = useMemo(
    () => activePositions.reduce((s, p) => s + p.currentValue, 0),
    [activePositions],
  );

  const totalPnl = useMemo(
    () => activePositions.reduce((s, p) => s + p.cashPnl, 0),
    [activePositions],
  );

  const totalCost = useMemo(
    () =>
      activePositions.reduce(
        (s, p) => s + p.size * p.avgPrice,
        0,
      ),
    [activePositions],
  );

  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const portfolioValue = usdcBalance + openPositionsValue;
  const trend: 'up' | 'down' | 'flat' =
    totalPnl > 0.01 ? 'up' : totalPnl < -0.01 ? 'down' : 'flat';

  // Format the big balance with a quieter decimal portion (matches the
  // wireframe: $128,304.<span>59</span>).
  const [intPart, decPart] = useMemo(() => {
    const formatted = portfolioValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dotIdx = formatted.lastIndexOf('.');
    return dotIdx === -1
      ? [formatted, '00']
      : [formatted.slice(0, dotIdx), formatted.slice(dotIdx + 1)];
  }, [portfolioValue]);

  const openOrderCount = activeOrders.length;
  const openBetCount = activePositions.length;
  const stakedTotal = useMemo(
    () =>
      activePositions.reduce((s, p) => s + p.size * p.avgPrice, 0),
    [activePositions],
  );

  // Top positions for the dark "Active picks" tile (right column of bento)
  const topPicks = useMemo(
    () =>
      [...activePositions]
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 3),
    [activePositions],
  );

  if (!authenticated) return null;

  if (isInitializing) {
    return (
      <div className="mt-6 max-w-[855px] w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">
              Loading markets...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="mt-6 max-w-[855px] w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-center text-gray-500 text-sm">
            Connect an EVM wallet to access Predictions.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="mt-6 max-w-[855px] w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-center text-gray-500 text-sm">
            Wallet found but could not initialize. Please refresh.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Bento hero — left card is the predictions balance, right card is the
   * dark "Active picks" tile listing the user's top open positions.
   * Maps to wireframe screen 1 (A · Bento hero + feed).
   */
  const balanceHero = (
    <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-3">
      {/* Left: balance hero */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              Predictions balance
            </span>
            <button
              onClick={() => openPortfolio('active')}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
              title="View portfolio details"
              aria-label="View portfolio"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>
          <DeltaTag pct={totalPnlPct} />
        </div>

        <div className="mt-2 leading-none tabular-nums">
          {balanceLoading ? (
            <div className="w-48 h-10 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              <span className="text-[40px] font-semibold tracking-tight text-gray-900">
                ${intPart}
              </span>
              <span className="text-[28px] font-semibold tracking-tight text-gray-400">
                .{decPart}
              </span>
            </>
          )}
        </div>

        <Sparkline trend={trend} className="mt-4" />

        {/* P/L + open bets summary strip */}
        <div className="grid grid-cols-3 mt-4 pt-3 border-t border-gray-100">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Total P/L
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-[15px] font-mono font-semibold tabular-nums ${
                  totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {totalPnl >= 0 ? '+' : '−'}$
                {Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="border-l border-gray-100 pl-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Open bets
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[15px] font-mono font-semibold tabular-nums text-gray-900">
                {openBetCount}
              </span>
              {stakedTotal > 0 && (
                <span className="text-[10px] text-gray-500 font-medium">
                  · ${stakedTotal.toFixed(0)}
                </span>
              )}
            </div>
          </div>
          <div className="border-l border-gray-100 pl-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Open orders
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[15px] font-mono font-semibold tabular-nums text-gray-900">
                {openOrderCount}
              </span>
            </div>
          </div>
        </div>

        {/* Action chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <ChipButton
            active
            icon={Plus}
            onClick={() =>
              legacyUsdcBalance > 0
                ? setActivateFundsOpen(true)
                : openTransfer('deposit')
            }
          >
            Deposit
            {legacyUsdcBalance > 0 && (
              <span className="ml-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </ChipButton>
          <ChipButton
            icon={ArrowDownToLine}
            onClick={() => openTransfer('withdraw')}
          >
            Withdraw
          </ChipButton>
          <ChipButton
            icon={ListOrdered}
            onClick={() => openPortfolio('orders')}
          >
            Open orders · {openOrderCount}
          </ChipButton>
          <ChipButton
            icon={Clock3}
            onClick={() => openPortfolio('active')}
          >
            My bets · {openBetCount}
          </ChipButton>
          <ChipButton
            icon={History}
            onClick={() => openPortfolio('history')}
          >
            History
          </ChipButton>
        </div>
      </div>

      {/* Right: dark Active picks tile */}
      <div className="bg-[#0a0a0c] text-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-wider font-bold text-[#ff5a5f] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] shadow-[0_0_0_3px_rgba(255,90,95,0.18)]" />
            ACTIVE PICKS
          </span>
          <span className="text-[11px] text-white/50 font-mono font-semibold tabular-nums">
            {openBetCount} {openBetCount === 1 ? 'bet' : 'bets'}
          </span>
        </div>
        <div className="px-5 py-2">
          {topPicks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-white/60 font-medium">
                No active picks yet
              </p>
              <button
                onClick={() => openTransfer('deposit')}
                className="mt-2 text-xs text-white/90 underline-offset-4 hover:underline"
              >
                Deposit to start trading
              </button>
            </div>
          ) : (
            topPicks.map((pick, i) => {
              const pnlPositive = pick.cashPnl >= 0;
              return (
                <button
                  key={pick.asset}
                  onClick={() => openPortfolio('active')}
                  className={`w-full text-left py-2.5 ${
                    i === 0 ? '' : 'border-t border-white/5'
                  } hover:bg-white/[0.02] transition-colors`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold tracking-tight truncate">
                        {pick.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-white/55 font-mono font-semibold uppercase tracking-wide">
                        <span className="truncate">
                          {pick.outcome}
                        </span>
                        <span className="text-white/25">·</span>
                        <span className="tabular-nums">
                          {pick.size.toFixed(0)} sh
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-mono font-semibold tabular-nums">
                        ${pick.currentValue.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10.5px] font-mono font-semibold tabular-nums mt-0.5 ${
                          pnlPositive
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {pnlPositive ? '+' : '−'}$
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

  return (
    <div className="mt-4 mb-20 max-w-[855px] w-full mx-auto space-y-4 bg-white rounded-xl p-6 drop-shadow-lg">
      <GeoBlockedBanner />

      {sessionError && !tradingSession && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Trading is not enabled yet
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {formatPolymarketError(sessionError)}
              </p>
            </div>
            <button
              onClick={() => initializeTradingSession()}
              disabled={currentStep !== 'idle'}
              className="shrink-0 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep !== 'idle' ? 'Enabling...' : 'Enable trading'}
            </button>
          </div>
        </div>
      )}

      {balanceHero}

      <HighVolumeMarkets splitLayout />

      {showConsentModal && (
        <EnableTradingModal
          onConfirm={handleConsentConfirm}
          onDismiss={handleConsentDismiss}
        />
      )}

      {activateFundsOpen && (
        <ActivateFundsModal
          balance={legacyUsdcBalance.toFixed(2)}
          wrapStep={wrapStep}
          activationError={wrapError}
          onConfirm={() => wrap(legacyUsdcBalance)}
          onDismiss={() => {
            setActivateFundsOpen(false);
            resetWrap();
          }}
          onRetry={() => {
            resetWrap();
          }}
        />
      )}

      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        defaultTab={transferTab}
      />
      <PredictionsPortfolioModal
        isOpen={portfolioModalOpen}
        onClose={() => setPortfolioModalOpen(false)}
        initialTab={portfolioTab}
      />
    </div>
  );
}
