'use client';

import { useQuery } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import type { HLPosition, HLOpenOrder } from '@/services/hyperliquid/types';

const transport = new hl.HttpTransport();
const infoClient = new hl.InfoClient({ transport });

// ─── Derived summary types ──────────────────────────────────────────────────

export interface PerpsAccountSummary {
  /** All open positions (filtered out zero-size entries) */
  positions: HLPosition[];
  /** All open limit / trigger orders */
  openOrders: HLOpenOrder[];
  /** Total account value in USD */
  accountValue: string;
  /** Total position notional value */
  totalNtlPos: string;
  /** Unrealized PnL across all positions */
  unrealizedPnl: string;
  /** Total margin currently in use */
  marginUsed: string;
  /** Amount available to withdraw (not in margin) */
  withdrawable: string;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useHyperliquidPositions
 *
 * Fetches the full account state (positions, balances, open orders) for the
 * master wallet address. Polls every 10s so PnL stays current.
 *
 * IMPORTANT: Pass the MASTER address (external wallet), not the agent address.
 * Positions are owned by the master account even when traded via the agent.
 */
export function useHyperliquidPositions(masterAddress: string | null) {
  return useQuery({
    queryKey: ['hl-positions', masterAddress],
    queryFn: async (): Promise<PerpsAccountSummary> => {
      if (!masterAddress) throw new Error('No master address provided');

      const [state, openOrders] = await Promise.all([
        infoClient.clearinghouseState({
          user: masterAddress as `0x${string}`,
        }),
        infoClient.openOrders({
          user: masterAddress as `0x${string}`,
        }),
      ]);

      // Filter positions that actually have a non-zero size
      const positions: HLPosition[] = state.assetPositions
        .filter((ap) => parseFloat(ap.position.szi) !== 0)
        .map((ap) => ap.position as unknown as HLPosition);

      return {
        positions,
        openOrders: openOrders as unknown as HLOpenOrder[],
        accountValue: state.marginSummary.accountValue,
        totalNtlPos: state.marginSummary.totalNtlPos,
        unrealizedPnl: state.marginSummary.totalRawUsd,
        marginUsed: state.crossMarginSummary?.totalMarginUsed ?? '0',
        withdrawable: state.withdrawable,
      };
    },
    enabled: !!masterAddress,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 2,
  });
}

/**
 * usePositionForCoin
 *
 * Returns the open position for a specific coin, if any.
 * Used in the trading form to show existing exposure.
 */
export function usePositionForCoin(
  masterAddress: string | null,
  coin: string | null,
): HLPosition | undefined {
  const { data } = useHyperliquidPositions(masterAddress);
  if (!data || !coin) return undefined;
  return data.positions.find((p) => p.coin === coin);
}
