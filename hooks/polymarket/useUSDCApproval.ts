import { useState, useCallback } from 'react';
import { erc20Abi, parseUnits } from 'viem';
import { usePolymarketWallet } from '@/providers/polymarket';
import { USDC_E_CONTRACT_ADDRESS, USDC_E_DECIMALS } from '@/constants/polymarket';
import { AMM_ROUTER_ADDRESS } from '@/constants/polymarket/abis';

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

export function useUSDCApproval() {
  const { publicClient, walletClient, eoaAddress } = usePolymarketWallet();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /// Check current USDC allowance for the AMM Router.
  const checkAllowance = useCallback(async (): Promise<bigint> => {
    if (!publicClient || !eoaAddress) return 0n;

    const allowance = await publicClient.readContract({
      address: USDC_E_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [eoaAddress as `0x${string}`, AMM_ROUTER_ADDRESS],
    });

    return allowance as bigint;
  }, [publicClient, eoaAddress]);

  /// Returns true if the current allowance covers `usdcAmount` (in human units, e.g. 10.5).
  const isApproved = useCallback(async (usdcAmount: number): Promise<boolean> => {
    const allowance = await checkAllowance();
    const required = parseUnits(usdcAmount.toString(), USDC_E_DECIMALS);
    return allowance >= required;
  }, [checkAllowance]);

  /// Approve max USDC for the AMM Router (one-time approval).
  const approveUSDC = useCallback(async () => {
    if (!walletClient || !eoaAddress) throw new Error('Wallet not connected');
    if (!AMM_ROUTER_ADDRESS) throw new Error('AMM Router address not configured');

    setIsApproving(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [AMM_ROUTER_ADDRESS, MAX_UINT256],
        account: eoaAddress as `0x${string}`,
        chain: undefined,
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Approval failed');
      setError(e);
      throw e;
    } finally {
      setIsApproving(false);
    }
  }, [walletClient, publicClient, eoaAddress]);

  return { checkAllowance, isApproved, approveUSDC, isApproving, error };
}
