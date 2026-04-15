'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useSportsEvents } from '@/hooks/polymarket/useSportsEvents';
import { usePolymarketTeams } from '@/hooks/polymarket/usePolymarketTeams';
import { useSportsMeta } from '@/hooks/polymarket/useSportsMeta';
import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  groupFlatMarketsIntoGames,
  enrichGamesWithTeamLogos,
  isValidGameCard,
} from '@/lib/polymarket/sports-grouping';
import {
  getSportSubcategoryById,
  getCategoryById,
  type SportSubcategoryId,
} from '@/constants/polymarket';
import LoadingState from '../shared/LoadingState';
import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import SportsGameCard from './SportsGameCard';

interface SportsMarketsViewProps {
  /**
   * Active sport subcategory (e.g. 'nba', 'nfl', 'all').
   * Used to resolve the Gamma tag ID — first from the live /sports API,
   * then falling back to the static constant in categories.ts.
   */
  activeSportSub?: SportSubcategoryId;
  /**
   * Direct tag ID override — takes precedence over activeSportSub.
   * Pass null to fetch all sports (tag 100639).
   */
  tagId?: number | null;
  disabled?: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}

/**
 * Renders the sports "Games" view: a paginated, infinite-scroll list of game
 * cards, each showing Moneyline / Spread / Total rows.
 *
 * Data flow:
 *   1. GET /api/polymarket/sports → live tag IDs per league (useSportsMeta)
 *   2. GET /api/polymarket/teams  → team name/logo map    (usePolymarketTeams)
 *   3. GET /api/polymarket/markets?tag_id=… (paginated)   (useSportsEvents)
 *   4. groupFlatMarketsIntoGames() groups raw markets by eventId
 *   5. enrichGamesWithTeamLogos() joins live logo URLs into each game card
 */
export default function SportsMarketsView({
  activeSportSub,
  tagId: tagIdProp,
  disabled = false,
  onOutcomeClick,
}: SportsMarketsViewProps) {
  // ── Live sports metadata (tag IDs per league) ─────────────────────────────
  const { data: sportsMeta } = useSportsMeta();

  // ── Resolve effective tag ID ───────────────────────────────────────────────
  // Priority: explicit prop > live /sports API > static fallback in categories.ts
  const resolvedTagId = useMemo<number | null | undefined>(() => {
    if (tagIdProp !== undefined) return tagIdProp;

    if (!activeSportSub || activeSportSub === 'all') {
      // "All Sports" — use the sports parent tag (100639)
      const allTagId = sportsMeta?.tagIdBySlug.get('sports')
        ?? getCategoryById('sports')?.tagId
        ?? 100639;
      return allTagId;
    }

    // Try live API first (keyed by slug, e.g. "nba")
    const liveTagId = sportsMeta?.tagIdBySlug.get(activeSportSub.toLowerCase());
    if (liveTagId != null) return liveTagId;

    // Static fallback
    return getSportSubcategoryById(activeSportSub)?.tagId ?? null;
  }, [tagIdProp, activeSportSub, sportsMeta]);

  // ── Live team data (name → logo URL) ─────────────────────────────────────
  const { data: teamsData } = usePolymarketTeams();

  // ── Sports markets (paginated flat list) ──────────────────────────────────
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSportsEvents({ tagId: resolvedTagId });

  // ── Group flat markets into game cards ────────────────────────────────────
  // Merge all pages before grouping so a game whose 3 markets span page
  // boundaries is still assembled into a single complete card.
  const allSportsMarkets = useMemo(() => data?.pages.flat() ?? [], [data]);

  const allGames = useMemo(() => {
    const grouped = groupFlatMarketsIntoGames(allSportsMarkets).filter(isValidGameCard);
    // Enrich with live logo URLs once teamsData is available
    return teamsData ? enrichGamesWithTeamLogos(grouped, teamsData) : grouped;
  }, [allSportsMarkets, teamsData]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState message="Loading games..." />;

  if (error && !isLoading)
    return <ErrorState error={error as Error} title="Error loading games" />;

  if (!isLoading && allGames.length === 0)
    return (
      <EmptyState title="No Games" message="No active sports games found." />
    );

  return (
    <div className="space-y-3">
      {allGames.map((game) => (
        <SportsGameCard
          key={game.eventId}
          game={game}
          disabled={disabled}
          onOutcomeClick={onOutcomeClick}
        />
      ))}

      {(hasNextPage || isFetchingNextPage) && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400"
        >
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading more games...
        </div>
      )}

      {!hasNextPage && allGames.length > 0 && !isFetchingNextPage && (
        <p className="text-center text-xs text-gray-400 py-3">
          All {allGames.length} games loaded
        </p>
      )}
    </div>
  );
}
