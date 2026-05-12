'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PolymarketProviders, useTrading } from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import MarketDetailView from '@/components/wallet/polymarket/Markets/MarketDetailView';
import {
  useMarketDetailStore,
  type MarketDetailEntry,
} from '@/zustandStore/marketDetailStore';

/**
 * Predictions market detail page — replaces the legacy MarketDetailModal.
 * The originating screen stashes the full PolymarketMarket object in the
 * marketDetailStore before navigating; we read it back here.
 *
 * Direct URL hits (refresh, share-link, deep-link) currently land on a
 * loading/not-found state because no single-market endpoint exists yet.
 * Adding one is a separate task.
 */
export default function MarketDetailPage() {
  return (
    <PolymarketProviders>
      <MarketDetailPageInner />
    </PolymarketProviders>
  );
}

function MarketDetailPageInner() {
  const router = useRouter();
  const params = useParams<{ marketId: string }>();
  const marketId = decodeURIComponent(params?.marketId ?? '');
  const { safeAddress, portfolioAddresses } = useTrading();
  const portfolioAddressInput = portfolioAddresses.length
    ? portfolioAddresses
    : safeAddress;
  const { usdcBalance } = usePolygonBalances(portfolioAddressInput);

  const entry = useMarketDetailStore((s) => s.entries[marketId]);
  const clearEntry = useMarketDetailStore((s) => s.clear);

  // Snapshot the entry so the page keeps rendering even if the store gets
  // cleared (e.g. if we cleared on unmount in a future iteration).
  const [snapshot, setSnapshot] = useState<MarketDetailEntry | undefined>(
    entry,
  );
  useEffect(() => {
    if (entry) setSnapshot(entry);
  }, [entry]);

  const handleBack = useMemo(
    () => () => {
      clearEntry(marketId);
      router.push('/prediction');
    },
    [clearEntry, marketId, router],
  );

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#f4f4f2] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            This market is no longer in memory.
          </p>
          <button
            onClick={() => router.push('/prediction')}
            className="mt-3 text-sm font-semibold text-gray-900 underline"
          >
            Back to Predictions
          </button>
        </div>
      </div>
    );
  }

  return (
    <MarketDetailView
      onClose={handleBack}
      market={snapshot.market}
      balance={usdcBalance}
      yesShares={snapshot.yesShares}
      noShares={snapshot.noShares}
      initialOutcome={snapshot.initialOutcome}
      initialAmount={snapshot.initialAmount}
      outcomeLabels={snapshot.outcomeLabels}
    />
  );
}
