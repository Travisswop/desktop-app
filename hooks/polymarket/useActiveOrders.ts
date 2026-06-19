import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import {
  POLYMARKET_BACKEND_PROXY_URL,
  QUERY_REFETCH_INTERVALS,
  QUERY_STALE_TIMES,
} from "@/constants/polymarket";

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
  options?: { enabled?: boolean },
) {
  const {
    tradingSession,
    safeAddress,
    eoaAddress,
    isTradingSessionComplete,
    walletType,
    depositWalletAddress,
    isGeoblocked,
    isGeoblockLoading,
  } = useTrading();
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ["active-orders", safeAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) {
        throw new Error("Prediction order session is not ready");
      }

      const res = await fetch(`${POLYMARKET_BACKEND_PROXY_URL}/orders/active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          safeAddress,
          depositWalletAddress,
          walletType,
          eoaAddress,
          apiCreds: tradingSession.apiCredentials,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh active orders");
      }

      const orders: PolymarketOrder[] = Array.isArray(data.orders) ? data.orders : [];
      const OPEN_STATUSES = new Set(["live", "delayed"]);
      return orders.filter((order) => {
        const status = (order.status ?? "").toLowerCase();
        if (!OPEN_STATUSES.has(status)) return false;
        const original = parseFloat(order.original_size ?? "0");
        const matched = parseFloat(order.size_matched ?? "0");
        return !isFinite(original) || original === 0 ? true : matched < original;
      });
    },
    enabled:
      options?.enabled !== false &&
      !isGeoblocked &&
      !isGeoblockLoading &&
      !!isTradingSessionComplete &&
      !!safeAddress,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: QUERY_STALE_TIMES.ORDERS,
    refetchInterval: QUERY_REFETCH_INTERVALS.ORDERS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
