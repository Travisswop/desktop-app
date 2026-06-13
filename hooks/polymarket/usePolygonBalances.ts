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

function normalizeAddresses(address: string | string[] | undefined): string[] {
  const addresses = Array.isArray(address) ? address : address ? [address] : [];
  return Array.from(
    new Map(
      addresses
        .filter(Boolean)
        .map((walletAddress) => [walletAddress.toLowerCase(), walletAddress]),
    ).values(),
  );
}

export function usePolygonBalances(address: string | string[] | undefined) {
  const { publicClient } = usePolymarketWallet();
  const addresses = normalizeAddresses(address);

  const {
    data: usdcBalance,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pusdBalance', addresses],
    queryFn: async () => {
      if (!addresses.length || !publicClient) return null;

      const balances = await Promise.all(
        addresses.map((walletAddress) =>
          publicClient.readContract({
            address: USDC_E_CONTRACT_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }),
        ),
      );

      return balances.reduce((sum, balance) => sum + balance, BigInt(0));
    },
    enabled: addresses.length > 0,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: legacyUsdcRaw, isLoading: isLoadingLegacy } =
    useQuery({
      queryKey: ['legacyUsdcBalance', addresses],
      queryFn: async () => {
        if (!addresses.length || !publicClient) return null;

        const balances = await Promise.all(
          addresses.map((walletAddress) =>
            publicClient.readContract({
              address: LEGACY_USDC_E_ADDRESS,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            }),
          ),
        );

        return balances.reduce((sum, balance) => sum + balance, BigInt(0));
      },
      enabled: addresses.length > 0,
      staleTime: QUERY_STALE_TIMES.BALANCE,
      refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const formattedUsdcBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance, USDC_E_DECIMALS))
    : 0;

  const legacyUsdcBalance = legacyUsdcRaw
    ? parseFloat(formatUnits(legacyUsdcRaw, USDC_E_DECIMALS))
    : 0;
  const totalUsdcBalance = formattedUsdcBalance + legacyUsdcBalance;

  return {
    usdcBalance: formattedUsdcBalance,
    formattedUsdcBalance: formattedUsdcBalance.toFixed(2),
    totalUsdcBalance,
    formattedTotalUsdcBalance: totalUsdcBalance.toFixed(2),
    rawUsdcBalance: usdcBalance,
    legacyUsdcBalance,
    rawLegacyUsdcBalance: legacyUsdcRaw,
    isLoading: isLoading || isLoadingLegacy,
    isError: !!error,
  };
}
