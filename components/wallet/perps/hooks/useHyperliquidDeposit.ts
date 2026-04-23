'use client';

import { useState, useCallback } from 'react';
import { useSendTransaction, useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits, erc20Abi } from 'viem';
import { HL_DEPOSIT_CONFIG } from '@/services/hyperliquid/config';

const { chainId, bridgeAddress, usdcAddress } = HL_DEPOSIT_CONFIG;

// ─── Constants ─────────────────────────────────────────────────────────────────

const MIN_DEPOSIT_USDC = 5; // Hyperliquid minimum

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DepositState {
  isDepositing: boolean;
  txHash: string | null;
  error: string | null;
  step: 'idle' | 'confirming' | 'pending' | 'success' | 'error';
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidDeposit
 *
 * Handles depositing USDC from Arbitrum to the Hyperliquid bridge.
 *
 * Flow:
 *  1. User enters amount (min $5 USDC)
 *  2. We encode ERC-20 `transfer(bridgeAddress, amount)` calldata
 *  3. Send via Privy's useSendTransaction on Arbitrum (chainId: 42161)
 *  4. Privy handles gas sponsorship if enabled in dashboard
 *  5. Funds arrive on Hyperliquid in ~2 minutes
 *
 * Reference: https://docs.privy.io/recipes/hyperliquid-guide
 */
export function useHyperliquidDeposit() {
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();

  const [state, setState] = useState<DepositState>({
    isDepositing: false,
    txHash: null,
    error: null,
    step: 'idle',
  });

  // ─── Fetch USDC balance on Arbitrum ──────────────────────────────────
  //
  // Calls a Next.js server-side API route instead of hitting the RPC
  // directly from the browser. This avoids CORS issues with public RPC
  // endpoints and ensures the Alchemy key is always used server-side,
  // even if NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL is missing from the client
  // bundle in a production build.

  const fetchArbitrumUsdcBalance = useCallback(
    async (address: string): Promise<string> => {
      try {
        // Always check mainnet Arbitrum USDC regardless of HL_IS_TESTNET.
        // The Hyperliquid bridge deposit is always mainnet-to-mainnet; testnet
        // trading is funded separately via the HL testnet faucet after the
        // mainnet account is activated with a real deposit.
        const params = new URLSearchParams({ address });
        const res = await fetch(`/api/arbitrum-usdc-balance?${params}`);
        if (!res.ok) return '0';
        const { balance } = await res.json();
        return balance ?? '0';
      } catch {
        return '0';
      }
    },
    [],
  );

  // ─── Deposit ──────────────────────────────────────────────────────────

  /**
   * Deposits USDC from Arbitrum to Hyperliquid.
   * @param amountUsd - Amount in USD (e.g. "100" for $100 USDC)
   */
  const deposit = useCallback(
    async (amountUsd: string) => {
      const amount = parseFloat(amountUsd);
      if (isNaN(amount) || amount < MIN_DEPOSIT_USDC) {
        setState((prev) => ({
          ...prev,
          error: `Minimum deposit is $${MIN_DEPOSIT_USDC} USDC`,
          step: 'error',
        }));
        return;
      }

      // Use the Privy embedded wallet — it is the master account and signs silently.
      // Privy's sendTransaction handles chain switching automatically via the chainId param.
      const evmWallet = wallets.find((w) => w.walletClientType === 'privy');

      if (!evmWallet) {
        setState((prev) => ({
          ...prev,
          error: 'Privy embedded wallet not found. Please refresh and try again.',
          step: 'error',
        }));
        return;
      }

      setState({ isDepositing: true, txHash: null, error: null, step: 'confirming' });

      try {

        // Encode ERC-20 transfer(bridgeAddress, amount) calldata
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [bridgeAddress, parseUnits(amountUsd, 6)],
        });

        setState((prev) => ({ ...prev, step: 'pending' }));

        // Send via Privy — gas sponsored if enabled in dashboard.
        const result = await sendTransaction(
          {
            to: usdcAddress,
            data,
            chainId,
          },
          { sponsor: true },
        );

        setState({
          isDepositing: false,
          txHash: result.hash,
          error: null,
          step: 'success',
        });

        return result.hash;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Deposit failed. Please try again.';
        setState({
          isDepositing: false,
          txHash: null,
          error: message,
          step: 'error',
        });
        throw err;
      }
    },
    [sendTransaction, wallets],
  );

  const reset = useCallback(() => {
    setState({ isDepositing: false, txHash: null, error: null, step: 'idle' });
  }, []);

  return {
    ...state,
    deposit,
    reset,
    fetchArbitrumUsdcBalance,
    minDeposit: MIN_DEPOSIT_USDC,
  };
}
