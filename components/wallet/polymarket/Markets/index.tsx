'use client';

import { useState, useMemo } from 'react';
import { useTrading } from '@/providers/polymarket';
import { useMarkets, usePolygonBalances, useUserPositions } from '@/hooks/polymarket';
import {
  type CategoryId,
  DEFAULT_CATEGORY,
  getCategoryById,
} from '@/constants/polymarket';

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
  tokenId: string;
  negRisk: boolean;
  yesTokenId: string;
  noTokenId: string;
  yesPrice: number;
  noPrice: number;
  orderMinSize: number;
};

export default function HighVolumeMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>(DEFAULT_CATEGORY);
  const [selectedMarket, setSelectedMarket] = useState<SelectedMarket | null>(null);

  const { clobClient, isGeoblocked, safeAddress } = useTrading();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: positions } = useUserPositions(safeAddress);

  const {
    data: markets,
    isLoading,
    error,
  } = useMarkets({
    limit: 10,
    categoryId: activeCategory,
  });

  const category = getCategoryById(activeCategory);
  const categoryLabel = category?.label || 'Markets';

  // Calculate share balances for selected market
  const { yesShares, noShares } = useMemo(() => {
    if (!selectedMarket || !positions) {
      return { yesShares: 0, noShares: 0 };
    }

    const yesPosition = positions.find(
      (p) => p.asset === selectedMarket.yesTokenId
    );
    const noPosition = positions.find(
      (p) => p.asset === selectedMarket.noTokenId
    );

    return {
      yesShares: yesPosition?.size || 0,
      noShares: noPosition?.size || 0,
    };
  }, [selectedMarket, positions]);

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
  ) => {
    // Find the market to get both token IDs and prices
    const market = markets?.find((m) => m.question === marketTitle);
    if (!market) return;

    const tokenIds = market.clobTokenIds
      ? JSON.parse(market.clobTokenIds)
      : [];

    const yesTokenId = tokenIds[0] || tokenId;
    const noTokenId = tokenIds[1] || '';

    const yesPrice = market.realtimePrices?.[yesTokenId]?.bidPrice || price;
    const noPrice = market.realtimePrices?.[noTokenId]?.bidPrice || (1 - price);

    setSelectedMarket({
      marketTitle,
      outcome,
      price,
      tokenId,
      negRisk,
      yesTokenId,
      noTokenId,
      yesPrice,
      noPrice,
      orderMinSize: market.orderMinSize || 5,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMarket(null);
  };

  const handleCategoryChange = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Category Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {categoryLabel} Markets{' '}
            {markets ? `(${markets.length})` : ''}
          </h3>
          <p className="text-xs text-gray-500">Sorted by volume + liquidity</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message={`Loading ${categoryLabel.toLowerCase()} markets...`}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading markets" />
        )}

        {/* Empty State */}
        {!isLoading &&
          !error &&
          (!markets || markets.length === 0) && (
            <EmptyState
              title="No Markets Available"
              message={`No active ${categoryLabel.toLowerCase()} markets found.`}
            />
          )}

        {/* Market Cards */}
        {!isLoading && !error && markets && markets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                disabled={isGeoblocked}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Placement Modal */}
      {selectedMarket && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedMarket.marketTitle}
          outcome={selectedMarket.outcome}
          currentPrice={selectedMarket.price}
          tokenId={selectedMarket.tokenId}
          negRisk={selectedMarket.negRisk}
          clobClient={clobClient}
          balance={usdcBalance}
          yesPrice={selectedMarket.yesPrice}
          noPrice={selectedMarket.noPrice}
          yesTokenId={selectedMarket.yesTokenId}
          noTokenId={selectedMarket.noTokenId}
          yesShares={yesShares}
          noShares={noShares}
          orderMinSize={selectedMarket.orderMinSize}
        />
      )}
    </>
  );
}
