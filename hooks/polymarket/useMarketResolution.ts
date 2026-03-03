import { useState, useCallback } from 'react';
import { erc20Abi, parseUnits } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePolymarketWallet } from '@/providers/polymarket';
import { ResolutionABI, AMM_RESOLUTION_ADDRESS } from '@/constants/polymarket/abis';
import { AMMPoolABI } from '@/constants/polymarket/abis';
import { USDC_E_DECIMALS } from '@/constants/polymarket';

/// Checks if a market is resolved and how many winning tokens the user can redeem.
export function useMarketResolution(
  poolAddress: `0x${string}` | undefined,
) {
  const { publicClient, walletClient, eoaAddress } = usePolymarketWallet();
  const queryClient = useQueryClient();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { data: redeemableAmount } = useQuery({
    queryKey: ['redeemable', poolAddress, eoaAddress],
    queryFn: async (): Promise<number> => {
      if (!publicClient || !poolAddress || !eoaAddress || !AMM_RESOLUTION_ADDRESS) return 0;

      const raw = await publicClient.readContract({
        address: AMM_RESOLUTION_ADDRESS,
        abi: ResolutionABI,
        functionName: 'getRedeemableAmount',
        args: [poolAddress, eoaAddress as `0x${string}`],
      });

      return Number(raw as bigint) / 1e6;
    },
    enabled: !!publicClient && !!poolAddress && !!eoaAddress && !!AMM_RESOLUTION_ADDRESS,
    refetchInterval: 30_000,
  });

  const redeem = useCallback(async (tokensIn: number) => {
    if (!walletClient || !eoaAddress || !poolAddress) throw new Error('Wallet not connected');
    if (!AMM_RESOLUTION_ADDRESS) throw new Error('Resolution contract not configured');

    setIsRedeeming(true);
    setError(null);

    try {
      // First check whether we need to approve the Resolution contract to burn tokens
      const resolved = await publicClient?.readContract({
        address: poolAddress,
        abi: AMMPoolABI,
        functionName: 'resolved',
      });

      if (!resolved) throw new Error('Market is not resolved yet');

      const yesWon = await publicClient?.readContract({
        address: poolAddress,
        abi: AMMPoolABI,
        functionName: 'yesWon',
      });

      const winningTokenAddress = yesWon
        ? await publicClient?.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'yesToken' })
        : await publicClient?.readContract({ address: poolAddress, abi: AMMPoolABI, functionName: 'noToken' });

      const tokensInRaw = parseUnits(tokensIn.toString(), USDC_E_DECIMALS);

      // Approve Resolution contract to spend winning tokens
      const allowance = await publicClient?.readContract({
        address: winningTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [eoaAddress as `0x${string}`, AMM_RESOLUTION_ADDRESS],
      });

      if ((allowance as bigint) < tokensInRaw) {
        const approveHash = await walletClient.writeContract({
          address: winningTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [AMM_RESOLUTION_ADDRESS, tokensInRaw],
          account: eoaAddress as `0x${string}`,
          chain: undefined,
        });
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      const hash = await walletClient.writeContract({
        address: AMM_RESOLUTION_ADDRESS,
        abi: ResolutionABI,
        functionName: 'redeem',
        args: [poolAddress, tokensInRaw],
        account: eoaAddress as `0x${string}`,
        chain: undefined,
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      queryClient.invalidateQueries({ queryKey: ['redeemable', poolAddress] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });

      return { success: true, hash };
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Redemption failed');
      setError(e);
      throw e;
    } finally {
      setIsRedeeming(false);
    }
  }, [walletClient, publicClient, eoaAddress, poolAddress, queryClient]);

  return { redeemableAmount: redeemableAmount ?? 0, redeem, isRedeeming, error };
}
