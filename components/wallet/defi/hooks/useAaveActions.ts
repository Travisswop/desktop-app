'use client';

import { useCallback } from 'react';
import { useSendTransaction } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { CHAIN_ID } from '@/types/wallet-types';
import type { AaveActionMode, AaveChain, AaveReserve } from '@/types/aave';

// Read-only RPC endpoints for allowance / balance checks (writes go through Privy)
const RPC_URLS: Record<AaveChain, string> = {
  ethereum:
    process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL || 'https://eth.llamarpc.com',
  polygon:
    process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL || 'https://polygon-rpc.com',
  base: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL || 'https://mainnet.base.org',
  arbitrum:
    process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL ||
    'https://arb1.arbitrum.io/rpc',
};

export const getAaveReadProvider = (chain: AaveChain) =>
  new ethers.JsonRpcProvider(RPC_URLS[chain]);

const ERC20_IFACE = new ethers.Interface([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
]);

const POOL_IFACE = new ethers.Interface([
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function withdraw(address asset, uint256 amount, address to)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
]);

// Aave v3 interest rate mode: 2 = variable (stable mode is deprecated)
const VARIABLE_RATE = 2n;

export interface AaveTxParams {
  chain: AaveChain;
  poolAddress: string;
  reserve: AaveReserve;
  userAddress: string;
  /** Parsed token amount in base units. Ignored when isMax for withdraw/repay. */
  amount: bigint;
  /** Withdraw/repay the full position using type(uint256).max */
  isMax?: boolean;
}

export interface AaveTxProgress {
  (step: 'approving' | 'confirming'): void;
}

export function useAaveActions() {
  const { sendTransaction } = useSendTransaction();

  /** Read the wallet's token balance and Pool allowance for a reserve. */
  const fetchBalanceAndAllowance = useCallback(
    async (
      chain: AaveChain,
      asset: string,
      owner: string,
      spender: string,
    ): Promise<{ balance: bigint; allowance: bigint }> => {
      const provider = getAaveReadProvider(chain);
      const token = new ethers.Contract(
        asset,
        ERC20_IFACE.fragments,
        provider,
      );
      const [balance, allowance] = await Promise.all([
        token.balanceOf(owner),
        token.allowance(owner, spender),
      ]);
      return { balance, allowance };
    },
    [],
  );

  /** Ensure the Aave Pool can pull `amount` of `asset` from the user. */
  const ensureAllowance = useCallback(
    async (params: AaveTxParams, onProgress?: AaveTxProgress) => {
      const { chain, poolAddress, reserve, userAddress, amount } = params;
      const { allowance } = await fetchBalanceAndAllowance(
        chain,
        reserve.asset,
        userAddress,
        poolAddress,
      );
      if (allowance >= amount) return;

      onProgress?.('approving');
      // One-time unlimited approval to the canonical Aave Pool — standard DeFi
      // UX and required for MAX repays where interest accrues between blocks.
      const data = ERC20_IFACE.encodeFunctionData('approve', [
        poolAddress,
        ethers.MaxUint256,
      ]);
      await sendTransaction(
        {
          to: reserve.asset as `0x${string}`,
          data: data as `0x${string}`,
          chainId: CHAIN_ID[chain],
        },
        { sponsor: true },
      );
    },
    [fetchBalanceAndAllowance, sendTransaction],
  );

  const execute = useCallback(
    async (
      mode: AaveActionMode,
      params: AaveTxParams,
      onProgress?: AaveTxProgress,
    ): Promise<{ hash: string }> => {
      const { chain, poolAddress, reserve, userAddress, amount, isMax } =
        params;

      if (mode === 'supply' || mode === 'repay') {
        await ensureAllowance(params, onProgress);
      }

      let data: string;
      switch (mode) {
        case 'supply':
          data = POOL_IFACE.encodeFunctionData('supply', [
            reserve.asset,
            amount,
            userAddress,
            0,
          ]);
          break;
        case 'borrow':
          data = POOL_IFACE.encodeFunctionData('borrow', [
            reserve.asset,
            amount,
            VARIABLE_RATE,
            0,
            userAddress,
          ]);
          break;
        case 'withdraw':
          data = POOL_IFACE.encodeFunctionData('withdraw', [
            reserve.asset,
            isMax ? ethers.MaxUint256 : amount,
            userAddress,
          ]);
          break;
        case 'repay':
          data = POOL_IFACE.encodeFunctionData('repay', [
            reserve.asset,
            isMax ? ethers.MaxUint256 : amount,
            VARIABLE_RATE,
            userAddress,
          ]);
          break;
        default:
          throw new Error(`Unknown Aave action: ${mode}`);
      }

      onProgress?.('confirming');
      const result = await sendTransaction(
        {
          to: poolAddress as `0x${string}`,
          data: data as `0x${string}`,
          chainId: CHAIN_ID[chain],
        },
        { sponsor: true },
      );
      return { hash: result.hash };
    },
    [ensureAllowance, sendTransaction],
  );

  return { execute, fetchBalanceAndAllowance };
}
