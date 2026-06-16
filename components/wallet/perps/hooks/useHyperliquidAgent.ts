'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  usePrivy,
  useWallets,
  toViemAccount,
  useSignTypedData,
} from '@privy-io/react-auth';
import type { SignTypedDataParams } from '@privy-io/react-auth';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as hl from '@nktkas/hyperliquid';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';
import { useUser } from '@/lib/UserContext';
import {
  getStoredEvmWalletAddress,
  shouldPreferEmbeddedWallets,
  walletAddressEquals,
} from '@/components/wallet/hooks/useWalletData';
import { safeLocalStorage } from '@/lib/browserStorage';
import { selectHyperliquidMasterWallet } from '../hyperliquidAgentSelection';

// ─── Agent key persistence ──────────────────────────────────────────────────
//
// We store a per-master-address agent private key in localStorage so the
// one-time approveAgent signature is never needed again after the initial setup.

function agentStorageKey(masterAddress: string) {
  return `hl_agent_pk_${masterAddress.toLowerCase()}`;
}

function agentMasterStorageKey(privyUserId: string) {
  return `hl_agent_master_${privyUserId}`;
}

function loadAgentKey(masterAddress: string): `0x${string}` | null {
  return safeLocalStorage.getItem(agentStorageKey(masterAddress)) as `0x${string}` | null;
}

function saveAgentKey(masterAddress: string, pk: `0x${string}`) {
  safeLocalStorage.setItem(agentStorageKey(masterAddress), pk);
}

function deleteAgentKey(masterAddress: string) {
  safeLocalStorage.removeItem(agentStorageKey(masterAddress));
}

function loadLastMasterAddress(privyUserId?: string | null) {
  if (!privyUserId) return '';
  return safeLocalStorage.getItem(agentMasterStorageKey(privyUserId)) || '';
}

function saveLastMasterAddress(
  privyUserId: string | null | undefined,
  masterAddress: string,
) {
  if (!privyUserId || !masterAddress) return;
  safeLocalStorage.setItem(agentMasterStorageKey(privyUserId), masterAddress);
}

function compactAddresses(
  ...addresses: Array<string | null | undefined>
) {
  const seen = new Set<string>();
  const result: string[] = [];

  addresses.forEach((address) => {
    const trimmed = address?.trim();
    const normalized = trimmed?.toLowerCase();
    if (!trimmed || !normalized || seen.has(normalized)) return;

    seen.add(normalized);
    result.push(trimmed);
  });

  return result;
}

