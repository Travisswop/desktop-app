'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useTrading } from '@/providers/polymarket';
import {
  useMarkets,
  usePolygonBalances,
  useUserPositions,
  useBtc5mPolymarketMarket,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import { useSportsEvents } from '@/hooks/polymarket/useSportsEvents';
import { usePolymarketTeams } from '@/hooks/polymarket/usePolymarketTeams';
import { useSportsMeta } from '@/hooks/polymarket/useSportsMeta';
import {
  type CategoryId,
  type SportSubcategoryId,
  DEFAULT_CATEGORY,
  DEFAULT_SPORT_SUBCATEGORY,
  getCategoryById,
  getSportSubcategoryById,
  MIN_ORDER_SIZE,
} from '@/constants/polymarket';
import {
  groupFlatMarketsIntoGames,
  enrichGamesWithTeamLogos,
  isValidGameCard,
  type SportsGameGroup,
} from '@/lib/polymarket/sports-grouping';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import MarketCard from './MarketCard';
import SportsGameCard from './SportsGameCard';
import BtcUpDownCard from './BtcUpDownCard';
import BtcOrderModal from './BtcOrderModal';
import CategoryTabs from './CategoryTabs';
import MarketDetailModal from './MarketDetailModal';

/** How many items appear in the left column when splitLayout is enabled */
const LEFT_COLUMN_COUNT = 3;

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
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>(DEFAULT_CATEGORY);
  const [activeSportSub, setActiveSportSub] =
    useState<SportSubcategoryId>(DEFAULT_SPORT_SUBCATEGORY);
  const [detailMarket, setDetailMarket] =
    useState<PolymarketMarket | null>(null);
  const [detailInitialOutcome, setDetailInitialOutcome] = useState<
    'yes' | 'no' | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // BTC 5-min order modal state
  const [btcModalOpen, setBtcModalOpen] = useState(false);
  const [btcInitialOutcome, setBtcInitialOutcome] = useState<'Up' | 'Down'>('Up');

  const { clobClient, isGeoblocked, safeAddress } = useTrading();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const { data: positions } = useUserPositions(safeAddress);

  const isSportsActive = activeCategory === 'sports';

  // ── Live Gamma metadata ────────────────────────────────────────────────────
  // Fetch once, cache for 1 h. Both hooks are no-ops when sports isn't active
  // (React Query still runs, but results are cheap and shared across mounts).
  const { data: sportsMeta } = useSportsMeta();
  const { data: teamsData } = usePolymarketTeams();

  const overrideTagId = useMemo(() => {
    if (!isSportsActive) return undefined;

    if (activeSportSub === 'all') {
      // "All Sports" — use the sports parent tag
      return (
        sportsMeta?.tagIdBySlug.get('sports') ??
        getCategoryById('sports')?.tagId ??
        100639
      );
    }

    // Prefer live tag ID from /sports API, fall back to static constant
    const liveTagId = sportsMeta?.tagIdBySlug.get(activeSportSub.toLowerCase());
    if (liveTagId != null) return liveTagId;

    const sub = getSportSubcategoryById(activeSportSub);
    return sub?.tagId ?? getCategoryById('sports')?.tagId ?? undefined;
  }, [isSportsActive, activeSportSub, sportsMeta]);

  // ── Non-sports flat markets ───────────────────────────────────────────────
  const {
    data: marketsData,
    isLoading: isMarketsLoading,
    error: marketsError,
    fetchNextPage: fetchNextMarketsPage,
    hasNextPage: hasNextMarketsPage,
    isFetchingNextPage: isFetchingNextMarketsPage,
  } = useMarkets({
    categoryId: activeCategory,
    overrideTagId,
    enabled: !isSportsActive,
  });

  const allMarkets = useMemo(() => marketsData?.pages.flat() ?? [], [marketsData]);

  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) return allMarkets;
    const q = searchQuery.toLowerCase();
    return allMarkets.filter((m) => m.question.toLowerCase().includes(q));
  }, [allMarkets, searchQuery]);

  // ── Sports events ─────────────────────────────────────────────────────────
  const {
    data: sportsData,
    isLoading: isSportsLoading,
    error: sportsError,
    fetchNextPage: fetchNextSportsPage,
    hasNextPage: hasNextSportsPage,
    isFetchingNextPage: isFetchingNextSportsPage,
  } = useSportsEvents({
    tagId: overrideTagId,
    enabled: isSportsActive,
  });

  // Merge all pages of flat sports markets first, then group into games.
  // Grouping after merging (rather than per-page) means a game whose markets
  // span two pages will still be assembled into a single complete card.
  // Finally, enrich with live logo URLs from the Gamma /teams API.
  const allSportsMarkets = useMemo(() => sportsData?.pages.flat() ?? [], [sportsData]);
  const allGames = useMemo(() => {
    const grouped = groupFlatMarketsIntoGames(allSportsMarkets).filter(isValidGameCard);
    return teamsData ? enrichGamesWithTeamLogos(grouped, teamsData) : grouped;
  }, [allSportsMarkets, teamsData]);

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return allGames;
    const q = searchQuery.toLowerCase();
    return allGames.filter((g) => g.title.toLowerCase().includes(q));
  }, [allGames, searchQuery]);

  // ── Unified pagination state (drives the single sentinel) ────────────────
  const isLoading = isSportsActive ? isSportsLoading : isMarketsLoading;
  const error = isSportsActive ? sportsError : marketsError;
  const hasNextPage = isSportsActive ? hasNextSportsPage : hasNextMarketsPage;
  const isFetchingNextPage = isSportsActive
    ? isFetchingNextSportsPage
    : isFetchingNextMarketsPage;
  const fetchNextPage = isSportsActive ? fetchNextSportsPage : fetchNextMarketsPage;

  // IntersectionObserver — fetch next page when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const category = getCategoryById(activeCategory);
  const categoryLabel = category?.label || 'Markets';

  const sectionLabel = useMemo(() => {
    if (!isSportsActive) return `${categoryLabel} Markets`;
    const sub = getSportSubcategoryById(activeSportSub);
    return sub?.id === 'all' ? 'Sports Markets' : `${sub?.label ?? ''} Markets`;
  }, [isSportsActive, activeSportSub, categoryLabel]);

  /**
   * All outcome clicks (sports + non-sports) open MarketDetailModal with the
   * clicked side pre-selected — the detail modal is the single entry point for
   * placing orders, so users always see the probability chart first.
   */
  const handleOutcomeClick = (
    marketTitle: string,
    _outcome: string,
    _price: number,
    tokenId: string,
    _negRisk: boolean,
  ) => {
    const market = allMarkets?.find((m) => m.question === marketTitle);
    if (!market) return;

    const tokenIds = market.clobTokenIds
      ? (JSON.parse(market.clobTokenIds) as string[])
      : [];
    const yesTokenId = tokenIds[0] || tokenId;
    const isFirstOutcome = tokenId === yesTokenId;
    setDetailInitialOutcome(isFirstOutcome ? 'yes' : 'no');
    setDetailMarket(market);
  };

  /**
   * Sports outcome clicks open the rich MarketDetailModal (with probability
   * chart + team panel) instead of the compact OrderPlacementModal — the
   * visualization only makes sense for team matchups.
   */
  const handleSportsOutcomeClick = useCallback(
    (market: PolymarketMarket, _outcome: string, _price: number, tokenId: string) => {
      const tokenIds: string[] = market.clobTokenIds
        ? JSON.parse(market.clobTokenIds)
        : [];
      const yesTokenId = tokenIds[0] || tokenId;
      const isFirstOutcome = tokenId === yesTokenId;
      setDetailInitialOutcome(isFirstOutcome ? 'yes' : 'no');
      setDetailMarket(market);
    },
    [],
  );

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

  // ─── Shared sub-components ───────────────────────────────────────────────

  const searchBar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={isSportsActive ? 'Search games...' : 'Search markets...'}
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

  // Unified sentinel — works for both sports and non-sports pagination
  const totalLoaded = isSportsActive ? allGames.length : allMarkets.length;
  const itemLabel = isSportsActive ? 'games' : 'markets';

  const loadMoreSentinel =
    hasNextPage || isFetchingNextPage ? (
      <div
        ref={sentinelRef}
        className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400"
      >
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        {`Loading more ${itemLabel}...`}
      </div>
    ) : totalLoaded > 0 ? (
      <p className="text-center text-xs text-gray-400 py-3">
        All {totalLoaded} {itemLabel} loaded
      </p>
    ) : null;

  // ── Real BTC 5-minute Polymarket market ──────────────────────────────────
  const btc5mMarket = useBtc5mPolymarketMarket();

  const btcTokenIds = useMemo(
    () => ({
      upTokenId: btc5mMarket.market?.upTokenId ?? '',
      downTokenId: btc5mMarket.market?.downTokenId ?? '',
    }),
    [btc5mMarket.market],
  );

  const btcShares = useMemo(() => {
    if (!positions) return { upShares: 0, downShares: 0 };
    return {
      upShares: positions.find((p) => p.asset === btcTokenIds.upTokenId)?.size ?? 0,
      downShares: positions.find((p) => p.asset === btcTokenIds.downTokenId)?.size ?? 0,
    };
  }, [positions, btcTokenIds]);

  const handleBtcOutcomeClick = useCallback(
    (outcome: 'Up' | 'Down') => {
      if (!btc5mMarket.market) return;
      setBtcInitialOutcome(outcome);
      setBtcModalOpen(true);
    },
    [btc5mMarket.market],
  );

  const renderMarketCard = (market: PolymarketMarket) => (
    <MarketCard
      key={market.id}
      market={market}
      disabled={isGeoblocked}
      isSportsCategory={false}
      onOutcomeClick={handleOutcomeClick}
      onTitleClick={() => setDetailMarket(market)}
    />
  );

  const renderSportsCard = (game: SportsGameGroup) => (
    <SportsGameCard
      key={game.eventId}
      game={game}
      disabled={isGeoblocked}
      onOutcomeClick={handleSportsOutcomeClick}
    />
  );

  /** Pinned BTC 5-min card — only rendered in the Crypto category */
  const btcCard =
    activeCategory === 'crypto' ? (
      <BtcUpDownCard
        key="btc-5min"
        disabled={isGeoblocked}
        noBackingMarket={!btc5mMarket.market && !btc5mMarket.isLoading}
        onOutcomeClick={handleBtcOutcomeClick}
      />
    ) : null;

  const modals = (
    <>
      <BtcOrderModal
        isOpen={btcModalOpen}
        onClose={() => setBtcModalOpen(false)}
        initialOutcome={btcInitialOutcome}
        upTokenId={btcTokenIds.upTokenId}
        downTokenId={btcTokenIds.downTokenId}
        negRisk={btc5mMarket.market?.negRisk ?? false}
        orderMinSize={btc5mMarket.market?.orderMinSize ?? MIN_ORDER_SIZE}
        clobClient={clobClient}
        balance={usdcBalance}
        upShares={btcShares.upShares}
        downShares={btcShares.downShares}
      />

      {detailMarket && (
        <MarketDetailModal
          isOpen={!!detailMarket}
          onClose={() => {
            setDetailMarket(null);
            setDetailInitialOutcome(undefined);
          }}
          market={detailMarket}
          clobClient={clobClient}
          balance={usdcBalance}
          yesShares={detailMarketShares.yesShares}
          noShares={detailMarketShares.noShares}
          initialOutcome={detailInitialOutcome}
        />
      )}
    </>
  );

  // ─── Split layout ─────────────────────────────────────────────────────────

  if (splitLayout) {
    // Sports: split game cards the same way markets are split
    const leftGames = filteredGames.slice(0, LEFT_COLUMN_COUNT);
    const rightGames = filteredGames.slice(LEFT_COLUMN_COUNT);

    // Non-sports
    const leftMarkets = filteredMarkets.slice(0, LEFT_COLUMN_COUNT);
    const rightMarkets = filteredMarkets.slice(LEFT_COLUMN_COUNT);

    const leftItems = isSportsActive ? leftGames.length : leftMarkets.length;
    const hasAnyLeft = isSportsActive
      ? leftGames.length > 0
      : btcCard || leftMarkets.length > 0;

    return (
      <>
        {/* ── Mobile: single scrollable column ── */}
        <div className="md:hidden space-y-3 min-w-0">
          {leftHeaderSlot}
          {searchBar}
          {categoryTabs}

          {isLoading && (
            <LoadingState message={`Loading ${sectionLabel.toLowerCase()}...`} />
          )}
          {error && !isLoading && (
            <ErrorState error={error} title={`Error loading ${itemLabel}`} />
          )}
          {!isLoading && !error && !hasAnyLeft && (
            <EmptyState
              title={`No ${isSportsActive ? 'Games' : 'Markets'}`}
              message={
                searchQuery
                  ? 'No results for your search.'
                  : `No active ${sectionLabel.toLowerCase()} found.`
              }
            />
          )}
          {!isLoading && !error && hasAnyLeft && (
            <div className="overflow-y-auto max-h-[calc(100vh-360px)] pr-1 space-y-3">
              {isSportsActive ? (
                <>
                  {filteredGames.map(renderSportsCard)}
                  {loadMoreSentinel}
                </>
              ) : (
                <>
                  {btcCard}
                  {filteredMarkets.map(renderMarketCard)}
                  {loadMoreSentinel}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop: two-column split layout ── */}
        <div className="hidden md:grid grid-cols-2 gap-4 items-start">
          {/* Left column */}
          <div className="space-y-3 min-w-0">
            {leftHeaderSlot}
            {searchBar}
            {categoryTabs}

            {isLoading && (
              <LoadingState message={`Loading ${sectionLabel.toLowerCase()}...`} />
            )}
            {error && !isLoading && (
              <ErrorState error={error} title={`Error loading ${itemLabel}`} />
            )}
            {!isLoading && !error && leftItems === 0 && !btcCard && (
              <EmptyState
                title={`No ${isSportsActive ? 'Games' : 'Markets'}`}
                message={
                  searchQuery
                    ? 'No results for your search.'
                    : `No active ${sectionLabel.toLowerCase()} found.`
                }
              />
            )}
            {!isLoading && !error && (btcCard || leftItems > 0) && (
              <div className="space-y-3">
                {isSportsActive
                  ? leftGames.map(renderSportsCard)
                  : <>{btcCard}{leftMarkets.map(renderMarketCard)}</>
                }
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="min-w-0 overflow-y-auto max-h-[calc(100vh-102px)] pr-1">
            {isLoading && <LoadingState message="" />}
            {!isLoading && !error && isSportsActive && rightGames.length === 0 && filteredGames.length > LEFT_COLUMN_COUNT && (
              <EmptyState title="" message="All games shown on the left." />
            )}
            {!isLoading && !error && !isSportsActive && rightMarkets.length === 0 && filteredMarkets.length > 0 && (
              <EmptyState title="" message="All markets shown on the left." />
            )}
            {!isLoading && !error && (
              <div className="space-y-3">
                {isSportsActive
                  ? rightGames.map(renderSportsCard)
                  : rightMarkets.map(renderMarketCard)
                }
                {(isSportsActive ? rightGames.length > 0 : rightMarkets.length > 0) && loadMoreSentinel}
              </div>
            )}
          </div>
        </div>

        {modals}
      </>
    );
  }

  // ─── Default full-width layout ────────────────────────────────────────────

  const displayCount = isSportsActive ? filteredGames.length : filteredMarkets.length;

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
            {displayCount > 0
              ? `(${displayCount}${hasNextPage ? '+' : ''})`
              : ''}
          </h3>
          <p className="text-xs text-gray-500">
            Sorted by volume + liquidity
          </p>
        </div>

        {isLoading && (
          <LoadingState message={`Loading ${sectionLabel.toLowerCase()}...`} />
        )}
        {error && !isLoading && (
          <ErrorState error={error} title={`Error loading ${itemLabel}`} />
        )}
        {!isLoading && !error && !btcCard && displayCount === 0 && (
          <EmptyState
            title={`No ${isSportsActive ? 'Games' : 'Markets'} Available`}
            message={`No active ${sectionLabel.toLowerCase()} found.`}
          />
        )}

        {!isLoading && !error && (btcCard || displayCount > 0) && (
          <>
            {btcCard && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {btcCard}
              </div>
            )}
            {displayCount > 0 && (
              <div
                className={`grid gap-3 ${
                  isSportsActive
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {isSportsActive
                  ? filteredGames.map(renderSportsCard)
                  : filteredMarkets.map(renderMarketCard)
                }
              </div>
            )}
            {loadMoreSentinel}
          </>
        )}
      </div>

      {modals}
    </>
  );
}
