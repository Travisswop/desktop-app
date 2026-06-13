'use client';

import { PolymarketProviders } from '@/providers/polymarket';
import WalletPredictionsSection from './WalletPredictionsSection';

export default function WalletPredictionsRuntime() {
  return (
    <PolymarketProviders>
      <WalletPredictionsSection />
    </PolymarketProviders>
  );
}
