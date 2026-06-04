'use client';

import { useQuery } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import { getHLApiUrl } from '@/services/hyperliquid/config';

// ─── Clients ───────────────────────────────────────────────────────────────────
//
// We keep one client per network so the PerpsCard can show both balances
// regardless of which environment the app is currently pointed at.

const mainnetClient = new hl.InfoClient({
  transport: new hl.HttpTransport({ isTestnet: false, apiUrl: getHLApiUrl(false) }),
});
const testnetClient = new hl.InfoClient({
  transport: new hl.HttpTransport({ isTestnet: true, apiUrl: getHLApiUrl(true) }),
});

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NetworkBalance {
  accountValue: string;
  withdrawable: string;
}

export interface DualBalance {
  mainnet: NetworkBalance;
  testnet: NetworkBalance;
}

const EMPTY_BALANCE: NetworkBalance = { accountValue: '0', withdrawable: '0' };

// ─── Hook ──────────────────────────────────────────────────────────────────────

async function fetchBalance(
  client: hl.InfoClient,
  address: string,
): Promise<NetworkBalance> {
  try {
    const state = await client.clearinghouseState({
      user: address as `0x${string}`,
    });
    return {
      accountValue: state.marginSummary.accountValue,
      withdrawable: state.withdrawable,
    };
  } catch {
    return EMPTY_BALANCE;
  }
}

/**
 * useHyperliquidDualBalance
 *
 * Fetches the Hyperliquid account balance for a single address from BOTH
 * mainnet and testnet simultaneously. Used by PerpsCard so the user sees
 * their testnet and mainnet account values side-by-side regardless of the
 * currently-active environment.
 */
export function useHyperliquidDualBalance(masterAddress: string | null | undefined) {
  return useQuery({
    queryKey: ['hl-dual-balance', masterAddress],
    queryFn: async (): Promise<DualBalance> => {
      if (!masterAddress) {
        return { mainnet: EMPTY_BALANCE, testnet: EMPTY_BALANCE };
      }
      const [mainnet, testnet] = await Promise.all([
        fetchBalance(mainnetClient, masterAddress),
        fetchBalance(testnetClient, masterAddress),
      ]);
      return { mainnet, testnet };
    },
    enabled: !!masterAddress,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    retry: 1,
  });
}
