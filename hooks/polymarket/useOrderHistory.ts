import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import { POLYMARKET_BACKEND_PROXY_URL } from "@/constants/polymarket";
import type { PolymarketOrder } from "./useActiveOrders";

export function useOrderHistory(
  _session: object | null,
  _walletAddress: string | undefined,
) {
  const {
    tradingSession,
    safeAddress,
    eoaAddress,
    isTradingSessionComplete,
    walletType,
    depositWalletAddress,
  } = useTrading();
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ["order-history", safeAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) {
        throw new Error("Prediction order session is not ready");
      }

      const res = await fetch(`${POLYMARKET_BACKEND_PROXY_URL}/orders/history`, {
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
        throw new Error(data.error || "Failed to refresh order history");
      }

      return Array.isArray(data.trades) ? data.trades : [];
    },
    enabled: !!isTradingSessionComplete && !!safeAddress,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
