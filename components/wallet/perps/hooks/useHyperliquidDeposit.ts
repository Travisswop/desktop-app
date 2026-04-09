'use client';

import { useState, useCallback } from 'react';
import { useSendTransaction, useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits, erc20Abi, createPublicClient, http, formatUnits } from 'viem';
import { arbitrum } from 'viem/chains';
import {
  HYPERLIQUID_BRIDGE_ADDRESS,
  ARBITRUM_USDC_ADDRESS,
  ARBITRUM_CHAIN_ID,
} from '@/services/hyperliquid/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MIN_DEPOSIT_USDC = 5; // Hyperliquid minimum
const USDC_DECIMALS = 6;

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

  const fetchArbitrumUsdcBalance = useCallback(
    async (address: string): Promise<string> => {
      try {
        const client = createPublicClient({
          chain: arbitrum,
          transport: http(),
        });

        const balance = await client.readContract({
          address: ARBITRUM_USDC_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        return formatUnits(balance as bigint, USDC_DECIMALS);
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

      // Prefer external wallet (MetaMask/WalletConnect) for the master account;
      // fall back to Privy embedded EVM wallet. Privy's sendTransaction handles
      // chain switching automatically when chainId is provided.
      const evmWallet =
        wallets.find((w) => w.walletClientType !== 'privy') ??
        wallets.find((w) => w.type === 'ethereum');

      if (!evmWallet) {
        setState((prev) => ({
          ...prev,
          error: 'No EVM wallet found. Please connect a wallet.',
          step: 'error',
        }));
        return;
      }

      setState({ isDepositing: true, txHash: null, error: null, step: 'confirming' });

      try {
        // For external wallets, explicitly switch to Arbitrum first.
        // Privy embedded wallets switch automatically via the chainId param below.
        if (evmWallet.walletClientType !== 'privy') {
          await evmWallet.switchChain(ARBITRUM_CHAIN_ID);
        }

        // Encode ERC-20 transfer(bridgeAddress, amount) calldata
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [
            HYPERLIQUID_BRIDGE_ADDRESS as `0x${string}`,
            parseUnits(amountUsd, USDC_DECIMALS),
          ],
        });

        setState((prev) => ({ ...prev, step: 'pending' }));

        // Send via Privy — gas sponsored if enabled on Arbitrum in dashboard.
        // chainId: 42161 tells Privy to use Arbitrum One for embedded wallets.
        const result = await sendTransaction(
          {
            to: ARBITRUM_USDC_ADDRESS as `0x${string}`,
            data,
            chainId: ARBITRUM_CHAIN_ID,
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
