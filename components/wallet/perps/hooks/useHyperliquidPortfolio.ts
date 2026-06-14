'use client';

import { useQuery } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import type { HLPosition, HLOpenOrder } from '@/services/hyperliquid/types';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';
import type { PerpsAccountSummary } from './useHyperliquidPositions';
import { buildPerpsAccountSummary } from '@/lib/perps/hyperliquidAccountSummary';

const transport = new hl.HttpTransport({
  isTestnet: HL_IS_TESTNET,
  apiUrl: getHLApiUrl(HL_IS_TESTNET),
});
const infoClient = new hl.InfoClient({ transport });

export interface PerpsPortfolio extends PerpsAccountSummary {
  /** Per-DEX account summary, keyed by dex name ('' = main USDC perp DEX). */
  perDex: Record<string, PerpsAccountSummary>;
}

const num = (v: string | undefined) => parseFloat(v ?? '0') || 0;

async function fetchDexSummary(
  user: `0x${string}`,
  dex: string,
): Promise<{ dex: string; summary: PerpsAccountSummary } | null> {
  try {
    const [state, openOrders] = await Promise.all([
      infoClient.clearinghouseState({ user, ...(dex ? { dex } : {}) }),
      infoClient.openOrders({ user, ...(dex ? { dex } : {}) }),
    ]);
    return {
      dex,
      summary: buildPerpsAccountSummary(
        state as unknown as Parameters<typeof buildPerpsAccountSummary>[0],
        openOrders as unknown as HLOpenOrder[],
      ),
    };
  } catch {
    // A single DEX failing (e.g. user never traded it) must not sink the whole
    // portfolio — treat as no balance/positions there.
    return null;
  }
}

/**
 * useHyperliquidPortfolio
 *
 * Aggregates the user's perps account across the main USDC perp DEX AND every
 * builder-deployed (HIP-3) DEX, so the UI can present ONE perps wallet:
 * positions and balances are merged across DEXs. Also exposes `perDex` so the
 * trade ticket can read the exact balance of the DEX it's about to trade on.
 */
export function useHyperliquidPortfolio(
  masterAddress: string | null,
  builderDexes: string[],
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const dexes = Array.from(
    new Set(builderDexes.map((d) => d?.trim()).filter(Boolean) as string[]),
  ).sort();

  return useQuery({
    queryKey: ['hl-portfolio', masterAddress, dexes.join(',')],
    queryFn: async (): Promise<PerpsPortfolio> => {
      if (!masterAddress) throw new Error('No master address provided');
      const user = masterAddress as `0x${string}`;

      const results = await Promise.all(
        ['', ...dexes].map((d) => fetchDexSummary(user, d)),
      );

      const perDex: Record<string, PerpsAccountSummary> = {};
      const positions: HLPosition[] = [];
      const openOrders: HLOpenOrder[] = [];
      let accountValue = 0;
      let totalNtlPos = 0;
      let unrealizedPnl = 0;
      let marginUsed = 0;
      let withdrawable = 0;

      for (const r of results) {
        if (!r) continue;
        perDex[r.dex] = r.summary;
        positions.push(...r.summary.positions);
        openOrders.push(...r.summary.openOrders);
        accountValue += num(r.summary.accountValue);
        totalNtlPos += num(r.summary.totalNtlPos);
        unrealizedPnl += num(r.summary.unrealizedPnl);
        marginUsed += num(r.summary.marginUsed);
        withdrawable += num(r.summary.withdrawable);
      }

      return {
        positions,
        openOrders,
        accountValue: accountValue.toFixed(2),
        totalNtlPos: totalNtlPos.toFixed(2),
        unrealizedPnl: unrealizedPnl.toFixed(2),
        marginUsed: marginUsed.toFixed(2),
        withdrawable: withdrawable.toFixed(2),
        perDex,
      };
    },
    enabled: options.enabled !== false && !!masterAddress,
    refetchInterval: options.refetchInterval ?? 12_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    retry: 1,
  });
}
