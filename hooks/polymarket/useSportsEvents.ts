import { useInfiniteQuery } from '@tanstack/react-query';
import {
  QUERY_REFETCH_INTERVALS,
  QUERY_STALE_TIMES,
} from '@/constants/polymarket';
import { fetchChunkedPrices } from '@/lib/polymarket/clob-prices';
import type { PolymarketMarket } from '@/hooks/polymarket';

/**
 * Fetch more markets per page so all three markets for a game (moneyline /
 * spread / total) are very likely to land on the same page and get grouped
 * correctly.  20 games × 3 markets = 60 markets per page.
 */
const PAGE_SIZE = 96;

export interface UseSportsEventsOptions {
  /** Polymarket tag ID for the sport (e.g. 745 = NBA, 100639 = all sports). */
  tagId?: number | null;
  /** Set false to skip fetching (e.g. when a non-sports category is active). */
  enabled?: boolean;
  /** Backend filter — true to keep only currently-live events. */
  live?: boolean;
  /** Backend filter — "gamelines" (matchups) or "futures" (championship-style). */
  kind?: 'gamelines' | 'futures';
  /** Backend filter — keep events whose startDate is >= this ISO timestamp. */
  dateFrom?: string;
  /** Backend filter — keep events whose startDate is < this ISO timestamp. */
  dateTo?: string;
  /** Server-side game/market search. */
  searchQuery?: string;
  /** Set false for overview cards that only need Gamma's embedded odds. */
  includeRealtimePrices?: boolean;
  /** Override the polling cadence for lightweight overview surfaces. */
  refetchIntervalMs?: number | false;
  refetchOnWindowFocus?: boolean;
}

/**
 * Fetches sports markets from the /markets endpoint, which correctly honours
 * the tag_id filter (unlike the Gamma /events endpoint which ignores it).
 *
 * Returns a flat PolymarketMarket[] per page, price-enriched via the CLOB
 * API.  Callers must group the pages into SportsGameGroup[] using
 * groupFlatMarketsIntoGames (done in Markets/index.tsx so cross-page
 * duplicates are merged before grouping).
 */
export function useSportsEvents({
  tagId,
  enabled = true,
  live,
  kind,
  dateFrom,
  dateTo,
  searchQuery = '',
  includeRealtimePrices = true,
  refetchIntervalMs = QUERY_REFETCH_INTERVALS.MARKETS,
  refetchOnWindowFocus = true,
}: UseSportsEventsOptions = {}) {
  const trimmedSearch = searchQuery.trim();
  const shouldApplyDateWindow = kind !== 'futures' && !live;
  const effectiveDateFrom = shouldApplyDateWindow ? dateFrom : undefined;
  const effectiveDateTo = shouldApplyDateWindow ? dateTo : undefined;

  return useInfiniteQuery({
    queryKey: [
      'sports-events',
      tagId ?? null,
      live ?? false,
      kind ?? null,
      effectiveDateFrom ?? null,
      effectiveDateTo ?? null,
      trimmedSearch,
      includeRealtimePrices,
    ],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PolymarketMarket[]> => {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(pageParam));
      qs.set('quality', 'relaxed');
      if (tagId != null) qs.set('tag_id', String(tagId));
      if (live) qs.set('live', 'true');
      if (kind) qs.set('kind', kind);
      if (effectiveDateFrom) qs.set('date_from', effectiveDateFrom);
      if (effectiveDateTo) qs.set('date_to', effectiveDateTo);
      if (trimmedSearch) qs.set('q', trimmedSearch);
      // Desktop endpoint — exposes the live / kind / date filters and the
      // extra event-level fields the A2 sportsbook table needs. Mobile
      // continues to call the original /markets proxy.
      const url = `/api/polymarket/desktop/markets?${qs.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sports markets');
      const markets: PolymarketMarket[] = await res.json();

      // ── Enrich with real-time CLOB prices ────────────────────────────────
      // The /prices endpoint is public — no trading session required. Gating
      // this on session init used to leave lists showing stale Gamma odds
      // until the wallet finished initializing.
      if (includeRealtimePrices && markets.length > 0) {
        const allTokenIds: string[] = [];
        for (const market of markets) {
          if (!market.clobTokenIds) continue;
          try {
            const ids: string[] = JSON.parse(market.clobTokenIds);
            allTokenIds.push(...ids);
          } catch {
            // ignore malformed JSON
          }
        }

        if (allTokenIds.length > 0) {
          try {
            const globalPriceMap = await fetchChunkedPrices(allTokenIds);
            for (const market of markets) {
              if (!market.clobTokenIds) continue;
              try {
                const tokenIds: string[] = JSON.parse(market.clobTokenIds);
                const priceMap: Record<
                  string,
                  (typeof globalPriceMap)[string]
                > = {};
                for (const tokenId of tokenIds) {
                  if (globalPriceMap[tokenId])
                    priceMap[tokenId] = globalPriceMap[tokenId];
                }
                market.realtimePrices = priceMap;
              } catch {
                // ignore malformed clobTokenIds on individual market
              }
            }
          } catch (err) {
            console.warn('[sports-events] Real-time price fetch failed:', err);
          }
        }
      }

      return markets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    staleTime: QUERY_STALE_TIMES.MARKETS,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus,
  });
}
