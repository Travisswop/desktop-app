'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import { formatPolymarketError } from '@/lib/polymarket';
import {
  ShieldCheck,
  PenLine,
  Wallet,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';
import TransferModal from '@/components/wallet/polymarket/TransferModal';
import PredictionsCard from '@/components/wallet/polymarket/PredictionsCard';
import { type PredictionsPanelView } from '@/components/wallet/polymarket/PredictionsPanel';

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

        <div className="px-5 pt-3 pb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Enable Polymarket Trading
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            A one-time setup is needed to activate your trading
            account. Your wallet will ask you to sign — no funds are
            moved.
          </p>

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
                  Set up your Deposit Wallet
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creates your Polymarket deposit wallet for trading
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

export default function WalletPredictionsSection() {
  const router = useRouter();
  const {
    authenticated,
    isReady,
    isInitializing,
    hasWallet,
    retryInitialization,
  } = usePolymarketWallet();
  const { accessToken, loading: userLoading } = useUser();
  const {
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    eoaAddress,
    safeAddress,
  } = useTrading();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('deposit');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [localSessionError, setLocalSessionError] =
    useState<Error | null>(null);

  const setupError = localSessionError ?? sessionError;

  // Show the consent modal once all pre-conditions are met, instead of
  // silently firing initializeTradingSession and surprising the user with
  // an unexplained wallet signing prompt.
  useEffect(() => {
    if (
      authenticated &&
      isReady &&
      !userLoading &&
      !!accessToken &&
      !!eoaAddress &&
      !isTradingSessionComplete &&
      currentStep === 'idle' &&
      !setupError &&
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
    eoaAddress,
    isTradingSessionComplete,
    currentStep,
    setupError,
    consentDismissed,
    showConsentModal,
  ]);

  const handleEnableTrading = useCallback(async () => {
    setLocalSessionError(null);
    try {
      await initializeTradingSession();
    } catch (error) {
      setLocalSessionError(
        error instanceof Error
          ? error
          : new Error('Failed to enable trading'),
      );
    }
  }, [initializeTradingSession]);

  const handleConsentConfirm = useCallback(() => {
    setShowConsentModal(false);
    void handleEnableTrading();
  }, [handleEnableTrading]);

  const handleConsentDismiss = useCallback(() => {
    setShowConsentModal(false);
    setConsentDismissed(true);
  }, []);

  const handleTransfer = useCallback(
    (tab: TransferTab) => {
      if (!isTradingSessionComplete) {
        setConsentDismissed(false);
        setShowConsentModal(true);
        return;
      }

      setTransferTab(tab);
      setTransferModalOpen(true);
    },
    [isTradingSessionComplete],
  );

  const openPanel = useCallback(
    (view?: PredictionsPanelView) => {
      const target = view ?? 'main';
      router.push(
        target === 'main' ? '/prediction' : `/prediction?view=${target}`,
      );
    },
    [router],
  );

  if (!authenticated) return null;

  if (isInitializing) {
    return (
      <section className="mt-8">
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
      </section>
    );
  }

  if (!hasWallet) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-center text-gray-500 text-sm">
            Connect an EVM wallet to access Predictions.
          </p>
        </div>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
          <p className="text-center text-gray-500 text-sm">
            Wallet found but could not initialize. Please refresh.
          </p>
          <button
            onClick={retryInitialization}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Retry wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-3">
      {/* Section head — matches the wallet wireframe (screen G):
          "Predictions" + "Stake balance and active markets" + chip */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.6px] text-gray-900">
            Predictions
          </h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Stake balance and active markets
          </p>
        </div>
        <button
          onClick={() => openPanel('main')}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-black/[0.06] bg-white text-[12px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Predictions
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <GeoBlockedBanner />

      {setupError && !isTradingSessionComplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Trading is not enabled yet
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {formatPolymarketError(setupError)}
              </p>
            </div>
            <button
              onClick={() => void handleEnableTrading()}
              disabled={currentStep !== 'idle'}
              className="shrink-0 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep !== 'idle' ? 'Enabling...' : 'Enable trading'}
            </button>
          </div>
        </div>
      )}

      <PredictionsCard
        safeAddress={safeAddress}
        onTransfer={handleTransfer}
        onOpenPanel={openPanel}
      />

      {showConsentModal && (
        <EnableTradingModal
          onConfirm={handleConsentConfirm}
          onDismiss={handleConsentDismiss}
        />
      )}

      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        defaultTab={transferTab}
      />
    </section>
  );
}
