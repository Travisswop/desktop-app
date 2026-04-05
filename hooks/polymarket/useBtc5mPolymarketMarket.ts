'use client';

/**
 * useBtc5mPolymarketMarket
 *
 * Resolves the actual Polymarket BTC 5-minute Up/Down market for the CURRENT
 * 5-minute window (the one the user would be betting on right now).
 *
 * Key behaviour:
 *  - Fetches market metadata (conditionId, clobTokenIds, outcomes, negRisk…)
 *    from GET /api/polymarket/btc5m-market?window_start=<unixSecs>
 *  - Re-fetches automatically when the window rolls over (every 5 minutes)
 *  - Exposes a human-readable `windowLabel` like "Apr 5, 1:20AM–1:25AM"
 *
 * Token IDs returned here should be used for all BTC 5-min order placements
 * so they go to the real 5m market instead of some generic monthly BTC market.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface Btc5mMarket {
  conditionId: string;
  /** Token ID for the Up / Yes (index 0) outcome. */
  upTokenId: string;
  /** Token ID for the Down / No (index 1) outcome. */
  downTokenId: string;
  negRisk: boolean;
  orderMinSize: number;
  slug: string;
  question: string;
  /** Human-readable label for the window, e.g. "Apr 5, 1:20AM–1:25AM" */
  windowLabel: string;
  /** Unix seconds for the window start */
  windowStart: number;
}

export interface Btc5mMarketState {
  market: Btc5mMarket | null;
  isLoading: boolean;
  /** True while we have stale data from the previous window (new window not yet resolved). */
  isRefreshing: boolean;
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Current 5-minute window start in Unix seconds. */
function getWindowStart(): number {
  return Math.floor(Date.now() / 1000 / 300) * 300;
}

/** Seconds until the next window boundary. */
function secsUntilNextWindow(): number {
  const now = Math.floor(Date.now() / 1000);
  return 300 - (now % 300);
}

/** Format a window start Unix seconds into a readable label. */
function formatWindowLabel(windowStart: number): string {
  const start = new Date(windowStart * 1000);
  const end = new Date((windowStart + 300) * 1000);
  const date = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtTime = (d: Date) => {
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}${ap}`;
  };
  return `${date}, ${fmtTime(start)}–${fmtTime(end)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBtc5mPolymarketMarket(): Btc5mMarketState {
  const [market, setMarket] = useState<Btc5mMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which window we last successfully loaded so we don't re-fetch
  // unnecessarily on re-renders.
  const loadedWindowRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const fetchMarket = useCallback(async (windowStart: number, isWindowRollover = false) => {
    if (loadedWindowRef.current === windowStart) return; // already have this window

    if (isWindowRollover) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/polymarket/btc5m-market?window_start=${windowStart}`);

      if (!mountedRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: Record<string, any> = await res.json();

      // Parse token IDs — Gamma API returns them as JSON string or array
      let upTokenId = '';
      let downTokenId = '';
      try {
        const tokenIds: string[] = typeof raw.clobTokenIds === 'string'
          ? JSON.parse(raw.clobTokenIds)
          : (raw.clobTokenIds ?? []);
        upTokenId = tokenIds[0] ?? '';
        downTokenId = tokenIds[1] ?? '';
      } catch { /* empty */ }

      if (!upTokenId || !downTokenId) {
        throw new Error('Market found but has no CLOB token IDs — may not be tradeable yet');
      }

      const resolved: Btc5mMarket = {
        conditionId: raw.conditionId ?? raw.condition_id ?? '',
        upTokenId,
        downTokenId,
        negRisk: raw.negRisk ?? raw.neg_risk ?? false,
        orderMinSize: raw.orderMinSize ?? raw.minimum_order_size ?? 5,
        slug: raw.slug ?? '',
        question: raw.question ?? raw.title ?? 'Bitcoin Up or Down',
        windowLabel: formatWindowLabel(windowStart),
        windowStart,
      };

      if (mountedRef.current) {
        setMarket(resolved);
        loadedWindowRef.current = windowStart;
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch BTC 5m market');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    fetchMarket(getWindowStart());
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh at every window boundary ─────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = secsUntilNextWindow() * 1000 + 500; // +500ms grace
      timer = setTimeout(() => {
        fetchMarket(getWindowStart(), /* isWindowRollover */ true);
        scheduleNext(); // re-arm for the window after that
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [fetchMarket]);

  return { market, isLoading, isRefreshing, error };
}
