'use client';

import { useState } from 'react';
import { useTrading } from '@/providers/polymarket';
import { useMarkets } from '@/hooks/polymarket';
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

export default function HighVolumeMarkets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>(DEFAULT_CATEGORY);
  const [selectedOutcome, setSelectedOutcome] = useState<{
    marketTitle: string;
    outcome: string;
    price: number;
    tokenId: string;
    negRisk: boolean;
  } | null>(null);

  const { clobClient, isGeoblocked } = useTrading();

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

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
  ) => {
    setSelectedOutcome({
      marketTitle,
      outcome,
      price,
      tokenId,
      negRisk,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOutcome(null);
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
          <h3 className="text-xl font-bold ">
            {categoryLabel} Markets{' '}
            {markets ? `(${markets.length})` : ''}
          </h3>
          <p className="text-xs ">Sorted by volume + liquidity</p>
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
          <div className="space-y-3">
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
      {selectedOutcome && (
        <OrderPlacementModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedOutcome.marketTitle}
          outcome={selectedOutcome.outcome}
          currentPrice={selectedOutcome.price}
          tokenId={selectedOutcome.tokenId}
          negRisk={selectedOutcome.negRisk}
          clobClient={clobClient}
        />
      )}
    </>
  );
}
