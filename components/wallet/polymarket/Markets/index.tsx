'use client';

import { useState } from 'react';
import { usePolymarketWallet } from '@/providers/polymarket';
import { useMarkets, usePolygonBalances } from '@/hooks/polymarket';
import { type CategoryId, DEFAULT_CATEGORY, getCategoryById } from '@/constants/polymarket';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import MarketCard from './MarketCard';
import CategoryTabs from './CategoryTabs';
import OrderPlacementModal from '../OrderModal';

type SelectedMarket = {
  marketTitle: string;
  outcome: string;
  price: number;
  marketId: `0x${string}`;
  poolAddress: `0x${string}` | undefined;
  yesPrice: number;
  noPrice: number;
};

export default function HighVolumeMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [selectedMarket, setSelectedMarket] = useState<SelectedMarket | null>(null);

  const { eoaAddress } = usePolymarketWallet();
  const { usdcBalance } = usePolygonBalances(eoaAddress);

  const { data: markets, isLoading, error } = useMarkets({ limit: 10, categoryId: activeCategory });

  const category = getCategoryById(activeCategory);
  const categoryLabel = category?.label || 'Markets';

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    marketId: `0x${string}`,
    poolAddress: `0x${string}` | undefined,
  ) => {
    const market = markets?.find((m) => m.question === marketTitle);
    const staticPrices: number[] = market?.outcomePrices
      ? JSON.parse(market.outcomePrices).map(Number)
      : [price, 1 - price];

    setSelectedMarket({
      marketTitle,
      outcome,
      price,
      marketId,
      poolAddress,
      yesPrice: staticPrices[0] ?? price,
      noPrice: staticPrices[1] ?? 1 - price,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMarket(null);
  };

  return (
    <>
      <div className="space-y-4">
        <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {categoryLabel} Markets {markets ? `(${markets.length})` : ''}
          </h3>
          <p className="text-xs text-gray-500">Sorted by volume + liquidity</p>
        </div>

        {isLoading && <LoadingState message={`Loading ${categoryLabel.toLowerCase()} markets...`} />}
        {error && !isLoading && <ErrorState error={error} title="Error loading markets" />}
        {!isLoading && !error && (!markets || markets.length === 0) && (
          <EmptyState title="No Markets Available" message={`No active ${categoryLabel.toLowerCase()} markets found.`} />
        )}

        {!isLoading && !error && markets && markets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}
          </div>
        )}
      </div>

      {selectedMarket && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedMarket.marketTitle}
          outcome={selectedMarket.outcome}
          currentPrice={selectedMarket.price}
          marketId={selectedMarket.marketId}
          poolAddress={selectedMarket.poolAddress}
          balance={usdcBalance}
          yesPrice={selectedMarket.yesPrice}
          noPrice={selectedMarket.noPrice}
        />
      )}
    </>
  );
}
