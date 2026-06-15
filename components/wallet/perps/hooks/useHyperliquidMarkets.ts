'use client';

import { useQuery } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import type { HLMarket } from '@/services/hyperliquid/types';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';

// Singleton transport + info client (no auth needed for read operations)
const transport = new hl.HttpTransport({ isTestnet: HL_IS_TESTNET, apiUrl: getHLApiUrl(HL_IS_TESTNET) });
const infoClient = new hl.InfoClient({ transport });

const BUILDER_DEX_ASSET_OFFSET = 100_000;
const BUILDER_DEX_ASSET_STRIDE = 10_000;

function displayCoinFor(coin: string) {
  return coin.includes(':') ? coin.split(':').pop() || coin : coin;
}

async function fetchMarketSet({
  dex,
  dexName,
  dexIndex = 0,
}: {
  dex?: string;
  dexName?: string;
  dexIndex?: number;
} = {}): Promise<HLMarket[]> {
  const [meta, contexts] = dex
    ? await infoClient.metaAndAssetCtxs({ dex })
    : await infoClient.metaAndAssetCtxs();

  return meta.universe.map((asset, index) => {
    const ctx = contexts[index];
    const markPrice = ctx?.markPx ?? '0';
    const prevDayPx = ctx?.prevDayPx ?? '0';

    const markNum = parseFloat(markPrice);
    const prevNum = parseFloat(prevDayPx);
    const change24h =
      prevNum > 0 ? ((markNum - prevNum) / prevNum) * 100 : 0;
    const assetIndex = dex
      ? BUILDER_DEX_ASSET_OFFSET + dexIndex * BUILDER_DEX_ASSET_STRIDE + index
      : index;

    return {
      index: assetIndex,
      name: `${asset.name}-PERP`,
      coin: asset.name,
      displayCoin: displayCoinFor(asset.name),
      dex,
      dexName,
      markPrice,
      midPrice: ctx?.midPx ?? '0',
      fundingRate: ctx?.funding ?? '0',
      szDecimals: asset.szDecimals,
      maxLeverage: asset.maxLeverage,
      openInterest: ctx?.openInterest ?? '0',
      dayVolume: ctx?.dayNtlVlm ?? '0',
      change24h: parseFloat(change24h.toFixed(2)),
      isDelisted: asset.isDelisted === true,
    };
  });
}

async function fetchHyperliquidMarkets({
  includeBuilderDexes = true,
}: {
  includeBuilderDexes?: boolean;
} = {}): Promise<HLMarket[]> {
  const mainMarkets = await fetchMarketSet();
  if (!includeBuilderDexes) {
    return mainMarkets.filter((m) => !m.isDelisted);
  }

  let builderMarkets: HLMarket[] = [];

  try {
    const dexs = await infoClient.perpDexs();
    const builderDexs = dexs
      .map((dex, dexIndex) => ({ dex, dexIndex }))
      .filter(
        (
          item
        ): item is {
          dex: NonNullable<(typeof dexs)[number]>;
          dexIndex: number;
        } =>
          item.dexIndex > 0 &&
          Boolean(item.dex?.name) &&
          typeof item.dex?.name === 'string'
      );

    const results = await Promise.allSettled(
      builderDexs.map((item) =>
        fetchMarketSet({
          dex: item.dex.name,
          dexName: item.dex.fullName || item.dex.name,
          dexIndex: item.dexIndex,
        })
      )
    );

    builderMarkets = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );
  } catch (error) {
    console.warn('[hl markets] builder dex market fetch failed', error);
  }

  return [...mainMarkets, ...builderMarkets].filter((m) => !m.isDelisted);
}

function normalizeCoinKey(value: string) {
  const trimmed = value.trim().toUpperCase();
  return trimmed.includes(':') ? trimmed.split(':').pop() || trimmed : trimmed;
}

const MARKET_ALIASES: Record<string, string[]> = {
  GOLD: ['PAXG', 'GOLD'],
  XAU: ['PAXG', 'GOLD'],
  XAUUSD: ['PAXG', 'GOLD'],
  PAXG: ['PAXG'],
  OIL: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  BRENT: ['BRENTOIL'],
  BRENTOIL: ['BRENTOIL'],
  'BRENT OIL': ['BRENTOIL'],
  CRUDE: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'CRUDE OIL': ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  SPACEX: ['SPCX', 'SPACEX'],
  'SPACE X': ['SPCX', 'SPACEX'],
};

function normalizeMarketQuery(value: string) {
  return value
    .replace(/-?PERP\b/gi, ' ')
    .replace(/[$]/g, '')
    .replace(/[^a-zA-Z0-9: .&/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function compactMarketKey(value: string) {
  return normalizeMarketQuery(value).replace(/[^A-Z0-9]/g, '');
}

function aliasTargets(value: string) {
  const normalized = normalizeMarketQuery(value);
  const compact = compactMarketKey(value);
  return [
    ...(MARKET_ALIASES[normalized] || []),
    ...(MARKET_ALIASES[compact] || []),
  ];
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all perpetual markets with live mark prices and funding rates.
 * Refreshes every 15s via React Query polling.
 */
export function useHyperliquidMarkets({
  enabled = true,
  includeBuilderDexes = true,
}: { enabled?: boolean; includeBuilderDexes?: boolean } = {}) {
  return useQuery({
    queryKey: ['hl-markets', includeBuilderDexes ? 'all-dexes' : 'main'],
    queryFn: async (): Promise<HLMarket[]> => {
      return fetchHyperliquidMarkets({ includeBuilderDexes });
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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
      const dex = coin.includes(':') ? coin.split(':')[0] : undefined;
      const [meta, contexts] = dex
        ? await infoClient.metaAndAssetCtxs({ dex })
        : await infoClient.metaAndAssetCtxs();
      const idx = meta.universe.findIndex((a) => a.name === coin);
      if (idx === -1) throw new Error(`Market ${coin} not found`);
      return {
        meta: meta.universe[idx],
        context: contexts[idx],
        index: dex ? undefined : idx,
      };
    },
    enabled: !!coin,
    staleTime: 3_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
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
  const normalized = coin.trim().toUpperCase();
  const normalizedDisplay = normalizeCoinKey(coin);
  const aliases = aliasTargets(coin).map((target) => target.toUpperCase());
  return (
    markets.find((m) => m.coin.toUpperCase() === normalized) ||
    markets.find(
      (m) =>
        m.displayCoin?.toUpperCase() === normalized ||
        normalizeCoinKey(m.coin) === normalizedDisplay ||
        aliases.includes(m.coin.toUpperCase()) ||
        aliases.includes(normalizeCoinKey(m.coin)) ||
        (m.displayCoin ? aliases.includes(m.displayCoin.toUpperCase()) : false)
    )
  );
}
