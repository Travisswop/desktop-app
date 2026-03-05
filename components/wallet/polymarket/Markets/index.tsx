'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTrading } from '@/providers/polymarket';
import { useMarkets, usePolygonBalances, useUserPositions, type PolymarketMarket } from '@/hooks/polymarket';
import {
  type CategoryId,
  type SportSubcategoryId,
  DEFAULT_CATEGORY,
  DEFAULT_SPORT_SUBCATEGORY,
  getCategoryById,
  getSportSubcategoryById,
} from '@/constants/polymarket';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import MarketCard from './MarketCard';
import CategoryTabs from './CategoryTabs';
import OrderPlacementModal from '../OrderModal';
import MarketDetailModal from './MarketDetailModal';

const PAGE_SIZE = 10;
const PREFETCH_SIZE = 50;

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
  const [activeSportSub, setActiveSportSub] =
    useState<SportSubcategoryId>(DEFAULT_SPORT_SUBCATEGORY);
  const [selectedMarket, setSelectedMarket] = useState<SelectedMarket | null>(null);
  const [detailMarket, setDetailMarket] = useState<PolymarketMarket | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { clobClient, isGeoblocked, safeAddress } = useTrading();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: positions } = useUserPositions(safeAddress);

  // When sports is active, use the sport subcategory's tagId to filter
  const overrideTagId = useMemo(() => {
    if (activeCategory !== 'sports') return undefined;
    const sub = getSportSubcategoryById(activeSportSub);
    // sub.tagId === null means "All Sports" — fall back to category tagId (100639)
    return sub?.tagId ?? undefined;
  }, [activeCategory, activeSportSub]);

  const {
    data: allMarkets,
    isLoading,
    error,
  } = useMarkets({
    limit: PREFETCH_SIZE,
    categoryId: activeCategory,
    overrideTagId,
  });

  // Slice to the currently visible window
  const markets = useMemo(
    () => (allMarkets ? allMarkets.slice(0, visibleCount) : []),
    [allMarkets, visibleCount],
  );

  const hasMore = !!allMarkets && visibleCount < allMarkets.length;

  // Reset visible count when the category / sport sub changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, activeSportSub]);

  // IntersectionObserver — load next page when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, allMarkets?.length ?? prev),
          );
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, allMarkets?.length]);

  const category = getCategoryById(activeCategory);
  const categoryLabel = category?.label || 'Markets';

  // Derive a descriptive sub-label for Sports
  const sectionLabel = useMemo(() => {
    if (activeCategory !== 'sports') return `${categoryLabel} Markets`;
    const sub = getSportSubcategoryById(activeSportSub);
    return sub?.id === 'all'
      ? 'Sports Markets'
      : `${sub?.label ?? ''} Markets`;
  }, [activeCategory, activeSportSub, categoryLabel]);

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
    const market = allMarkets?.find((m) => m.question === marketTitle);
    if (!market) return;

    const tokenIds = market.clobTokenIds
      ? JSON.parse(market.clobTokenIds)
      : [];

    const yesTokenId = tokenIds[0] || tokenId;
    const noTokenId = tokenIds[1] || '';

    // staticPrices[0] = Yes price, staticPrices[1] = No price (correctly indexed)
    const staticPrices: number[] = market.outcomePrices
      ? JSON.parse(market.outcomePrices).map(Number)
      : [];

    // Use realtime prices first, then static prices, then infer from the
    // clicked price (using the outcome name to derive the correct polarity).
    const isYesClicked = outcome.toLowerCase() === 'yes';
    const yesPrice =
      market.realtimePrices?.[yesTokenId]?.bidPrice ??
      staticPrices[0] ??
      (isYesClicked ? price : 1 - price);
    const noPrice =
      market.realtimePrices?.[noTokenId]?.bidPrice ??
      staticPrices[1] ??
      (isYesClicked ? 1 - price : price);

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

  // Share balances for the detail modal market
  const detailMarketShares = useMemo(() => {
    if (!detailMarket || !positions) return { yesShares: 0, noShares: 0 };
    const tIds = detailMarket.clobTokenIds
      ? (JSON.parse(detailMarket.clobTokenIds) as string[])
      : [];
    return {
      yesShares: positions.find((p) => p.asset === tIds[0])?.size || 0,
      noShares: positions.find((p) => p.asset === tIds[1])?.size || 0,
    };
  }, [detailMarket, positions]);

  const handleCategoryChange = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
    // Reset sport subcategory when switching away from sports
    if (categoryId !== 'sports') {
      setActiveSportSub(DEFAULT_SPORT_SUBCATEGORY);
    }
  };

  const handleSportSubChange = (subId: SportSubcategoryId) => {
    setActiveSportSub(subId);
  };

  return (
    <>
      <div className="space-y-4 min-w-0">
        {/* Category + Sport Subcategory Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          activeSportSub={activeSportSub}
          onSportSubChange={handleSportSubChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {sectionLabel}{' '}
            {allMarkets ? `(${markets.length} of ${allMarkets.length})` : ''}
          </h3>
          <p className="text-xs text-gray-500">Sorted by volume + liquidity</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message={`Loading ${sectionLabel.toLowerCase()}...`}
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
              message={`No active ${sectionLabel.toLowerCase()} found.`}
            />
          )}

        {/* Market Cards */}
        {!isLoading && !error && markets && markets.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {markets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  disabled={isGeoblocked}
                  isSportsCategory={activeCategory === 'sports'}
                  onOutcomeClick={handleOutcomeClick}
                  onTitleClick={() => setDetailMarket(market)}
                />
              ))}
            </div>

            {/* Sentinel — triggers next page when scrolled into view */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400"
              >
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Loading more markets...
              </div>
            )}

            {/* End-of-list indicator */}
            {!hasMore && markets.length > PAGE_SIZE && (
              <p className="text-center text-xs text-gray-400 py-3">
                All {allMarkets?.length} markets loaded
              </p>
            )}
          </>
        )}
      </div>

      {/* Order Placement Modal (opened via outcome button click) */}
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

      {/* Market Detail Modal (opened via market title click) */}
      {detailMarket && (
        <MarketDetailModal
          isOpen={!!detailMarket}
          onClose={() => setDetailMarket(null)}
          market={detailMarket}
          clobClient={clobClient}
          balance={usdcBalance}
          yesShares={detailMarketShares.yesShares}
          noShares={detailMarketShares.noShares}
        />
      )}
    </>
  );
}
