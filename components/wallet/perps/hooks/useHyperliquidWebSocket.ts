'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { HLOrderBook, HLOrderBookLevel, HLTradeData } from '@/services/hyperliquid/types';

// ─── WS URLs ────────────────────────────────────────────────────────────────
const HL_WS_MAINNET = 'wss://api.hyperliquid.xyz/ws';
// const HL_WS_TESTNET = 'wss://api.hyperliquid-testnet.xyz/ws';
const HL_WS_URL = HL_WS_MAINNET;

// ─── Subscription types ─────────────────────────────────────────────────────

type Subscription =
  | { type: 'allMids' }
  | { type: 'l2Book'; coin: string }
  | { type: 'trades'; coin: string }
  | { type: 'user'; user: string };

// ─── Message Handler ─────────────────────────────────────────────────────────

type MessageHandler = (channel: string, data: unknown) => void;

// ─────────────────────────────────────────────────────────────────────────────
//  Core WS hook — low-level, handles reconnect + subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export function useHyperliquidWebSocket(
  subscriptions: Subscription[],
  onMessage: MessageHandler,
  enabled = true,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const onMessageRef = useRef(onMessage);
  const subsRef = useRef(subscriptions);
  const [connected, setConnected] = useState(false);

  // Keep refs fresh so closures in connect() never go stale
  onMessageRef.current = onMessage;
  subsRef.current = subscriptions;

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(HL_WS_URL);

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectRef.current);
      // Subscribe to all channels at once
      subsRef.current.forEach((sub) =>
        ws.send(JSON.stringify({ method: 'subscribe', subscription: sub })),
      );
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as { channel: string; data: unknown };
        if (msg.channel) {
          onMessageRef.current(msg.channel, msg.data);
        }
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Exponential-ish back-off: 2s
      reconnectRef.current = setTimeout(connect, 2_000);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [enabled]); // stable — intentional

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  return { connected };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useAllMids — live price map for all markets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the `allMids` channel and returns a live map of
 * coin → mid price as a string (e.g. { BTC: "95420.5", ETH: "3210.0" })
 */
export function useAllMids(enabled = true) {
  const [mids, setMids] = useState<Record<string, string>>({});

  const handleMessage = useCallback((channel: string, data: unknown) => {
    if (channel === 'allMids') {
      const payload = data as { mids: Record<string, string> };
      if (payload?.mids) setMids(payload.mids);
    }
  }, []);

  const { connected } = useHyperliquidWebSocket(
    [{ type: 'allMids' }],
    handleMessage,
    enabled,
  );

  return { mids, connected };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useOrderBook — live order book for a specific coin
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LEVELS = 15; // levels per side to keep

/**
 * Subscribes to the `l2Book` channel for a given coin and returns
 * the current order book with up to MAX_LEVELS bid/ask levels.
 */
export function useOrderBook(coin: string | null, enabled = true) {
  const [book, setBook] = useState<HLOrderBook | null>(null);

  const handleMessage = useCallback(
    (channel: string, data: unknown) => {
      if (channel === 'l2Book') {
        const payload = data as {
          coin: string;
          levels: [Array<{ px: string; sz: string; n: number }>, Array<{ px: string; sz: string; n: number }>];
          time: number;
        };
        if (payload?.coin !== coin) return;

        const bids: HLOrderBookLevel[] = (payload.levels[0] ?? [])
          .slice(0, MAX_LEVELS)
          .map((l) => ({ px: l.px, sz: l.sz, n: l.n }));

        const asks: HLOrderBookLevel[] = (payload.levels[1] ?? [])
          .slice(0, MAX_LEVELS)
          .map((l) => ({ px: l.px, sz: l.sz, n: l.n }));

        setBook({ coin: payload.coin, levels: [bids, asks], time: payload.time });
      }
    },
    [coin],
  );

  const subs: Subscription[] = coin ? [{ type: 'l2Book', coin }] : [];

  const { connected } = useHyperliquidWebSocket(subs, handleMessage, enabled && !!coin);

  return { book, connected };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useRecentTrades — live trade feed for a specific coin
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TRADES = 50;

export function useRecentTrades(coin: string | null, enabled = true) {
  const [trades, setTrades] = useState<HLTradeData[]>([]);

  const handleMessage = useCallback(
    (channel: string, data: unknown) => {
      if (channel === 'trades') {
        const payload = data as HLTradeData[];
        if (!Array.isArray(payload) || payload[0]?.coin !== coin) return;

        setTrades((prev) => [...payload, ...prev].slice(0, MAX_TRADES));
      }
    },
    [coin],
  );

  const subs: Subscription[] = coin ? [{ type: 'trades', coin }] : [];

  const { connected } = useHyperliquidWebSocket(subs, handleMessage, enabled && !!coin);

  return { trades, connected };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useUserFills — live fill / position updates for the master wallet
// ─────────────────────────────────────────────────────────────────────────────

export function useUserFills(
  masterAddress: string | null,
  onFill: (data: unknown) => void,
  enabled = true,
) {
  const onFillRef = useRef(onFill);
  onFillRef.current = onFill;

  const handleMessage = useCallback((channel: string, data: unknown) => {
    if (channel === 'user') {
      onFillRef.current(data);
    }
  }, []);

  const subs: Subscription[] = masterAddress
    ? [{ type: 'user', user: masterAddress }]
    : [];

  return useHyperliquidWebSocket(
    subs,
    handleMessage,
    enabled && !!masterAddress,
  );
}