function shortAddress(address?: string | null) {
  if (!address) return '';
  return address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

const AGENT_NAME = 'Swop';
const STALE_AGENT_MESSAGE =
  'Your Hyperliquid trading key expired or was replaced. Enable trading again to create a fresh key.';

type PrivyWallet = ReturnType<typeof useWallets>['wallets'][number];

export type EnsureHyperliquidMasterClient = () => Promise<hl.ExchangeClient | null>;

async function getAgentApprovalStatus(
  infoClient: hl.InfoClient,
  masterAddress: string,
  agentAddress: `0x${string}`,
): Promise<boolean | null> {
  try {
    const agents = await infoClient.extraAgents({
      user: masterAddress as `0x${string}`,
    });
    const now = Date.now();

    return agents.some((agent) => {
      const validUntil = Number(agent.validUntil);
      const isUnexpired = Number.isFinite(validUntil)
        ? validUntil > now
        : true;

      return walletAddressEquals(agent.address, agentAddress) && isUnexpired;
    });
  } catch (error) {
    console.warn('Failed to validate Hyperliquid agent key:', error);
    return null;
  }
}

function isPrivyEmbeddedWallet(wallet: {
  walletClientType?: string | null;
  connectorType?: string | null;
}) {
  return (
    wallet.walletClientType === 'privy' ||
    wallet.walletClientType === 'privy-v2' ||
    wallet.connectorType === 'embedded'
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AgentState {
  /**
   * ExchangeClient backed by the ephemeral agent keypair.
   * Signs all trading L1 actions silently — no wallet popup.
   */
  agentClient: hl.ExchangeClient | null;
  /**
   * ExchangeClient backed by the selected EVM wallet.
   * Used only for account-level operations (withdraw, transfer).
   */
  masterClient: hl.ExchangeClient | null;
  /** Selected EVM wallet address = Hyperliquid account address */
  masterAddress: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  /** True while auto-reconnect is in progress after a brief disconnect */
  isReconnecting: boolean;
  error: string | null;
}

interface UseHyperliquidAgentOptions {
  enabled?: boolean;
  masterAddress?: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidAgent
 *
 * Two-wallet architecture — eliminates the repeated "Sign message" popup:
 *
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  Master  = selected EVM wallet                                       │
 *  │            Signs approveAgent exactly ONCE from the setup button.     │
 *  │            The HL account address is this wallet's address.          │
 *  │                                                                      │
 *  │  Agent   = Ephemeral local keypair (private key in localStorage)     │
 *  │            Signs every order / cancel / leverage update silently.    │
 *  │            No Privy UI ever triggered for trading actions.           │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * Reconnect behaviour:
 *  - If the selected wallet disappears (session refresh), clients are reset.
 *  - When it returns, the stored agent key is reused — no re-approval needed.
 */
export function useHyperliquidAgent({
  enabled = true,
  masterAddress: masterAddressOverride = null,
}: UseHyperliquidAgentOptions = {}) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { user: swopUser } = useUser();
  const { signTypedData } = useSignTypedData();
  const useEmbeddedWalletProvider = shouldPreferEmbeddedWallets();
  const storedMasterAddress = getStoredEvmWalletAddress(swopUser);
  const lastMasterAddress = loadLastMasterAddress(user?.id);
  const requestedMasterAddressOverride =
    typeof masterAddressOverride === 'string'
      ? masterAddressOverride.trim()
      : '';
  const preferredMasterAddresses = useMemo(
    () =>
      compactAddresses(
        requestedMasterAddressOverride,
        lastMasterAddress,
        storedMasterAddress,
        user?.wallet?.address,
      ),
    [
      lastMasterAddress,
      requestedMasterAddressOverride,
      storedMasterAddress,
      user?.wallet?.address,
    ],
  );
  const walletSelectionOptions = useMemo(
    () => ({
      preferEmbedded: useEmbeddedWalletProvider,
      embeddedOnly: useEmbeddedWalletProvider,
      preferredAddresses: preferredMasterAddresses,
    }),
    [preferredMasterAddresses, useEmbeddedWalletProvider],
  );
  const resolveMasterWallet = useCallback(() => {
    return selectHyperliquidMasterWallet({
      wallets,
      preferredAddresses: preferredMasterAddresses,
      options: walletSelectionOptions,
      hasSavedAgentKey: (address) => Boolean(loadAgentKey(address)),
    });
  }, [preferredMasterAddresses, walletSelectionOptions, wallets]);
  const candidateMasterAddress = resolveMasterWallet()?.address ?? null;

  const [state, setState] = useState<AgentState>({
    agentClient: null,
    masterClient: null,
    masterAddress: null,
    isInitialized: false,
    isInitializing: false,
    isReconnecting: false,
    error: null,
  });

  // True until the silent rehydrate effect has had a real chance to restore a
  // persisted agent key (i.e. Privy + the wallet list are ready). The setup
  // modal must stay hidden while this is true — otherwise it flashes open on
  // every page load / redeploy before the saved agent has been rehydrated.
  const [isHydrating, setIsHydrating] = useState(true);

  const agentClientRef = useRef<hl.ExchangeClient | null>(null);
  const masterClientRef = useRef<hl.ExchangeClient | null>(null);
  const wasInitializedRef = useRef(false);

  const createMasterClient = useCallback(
    async (masterWallet: PrivyWallet, transport: hl.HttpTransport) => {
      const masterViemAccount = await toViemAccount({ wallet: masterWallet });
      const masterSigningAccount = isPrivyEmbeddedWallet(masterWallet)
        ? ({
            ...masterViemAccount,
            signTypedData: async (
              parameters: Parameters<
                typeof masterViemAccount.signTypedData
              >[0]
            ) => {
              const { signature } = await signTypedData(
                parameters as SignTypedDataParams,
                {
                  address: masterWallet.address,
                  uiOptions: {
                    showWalletUIs: false,
                  },
                }
              );
              return signature as `0x${string}`;
            },
          } as typeof masterViemAccount)
        : masterViemAccount;

      return new hl.ExchangeClient({ wallet: masterSigningAccount, transport });
    },
    [signTypedData],
  );

  // ─── Core init logic ───────────────────────────────────────────────────────

  const _init = useCallback(
    async (silent = false): Promise<hl.ExchangeClient | null> => {
      if (!enabled || !ready || !walletsReady) return null;
      if (agentClientRef.current) return agentClientRef.current;

      setState((prev) => ({
        ...prev,
        isInitializing: !silent,
        isReconnecting: silent,
        error: null,
      }));

      // Track whether we generated a brand-new key in *this* call so error
      // recovery only rolls back what we created. Prevents wiping a valid
      // pre-existing key when an unrelated step (transport, signing) fails.
      let createdNewKey = false;
      let masterAddrForCleanup: string | null = null;

      try {
        const masterWallet = resolveMasterWallet();
        if (!masterWallet) {
          const preferredAddressLabel = preferredMasterAddresses[0]
            ? ` (${shortAddress(preferredMasterAddresses[0])})`
            : '';
          throw new Error(
            `EVM wallet${preferredAddressLabel} is not connected. Sign in with the wallet that owns this Hyperliquid position, then try again.`
          );
        }

        const masterAddress = masterWallet.address;
        masterAddrForCleanup = masterAddress;
        const transport = new hl.HttpTransport({ isTestnet: HL_IS_TESTNET, apiUrl: getHLApiUrl(HL_IS_TESTNET) });
        const infoClient = new hl.InfoClient({ transport });

        // ── Agent keypair ─────────────────────────────────────────────────
        // Reuse the persisted key if one exists for this master address.
        // Silent init must never produce a wallet popup, so if no key exists
        // we bail out and let the user trigger manual setup explicitly.
        let agentPk = loadAgentKey(masterAddress);
        if (!agentPk) {
          if (silent) {
            setState((prev) => ({
              ...prev,
              isInitializing: false,
              isReconnecting: false,
            }));
            return null;
          }
          agentPk = generatePrivateKey();
          saveAgentKey(masterAddress, agentPk);
          createdNewKey = true;
        }

        let agentAccount = privateKeyToAccount(agentPk);

        // A saved agent key can be pruned by Hyperliquid when the same named
        // agent is re-approved, expires, or the registering account loses
        // funds. Never mark a pruned key as active just because it exists in
        // localStorage; it will only produce "API Wallet does not exist" on
        // the next close/order attempt.
        if (!createdNewKey) {
          const isApproved = await getAgentApprovalStatus(
            infoClient,
            masterAddress,
            agentAccount.address,
          );

          if (isApproved === false) {
            deleteAgentKey(masterAddress);

            if (silent) {
              setState((prev) => ({
                ...prev,
                isInitializing: false,
                isReconnecting: false,
                error: STALE_AGENT_MESSAGE,
              }));
              return null;
            }

            agentPk = generatePrivateKey();
            saveAgentKey(masterAddress, agentPk);
            createdNewKey = true;
            agentAccount = privateKeyToAccount(agentPk);
          }
        }

        // ── Approve agent ─────────────────────────────────────────────────
        // ONLY when we just generated a fresh key. Re-approving an existing
        // agent address throws "Extra agent already used." on Hyperliquid —
        // an already-approved agent stays valid until explicitly revoked.
        // Saved keys must restore without creating a Privy wallet account,
        // because that can trigger phone-code MFA during a plain perps open.
        let masterClient: hl.ExchangeClient | null = null;
        if (createdNewKey) {
          masterClient = await createMasterClient(masterWallet, transport);
          await masterClient.approveAgent({
            agentAddress: agentAccount.address,
            agentName: AGENT_NAME,
          });
        }

        // ── Agent client (local keypair — silent signing) ─────────────────
        const agentClient = new hl.ExchangeClient({ wallet: agentAccount, transport });

        agentClientRef.current = agentClient;
        masterClientRef.current = masterClient;
        wasInitializedRef.current = true;
        saveLastMasterAddress(user?.id, masterAddress);

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

        // Only roll back a key we just created in this call. Never delete a
        // pre-existing key — it may still be valid on Hyperliquid.
        if (createdNewKey && masterAddrForCleanup) {
          deleteAgentKey(masterAddrForCleanup);
        }

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
    [
      enabled,
      ready,
      walletsReady,
      createMasterClient,
      preferredMasterAddresses,
      resolveMasterWallet,
      user?.id,
    ],
  );

  // ─── Public: manual initialization ────────────────────────────────────────

  const initializeAgent = useCallback(() => _init(false), [_init]);

  const ensureMasterClient = useCallback<EnsureHyperliquidMasterClient>(
    async () => {
      if (masterClientRef.current) return masterClientRef.current;
      if (!enabled || !ready || !walletsReady) return null;

      const masterWallet = resolveMasterWallet();
      if (!masterWallet) {
        throw new Error('EVM wallet is not connected. Sign in and try again.');
      }

      if (
        state.masterAddress &&
        !walletAddressEquals(state.masterAddress, masterWallet.address)
      ) {
        throw new Error(
          'Perps wallet changed. Reopen perps before submitting this action.',
        );
      }

      const transport = new hl.HttpTransport({
        isTestnet: HL_IS_TESTNET,
        apiUrl: getHLApiUrl(HL_IS_TESTNET),
      });
      const masterClient = await createMasterClient(masterWallet, transport);
      masterClientRef.current = masterClient;

      setState((prev) => ({
        ...prev,
        masterClient,
        masterAddress: prev.masterAddress ?? masterWallet.address,
      }));

      return masterClient;
    },
    [
      createMasterClient,
      enabled,
      ready,
      resolveMasterWallet,
      state.masterAddress,
      walletsReady,
    ],
  );

  // ─── Disconnect / reconnect detection ─────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;
    // Keep isHydrating true (setup modal suppressed) until Privy AND the wallet
    // list are ready — only then have we genuinely had a chance to rehydrate a
    // saved agent key from localStorage.
    if (!ready || !walletsReady) return;

    const masterWallet = resolveMasterWallet();

    const masterChanged =
      Boolean(agentClientRef.current && masterWallet && state.masterAddress) &&
      !walletAddressEquals(state.masterAddress, masterWallet!.address);

    if ((!masterWallet || masterChanged) && agentClientRef.current) {
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

    // Silent (re)hydration. Triggers in two cases:
    //  1. First mount after a page reload — picks up the agent key persisted
    //     in localStorage so the user is NOT asked to re-approve and Hyperliquid
    //     does NOT throw "Extra agent already used."
    //  2. In-session reconnect after the Privy wallet briefly disappears.
    if (
      masterWallet &&
      !agentClientRef.current &&
      (wasInitializedRef.current || loadAgentKey(masterWallet.address))
    ) {
      _init(true);
    }

    // We've now had a real chance to rehydrate. This runs in the same React
    // batch as the isReconnecting=true that _init(true) sets synchronously, so
    // the setup modal never flashes in the gap between "ready" and the silent
    // (re)connect kicking in.
    setIsHydrating(false);
  }, [
    enabled,
    ready,
    walletsReady,
    resolveMasterWallet,
    state.masterAddress,
    _init,
  ]);

  // ─── Clear on Privy logout ─────────────────────────────────────────────────

  useEffect(() => {
    if (!authenticated) {
      agentClientRef.current = null;
      masterClientRef.current = null;
      wasInitializedRef.current = false;
      // Re-arm hydration so a subsequent login waits for rehydrate again
      // instead of immediately showing the setup modal.
      setIsHydrating(true);
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

  const resetAgent = useCallback((message?: string | null) => {
    // Clear the persisted agent key so the next setup generates a fresh one
    // and triggers a new approveAgent signature. Without this, resetAgent
    // would only clear runtime state and the next init would silently rehydrate
    // the same key — defeating the point of "reset".
    const masterWallet = resolveMasterWallet();
    if (masterWallet?.address) deleteAgentKey(masterWallet.address);

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
      error: message ?? null,
    });
  }, [resolveMasterWallet]);

  return {
    ...state,
    candidateMasterAddress,
    isHydrating,
    initializeAgent,
    ensureMasterClient,
    resetAgent,
  };
}
