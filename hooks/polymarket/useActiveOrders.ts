import { useQuery } from "@tanstack/react-query";

export type PolymarketOrder = {
  id: string;
  status: string;
  owner: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  created_at: number;
  expiration: string;
  order_type: string;
};

// AMM trades are on-chain and final — there are no resting open orders.
// This hook returns an empty list. It is kept so the Orders UI tab compiles.
// Phase 3 (optional orderbook) can re-populate this from a trade history indexer.
export function useActiveOrders(
  _ignored: unknown,
  walletAddress: string | undefined,
) {
  return useQuery({
    queryKey: ["active-orders", walletAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => [],
    enabled: !!walletAddress,
    staleTime: 60_000,
  });
}
