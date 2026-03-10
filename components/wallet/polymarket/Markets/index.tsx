'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
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
/** How many markets appear in the left column when splitLayout is enabled */
const LEFT_COLUMN_COUNT = 3;

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
  yesOutcomeName: string;
  noOutcomeName: string;
};

interface HighVolumeMarketsProps {
  /** When true renders a 2-column split layout */
  splitLayout?: boolean;
  /** Content injected above the search bar in the left column (balance header) */
  leftHeaderSlot?: React.ReactNode;
}

export default function HighVolumeMarkets({
  splitLayout = false,
  leftHeaderSlot,
}: HighVolumeMarketsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>(DEFAULT_CATEGORY);
  const [activeSportSub, setActiveSportSub] =
    useState<SportSubcategoryId>(DEFAULT_SPORT_SUBCATEGORY);
  const [selectedMarket, setSelectedMarket] = useState<SelectedMarket | null>(null);
  const [detailMarket, setDetailMarket] = useState<PolymarketMarket | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { clobClient, isGeoblocked, safeAddress } = useTrading();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: positions } = useUserPositions(safeAddress);

  const overrideTagId = useMemo(() => {
    if (activeCategory !== 'sports') return undefined;
    const sub = getSportSubcategoryById(activeSportSub);
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

  // Filter by search query
  const filteredMarkets = useMemo(() => {
    if (!allMarkets) return [];
    if (!searchQuery.trim()) return allMarkets;
    const q = searchQuery.toLowerCase();
    return allMarkets.filter((m) =>
      m.question.toLowerCase().includes(q)
    );
  }, [allMarkets, searchQuery]);

  // Slice to the currently visible window
  const markets = useMemo(
    () => filteredMarkets.slice(0, visibleCount),
    [filteredMarkets, visibleCount],
  );

  const hasMore = visibleCount < filteredMarkets.length;

  // Reset visible count when category / sport sub / search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, activeSportSub, searchQuery]);

  // IntersectionObserver — load next page when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, filteredMarkets.length),
          );
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredMarkets.length]);

  const category = getCategoryById(activeCategory);
  const categoryLabel = category?.label || 'Markets';

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
    const yesPosition = positions.find((p) => p.asset === selectedMarket.yesTokenId);
    const noPosition = positions.find((p) => p.asset === selectedMarket.noTokenId);
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

    const tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
    const yesTokenId = tokenIds[0] || tokenId;
    const noTokenId = tokenIds[1] || '';
    const staticPrices: number[] = market.outcomePrices
      ? JSON.parse(market.outcomePrices).map(Number)
      : [];

    const isFirstOutcome = tokenId === yesTokenId;
    const yesPrice =
      market.realtimePrices?.[yesTokenId]?.bidPrice ??
      staticPrices[0] ??
      (isFirstOutcome ? price : 1 - price);
    const noPrice =
      market.realtimePrices?.[noTokenId]?.bidPrice ??
      staticPrices[1] ??
      (isFirstOutcome ? 1 - price : price);

    const outcomes: string[] = market.outcomes ? JSON.parse(market.outcomes) : ['Yes', 'No'];

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
      yesOutcomeName: outcomes[0] || 'Yes',
      noOutcomeName: outcomes[1] || 'No',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMarket(null);
  };

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
    if (categoryId !== 'sports') setActiveSportSub(DEFAULT_SPORT_SUBCATEGORY);
    setSearchQuery('');
  };

  const handleSportSubChange = (subId: SportSubcategoryId) => {
    setActiveSportSub(subId);
  };

  // ─── Shared sub-components ──────────────────────────────────────────────────

  const searchBar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search markets..."
        className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  );

  const categoryTabs = (
    <CategoryTabs
      activeCategory={activeCategory}
      onCategoryChange={handleCategoryChange}
      activeSportSub={activeSportSub}
      onSportSubChange={handleSportSubChange}
    />
  );

  const renderMarketCard = (market: PolymarketMarket) => (
    <MarketCard
      key={market.id}
      market={market}
      disabled={isGeoblocked}
      isSportsCategory={activeCategory === 'sports'}
      onOutcomeClick={handleOutcomeClick}
      onTitleClick={() => setDetailMarket(market)}
    />
  );

  const modals = (
    <>
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
          yesOutcomeName={selectedMarket.yesOutcomeName}
          noOutcomeName={selectedMarket.noOutcomeName}
        />
      )}
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

  // ─── Split layout ────────────────────────────────────────────────────────────

  if (splitLayout) {
    const leftMarkets = markets.slice(0, LEFT_COLUMN_COUNT);
    const rightMarkets = markets.slice(LEFT_COLUMN_COUNT);

    return (
      <>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left column */}
          <div className="space-y-3 min-w-0">
            {leftHeaderSlot}
            {searchBar}
            {categoryTabs}

            {isLoading && <LoadingState message={`Loading ${sectionLabel.toLowerCase()}...`} />}
            {error && !isLoading && <ErrorState error={error} title="Error loading markets" />}
            {!isLoading && !error && leftMarkets.length === 0 && (
              <EmptyState
                title="No Markets"
                message={searchQuery ? 'No results for your search.' : `No active ${sectionLabel.toLowerCase()} found.`}
              />
            )}
            {!isLoading && !error && leftMarkets.length > 0 && (
              <div className="space-y-3">
                {leftMarkets.map(renderMarketCard)}
              </div>
            )}
          </div>

          {/* Right column — scrollable */}
          <div className="min-w-0 overflow-y-auto max-h-[720px] pr-1">
            {isLoading && <LoadingState message="" />}
            {!isLoading && !error && rightMarkets.length === 0 && markets.length > 0 && (
              <EmptyState title="" message="All markets shown on the left." />
            )}
            {!isLoading && !error && rightMarkets.length > 0 && (
              <div className="space-y-3">
                {rightMarkets.map(renderMarketCard)}

                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400"
                  >
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Loading more markets...
                  </div>
                )}

                {!hasMore && rightMarkets.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-gray-400 py-3">
                    All {filteredMarkets.length} markets loaded
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {modals}
      </>
    );
  }

  // ─── Default full-width layout ───────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4 min-w-0">
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          activeSportSub={activeSportSub}
          onSportSubChange={handleSportSubChange}
        />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {sectionLabel}{' '}
            {allMarkets ? `(${markets.length} of ${allMarkets.length})` : ''}
          </h3>
          <p className="text-xs text-gray-500">Sorted by volume + liquidity</p>
        </div>

        {isLoading && <LoadingState message={`Loading ${sectionLabel.toLowerCase()}...`} />}
        {error && !isLoading && <ErrorState error={error} title="Error loading markets" />}
        {!isLoading && !error && (!markets || markets.length === 0) && (
          <EmptyState
            title="No Markets Available"
            message={`No active ${sectionLabel.toLowerCase()} found.`}
          />
        )}

        {!isLoading && !error && markets && markets.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {markets.map(renderMarketCard)}
            </div>

            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400"
              >
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Loading more markets...
              </div>
            )}

            {!hasMore && markets.length > PAGE_SIZE && (
              <p className="text-center text-xs text-gray-400 py-3">
                All {allMarkets?.length} markets loaded
              </p>
            )}
          </>
        )}
      </div>

      {modals}
    </>
  );
}
