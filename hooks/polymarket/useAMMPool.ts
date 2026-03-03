import { useQuery } from '@tanstack/react-query';
import { usePolymarketWallet } from '@/providers/polymarket';
import { AMMPoolABI } from '@/constants/polymarket/abis';
import { QUERY_STALE_TIMES, QUERY_REFETCH_INTERVALS } from '@/constants/polymarket';

export type AMMPoolState = {
  reserveYes: bigint;
  reserveNo: bigint;
  yesPrice: number;   // 0–1 implied probability
  resolved: boolean;
  yesWon: boolean;
  yesTokenAddress: `0x${string}`;
  noTokenAddress: `0x${string}`;
};

/// Returns live AMM pool state (reserves, price, resolution) for a given pool address.
export function useAMMPool(poolAddress: `0x${string}` | undefined) {
  const { publicClient } = usePolymarketWallet();

  return useQuery({
    queryKey: ['amm-pool', poolAddress],
    queryFn: async (): Promise<AMMPoolState> => {
      if (!publicClient || !poolAddress) throw new Error('Not ready');

      const [reserveYes, reserveNo, yesPriceRaw, resolved, yesWon, yesTokenAddress, noTokenAddress] =
        await Promise.all([
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'reserveYes' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'reserveNo' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'yesPrice' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'resolved' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'yesWon' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'yesToken' }),
          publicClient.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'noToken' }),
        ]);

      return {
        reserveYes: reserveYes as bigint,
        reserveNo: reserveNo as bigint,
        // yesPrice is returned scaled to 1e6 by the contract
        yesPrice: Number(yesPriceRaw as bigint) / 1e6,
        resolved: resolved as boolean,
        yesWon: yesWon as boolean,
        yesTokenAddress: yesTokenAddress as `0x${string}`,
        noTokenAddress: noTokenAddress as `0x${string}`,
      };
    },
    enabled: !!publicClient && !!poolAddress,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
    refetchIntervalInBackground: false,
  });
}

/// Preview how many outcome tokens you receive for a given USDC input (no tx required).
export function useAMMQuote(
  poolAddress: `0x${string}` | undefined,
  isYes: boolean,
  usdcIn: number,
) {
  const { publicClient } = usePolymarketWallet();
  const usdcInRaw = BigInt(Math.floor(usdcIn * 1e6));

  return useQuery({
    queryKey: ['amm-quote', poolAddress, isYes, usdcIn],
    queryFn: async (): Promise<{ tokensOut: number; priceImpact: number }> => {
      if (!publicClient || !poolAddress || usdcIn <= 0) {
        return { tokensOut: 0, priceImpact: 0 };
      }

      const tokensOutRaw = await publicClient.readContract({
        address: poolAddress,
        abi: AMMPoolABI,
        functionName: 'getAmountOut',
        args: [isYes, usdcInRaw],
      });

      const tokensOut = Number(tokensOutRaw as bigint) / 1e6;
      // Effective price paid per token
      const effectivePrice = tokensOut > 0 ? usdcIn / tokensOut : 0;
      const priceImpact = effectivePrice > 0 ? (effectivePrice - 0.5) / 0.5 : 0;

      return { tokensOut, priceImpact };
    },
    enabled: !!publicClient && !!poolAddress && usdcIn > 0,
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
}
