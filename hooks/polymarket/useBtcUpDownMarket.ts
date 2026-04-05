'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface BtcMarketState {
  currentPrice: number | null;
  startPrice: number | null;
  countdownSeconds: number;
  /** 0–100: probability that price is higher at window end */
  upProbability: number;
  /** Absolute USD change from window-open price */
  priceChange: number;
  /** Percentage change from window-open price */
  priceChangePct: number;
  isConnected: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a string key identifying the current 5-minute window (e.g. "14:35"). */
function getWindowKey(): string {
  const now = new Date();
  const windowMinute = Math.floor(now.getMinutes() / 5) * 5;
  return `${now.getHours()}:${String(windowMinute).padStart(2, '0')}`;
}

/** Seconds remaining until the next 5-minute boundary. */
function getCountdownSeconds(): number {
  const now = new Date();
  const msIntoWindow = (now.getMinutes() % 5) * 60_000 + now.getSeconds() * 1000 + now.getMilliseconds();
  return Math.max(0, Math.ceil((300_000 - msIntoWindow) / 1000));
}

/**
 * Maps price deviation from start to a 0-100 probability.
 * ±2.5 % move shifts probability by ±49 points (capped).
 */
function calcUpProbability(current: number, start: number): number {
  if (start === 0) return 50;
  const pctChange = (current - start) / start;
  const shift = Math.min(0.49, Math.max(-0.49, pctChange * 20));
  return Math.round((0.5 + shift) * 100);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBtcUpDownMarket(): BtcMarketState {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [startPrice, setStartPrice] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const windowKeyRef = useRef('');

  /** Apply an incoming price tick: update current price + reset window if needed. */
  const applyPrice = useCallback((price: number) => {
    setCurrentPrice(price);
    const key = getWindowKey();
    if (windowKeyRef.current !== key) {
      windowKeyRef.current = key;
      setStartPrice(price);
    }
  }, []);

  // ── Binance REST fallback ────────────────────────────────────────────────
  const fetchPrice = useCallback(async () => {
    // Primary: Binance REST
    try {
      const res = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('binance-rest-failed');
      const { price } = await res.json() as { price: string };
      const p = parseFloat(price);
      if (p > 0) { applyPrice(p); setIsConnected(true); return; }
    } catch {/* fall through */}

    // Secondary: CoinGecko
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        { cache: 'no-store' },
      );
      if (!res.ok) return;
      const data = await res.json() as { bitcoin?: { usd?: number } };
      const p = data?.bitcoin?.usd;
      if (p && p > 0) { applyPrice(p); setIsConnected(true); }
    } catch {
      setIsConnected(false);
    }
  }, [applyPrice]);

  // ── Binance WebSocket (primary) + polling fallback ───────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let destroyed = false;

    const clearPoll = () => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    };

    const startPoll = () => {
      if (pollInterval) return;
      fetchPrice(); // immediate fetch
      pollInterval = setInterval(fetchPrice, 2_000);
    };

    const connect = () => {
      if (destroyed) return;
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

        ws.onopen = () => {
          setIsConnected(true);
          clearPoll(); // WebSocket is up — stop polling
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as { c?: string };
            const p = parseFloat(data.c ?? '');
            if (p > 0) applyPrice(p);
          } catch {/* ignore */}
        };

        ws.onerror = () => setIsConnected(false);

        ws.onclose = () => {
          if (destroyed) return;
          setIsConnected(false);
          startPoll(); // fall back to polling while disconnected
          reconnectTimer = setTimeout(connect, 5_000);
        };
      } catch {
        // WebSocket unavailable (e.g. SSR guard shouldn't be needed but just in case)
        startPoll();
      }
    };

    // Kick things off
    fetchPrice();
    connect();

    return () => {
      destroyed = true;
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearPoll();
    };
  }, [applyPrice, fetchPrice]);

  // ── Countdown ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    // Initialise immediately on mount
    setCountdownSeconds(getCountdownSeconds());

    const id = setInterval(() => {
      const secs = getCountdownSeconds();
      setCountdownSeconds(secs);

      // When window rolls over and we have a price, lock in new start price
      if (secs === 299 || secs === 300) {
        setCurrentPrice((cp) => {
          if (cp !== null) {
            windowKeyRef.current = ''; // force reset on next applyPrice call
          }
          return cp;
        });
      }
    }, 1_000);

    return () => clearInterval(id);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const upProbability =
    currentPrice !== null && startPrice !== null
      ? calcUpProbability(currentPrice, startPrice)
      : 50;

  const priceChange =
    currentPrice !== null && startPrice !== null ? currentPrice - startPrice : 0;

  const priceChangePct =
    startPrice !== null && startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

  return {
    currentPrice,
    startPrice,
    countdownSeconds,
    upProbability,
    priceChange,
    priceChangePct,
    isConnected,
  };
}
