'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { formatPolymarketError } from '@/lib/polymarket';
import { ArrowRight } from 'lucide-react';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';
import TransferModal from '@/components/wallet/polymarket/TransferModal';
import PredictionsCard from '@/components/wallet/polymarket/PredictionsCard';
import EnableTradingModal from '@/components/wallet/polymarket/EnableTradingModal';
import { type PredictionsPanelView } from '@/components/wallet/polymarket/PredictionsPanel';

type TransferTab = 'deposit' | 'withdraw';

export default function WalletPredictionsSection() {
  const router = useRouter();
  const {
    authenticated,
    isReady,
    isInitializing,
    hasWallet,
    retryInitialization,
  } = usePolymarketWallet();
  const {
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    safeAddress,
    isGeoblocked,
    isGeoblockLoading,
    geoblockStatus,
  } = useTrading();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('deposit');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [localSessionError, setLocalSessionError] =
    useState<Error | null>(null);

  const setupError = localSessionError ?? sessionError;
  const tradingDisabledReason = isGeoblockLoading
    ? 'Checking trading availability...'
    : isGeoblocked
      ? `Trading is not available in your region${
          geoblockStatus?.country ? ` (${geoblockStatus.country})` : ''
        }.`
      : undefined;

  const handleEnableTrading = useCallback(async () => {
    if (tradingDisabledReason) {
      setLocalSessionError(new Error(tradingDisabledReason));
      return;
    }

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
  }, [initializeTradingSession, tradingDisabledReason]);

  const handleConsentConfirm = useCallback(() => {
    setShowConsentModal(false);
    void handleEnableTrading();
  }, [handleEnableTrading]);

  const handleConsentDismiss = useCallback(() => {
    setShowConsentModal(false);
  }, []);

  const handleTransfer = useCallback(
    (tab: TransferTab) => {
      if (tradingDisabledReason) {
        setLocalSessionError(new Error(tradingDisabledReason));
        return;
      }

      if (!isTradingSessionComplete) {
        setShowConsentModal(true);
        return;
      }

      setTransferTab(tab);
      setTransferModalOpen(true);
    },
    [isTradingSessionComplete, tradingDisabledReason],
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

      {!isTradingSessionComplete && !isGeoblocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Trading is not enabled yet
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {setupError
                  ? formatPolymarketError(setupError)
                  : 'A one-time setup activates your Polymarket trading account. No funds are moved.'}
              </p>
            </div>
            <button
              onClick={() => {
                setLocalSessionError(null);
                setShowConsentModal(true);
              }}
              disabled={currentStep !== 'idle'}
              className="shrink-0 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep !== 'idle'
                ? 'Initializing…'
                : 'Initialize trading session'}
            </button>
          </div>
        </div>
      )}

      <PredictionsCard
        safeAddress={safeAddress}
        onTransfer={handleTransfer}
        onOpenPanel={openPanel}
        isTradingDisabled={!!tradingDisabledReason}
        disabledTransferReason={tradingDisabledReason}
      />

      {showConsentModal && (
        <EnableTradingModal
          onConfirm={handleConsentConfirm}
          onDismiss={handleConsentDismiss}
          disabledReason={tradingDisabledReason}
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
