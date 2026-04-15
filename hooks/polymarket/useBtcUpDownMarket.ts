'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBtc5mPolymarketMarket } from './useBtc5mPolymarketMarket';
import { CLOB_API_URL, CLOB_WS_MARKET_URL } from '@/constants/polymarket/api';

export interface BtcMarketState {
  currentPrice: number | null;
  startPrice: number | null;
  countdownSeconds: number;
  /**
   * 0–100 probability that BTC finishes higher than the window-open price.
   *
   * Source priority:
   *  1. Polymarket CLOB mid-price for the Up token (actual market consensus)
   *  2. Synthetic formula from BTC price deviation (fallback when CLOB unavailable)
   */
  upProbability: number;
  /** Absolute USD change from window-open price */
  priceChange: number;
  /** Percentage change from window-open price */
  priceChangePct: number;
  /** True when at least one live data source (Binance WS or Polymarket CLOB WS) is connected */
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
  const msIntoWindow =
    (now.getMinutes() % 5) * 60_000 + now.getSeconds() * 1000 + now.getMilliseconds();
  return Math.max(0, Math.ceil((300_000 - msIntoWindow) / 1000));
}

/**
 * FALLBACK ONLY — used when no Polymarket CLOB price is available.
 *
 * OLD BUG: this was the *sole* source of upProbability. Two problems:
 *   (a) Math.round() eats sub-dollar BTC moves: a $50 move on $84k BTC gives
 *       shift=0.012 → Math.round(51.2) = 51, and moves smaller than ~$25
 *       always round to 50 — the display appears frozen.
 *   (b) It reflects BTC price momentum, not Polymarket market consensus. Real
 *       market probabilities are driven by order flow and can diverge sharply.
 *
 * This formula is kept only as a graceful fallback when the CLOB feed is down.
 */
