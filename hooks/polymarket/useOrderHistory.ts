import { useQuery } from "@tanstack/react-query";
import { useTrading } from "@/providers/polymarket";
import { useUser } from "@/lib/UserContext";
import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";
import type { PolymarketOrder } from "./useActiveOrders";

export function useOrderHistory(
  _session: object | null,
  _walletAddress: string | undefined,
) {
  const { tradingSession, safeAddress, eoaAddress, isTradingSessionComplete } = useTrading();
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ["order-history", safeAddress],
    queryFn: async (): Promise<PolymarketOrder[]> => {
      if (!tradingSession?.apiCredentials || !safeAddress || !eoaAddress || !accessToken) return [];
      try {
        const res = await fetch(`${POLYMARKET_BACKEND_URL}/api/prediction-markets/orders/history`, {
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
        return Array.isArray(data.trades) ? data.trades : [];
      } catch {
        return [];
      }
    },
    enabled: !!isTradingSessionComplete && !!safeAddress,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
