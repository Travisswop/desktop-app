'use client';

import { useCallback, useState, useRef } from 'react';
import { usePrivy, useWallets, toViemAccount } from '@privy-io/react-auth';
import * as hl from '@nktkas/hyperliquid';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AgentState {
  /** The agent ExchangeClient — used for all order actions (L1 actions) */
  agentClient: hl.ExchangeClient | null;
  /** The master ExchangeClient — used ONLY for approveAgent + withdrawals */
  masterClient: hl.ExchangeClient | null;
  /** The external (MetaMask / WalletConnect) wallet address = HL master account */
  masterAddress: string | null;
  /** The Privy embedded wallet address = HL agent wallet */
  agentAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidAgent
 *
 * Manages the two-wallet architecture required for Hyperliquid:
 *  - External wallet (MetaMask etc.) → Hyperliquid MASTER account
 *  - Privy embedded wallet           → Hyperliquid AGENT wallet
 *
 * After `initializeAgent()` is called once, all trades go through the
 * agent client with no wallet popups. Only `approveAgent` + withdrawals
 * require the master wallet (which triggers ONE external wallet popup).
 *
 * Reference: https://docs.privy.io/recipes/hyperliquid/client-side-usage
 */
export function useHyperliquidAgent() {
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [state, setState] = useState<AgentState>({
    agentClient: null,
    masterClient: null,
    masterAddress: null,
    agentAddress: null,
    isInitialized: false,
    isInitializing: false,
    error: null,
  });

  // Persist clients across renders without triggering re-init
  const agentClientRef = useRef<hl.ExchangeClient | null>(null);
  const masterClientRef = useRef<hl.ExchangeClient | null>(null);

  // ─── Initialize (call once per session) ──────────────────────────────

  const initializeAgent = useCallback(async () => {
    if (!ready || !walletsReady) return null;
    if (agentClientRef.current) return agentClientRef.current; // already done

    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      // 1. External wallet → Hyperliquid MASTER account
      //    This is the wallet the user actually connected (MetaMask / WalletConnect)
      const externalWallet = wallets.find(
        (w) =>
          w.walletClientType !== 'privy' &&
          w.address === user?.wallet?.address,
      );

      if (!externalWallet) {
        throw new Error(
          'No external wallet detected. Please connect MetaMask or WalletConnect first.',
        );
      }

      // 2. Privy embedded wallet → Hyperliquid AGENT wallet
      //    This signs all orders silently (no popups per trade)
      const embeddedWallet = wallets.find(
        (w) => w.walletClientType === 'privy',
      );

      if (!embeddedWallet) {
        throw new Error(
          'Privy embedded wallet not found. Please refresh and try again.',
        );
      }

      // 3. Convert both wallets to viem accounts
      //    toViemAccount() wraps Privy's signing — no raw key access
      const [externalViemAccount, embeddedViemAccount] = await Promise.all([
        toViemAccount({ wallet: externalWallet }),
        toViemAccount({ wallet: embeddedWallet }),
      ]);

      const transport = new hl.HttpTransport({
        // Remove isTestnet for mainnet
        // isTestnet: true,
      });

      // 4. Master client — signs agent approval (one-time) + withdrawals only
      const masterClient = new hl.ExchangeClient({
        wallet: externalViemAccount,
        transport,
      });

      // 5. Approve the Privy embedded wallet as an agent on Hyperliquid
      //    This triggers ONE MetaMask popup. Never again after this.
      await masterClient.approveAgent({
        agentAddress: embeddedWallet.address as `0x${string}`,
        agentName: 'Swop Wallet Agent',
      });

      // 6. Agent client — signs all L1 actions silently via Privy embedded wallet
      const agentClient = new hl.ExchangeClient({
        wallet: embeddedViemAccount,
        transport,
      });

      agentClientRef.current = agentClient;
      masterClientRef.current = masterClient;

      const nextState: AgentState = {
        agentClient,
        masterClient,
        masterAddress: externalWallet.address,
        agentAddress: embeddedWallet.address,
        isInitialized: true,
        isInitializing: false,
        error: null,
      };

      setState(nextState);
      return agentClient;
    } catch (err) {
      const error =
        err instanceof Error ? err.message : 'Agent initialization failed';
      setState((prev) => ({ ...prev, isInitializing: false, error }));
      throw err;
    }
  }, [ready, walletsReady, wallets, user?.wallet?.address]);

  // ─── Reset (e.g. on wallet disconnect) ───────────────────────────────

  const resetAgent = useCallback(() => {
    agentClientRef.current = null;
    masterClientRef.current = null;
    setState({
      agentClient: null,
      masterClient: null,
      masterAddress: null,
      agentAddress: null,
      isInitialized: false,
      isInitializing: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    initializeAgent,
    resetAgent,
  };
}
