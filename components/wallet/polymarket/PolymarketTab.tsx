'use client';

import { useEffect } from 'react';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';

import SafeWalletCard from './SafeWalletCard';
import MarketTabs from './MarketTabs';
import PolygonAssets from './PolygonAssets';
import GeoBlockedBanner from './GeoBlockedBanner';

export default function PolymarketTab() {
  const { authenticated, isReady } = usePolymarketWallet();
  const {
    tradingSession,
    isTradingSessionComplete,
    initializeTradingSession,
  } = useTrading();

  // Auto-initialize trading session when authenticated
  useEffect(() => {
    if (authenticated && isReady && !tradingSession && !isTradingSessionComplete) {
      initializeTradingSession();
    }
  }, [authenticated, isReady, tradingSession, isTradingSessionComplete, initializeTradingSession]);

  // Show loading state while checking authentication
  if (!isReady && authenticated) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Loading markets...
          </p>
        </div>
      </div>
    );
  }

  // Show connect wallet prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm mt-4">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Connect your wallet to access Polymarket prediction
            markets and start trading on real-world events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Geoblock Warning */}
      <GeoBlockedBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Wallet & Assets */}
        <div className="space-y-4">
          {/* Safe Wallet Card with QR & Address */}
          <SafeWalletCard />

          {/* Trading Balance with Deposit */}
          <PolygonAssets />
        </div>

        {/* Right Column - Trading */}
        <div className="lg:col-span-2">
          <MarketTabs />
        </div>
      </div>
    </div>
  );
}
