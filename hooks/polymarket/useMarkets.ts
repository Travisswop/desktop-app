import type { CategoryId } from "@/constants/polymarket";
import { getCategoryById, QUERY_STALE_TIMES } from "@/constants/polymarket";
import { useTrading } from "@/providers/polymarket";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchChunkedPrices } from "@/lib/polymarket/clob-prices";

export type PolymarketMarket = {
  id: string;
  question: string;
  description?: string;
  slug: string;
  active: boolean;
  closed: boolean;
  icon?: string;
  image?: string;
  volume?: string;
  volume24hr?: string | number;
  liquidity?: string | number;
  spread?: string;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  conditionId?: string;
  endDate?: string;
  endDateIso?: string;
  gameStartTime?: string;
  events?: any[];
  eventTitle?: string;
  eventSlug?: string;
  eventId?: string;
  eventIcon?: string;
  /**
   * Per-team metadata attached by Polymarket to sports events (logo,
   * abbreviation, brand color). Usually two entries keyed by team name.
   */
  eventTeams?: Array<{
    id?: number | string;
    name?: string;
    league?: string;
    logo?: string;
    abbreviation?: string;
    color?: string;
  }>;
  negRisk?: boolean;
  orderMinSize?: number;
  orderPriceMinTickSize?: number;
  realtimePrices?: Record<
    string,
    {
      bidPrice: number;
      askPrice: number;
      midPrice: number;
      spread: number;
    }
  >;
  [key: string]: any;
};

export const MARKETS_PAGE_SIZE = 20;

interface UseMarketsOptions {
  categoryId?: CategoryId;
  /** Override the tag_id used for filtering (e.g. a sport subcategory tag) */
  overrideTagId?: number | null;
  /** Set to false to skip fetching (e.g. when the sports events view is active) */
  enabled?: boolean;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const { categoryId = "trending", overrideTagId, enabled = true } = options;
  const { clobClient } = useTrading();

  return useInfiniteQuery({
    queryKey: ["high-volume-markets", categoryId, overrideTagId, !!clobClient],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PolymarketMarket[]> => {
      const category = getCategoryById(categoryId);
      let url = `/api/polymarket/markets?limit=${MARKETS_PAGE_SIZE}&offset=${pageParam}`;

      // overrideTagId (sport subcategory) takes priority over category-level tagId
      const tagId =
        overrideTagId !== undefined ? overrideTagId : category?.tagId;
      if (tagId) {
        url += `&tag_id=${tagId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch markets");
      }

      const markets: PolymarketMarket[] = await response.json();

      // Fetch realtime prices using batch API — one POST /prices call per side
      if (clobClient && markets.length > 0) {
        try {
          const allTokenIds: string[] = [];
          for (const market of markets) {
            if (market.clobTokenIds) {
              try {
                const ids: string[] = JSON.parse(market.clobTokenIds);
                allTokenIds.push(...ids);
              } catch {
                // ignore malformed clobTokenIds
              }
            }
          }

          if (allTokenIds.length > 0) {
            // Use chunked fetching to stay under the CLOB payload size limit
            const globalPriceMap = await fetchChunkedPrices(clobClient, allTokenIds);

            for (const market of markets) {
              if (!market.clobTokenIds) continue;
              try {
                const tokenIds: string[] = JSON.parse(market.clobTokenIds);
                const priceMap: Record<string, typeof globalPriceMap[string]> = {};
                for (const tokenId of tokenIds) {
                  if (globalPriceMap[tokenId]) priceMap[tokenId] = globalPriceMap[tokenId];
                }
                market.realtimePrices = priceMap;
              } catch {
                // ignore malformed clobTokenIds on individual market
              }
            }
          }
        } catch (error) {
          console.warn("[Polymarket] Batch price fetch failed:", error);
        }
      }

      return markets;
    },
    // If the page returned fewer items than PAGE_SIZE, there are no more pages
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MARKETS_PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    staleTime: QUERY_STALE_TIMES.MARKETS,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
