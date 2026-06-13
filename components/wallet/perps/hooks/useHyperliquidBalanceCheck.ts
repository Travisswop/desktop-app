'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import * as hl from '@nktkas/hyperliquid';
import { getHLApiUrl } from '@/services/hyperliquid/config';
import { useUser } from '@/lib/UserContext';
import {
  getStoredEvmWalletAddress,
  selectPreferredWallet,
  shouldUseStoredWalletAddresses,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';

// Always check mainnet HL balance regardless of HL_IS_TESTNET.
// The deposit bridge is always mainnet-to-mainnet, so the balance that reflects
// a completed deposit is always the mainnet clearinghouse balance.
// Testnet trading funds come from the HL testnet faucet after the mainnet
// account is activated — that is a separate step from this gate.
const transport = new hl.HttpTransport({ isTestnet: false, apiUrl: getHLApiUrl(false) });
const infoClient = new hl.InfoClient({ transport });

export type DepositCheckStatus =
  | 'idle'           // not yet checked
  | 'checking'       // fetching balance
  | 'no-deposit'     // zero balance — must deposit first
  | 'pending'        // deposit tx submitted, polling for settlement
  | 'ready';         // balance > 0 — safe to call approveAgent

export interface BalanceCheckState {
  status: DepositCheckStatus;
  accountValue: string | null;
  /** Refresh immediately (e.g. right after deposit tx succeeds) */
  check: () => Promise<void>;
  /** Begin polling until balance is non-zero, or until maxAttempts is reached */
  startPolling: () => void;
  stopPolling: () => void;
}

const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_ATTEMPTS = 30; // 30 × 8s = 4 minutes

let builderDexNamesCache: string[] | null = null;
let builderDexNamesPromise: Promise<string[]> | null = null;

async function getBuilderDexNames() {
  if (builderDexNamesCache) return builderDexNamesCache;
  if (!builderDexNamesPromise) {
    builderDexNamesPromise = infoClient
      .perpDexs()
      .then((dexs) =>
        dexs
          .map((dex, dexIndex) => ({ dex, dexIndex }))
          .filter(
            (
              item,
            ): item is {
              dex: NonNullable<(typeof dexs)[number]>;
              dexIndex: number;
            } =>
              item.dexIndex > 0 &&
              Boolean(item.dex?.name) &&
              typeof item.dex?.name === 'string',
          )
          .map((item) => item.dex.name.trim())
          .filter(Boolean),
      )
      .then((names) => {
        builderDexNamesCache = Array.from(new Set(names)).sort();
        return builderDexNamesCache;
      })
      .finally(() => {
        builderDexNamesPromise = null;
      });
  }

  return builderDexNamesPromise;
}

async function getAggregateAccountValue(masterAddress: string) {
  const dexNames = await getBuilderDexNames();
  const states = await Promise.allSettled(
    ['', ...dexNames].map((dex) =>
      infoClient.clearinghouseState({
        user: masterAddress as `0x${string}`,
        ...(dex ? { dex } : {}),
      }),
    ),
  );

  let accountValue = 0;
  for (const state of states) {
    if (state.status !== 'fulfilled') continue;
    accountValue += parseFloat(state.value.marginSummary.accountValue) || 0;
  }

  return accountValue.toFixed(6);
}

/**
 * useHyperliquidBalanceCheck
 *
 * Checks whether the master address has a non-zero Hyperliquid balance
 * before approveAgent is called.  This prevents the "Must deposit before
 * performing actions" error from Hyperliquid.
 *
 * States:
 *  idle       → initial, before the first check
 *  checking   → fetching clearinghouseState
 *  no-deposit → balance is 0 — user needs to deposit first
 *  pending    → deposit tx sent, polling every 8s for the bridge to settle
 *  ready      → balance > 0 — agent approval is safe to call
 */
export function useHyperliquidBalanceCheck(
  masterAddressOverride?: string | null,
): BalanceCheckState {
  // Always resolve the selected EVM wallet so the balance check can run
  // BEFORE `approveAgent` (which is what surfaces masterAddress on hlAgent).
  // A caller may still pass an explicit override if they already have it.
  const { user } = usePrivy();
  const { user: swopUser } = useUser();
  const { wallets, ready: walletsReady } = useWallets();
  const storedMasterAddress = getStoredEvmWalletAddress(swopUser);
  const activeMasterWallet = selectPreferredWallet(
    wallets,
    user?.wallet?.address,
    tradingWalletSelectionOptions(),
  );
  const shouldUseStoredMaster =
    shouldUseStoredWalletAddresses(
      user?.id,
      swopUser,
      activeMasterWallet?.address,
    ) &&
    Boolean(storedMasterAddress);
  const masterWallet = selectPreferredWallet(
    wallets,
    shouldUseStoredMaster ? storedMasterAddress : user?.wallet?.address,
    tradingWalletSelectionOptions(),
  );
  const masterAddress =
    masterAddressOverride ??
    (shouldUseStoredMaster
      ? storedMasterAddress
      : walletsReady
        ? masterWallet?.address ?? null
        : null);

  const [status, setStatus] = useState<DepositCheckStatus>('idle');
  const [accountValue, setAccountValue] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Core single check ────────────────────────────────────────────────────────

  const check = useCallback(async (): Promise<void> => {
    if (!masterAddress) return;

    if (isMountedRef.current) setStatus('checking');

    try {
      const value = await getAggregateAccountValue(masterAddress);
      const hasBalance = parseFloat(value) > 0;

      if (isMountedRef.current) {
        setAccountValue(value);
        setStatus(hasBalance ? 'ready' : 'no-deposit');
      }
    } catch {
      // On network error don't gate the user — fall back to 'ready'
      // so a transient failure doesn't block approveAgent indefinitely.
      if (isMountedRef.current) {
        setStatus('ready');
      }
    }
  }, [masterAddress]);

  // ── Run initial check when masterAddress becomes available ───────────────────

  useEffect(() => {
    if (!masterAddress) {
      setStatus('idle');
      setAccountValue(null);
      return;
    }
    check();
  }, [masterAddress, check]);

  // ── Polling logic ────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (!masterAddress) return;

    if (isMountedRef.current) setStatus('pending');
    pollAttemptsRef.current = 0;

    pollingRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        // Give up polling — let user retry manually
        if (isMountedRef.current) setStatus('no-deposit');
        return;
      }

      try {
        const value = await getAggregateAccountValue(masterAddress);
        const hasBalance = parseFloat(value) > 0;

        if (hasBalance) {
          stopPolling();
          if (isMountedRef.current) {
            setAccountValue(value);
            setStatus('ready');
          }
        }
      } catch {
        // ignore transient errors during polling
      }
    }, POLL_INTERVAL_MS);
  }, [masterAddress, stopPolling]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { status, accountValue, check, startPolling, stopPolling };
}
