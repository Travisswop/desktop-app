'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import { usePolygonBalances, useWrapUsdcE } from '@/hooks/polymarket';
import { formatPolymarketError } from '@/lib/polymarket';
import {
  ArrowUpDown,
  LayoutList,
  ShieldCheck,
  PenLine,
  Wallet,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import HighVolumeMarkets from '@/components/wallet/polymarket/Markets';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';
import TransferModal from '@/components/wallet/polymarket/TransferModal';
import PredictionsPortfolioModal from '@/components/wallet/polymarket/PredictionsPortfolioModal';

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
    formattedUsdcBalance,
    legacyUsdcBalance,
    isLoading: balanceLoading,
  } = usePolygonBalances(safeAddress);

  const { wrap, step: wrapStep, error: wrapError, reset: resetWrap } =
    useWrapUsdcE();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
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

  if (sessionError && !tradingSession) {
    return (
      <div className="mt-6 max-w-[855px] w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-red-100">
          <div className="flex flex-col items-center text-center max-w-sm mx-auto">
            <p className="text-gray-500 text-sm mb-4">
              {formatPolymarketError(sessionError)}
            </p>
            <button
              onClick={() => initializeTradingSession()}
              disabled={currentStep !== 'idle'}
              className="px-5 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {currentStep !== 'idle' ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** Injected into the left column above the search bar */
  const balanceHeader = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">Portfolio Balance</p>
        <div className="flex items-center gap-2 mt-0.5">
          {balanceLoading ? (
            <div className="w-28 h-8 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">
                ${formattedUsdcBalance}
              </span>
              <button
                onClick={() =>
                  legacyUsdcBalance > 0
                    ? setActivateFundsOpen(true)
                    : setTransferModalOpen(true)
                }
                className="relative text-gray-500 hover:text-gray-800 transition-colors"
                title="Deposit / Withdraw"
              >
                <ArrowUpDown className="w-4 h-4" />
                {legacyUsdcBalance > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => setPortfolioModalOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        title="View portfolio details"
      >
        <LayoutList className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="mt-4 mb-20 max-w-[855px] w-full mx-auto space-y-3 bg-white rounded-xl p-6 drop-shadow-lg">
      <GeoBlockedBanner />

      <HighVolumeMarkets splitLayout leftHeaderSlot={balanceHeader} />

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
      />
      <PredictionsPortfolioModal
        isOpen={portfolioModalOpen}
        onClose={() => setPortfolioModalOpen(false)}
      />
    </div>
  );
}
