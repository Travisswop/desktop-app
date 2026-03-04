import type { CategoryId } from '@/constants/polymarket';
import { getCategoryById, QUERY_STALE_TIMES } from '@/constants/polymarket';
import { pmApi } from '@/lib/polymarket/polymarketApi';
import { useQuery } from '@tanstack/react-query';

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
  overrideTagId?: number | null;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const { limit = 10, categoryId = 'trending', overrideTagId } = options;

  return useQuery({
    queryKey: ['high-volume-markets', limit, categoryId, overrideTagId],
    queryFn: async (): Promise<PolymarketMarket[]> => {
      const category = getCategoryById(categoryId);
      let url = `/api/polymarket/markets?limit=${limit}`;

      const tagId =
        overrideTagId !== undefined ? overrideTagId : category?.tagId;
      if (tagId) {
        url += `&tag_id=${tagId}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch markets');

      const markets: PolymarketMarket[] = await response.json();

      // Batch-fetch realtime bid/ask prices from polymarket-backend
      if (markets.length > 0) {
        try {
          const allTokenIds: string[] = [];
          for (const market of markets) {
            if (market.clobTokenIds) {
              try {
                const ids: string[] = JSON.parse(market.clobTokenIds);
                allTokenIds.push(...ids);
              } catch {
                // ignore malformed
              }
            }
          }

          if (allTokenIds.length > 0) {
            // Single call returns both bid and ask per token
            const prices = await pmApi<
              Record<string, { bid: number | null; ask: number | null }>
            >('/prices', {
              method: 'POST',
              body: JSON.stringify({ tokenIds: allTokenIds }),
            });

            for (const market of markets) {
              if (!market.clobTokenIds) continue;
              try {
                const tokenIds: string[] = JSON.parse(market.clobTokenIds);
                const priceMap: Record<string, any> = {};

                for (const tokenId of tokenIds) {
                  const entry = prices[tokenId];
                  if (!entry) continue;
                  const bidPrice = entry.bid ?? 0;
                  const askPrice = entry.ask ?? 0;

                  if (
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
                // ignore
              }
            }
          }
        } catch (error) {
          console.warn('[Polymarket] Batch price fetch failed:', error);
        }
      }

      return markets;
    },
    staleTime: QUERY_STALE_TIMES.MARKETS,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
