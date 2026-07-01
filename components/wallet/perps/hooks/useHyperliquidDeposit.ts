'use client';

import { useState, useCallback, useRef } from 'react';
import {
  usePrivy,
  useSendTransaction,
  useSigners,
  useWallets,
} from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits, erc20Abi } from 'viem';
import { HL_DEPOSIT_CONFIG } from '@/services/hyperliquid/config';
import {
  selectPreferredWallet,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';
import { useUser } from '@/lib/UserContext';
import { runSponsoredFirst } from '@/lib/wallet/gasSponsorship';

const { chainId, bridgeAddress, usdcAddress } = HL_DEPOSIT_CONFIG;

// ─── Constants ─────────────────────────────────────────────────────────────────

const MIN_DEPOSIT_USDC = 5; // Hyperliquid minimum
const swopApiBase = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

interface DelegatedSignerConfig {
  signerId: string;
  policyIds: string[];
}

interface EvmWalletLike {
  address?: string;
  chainId?: string;
  switchChain?: (chainId: number) => Promise<void>;
  walletClientType?: string;
  connectorType?: string;
}

const delegatedSignerStorageKey = (signerId: string, address: string) =>
  `privy-delegated-signer:${signerId}:${address.toLowerCase()}`;

const makeDepositIdempotencyKey = (address: string, amountUsd: string) =>
  `hyperliquid-deposit:${address.toLowerCase()}:${amountUsd}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;

const isUserRejectionError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = message.toLowerCase();
  return (
    lower.includes('rejected') ||
    lower.includes('denied') ||
    lower.includes('cancelled') ||
    lower.includes('user rejected')
  );
};

const isDelegatedSigningConfigError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = message.toLowerCase();
  return (
    lower.includes('key quorum') ||
    lower.includes('quorums') ||
    lower.includes('delegated') ||
    lower.includes('authorization_context') ||
    lower.includes('authorization context') ||
    lower.includes('silent deposit signing is not configured')
  );
};

const isEmbeddedPrivyWallet = (
  wallet: EvmWalletLike | null | undefined,
  privyUser: any,
) => {
  if (
    wallet?.walletClientType === 'privy' ||
    wallet?.walletClientType === 'privy-v2' ||
    wallet?.connectorType === 'embedded'
  ) {
    return true;
  }

  const target = wallet?.address?.toLowerCase();
  if (!target) return false;

  return (privyUser?.linkedAccounts || []).some((account: any) => {
    if (account?.type !== 'wallet') return false;
    if (account?.address?.toLowerCase() !== target) return false;
    return (
      account.walletClientType === 'privy' ||
      account.wallet_client_type === 'privy' ||
      account.connectorType === 'embedded' ||
      account.connector_type === 'embedded'
    );
  });
};

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
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { addSigners } = useSigners();
  const { accessToken } = useUser();
  const [delegatedSignerConfig, setDelegatedSignerConfig] =
    useState<DelegatedSignerConfig | null>(null);
  const delegatedSignerUnavailableRef = useRef(false);

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
  // even if NEXT_PUBLIC_ALCHEMY_API_KEY is missing from the client
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

  const getDelegatedSignerConfig =
    useCallback(async (): Promise<DelegatedSignerConfig | null> => {
      if (delegatedSignerConfig) return delegatedSignerConfig;
      const base = swopApiBase();
      if (!accessToken || !base) return null;

      try {
        const response = await fetch(
          `${base}/api/v5/wallet/privy/delegated-signer-config`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) return null;
        const body = await response.json().catch(() => null);
        const data = body?.data || body;
        if (!data?.configured || !data?.signerId) return null;

        const config = {
          signerId: String(data.signerId),
          policyIds: Array.isArray(data.policyIds)
            ? data.policyIds.map((id: unknown) => String(id)).filter(Boolean)
            : [],
        };
        setDelegatedSignerConfig(config);
        return config;
      } catch (error) {
        console.warn(
          '[Hyperliquid deposit] Delegated signer config unavailable; using wallet confirmation.',
          error,
        );
        return null;
      }
    }, [accessToken, delegatedSignerConfig]);

  const getSelectedEvmWallet = useCallback(
    (address?: string | null): EvmWalletLike | undefined => {
      if (address) {
        const normalized = address.toLowerCase();
        return (
          wallets.find(
            (candidate) => candidate.address?.toLowerCase() === normalized,
          ) ?? { address }
        );
      }

      return selectPreferredWallet(
        wallets,
        privyUser?.wallet?.address,
        tradingWalletSelectionOptions(),
      );
    },
    [privyUser?.wallet?.address, wallets],
  );

  const prepareDelegatedDeposit = useCallback(
    async (address?: string | null) => {
      if (delegatedSignerUnavailableRef.current) {
        return false;
      }

      const evmWallet = getSelectedEvmWallet(address);
      const walletAddress = evmWallet?.address ?? address ?? null;
      if (!walletAddress || !isEmbeddedPrivyWallet(evmWallet, privyUser)) {
        return false;
      }

      const config = await getDelegatedSignerConfig();
      if (!config?.signerId) return false;

      const storageKey = delegatedSignerStorageKey(
        config.signerId,
        walletAddress,
      );
      if (
        typeof window !== 'undefined' &&
        window.localStorage.getItem(storageKey)
      ) {
        return true;
      }

      try {
        await addSigners({
          address: walletAddress,
          signers: [
            {
              signerId: config.signerId,
              policyIds: config.policyIds,
            },
          ],
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, 'true');
        }
        return true;
      } catch (error) {
        delegatedSignerUnavailableRef.current = true;
        console.warn(
          '[Hyperliquid deposit] Delegated signer setup failed; using wallet confirmation.',
          error,
        );
        return false;
      }
    },
    [addSigners, getDelegatedSignerConfig, getSelectedEvmWallet, privyUser],
  );

  const sendDelegatedDeposit = useCallback(
    async (address: string, amountUsd: string) => {
      const base = swopApiBase();
      if (!accessToken || !base) {
        throw new Error('Silent deposit signing is not configured.');
      }

      // No toast/status channel in this hook, so the fallback is silent here;
      // the retry only runs on definitive pre-broadcast sponsorship refusals.
      // A fresh idempotency key per attempt keeps the unsponsored retry from
      // being deduped against the refused sponsored request.
      return runSponsoredFirst(async ({ sponsor }) => {
        const response = await fetch(
          `${base}/api/v5/wallet/privy/ethereum/hyperliquid-deposit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              address,
              amountUsd,
              sponsor,
              idempotencyKey: makeDepositIdempotencyKey(address, amountUsd),
            }),
          },
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.hash) {
          throw new Error(
            data.message ||
              data.error ||
              'Silent Hyperliquid deposit failed.',
          );
        }

        return data.hash as string;
      });
    },
    [accessToken],
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
        const error = `Minimum deposit is $${MIN_DEPOSIT_USDC} USDC`;
        setState((prev) => ({
          ...prev,
          error,
          step: 'error',
        }));
        throw new Error(error);
      }

      // Use the same EVM wallet as the perps account selector.
      // Privy's sendTransaction handles chain switching automatically via the chainId param.
      const evmWallet = getSelectedEvmWallet();

      if (!evmWallet) {
        const error = 'EVM wallet not found. Please refresh and try again.';
        setState((prev) => ({
          ...prev,
          error,
          step: 'error',
        }));
        throw new Error(error);
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

        const delegatedReady = await prepareDelegatedDeposit(evmWallet.address);
        if (delegatedReady && evmWallet.address) {
          try {
            const hash = await sendDelegatedDeposit(evmWallet.address, amountUsd);
            setState({
              isDepositing: false,
              txHash: hash,
              error: null,
              step: 'success',
            });
            return hash;
          } catch (delegatedErr) {
            if (!isDelegatedSigningConfigError(delegatedErr)) {
              throw delegatedErr;
            }
            delegatedSignerUnavailableRef.current = true;
            console.warn(
              '[Hyperliquid deposit] Delegated deposit failed; retrying with wallet confirmation.',
              delegatedErr,
            );
          }
        }

        if (evmWallet.chainId !== `eip155:${chainId}` && evmWallet.switchChain) {
          await evmWallet.switchChain(chainId);
        }

        // Send via Privy — gas sponsored if enabled in dashboard.
        const txRequest = {
          to: usdcAddress,
          data,
          chainId,
        };
        let result: Awaited<ReturnType<typeof sendTransaction>>;
        try {
          // No toast/status channel in this hook, so the sponsored-first
          // fallback is silent (matching the existing silent retry below).
          result = await runSponsoredFirst(({ sponsor }) =>
            sendTransaction(txRequest, {
              address: evmWallet.address,
              sponsor,
            }),
          );
        } catch (sponsoredErr) {
          if (isUserRejectionError(sponsoredErr)) {
            throw sponsoredErr;
          }
          result = await sendTransaction(txRequest, {
            address: evmWallet.address,
            sponsor: false,
          });
        }

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
    [
      getSelectedEvmWallet,
      prepareDelegatedDeposit,
      sendDelegatedDeposit,
      sendTransaction,
    ],
  );

  const reset = useCallback(() => {
    setState({ isDepositing: false, txHash: null, error: null, step: 'idle' });
  }, []);

  return {
    ...state,
    deposit,
    prepareDelegatedDeposit,
    reset,
    fetchArbitrumUsdcBalance,
    minDeposit: MIN_DEPOSIT_USDC,
  };
}
