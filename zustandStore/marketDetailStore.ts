/**
 * marketDetailStore
 *
 * In-memory hand-off for the `/prediction/market/[marketId]` route. The
 * markets list / portfolio / positions screens already have the full
 * `PolymarketMarket` object in memory; rather than refetch a single market
 * on the detail page (no such endpoint exists), each callsite stashes the
 * object here and pushes the route. The detail page reads it back.
 *
 * Direct URL hits (refresh, deep-link) will find an empty store — the
 * detail page then falls back to a loading/not-found state.
 */

import { create } from 'zustand';
import type { PolymarketMarket } from '@/hooks/polymarket';
import type { SportsGameGroup } from '@/lib/polymarket/sports-grouping';

export type MarketDetailEntry = {
  market: PolymarketMarket;
  game?: SportsGameGroup;
  initialOutcome?: 'yes' | 'no';
  initialAmount?: string;
  initialSide?: 'BUY' | 'SELL';
  initialOrderType?: 'market' | 'limit';
  initialLimitPrice?: string;
  outcomeLabels?: [string, string];
  yesShares?: number;
  noShares?: number;
};

interface MarketDetailState {
  entries: Record<string, MarketDetailEntry>;
  set: (key: string, entry: MarketDetailEntry) => void;
  get: (key: string) => MarketDetailEntry | undefined;
  clear: (key: string) => void;
}

export const useMarketDetailStore = create<MarketDetailState>((set, get) => ({
  entries: {},
  set: (key, entry) =>
    set((s) => ({ entries: { ...s.entries, [key]: entry } })),
  get: (key) => get().entries[key],
  clear: (key) =>
    set((s) => {
      const next = { ...s.entries };
      delete next[key];
      return { entries: next };
    }),
}));

/**
 * Build a stable URL key for a market. We prefer `conditionId` (unique on
 * Polymarket), then fall back to `id`, then the slug. Whatever we use here
 * MUST match what the page reads via `useParams().marketId`.
 */
export function marketRouteKey(market: PolymarketMarket): string {
  return (
    (market.conditionId as string) ||
    (market.id as string) ||
    (market.slug as string) ||
    ''
  );
}

export function marketDetailHref(market?: PolymarketMarket | null): string {
  const routeKey = market ? marketRouteKey(market) : '';
  return routeKey
    ? `/prediction/market/${encodeURIComponent(routeKey)}`
    : '/prediction';
}

export function normalizeMarketDetailHref(href?: string): string {
  if (!href) return '/prediction';
  if (href.startsWith('/prediction')) return href;
  return '/prediction';
}
