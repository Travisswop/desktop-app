'use client';

import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';

import TradingSession from './TradingSession';
import MarketTabs from './MarketTabs';
import PolygonAssets from './PolygonAssets';
import GeoBlockedBanner from './GeoBlockedBanner';

export default function PolymarketTab() {
  const { authenticated, isReady } = usePolymarketWallet();
  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
  } = useTrading();

  // Show loading state while checking authentication
  if (!isReady && authenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show connect wallet prompt if not authenticated
  if (!authenticated) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-lg p-8 border border-white/10 text-center">
        <div className="w-16 h-16  rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">
          Connect Your Wallet
        </h3>
        <p className=" mb-4">
          Connect your wallet to access Polymarket prediction markets
          and start trading.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Geoblock Warning */}
      <GeoBlockedBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Session & Assets */}
        <div className="space-y-6">
          {/* Trading Session */}
          <TradingSession
            session={tradingSession}
            currentStep={currentStep}
            error={sessionError}
            isComplete={isTradingSessionComplete}
            initialize={initializeTradingSession}
            endSession={endTradingSession}
          />

          {/* Polygon Assets */}
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
