'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as hl from '@nktkas/hyperliquid';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';
import { useHyperliquidWebSocket } from './useHyperliquidWebSocket';

// Hyperliquid's supported intervals — see candleSnapshot schema.
export type HLInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/** UI label → HL interval. UI uses '1D' (uppercase) so we map it. */
const UI_TO_HL: Record<string, HLInterval> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
};

/** How many bars of history to load up-front (covers ~1 screen of zooming-out). */
const HISTORY_BARS = 500;

/** ms in a single bar — used to size the snapshot lookback window. */
const INTERVAL_MS: Record<HLInterval, number> = {
  '1m': 60_000,
  '3m': 3 * 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '2h': 2 * 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '8h': 8 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
  '1M': 30 * 24 * 60 * 60_000,
};

/** Converts a UI label like '15m' or '1D' to a Hyperliquid interval. */
export function toHLInterval(uiInterval: string): HLInterval {
  return UI_TO_HL[uiInterval] ?? (uiInterval as HLInterval);
}

export interface OhlcvBar {
  /** Bar open time, seconds since epoch (lightweight-charts wants seconds). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleWsPayload {
  t: number; // open ms
  T: number; // close ms
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

const transport = new hl.HttpTransport({
  isTestnet: HL_IS_TESTNET,
  apiUrl: getHLApiUrl(HL_IS_TESTNET),
});
const infoClient = new hl.InfoClient({ transport });

/**
 * useHyperliquidCandles
 *
 * Loads an initial candleSnapshot for the given (coin, interval) and then
 * subscribes to the `candle` WebSocket channel to keep the latest bar live.
 * The latest bar updates in-place; once a new bar opens it is appended.
 *
 * Returns a stable bars array (sorted ascending by time) plus the most-recent
 * bar that was streamed (handy for UI hints like "live" status).
 */
export function useHyperliquidCandles(
  coin: string | null,
  uiInterval: string,
  enabled = true,
) {
  const interval = toHLInterval(uiInterval);
  const [bars, setBars] = useState<OhlcvBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<number>(0);

  // Stable ref for the bars setter so the WS handler doesn't re-create on every
  // bar update (which would re-subscribe needlessly).
  const barsRef = useRef<OhlcvBar[]>([]);
  barsRef.current = bars;

  // Load history when coin / interval changes
  useEffect(() => {
    if (!enabled || !coin) {
      setBars([]);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    setIsLoading(true);
    setBars([]);

    const lookback = INTERVAL_MS[interval] * HISTORY_BARS;
    const startTime = Date.now() - lookback;

    infoClient
      .candleSnapshot({ coin, interval, startTime }, ac.signal)
      .then((res) => {
        if (cancelled) return;
        const sorted: OhlcvBar[] = res
          .map(toOhlcv)
          .sort((a, b) => a.time - b.time);
        setBars(sorted);
        setLatestUpdate(Date.now());
      })
      .catch((err) => {
        if (cancelled || ac.signal.aborted) return;
        // Surface in the console — we still try the WS feed which will
        // bootstrap state once a candle arrives, even if history failed.
        console.warn('[hl candles] snapshot failed', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [coin, interval, enabled]);

  // Live updates via the `candle` channel
  const handleMessage = useCallback(
    (channel: string, data: unknown) => {
      if (channel !== 'candle') return;
      const payload = data as CandleWsPayload | undefined;
      if (!payload || payload.s !== coin || payload.i !== interval) return;

      const incoming = toOhlcv(payload);
      const list = barsRef.current;

      // Most recent bar wins on equal `time` (replace), otherwise append.
      const last = list[list.length - 1];
      if (last && last.time === incoming.time) {
        const next = list.slice(0, -1);
        next.push(incoming);
        setBars(next);
      } else if (!last || incoming.time > last.time) {
        setBars([...list, incoming]);
      } else {
        // Out-of-order frame for an older bar — patch in place.
        const idx = list.findIndex((b) => b.time === incoming.time);
        if (idx >= 0) {
          const next = list.slice();
          next[idx] = incoming;
          setBars(next);
        }
      }
      setLatestUpdate(Date.now());
    },
    [coin, interval],
  );

  const subs = useMemo(
    () => (coin ? [{ type: 'candle' as const, coin, interval }] : []),
    [coin, interval],
  );

  const { connected } = useHyperliquidWebSocket(
    subs,
    handleMessage,
    enabled && !!coin,
  );

  return {
    bars,
    isLoading,
    connected,
    latestUpdate,
  };
}

function toOhlcv(c: {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}): OhlcvBar {
  return {
    time: Math.floor(c.t / 1000),
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  };
}
