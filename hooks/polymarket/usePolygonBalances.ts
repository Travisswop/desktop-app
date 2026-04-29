import { erc20Abi, formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { usePolymarketWallet } from '@/providers/polymarket';
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  LEGACY_USDC_E_ADDRESS,
  QUERY_STALE_TIMES,
  QUERY_REFETCH_INTERVALS,
} from '@/constants/polymarket';

export function usePolygonBalances(address: string | undefined) {
  const { publicClient } = usePolymarketWallet();

  const {
    data: usdcBalance,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['usdcBalance', address],
    queryFn: async () => {
      if (!address || !publicClient) return null;

      const balance = await publicClient.readContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      return balance;
    },
    enabled: !!address,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: legacyUsdcRaw, isLoading: isLoadingLegacy } =
    useQuery({
      queryKey: ['legacyUsdcBalance', address],
      queryFn: async () => {
        if (!address || !publicClient) return null;

        const balance = await publicClient.readContract({
          address: LEGACY_USDC_E_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        return balance;
      },
      enabled: !!address,
      staleTime: QUERY_STALE_TIMES.BALANCE,
      refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
    });

  const formattedUsdcBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance, USDC_E_DECIMALS))
    : 0;

  const legacyUsdcBalance = legacyUsdcRaw
    ? parseFloat(formatUnits(legacyUsdcRaw, USDC_E_DECIMALS))
    : 0;

  return {
    usdcBalance: formattedUsdcBalance,
    formattedUsdcBalance: formattedUsdcBalance.toFixed(2),
    rawUsdcBalance: usdcBalance,
    legacyUsdcBalance,
    rawLegacyUsdcBalance: legacyUsdcRaw,
    isLoading: isLoading || isLoadingLegacy,
    isError: !!error,
  };
}