function calcUpProbabilityFallback(current: number, start: number): number {
  if (start === 0) return 50;
  const pctChange = (current - start) / start;
  const shift = Math.min(0.49, Math.max(-0.49, pctChange * 20));
  return Math.round((0.5 + shift) * 100);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBtcUpDownMarket(): BtcMarketState {
  // ── BTC spot-price state (Binance) ────────────────────────────────────────
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [startPrice, setStartPrice] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isBinanceConnected, setIsBinanceConnected] = useState(false);

  const windowKeyRef = useRef('');

  // ── Polymarket CLOB price state ───────────────────────────────────────────
  /**
   * upMidPrice / downMidPrice hold the live Polymarket mid-market price (0–1)
   * for the Up and Down tokens of the current 5-minute window.
   *
   * These come from the Polymarket CLOB WebSocket and are reset to null whenever
   * the window rolls over (new token IDs), preventing the old window's prices
   * from bleeding into the new window's display.
   */
  const [upMidPrice, setUpMidPrice] = useState<number | null>(null);
  const [isClobConnected, setIsClobConnected] = useState(false);

  // ── Resolve the current window's Polymarket market ────────────────────────
  const { market } = useBtc5mPolymarketMarket();

  // ── Apply a BTC price tick ────────────────────────────────────────────────
  const applyBtcPrice = useCallback((price: number) => {
    setCurrentPrice(price);
    const key = getWindowKey();
    if (windowKeyRef.current !== key) {
      windowKeyRef.current = key;
      setStartPrice(price);
    }
  }, []);

  // ── Binance REST fallback ─────────────────────────────────────────────────
  const fetchBtcPrice = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('binance-rest-failed');
      const { price } = (await res.json()) as { price: string };
      const p = parseFloat(price);
      if (p > 0) {
        applyBtcPrice(p);
        setIsBinanceConnected(true);
        return;
      }
    } catch {
      /* fall through */
    }

    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        { cache: 'no-store' },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { bitcoin?: { usd?: number } };
      const p = data?.bitcoin?.usd;
      if (p && p > 0) {
        applyBtcPrice(p);
        setIsBinanceConnected(true);
      }
    } catch {
      setIsBinanceConnected(false);
    }
  }, [applyBtcPrice]);

  // ── Binance WebSocket (primary) + polling fallback ────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let destroyed = false;

    const clearPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPoll = () => {
      if (pollInterval) return;
      fetchBtcPrice();
      pollInterval = setInterval(fetchBtcPrice, 2_000);
    };

    const connect = () => {
      if (destroyed) return;
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

        ws.onopen = () => {
          setIsBinanceConnected(true);
          clearPoll();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as { c?: string };
            const p = parseFloat(data.c ?? '');
            if (p > 0) applyBtcPrice(p);
          } catch {
            /* ignore */
          }
        };

        ws.onerror = () => setIsBinanceConnected(false);

        ws.onclose = () => {
          if (destroyed) return;
          setIsBinanceConnected(false);
          startPoll();
          reconnectTimer = setTimeout(connect, 5_000);
        };
      } catch {
        startPoll();
      }
    };

    fetchBtcPrice();
    connect();

    return () => {
      destroyed = true;
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearPoll();
    };
  }, [applyBtcPrice, fetchBtcPrice]);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    setCountdownSeconds(getCountdownSeconds());

    const id = setInterval(() => {
      const secs = getCountdownSeconds();
      setCountdownSeconds(secs);

      if (secs === 299 || secs === 300) {
        setCurrentPrice((cp) => {
          if (cp !== null) windowKeyRef.current = '';
          return cp;
        });
      }
    }, 1_000);

    return () => clearInterval(id);
  }, []);

  // ── Polymarket CLOB live price subscription ───────────────────────────────
  /**
   * FIX: Subscribe to Polymarket's CLOB WebSocket for the current window's
   * Up and Down token IDs. This effect re-runs whenever market.upTokenId /
   * market.downTokenId change (i.e. every time the 5-minute window rolls over
   * and useBtc5mPolymarketMarket resolves new token IDs).
   *
   * Protocol: wss://ws-subscriptions-clob.polymarket.com/ws/market
   *   Subscribe: { "assets_ids": [upTokenId, downTokenId], "type": "market" }
   *   Events:
   *     "book"         — full orderbook snapshot (sent on subscribe)
   *     "price_change" — incremental level updates [side, price, size]
   *
   * We maintain a local bid/ask Map per token so we can correctly handle level
   * removals (size="0") and always compute an accurate mid-price.
   *
   * REST fallback: GET /midpoint?token_id=<id> is polled every 3 s while the
   * WebSocket is not connected. Once the WS connects and delivers its first
   * "book" snapshot, polling stops.
   */
  useEffect(() => {
    const upTokenId = market?.upTokenId;
    const downTokenId = market?.downTokenId;

    // Reset stale prices from the previous window immediately
    setUpMidPrice(null);
    setIsClobConnected(false);

    if (!upTokenId || !downTokenId) return;

    let ws: WebSocket | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    // Local orderbook state (per token) for correct incremental mid-price tracking.
    // Map key = price string (preserves decimal precision), value = size as number.
    const bids: Record<string, Map<string, number>> = {
      [upTokenId]: new Map(),
      [downTokenId]: new Map(),
    };
    const asks: Record<string, Map<string, number>> = {
      [upTokenId]: new Map(),
      [downTokenId]: new Map(),
    };

    const getBestBid = (tokenId: string): number => {
      const map = bids[tokenId];
      if (!map || map.size === 0) return 0;
      return Math.max(...Array.from(map.keys()).map(parseFloat));
    };

    const getBestAsk = (tokenId: string): number => {
      const map = asks[tokenId];
      if (!map || map.size === 0) return 1;
      return Math.min(...Array.from(map.keys()).map(parseFloat));
    };

    /** Recompute mid-price for a token and push state update if valid. */
    const pushMid = (tokenId: string) => {
      const bid = getBestBid(tokenId);
      const ask = getBestAsk(tokenId);
      if (bid > 0 && ask < 1 && bid < ask) {
        const mid = (bid + ask) / 2;
        if (tokenId === upTokenId) {
          console.debug('[BtcUpDown] Up mid-price updated', { mid, bid, ask, tokenId });
          setUpMidPrice(mid);
        }
        // Note: downMidPrice is not stored separately because the card derives
        // downProbability as (100 - upProbability). In a binary market these
        // always sum to 1 anyway.
      }
    };

    // ── REST midpoint fallback ──────────────────────────────────────────────
    const fetchMidpoint = async (tokenId: string) => {
      try {
        const res = await fetch(`${CLOB_API_URL}/midpoint?token_id=${tokenId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { mid?: string };
        const mid = parseFloat(data.mid ?? '');
        if (mid > 0 && mid < 1) {
          console.debug('[BtcUpDown] REST midpoint', { tokenId, mid });
          if (tokenId === upTokenId) setUpMidPrice(mid);
        }
      } catch {
        /* ignore */
      }
    };

    const startPoll = () => {
      if (pollInterval) return;
      fetchMidpoint(upTokenId);
      fetchMidpoint(downTokenId);
      pollInterval = setInterval(() => {
        fetchMidpoint(upTokenId);
        fetchMidpoint(downTokenId);
      }, 3_000);
    };

    const stopPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    // ── WebSocket connection ────────────────────────────────────────────────
    const connect = () => {
      if (destroyed) return;
      try {
        ws = new WebSocket(CLOB_WS_MARKET_URL);

        ws.onopen = () => {
          if (destroyed) {
            ws?.close();
            return;
          }
          // Subscribe to both Up and Down token order books
          ws!.send(
            JSON.stringify({
              assets_ids: [upTokenId, downTokenId],
              type: 'market',
            }),
          );
          setIsClobConnected(true);
          stopPoll(); // WS is live — stop REST polling

          // Keep-alive ping every 10 s
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) ws.send('PING');
          }, 10_000);

          console.debug('[BtcUpDown] CLOB WS connected, subscribed to', { upTokenId, downTokenId });
        };

        ws.onmessage = (event) => {
          if (event.data === 'PONG') return;
          try {
            const raw = JSON.parse(event.data as string);
            // Polymarket can batch multiple events into an array
            const msgs: unknown[] = Array.isArray(raw) ? raw : [raw];

            for (const item of msgs) {
              const msg = item as Record<string, unknown>;
              const assetId = msg.asset_id as string | undefined;
              if (!assetId || (assetId !== upTokenId && assetId !== downTokenId)) continue;

              if (msg.event_type === 'book') {
                // Full snapshot: rebuild our local orderbook from scratch
                const rawBuys = (msg.buys as Array<{ price: string; size: string }> | undefined) ?? [];
                const rawSells = (msg.sells as Array<{ price: string; size: string }> | undefined) ?? [];

                bids[assetId] = new Map(
                  rawBuys
                    .filter((b) => parseFloat(b.size) > 0)
                    .map((b) => [b.price, parseFloat(b.size)]),
                );
                asks[assetId] = new Map(
                  rawSells
                    .filter((s) => parseFloat(s.size) > 0)
                    .map((s) => [s.price, parseFloat(s.size)]),
                );

                console.debug('[BtcUpDown] book snapshot', {
                  assetId,
                  bids: rawBuys.length,
                  asks: rawSells.length,
                });
                pushMid(assetId);
              } else if (msg.event_type === 'price_change') {
                // Incremental update: apply each changed level
                const changes = (msg.changes as Array<[string, string, string]> | undefined) ?? [];
                for (const [side, price, size] of changes) {
                  const sz = parseFloat(size);
                  if (side === 'BUY') {
                    if (sz === 0) bids[assetId].delete(price);
                    else bids[assetId].set(price, sz);
                  } else if (side === 'SELL') {
                    if (sz === 0) asks[assetId].delete(price);
                    else asks[assetId].set(price, sz);
                  }
                }
                pushMid(assetId);
              } else if (msg.event_type === 'last_trade_price') {
                // Use last trade price as a direct price signal when book is thin
                const tradePrice = parseFloat((msg.price as string) ?? '');
                if (tradePrice > 0 && tradePrice < 1 && assetId === upTokenId) {
                  console.debug('[BtcUpDown] last_trade_price', { assetId, tradePrice });
                  setUpMidPrice(tradePrice);
                }
              }
            }
          } catch {
            /* ignore malformed messages */
          }
        };

        ws.onerror = () => {
          setIsClobConnected(false);
          startPoll();
        };

        ws.onclose = () => {
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          if (destroyed) return;
          setIsClobConnected(false);
          startPoll(); // fall back to REST while reconnecting
          reconnectTimer = setTimeout(connect, 5_000);
        };
      } catch {
        startPoll();
      }
    };

    // Kick off: REST fetch immediately, then open WS
    startPoll();
    connect();

    return () => {
      destroyed = true;
      ws?.close();
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPoll();
    };
    // Re-run when the window rolls over (useBtc5mPolymarketMarket resolves new token IDs)
  }, [market?.upTokenId, market?.downTokenId]);

  // ── Derived values ────────────────────────────────────────────────────────

  /**
   * upProbability now sources from Polymarket CLOB (actual market consensus).
   * Falls back to the synthetic BTC-deviation formula only when the CLOB feed
   * is unavailable (first load, network error, etc.).
   */
  const upProbability = (() => {
    if (upMidPrice !== null) {
      // Polymarket prices are 0–1 probabilities; display as 0–100 integer
      return Math.round(upMidPrice * 100);
    }
    // Fallback: synthetic formula (see calcUpProbabilityFallback JSDoc for caveats)
    if (currentPrice !== null && startPrice !== null) {
      return calcUpProbabilityFallback(currentPrice, startPrice);
    }
    return 50;
  })();

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
    // LIVE badge is green when either the BTC price feed OR the Polymarket
    // CLOB feed is connected — at least one data source is updating.
    isConnected: isBinanceConnected || isClobConnected,
  };
}
