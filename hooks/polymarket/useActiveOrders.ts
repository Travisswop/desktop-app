import { useQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";

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
  _session: object | null,
  _walletAddress: string | undefined,
) {
  const { tradingSession, safeAddress, eoaAddress, isTradingSessionComplete } = useTrading();
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ["active-orders", safeAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) return [];
      try {
        const res = await fetch(`${POLYMARKET_BACKEND_URL}/api/prediction-markets/orders/active`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            safeAddress,
            eoaAddress,
            apiCreds: tradingSession.apiCredentials,
          }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        const orders: PolymarketOrder[] = Array.isArray(data.orders) ? data.orders : [];
        const OPEN_STATUSES = new Set(["live", "delayed"]);
        return orders.filter((order) => {
          const status = (order.status ?? "").toLowerCase();
          if (!OPEN_STATUSES.has(status)) return false;
          const original = parseFloat(order.original_size ?? "0");
          const matched = parseFloat(order.size_matched ?? "0");
          return !isFinite(original) || original === 0 ? true : matched < original;
        });
      } catch {
        return [];
      }
    },
    enabled: !!isTradingSessionComplete && !!safeAddress,
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
