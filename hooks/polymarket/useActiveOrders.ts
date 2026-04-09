import { useQuery } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";

export type PolymarketOrder = {
  id: string;
  status: string;
  owner: string;
  maker_address: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  original_size: string;
  size_matched: string;
  price: string;
  associate_trades: string[];
  outcome: string;
  created_at: number;
  expiration: string;
  order_type: string;
};

export function useActiveOrders(
  clobClient: ClobClient | null,
  walletAddress: string | undefined
) {
  return useQuery({
    queryKey: ["active-orders", walletAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!clobClient || !walletAddress) {
        return [];
      }

      try {
        // getOpenOrders() is authenticated — it already returns only the
        // current user's orders, so no maker_address filter is needed.
        const allOrders = await clobClient.getOpenOrders();

        // The CLOB API returns statuses in lowercase ("live", "matched",
        // "delayed"). Normalise before comparing to avoid missing orders.
        const OPEN_STATUSES = new Set(["live", "delayed"]);
        const activeOrders = (allOrders as any[]).filter((order) => {
          const status = (order.status ?? "").toLowerCase();
          if (!OPEN_STATUSES.has(status)) return false;
          const original = parseFloat(order.original_size ?? "0");
          const matched = parseFloat(order.size_matched ?? "0");
          return !isFinite(original) || original === 0
            ? true
            : matched < original; // hide fully filled orders
        });

        return activeOrders as PolymarketOrder[];
      } catch (err) {
        console.error("Error fetching open orders:", err);
        return [];
      }
    },
    enabled: !!clobClient && !!walletAddress,
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
