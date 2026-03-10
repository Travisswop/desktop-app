import { useQuery } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";
import type { PolymarketOrder } from "./useActiveOrders";

export function useOrderHistory(
  clobClient: ClobClient | null,
  walletAddress: string | undefined
) {
  return useQuery({
    queryKey: ["order-history", walletAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!clobClient || !walletAddress) return [];
      try {
        // ClobClient v5 does not have getOrders(). Use getTrades() which returns
        // the user's executed trade history from the /data/trades endpoint.
        // only_first_page=true prevents paginating through every historical trade.
        const trades = await clobClient.getTrades(undefined, true);
        return (trades as any[]).map((trade: any) => ({
          id: trade.id ?? "",
          status: (trade.status ?? "confirmed").toLowerCase(),
          owner: trade.owner ?? "",
          maker_address: trade.maker_address ?? "",
          market: trade.market ?? "",
          asset_id: trade.asset_id ?? "",
          side: trade.side as "BUY" | "SELL",
          // A trade record represents a completed match — original_size and
          // size_matched are both the trade size (100% filled by definition).
          original_size: trade.size ?? "0",
          size_matched: trade.size ?? "0",
          price: trade.price ?? "0",
          associate_trades: [],
          outcome: trade.outcome ?? "",
          created_at: trade.match_time
            ? Math.floor(new Date(trade.match_time).getTime() / 1000)
            : 0,
          expiration: "",
          order_type: "FOK",
        })) as PolymarketOrder[];
      } catch {
        return [];
      }
    },
    enabled: !!clobClient && !!walletAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
