'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { usePrivy, useWallets, toViemAccount } from '@privy-io/react-auth';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as hl from '@nktkas/hyperliquid';
import { HL_IS_TESTNET } from '@/services/hyperliquid/config';

// ─── Agent key persistence ──────────────────────────────────────────────────
//
// We store a per-master-address agent private key in localStorage so the
// one-time approveAgent signature is never needed again after the initial setup.

function agentStorageKey(masterAddress: string) {
  return `hl_agent_pk_${masterAddress.toLowerCase()}`;
}

function loadAgentKey(masterAddress: string): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(agentStorageKey(masterAddress)) as `0x${string}` | null;
}

function saveAgentKey(masterAddress: string, pk: `0x${string}`) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(agentStorageKey(masterAddress), pk);
}

function deleteAgentKey(masterAddress: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(agentStorageKey(masterAddress));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AgentState {
  /**
   * ExchangeClient backed by the ephemeral agent keypair.
   * Signs all trading L1 actions silently — no wallet popup.
   */
  agentClient: hl.ExchangeClient | null;
  /**
   * ExchangeClient backed by the Privy embedded wallet.
   * Used only for account-level operations (withdraw, transfer).
   */
  masterClient: hl.ExchangeClient | null;
  /** Privy embedded wallet address = Hyperliquid account address */
  masterAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  /** True while auto-reconnect is in progress after a brief disconnect */
  isReconnecting: boolean;
  error: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidAgent
 *
 * Two-wallet architecture — eliminates the repeated "Sign message" popup:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  Master  = Privy embedded wallet                                     │
 *  │            Signs approveAgent exactly ONCE (shown in setup modal).   │
 *  │            The HL account address is this wallet's address.          │
 *  │                                                                      │
 *  │  Agent   = Ephemeral local keypair (private key in localStorage)     │
 *  │            Signs every order / cancel / leverage update silently.    │
 *  │            No Privy UI ever triggered for trading actions.           │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * Reconnect behaviour:
 *  - If the Privy wallet disappears (session refresh), the clients are reset.
 *  - When it returns, the stored agent key is reused — no re-approval needed.
 */
export function useHyperliquidAgent() {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [state, setState] = useState<AgentState>({
    agentClient: null,
    masterClient: null,
    masterAddress: null,
    isInitialized: false,
    isInitializing: false,
    isReconnecting: false,
    error: null,
  });

  const agentClientRef = useRef<hl.ExchangeClient | null>(null);
  const masterClientRef = useRef<hl.ExchangeClient | null>(null);
  const wasInitializedRef = useRef(false);

  // ─── Core init logic ───────────────────────────────────────────────────────

  const _init = useCallback(
    async (silent = false): Promise<hl.ExchangeClient | null> => {
      if (!ready || !walletsReady) return null;
      if (agentClientRef.current) return agentClientRef.current;

      setState((prev) => ({
        ...prev,
        isInitializing: !silent,
        isReconnecting: silent,
        error: null,
      }));

      try {
        const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
        if (!embeddedWallet) {
          throw new Error('Privy embedded wallet not found. Please refresh and try again.');
        }

        const masterAddress = embeddedWallet.address;
        const transport = new hl.HttpTransport({ isTestnet: HL_IS_TESTNET });

        // ── Agent keypair ─────────────────────────────────────────────────
        // Load existing key or generate a new one.
        // A new key always requires a fresh approveAgent signature.
        let agentPk = loadAgentKey(masterAddress);
        const isNewKey = !agentPk;

        if (isNewKey) {
          agentPk = generatePrivateKey();
          saveAgentKey(masterAddress, agentPk);
        }

        const agentAccount = privateKeyToAccount(agentPk!);

        // ── Master client (Privy wallet) ───────────────────────────────────
        // Only used for approveAgent. All trading goes through agentClient.
        const masterViemAccount = await toViemAccount({ wallet: embeddedWallet });
        const masterClient = new hl.ExchangeClient({ wallet: masterViemAccount, transport });

        // ── Approve agent ─────────────────────────────────────────────────
        // Called when:
        //  - Key is brand new (first-ever setup, or key was cleared)
        //  - Manual init (!silent) — user clicked "Enable Trading" in modal
        // Skipped on silent reconnect with an existing key — no popup.
        if (isNewKey || !silent) {
          await masterClient.approveAgent({
            hyperliquidChain: HL_IS_TESTNET ? 'Testnet' : 'Mainnet',
            agentAddress: agentAccount.address,
            agentName: 'Swop',
            nonce: BigInt(Date.now()),
          });
        }

        // ── Agent client (local keypair — silent signing) ─────────────────
        const agentClient = new hl.ExchangeClient({ wallet: agentAccount, transport });

        agentClientRef.current = agentClient;
        masterClientRef.current = masterClient;
        wasInitializedRef.current = true;

        setState({
          agentClient,
          masterClient,
          masterAddress,
          isInitialized: true,
          isInitializing: false,
          isReconnecting: false,
          error: null,
        });

        return agentClient;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Setup failed';

        // If approval failed for a new key, remove the stored key so the user
        // can retry from scratch next time.
        const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
        if (embeddedWallet) deleteAgentKey(embeddedWallet.address);

        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isReconnecting: false,
          error: silent ? null : error,
        }));
        if (!silent) throw err;
        return null;
      }
    },
    [ready, walletsReady, wallets],
  );

  // ─── Public: manual initialization ────────────────────────────────────────

  const initializeAgent = useCallback(() => _init(false), [_init]);

  // ─── Disconnect / reconnect detection ─────────────────────────────────────

  useEffect(() => {
    if (!walletsReady) return;

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

    if (!embeddedWallet && agentClientRef.current) {
      agentClientRef.current = null;
      masterClientRef.current = null;
      setState((prev) => ({
        ...prev,
        agentClient: null,
        masterClient: null,
        masterAddress: null,
        isInitialized: false,
        isReconnecting: wasInitializedRef.current,
      }));
    }

    if (embeddedWallet && !agentClientRef.current && wasInitializedRef.current) {
      // Wallet is back — reuse stored agent key, no re-approval
      _init(true);
    }
  }, [wallets, walletsReady, _init]);

  // ─── Clear on Privy logout ─────────────────────────────────────────────────

  useEffect(() => {
    if (!authenticated) {
      agentClientRef.current = null;
      masterClientRef.current = null;
      wasInitializedRef.current = false;
      setState({
        agentClient: null,
        masterClient: null,
        masterAddress: null,
        isInitialized: false,
        isInitializing: false,
        isReconnecting: false,
        error: null,
      });
    }
  }, [authenticated]);

  // ─── Manual reset ─────────────────────────────────────────────────────────

  const resetAgent = useCallback(() => {
    agentClientRef.current = null;
    masterClientRef.current = null;
    wasInitializedRef.current = false;
    setState({
      agentClient: null,
      masterClient: null,
      masterAddress: null,
      isInitialized: false,
      isInitializing: false,
      isReconnecting: false,
      error: null,
    });
  }, []);

  return { ...state, initializeAgent, resetAgent };
}
