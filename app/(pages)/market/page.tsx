'use client';

import { PolymarketProviders } from '@/providers/polymarket';
import { PolymarketTab } from '@/components/wallet/polymarket';

export default function MarketPage() {
  return (
    <PolymarketProviders>
      <PolymarketTab />
    </PolymarketProviders>
  );
}
