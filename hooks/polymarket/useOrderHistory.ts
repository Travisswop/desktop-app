import { useQuery } from "@tanstack/react-query";
import type { ClobClient } from "@polymarket/clob-client";
import type { PolymarketOrder } from "./useActiveOrders";

const CLOSED_STATUSES = new Set(["matched", "canceled", "cancelled"]);

export function useOrderHistory(
  clobClient: ClobClient | null,
  walletAddress: string | undefined
) {
  return useQuery({
    queryKey: ["order-history", walletAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!clobClient || !walletAddress) return [];
      try {
        // getOrders (if available) returns all orders including closed ones.
        // Fall back to empty array if the method doesn't exist on this client version.
        const allOrders =
          typeof (clobClient as any).getOrders === "function"
            ? await (clobClient as any).getOrders()
            : [];
        return (allOrders as any[]).filter((order: any) =>
          CLOSED_STATUSES.has((order.status ?? "").toLowerCase())
        ) as PolymarketOrder[];
      } catch {
        return [];
      }
    },
    enabled: !!clobClient && !!walletAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
