'use client';

import { useEffect } from 'react';
import { useTrading, usePolymarketWallet } from '@/providers/polymarket';
import SafeWalletCard from '@/components/wallet/polymarket/SafeWalletCard';
import PolygonAssets from '@/components/wallet/polymarket/PolygonAssets';
import UserPositions from '@/components/wallet/polymarket/Positions';
import HighVolumeMarkets from '@/components/wallet/polymarket/Markets';
import GeoBlockedBanner from '@/components/wallet/polymarket/GeoBlockedBanner';

export default function WalletPredictionsSection() {
  const { authenticated, isReady } = usePolymarketWallet();
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
  } = useTrading();

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
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Predictions</h2>
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
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Predictions</h2>
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

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Predictions</h2>
      <GeoBlockedBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Trading Wallet + Positions */}
        <div className="space-y-4">
          <SafeWalletCard />
          <PolygonAssets />
          <UserPositions />
        </div>

        {/* Right: Markets */}
        <div className="lg:col-span-2">
          <HighVolumeMarkets />
        </div>
      </div>
    </div>
  );
}
