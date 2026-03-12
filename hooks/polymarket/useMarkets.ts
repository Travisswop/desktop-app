import type { CategoryId } from "@/constants/polymarket";
import { getCategoryById, QUERY_STALE_TIMES } from "@/constants/polymarket";
import { useTrading } from "@/providers/polymarket";
import { Side } from "@polymarket/clob-client";
import { useInfiniteQuery } from "@tanstack/react-query";

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
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const { categoryId = "trending", overrideTagId } = options;
  const { clobClient } = useTrading();

  return useInfiniteQuery({
    queryKey: ["high-volume-markets", categoryId, overrideTagId, !!clobClient],
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
            const [bidPrices, askPrices] = await Promise.all([
              clobClient.getPrices(
                allTokenIds.map((id) => ({ token_id: id, side: Side.SELL })),
              ),
              clobClient.getPrices(
                allTokenIds.map((id) => ({ token_id: id, side: Side.BUY })),
              ),
            ]);

            for (const market of markets) {
              if (!market.clobTokenIds) continue;

              try {
                const tokenIds: string[] = JSON.parse(market.clobTokenIds);
                const priceMap: Record<string, any> = {};

                for (const tokenId of tokenIds) {
                  const bidPrice = parseFloat(
                    (bidPrices as Record<string, string>)[tokenId] ?? "0",
                  );
                  const askPrice = parseFloat(
                    (askPrices as Record<string, string>)[tokenId] ?? "0",
                  );

                  if (
                    !isNaN(bidPrice) &&
                    !isNaN(askPrice) &&
                    bidPrice > 0 &&
                    bidPrice < 1 &&
                    askPrice > 0 &&
                    askPrice < 1
                  ) {
                    priceMap[tokenId] = {
                      bidPrice,
                      askPrice,
                      midPrice: (bidPrice + askPrice) / 2,
                      spread: askPrice - bidPrice,
                    };
                  }
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
