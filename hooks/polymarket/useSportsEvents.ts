import { useInfiniteQuery } from '@tanstack/react-query';
import { useTrading } from '@/providers/polymarket';
import { QUERY_STALE_TIMES } from '@/constants/polymarket';
import { fetchChunkedPrices } from '@/lib/polymarket/clob-prices';
import type { PolymarketMarket } from '@/hooks/polymarket';

/**
 * Fetch more markets per page so all three markets for a game (moneyline /
 * spread / total) are very likely to land on the same page and get grouped
 * correctly.  20 games × 3 markets = 60 markets per page.
 */
const PAGE_SIZE = 60;

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
}: UseSportsEventsOptions = {}) {
  const { isTradingSessionComplete } = useTrading();

  return useInfiniteQuery({
    queryKey: [
      'sports-events',
      tagId ?? null,
      live ?? false,
      kind ?? null,
      dateFrom ?? null,
      dateTo ?? null,
      !!isTradingSessionComplete,
    ],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PolymarketMarket[]> => {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(pageParam));
      if (tagId != null) qs.set('tag_id', String(tagId));
      if (live) qs.set('live', 'true');
      if (kind) qs.set('kind', kind);
      if (dateFrom) qs.set('date_from', dateFrom);
      if (dateTo) qs.set('date_to', dateTo);
      // Desktop endpoint — exposes the live / kind / date filters and the
      // extra event-level fields the A2 sportsbook table needs. Mobile
      // continues to call the original /markets proxy.
      const url = `/api/polymarket/desktop/markets?${qs.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sports markets');
      const markets: PolymarketMarket[] = await res.json();

      // ── Enrich with real-time CLOB prices ────────────────────────────────
      if (isTradingSessionComplete && markets.length > 0) {
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
                const priceMap: Record<string, (typeof globalPriceMap)[string]> = {};
                for (const tokenId of tokenIds) {
                  if (globalPriceMap[tokenId]) priceMap[tokenId] = globalPriceMap[tokenId];
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
