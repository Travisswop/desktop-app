import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { usePolymarketWallet } from '@/providers/polymarket';
import { RouterABI, AMM_ROUTER_ADDRESS } from '@/constants/polymarket/abis';
import { USDC_E_DECIMALS } from '@/constants/polymarket';
import { useUSDCApproval } from './useUSDCApproval';

export type AMMOrderParams = {
  marketId: `0x${string}`;  // bytes32 market identifier
  isYes: boolean;
  isBuy: boolean;
  /** USDC amount when buying; outcome token amount when selling (human units) */
  amount: number;
  /** Minimum acceptable output (human units). Used as slippage guard. */
  minOut: number;
};

export function useAMMOrder() {
  const { walletClient, publicClient, eoaAddress } = usePolymarketWallet();
  const { isApproved, approveUSDC } = useUSDCApproval();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submitOrder = useCallback(async (params: AMMOrderParams) => {
    if (!walletClient || !eoaAddress) throw new Error('Wallet not connected');
    if (!AMM_ROUTER_ADDRESS) throw new Error('AMM Router address not configured');

    setIsSubmitting(true);
    setError(null);
    setTxHash(null);

    try {
      const amountRaw = parseUnits(params.amount.toString(), USDC_E_DECIMALS);
      const minOutRaw = parseUnits(params.minOut.toString(), USDC_E_DECIMALS);

      // For buy orders ensure USDC allowance is sufficient
      if (params.isBuy) {
        const approved = await isApproved(params.amount);
        if (!approved) {
          await approveUSDC();
        }
      }

      let functionName: 'buyYes' | 'buyNo' | 'sellYes' | 'sellNo';
      if (params.isBuy && params.isYes) functionName = 'buyYes';
      else if (params.isBuy && !params.isYes) functionName = 'buyNo';
      else if (!params.isBuy && params.isYes) functionName = 'sellYes';
      else functionName = 'sellNo';

      const hash = await walletClient.writeContract({
        address: AMM_ROUTER_ADDRESS,
        abi: RouterABI,
        functionName,
        args: [params.marketId, amountRaw, minOutRaw],
        account: eoaAddress as `0x${string}`,
        chain: undefined,
      });

      setTxHash(hash);
      await publicClient?.waitForTransactionReceipt({ hash });

      // Invalidate relevant queries so UI refreshes
      queryClient.invalidateQueries({ queryKey: ['amm-pool', ] });
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });

      return { success: true, hash };
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Order failed');
      setError(e);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, [walletClient, publicClient, eoaAddress, isApproved, approveUSDC, queryClient]);

  return { submitOrder, isSubmitting, txHash, error };
}
