'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const HL_TESTNET_INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';

// ─── Local-storage claim tracking ─────────────────────────────────────────────
// The faucet is one-shot per address. Track the claim locally so the UI can
// hide the faucet tab after a successful claim, even across reloads.

function claimStorageKey(address: string) {
  return `hl_faucet_claimed_${address.toLowerCase()}`;
}

export function hasClaimedFaucet(address: string | null | undefined): boolean {
  if (!address || typeof window === 'undefined') return false;
  return localStorage.getItem(claimStorageKey(address)) === '1';
}

function markFaucetClaimed(address: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(claimStorageKey(address), '1');
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FaucetState {
  isClaiming: boolean;
  success: boolean;
  error: string | null;
  /** True if this address has already successfully claimed the faucet */
  alreadyClaimed: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidFaucet
 *
 * Claims $1,000 testnet USDC directly onto the Hyperliquid L1 for a given
 * master wallet address. No bridge or Arbitrum transaction required.
 *
 * API: POST https://api.hyperliquid-testnet.xyz/info
 * Body: { type: 'claimDrip', user: '<address>' }
 *
 * Limitations:
 *  - Testnet only — will throw if called against mainnet config
 *  - One-time claim per address (subsequent calls return an API error)
 *
 * Reference: https://docs.privy.io/recipes/hyperliquid-guide
 */
export function useHyperliquidFaucet(address?: string | null) {
  const [state, setState] = useState<FaucetState>({
    isClaiming: false,
    success: false,
    error: null,
    alreadyClaimed: false,
  });

  // Read the persisted claim flag whenever the address changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      alreadyClaimed: hasClaimedFaucet(address),
    }));
  }, [address]);

  const claimFaucet = useCallback(async (addr: string) => {
    setState((prev) => ({ ...prev, isClaiming: true, success: false, error: null }));

    try {
      const res = await fetch(HL_TESTNET_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'claimDrip', user: addr }),
      });

      // Parse body regardless of HTTP status — HL returns errors as JSON with 200
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        if (!res.ok) throw new Error(`Faucet request failed (${res.status})`);
      }

      // Surface any API-level error message
      if (
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as Record<string, unknown>).error === 'string'
      ) {
        const errMsg = (data as Record<string, string>).error;
        // HL returns "already claimed" style errors — persist the flag so the
        // tab hides on subsequent visits even if we didn't see a clean success.
        if (/already|claimed/i.test(errMsg)) {
          markFaucetClaimed(addr);
          setState({ isClaiming: false, success: false, error: errMsg, alreadyClaimed: true });
          return;
        }
        throw new Error(errMsg);
      }

      markFaucetClaimed(addr);
      setState({ isClaiming: false, success: true, error: null, alreadyClaimed: true });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isClaiming: false,
        success: false,
        error: err instanceof Error ? err.message : 'Faucet claim failed',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isClaiming: false,
      success: false,
      error: null,
    }));
  }, []);

  return { ...state, claimFaucet, reset };
}
