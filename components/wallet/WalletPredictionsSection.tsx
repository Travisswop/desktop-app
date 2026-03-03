'use client';

import { usePolymarketWallet } from '@/providers/polymarket';
import SafeWalletCard from '@/components/wallet/polymarket/SafeWalletCard';
import PolygonAssets from '@/components/wallet/polymarket/PolygonAssets';
import UserPositions from '@/components/wallet/polymarket/Positions';
import HighVolumeMarkets from '@/components/wallet/polymarket/Markets';

export default function WalletPredictionsSection() {
  const { authenticated, isReady } = usePolymarketWallet();

  if (!authenticated) return null;

  if (!isReady) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Predictions</h2>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading markets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Predictions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <SafeWalletCard />
          <PolygonAssets />
          <UserPositions />
        </div>
        <div className="lg:col-span-2">
          <HighVolumeMarkets />
        </div>
      </div>
    </div>
  );
}
