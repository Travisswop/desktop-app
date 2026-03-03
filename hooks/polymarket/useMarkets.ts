import { useQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/polymarket";
import { Side } from "@polymarket/clob-client";
import type { CategoryId } from "@/constants/polymarket";
import { getCategoryById, QUERY_STALE_TIMES } from "@/constants/polymarket";

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

interface UseMarketsOptions {
  limit?: number;
  categoryId?: CategoryId;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const { limit = 10, categoryId = "trending" } = options;
  const { clobClient } = useTrading();

  return useQuery({
    queryKey: ["high-volume-markets", limit, categoryId, !!clobClient],
    queryFn: async (): Promise<PolymarketMarket[]> => {
      const category = getCategoryById(categoryId);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      let url = `${apiBase}/api/v5/prediction-markets/markets?limit=${limit}`;

      if (category?.tagId) {
        url += `&tag_id=${category.tagId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch markets");
      }

      const markets: PolymarketMarket[] = await response.json();

      // Fetch realtime prices using batch API — one POST /prices call per side
      // instead of N×2 individual requests per market
      if (clobClient && markets.length > 0) {
        try {
          // Collect all token IDs across every market
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
            // Two batch requests: BUY side = best ask, SELL side = best bid
            const [bidPrices, askPrices] = await Promise.all([
              clobClient.getPrices(
                allTokenIds.map((id) => ({ token_id: id, side: Side.SELL }))
              ),
              clobClient.getPrices(
                allTokenIds.map((id) => ({ token_id: id, side: Side.BUY }))
              ),
            ]);

            // Map prices back onto each market
            for (const market of markets) {
              if (!market.clobTokenIds) continue;

              try {
                const tokenIds: string[] = JSON.parse(market.clobTokenIds);
                const priceMap: Record<string, any> = {};

                for (const tokenId of tokenIds) {
                  const bidPrice = parseFloat(
                    (bidPrices as Record<string, string>)[tokenId] ?? "0"
                  );
                  const askPrice = parseFloat(
                    (askPrices as Record<string, string>)[tokenId] ?? "0"
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
    // Market metadata from Gamma API is stable — use the 5-minute constant.
    // Real-time prices are fetched inside the same queryFn and will refresh
    // on each refetch, but we don't need to hammer the Gamma API every 3s.
    staleTime: QUERY_STALE_TIMES.MARKETS,
    refetchInterval: 60_000, // refresh market list every 60s
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
