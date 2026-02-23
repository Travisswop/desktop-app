import { useQuery } from "@tanstack/react-query";
import { QUERY_STALE_TIMES, QUERY_REFETCH_INTERVALS } from "@/constants/polymarket";

export type PolymarketPosition = {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  eventId?: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  negativeRisk: boolean;
};

export function useUserPositions(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ["polymarket-positions", walletAddress],
    queryFn: async (): Promise<PolymarketPosition[]> => {
      if (!walletAddress) return [];

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${apiBase}/api/v5/prediction-markets/positions?user=${walletAddress}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch positions");
      }

      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: QUERY_STALE_TIMES.POSITIONS,
    refetchInterval: QUERY_REFETCH_INTERVALS.POSITIONS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
