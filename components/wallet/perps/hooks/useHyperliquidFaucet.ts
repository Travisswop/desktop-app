'use client';

import { useState, useCallback } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const HL_TESTNET_INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FaucetState {
  isClaiming: boolean;
  success: boolean;
  error: string | null;
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
export function useHyperliquidFaucet() {
  const [state, setState] = useState<FaucetState>({
    isClaiming: false,
    success: false,
    error: null,
  });

  const claimFaucet = useCallback(async (address: string) => {
    setState({ isClaiming: true, success: false, error: null });

    try {
      const res = await fetch(HL_TESTNET_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'claimDrip', user: address }),
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
        throw new Error((data as Record<string, string>).error);
      }

      setState({ isClaiming: false, success: true, error: null });
    } catch (err) {
      setState({
        isClaiming: false,
        success: false,
        error: err instanceof Error ? err.message : 'Faucet claim failed',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isClaiming: false, success: false, error: null });
  }, []);

  return { ...state, claimFaucet, reset };
}
