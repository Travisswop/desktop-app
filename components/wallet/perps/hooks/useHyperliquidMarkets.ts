'use client';

import { useQuery } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import type { HLMarket } from '@/services/hyperliquid/types';

// Singleton transport + info client (no auth needed for read operations)
const transport = new hl.HttpTransport();
const infoClient = new hl.InfoClient({ transport });

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all perpetual markets with live mark prices and funding rates.
 * Refreshes every 15s via React Query polling.
 */
export function useHyperliquidMarkets() {
  return useQuery({
    queryKey: ['hl-markets'],
    queryFn: async (): Promise<HLMarket[]> => {
      const [meta, contexts] = await infoClient.metaAndAssetCtxs();

      return meta.universe.map((asset, index) => {
        const ctx = contexts[index];
        const markPrice = ctx?.markPx ?? '0';
        const prevDayPx = ctx?.prevDayPx ?? '0';

        const markNum = parseFloat(markPrice);
        const prevNum = parseFloat(prevDayPx);
        const change24h =
          prevNum > 0 ? ((markNum - prevNum) / prevNum) * 100 : 0;

        return {
          index,
          name: `${asset.name}-PERP`,
          coin: asset.name,
          markPrice,
          midPrice: ctx?.midPx ?? '0',
          fundingRate: ctx?.funding ?? '0',
          szDecimals: asset.szDecimals,
          maxLeverage: asset.maxLeverage,
          openInterest: ctx?.openInterest ?? '0',
          dayVolume: ctx?.dayNtlVlm ?? '0',
          change24h: parseFloat(change24h.toFixed(2)),
        };
      });
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 3,
  });
}

/**
 * Fetches live context for a single market by coin name (e.g. "BTC").
 * Used inside the trading panel for real-time mark price.
 */
export function useMarketContext(coin: string | null) {
  return useQuery({
    queryKey: ['hl-market-ctx', coin],
    queryFn: async () => {
      if (!coin) throw new Error('No coin specified');
      const [meta, contexts] = await infoClient.metaAndAssetCtxs();
      const idx = meta.universe.findIndex((a) => a.name === coin);
      if (idx === -1) throw new Error(`Market ${coin} not found`);
      return {
        meta: meta.universe[idx],
        context: contexts[idx],
        index: idx,
      };
    },
    enabled: !!coin,
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
}

/**
 * Returns a single market from the cached markets list.
 * Avoids a second network call when market list is already loaded.
 */
export function useMarketByCoins(
  markets: HLMarket[] | undefined,
  coin: string | null,
): HLMarket | undefined {
  if (!markets || !coin) return undefined;
  return markets.find((m) => m.coin === coin);
}
