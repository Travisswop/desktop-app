'use client';

import { useEffect, useState } from 'react';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import { ArrowUpDown, LayoutList } from 'lucide-react';
import HighVolumeMarkets from '@/components/wallet/polymarket/Markets';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';
import TransferModal from '@/components/wallet/polymarket/TransferModal';
import PredictionsPortfolioModal from '@/components/wallet/polymarket/PredictionsPortfolioModal';

export default function WalletPredictionsSection() {
  const { authenticated, isReady } = usePolymarketWallet();
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    safeAddress,
  } = useTrading();

  const { formattedUsdcBalance, isLoading: balanceLoading } =
    usePolygonBalances(safeAddress);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);

  useEffect(() => {
    if (
      authenticated &&
      isReady &&
      !tradingSession &&
      !isTradingSessionComplete &&
      currentStep === 'idle' &&
      !sessionError
    ) {
      initializeTradingSession();
    }
  }, [
    authenticated,
    isReady,
    tradingSession,
    isTradingSessionComplete,
    initializeTradingSession,
    currentStep,
    sessionError,
  ]);

  if (!authenticated) return null;

  if (!isReady) {
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

  if (sessionError && !tradingSession) {
    return (
      <div className="mt-6 max-w-[855px] w-full mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Predictions
        </h2>
        <div className="bg-white rounded-xl p-6 border border-red-100">
          <div className="flex flex-col items-center text-center max-w-sm mx-auto">
            <p className="text-gray-500 text-sm mb-4">
              {sessionError.message.includes('401') ||
              sessionError.message.includes('invalid authorization')
                ? 'Unable to connect to the trading service. Please try again.'
                : sessionError.message}
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
        <p className="text-sm text-gray-500">Predictions Balance</p>
        <div className="flex items-center gap-2 mt-0.5">
          {balanceLoading ? (
            <div className="w-28 h-8 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">
                ${formattedUsdcBalance}
              </span>
              <button
                onClick={() => setTransferModalOpen(true)}
                className="text-gray-500 hover:text-gray-800 transition-colors"
                title="Deposit / Withdraw"
              >
                <ArrowUpDown className="w-4 h-4" />
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
