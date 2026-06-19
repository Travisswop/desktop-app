import {
  QUERY_REFETCH_INTERVALS,
  QUERY_STALE_TIMES,
} from "@/constants/polymarket";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { mergeSettledArrays } from "@/lib/polymarket/stable-results";

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
  marketClosed?: boolean;
  marketResolutionPending?: boolean;
  marketResolutionSource?: "event-live";
  resolvedOutcomeIndex?: number;
  resolvedOutcomePrice?: number;
};

function normalizeAddresses(
  walletAddress: string | string[] | undefined,
): string[] {
  const addresses = Array.isArray(walletAddress)
    ? walletAddress
    : walletAddress
      ? [walletAddress]
      : [];

  return Array.from(
    new Map(
      addresses
        .filter(Boolean)
        .map((address) => [address.toLowerCase(), address]),
    ).values(),
  );
}

export function useUserPositions(
  walletAddress: string | string[] | undefined,
) {
  const walletAddresses = normalizeAddresses(walletAddress);

  return useQuery({
    queryKey: ["polymarket-positions", walletAddresses],
    queryFn: async (): Promise<PolymarketPosition[]> => {
      if (!walletAddresses.length) {
        throw new Error("Prediction wallet is not ready");
      }

      const positionSets = await Promise.allSettled(
        walletAddresses.map(async (address) => {
          const response = await fetch(
            `/api/polymarket/positions?user=${address}`,
          );

          if (!response.ok) {
            throw new Error("Failed to fetch positions");
          }

          return response.json() as Promise<PolymarketPosition[]>;
        }),
      );

      return mergeSettledArrays(positionSets, "Failed to fetch positions");
    },
    enabled: walletAddresses.length > 0,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: QUERY_STALE_TIMES.POSITIONS,
    refetchInterval: QUERY_REFETCH_INTERVALS.POSITIONS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
