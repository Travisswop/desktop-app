'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { normalizePerpsCoin } from './useLivePerpsMarkPrice';

/**
 * Resolving a bare ticker to a Hyperliquid market.
 *
 * Feed posts made before the builder-DEX (HIP-3) rollout stored only a ticker —
 * "SPACEX", "TSLA" — with no DEX. Hyperliquid needs the qualified name
 * (`vntl:SPACEX`, `xyz:TSLA`); a bare builder ticker 500s on candleSnapshot,
 * and the card then falls back to drawing a straight line between entry and
 * mark, which is not real price history.
 *
 * This used to be a two-entry hardcode mapping both SPCX and SPACEX to
 * `xyz:SPCX`. That conflated two different markets: `xyz` lists SpaceX as
 * SPCX while Ventuals (`vntl`) lists it as SPACEX, at its own price. Anyone
 * who traded SpaceX on Ventuals had their position charted against the wrong
 * market, and Ventuals-only names (OPENAI, ANTHROPIC) resolved to nothing.
 *
 * Instead we index the live universe and match on the exact ticker, which also
 * picks up any builder DEX listed after this was written.
 */

interface PerpsMarketIndex {
  /** Qualified names on the first-party perp DEX, e.g. "BTC". */
  main: Set<string>;
  /** Bare ticker → qualified names, e.g. "SPACEX" → ["vntl:SPACEX"]. */
  builder: Map<string, string[]>;
}

interface HLMetaResponse {
  universe?: Array<{ name?: string }>;
}

async function postInfo<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch('/api/hyperliquid/mainnet/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function bareTicker(qualifiedName: string) {
  const parts = qualifiedName.split(':');
  return (parts.length > 1 ? parts[parts.length - 1] : qualifiedName)
    .trim()
    .toUpperCase();
}

async function fetchPerpsMarketIndex(): Promise<PerpsMarketIndex> {
  const index: PerpsMarketIndex = { main: new Set(), builder: new Map() };

  const [mainMeta, dexs] = await Promise.all([
    postInfo<HLMetaResponse>({ type: 'meta' }),
    postInfo<Array<{ name?: string } | null>>({ type: 'perpDexs' }),
  ]);

  for (const asset of mainMeta?.universe ?? []) {
    if (asset?.name) index.main.add(asset.name.trim().toUpperCase());
  }

  // perpDexs()[0] is the first-party DEX (null); the rest are builder DEXes,
  // in deployment order — which is also the order we prefer on a tie.
  const builderDexNames = (dexs ?? [])
    .map((dex) => dex?.name)
    .filter((name): name is string => Boolean(name));

  const metas = await Promise.all(
    builderDexNames.map((dex) => postInfo<HLMetaResponse>({ type: 'meta', dex })),
  );

  metas.forEach((meta) => {
    for (const asset of meta?.universe ?? []) {
      const name = asset?.name?.trim();
      if (!name || !name.includes(':')) continue;
      const ticker = bareTicker(name);
      const existing = index.builder.get(ticker);
      if (existing) existing.push(name);
      else index.builder.set(ticker, [name]);
    }
  });

  return index;
}

/**
 * The listed-market set changes when a DEX lists something new — rare enough
 * that one fetch per session is plenty, and every feed card shares it.
 */
export function usePerpsMarketIndex(enabled = true) {
  return useQuery({
    queryKey: ['hl-perps-market-index'],
    queryFn: fetchPerpsMarketIndex,
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function resolvePerpsMarketCoin(
  rawCoin: string | null | undefined,
  index: PerpsMarketIndex | undefined,
) {
  const structural = normalizePerpsCoin(rawCoin);

  // Already qualified (`vntl:SPACEX`) or unusable — nothing to resolve.
  if (!structural || structural.dex || !index) return structural;

  const ticker = structural.displayCoin;

  // A first-party market (BTC, ETH, …) is never a builder market.
  if (index.main.has(ticker)) return structural;

  const matches = index.builder.get(ticker);
  if (!matches || matches.length === 0) return structural;

  // Ambiguous tickers are real: TSLA is listed on xyz, flx, km, cash and mkts.
  // Without a stored DEX we cannot know which one the position was opened on,
  // so take the earliest-deployed DEX — deterministic, and far better than the
  // fabricated straight line a bare ticker produces.
  const qualified = matches[0];
  const resolved = normalizePerpsCoin(qualified);
  return resolved ?? structural;
}

/**
 * Resolves a stored feed coin to the market it should be priced and charted
 * against. Returns the structural parse immediately and upgrades once the
 * market index loads, so the card renders without waiting on the network.
 */
export function usePerpsMarketCoin(
  rawCoin: string | null | undefined,
  enabled = true,
) {
  const structural = useMemo(() => normalizePerpsCoin(rawCoin), [rawCoin]);

  // Only bare tickers need resolving; a qualified coin costs no network call.
  const needsResolution = Boolean(structural && !structural.dex && enabled);
  const { data: index } = usePerpsMarketIndex(needsResolution);

  return useMemo(
    () => (needsResolution ? resolvePerpsMarketCoin(rawCoin, index) : structural),
    [needsResolution, rawCoin, index, structural],
  );
}
