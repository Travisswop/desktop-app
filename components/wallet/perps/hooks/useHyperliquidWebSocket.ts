'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { HLOrderBook, HLOrderBookLevel, HLTradeData } from '@/services/hyperliquid/types';
import { HL_WS_URL } from '@/services/hyperliquid/config';

// ─── Subscription types ─────────────────────────────────────────────────────

type Subscription =
  | { type: 'allMids' }
  | { type: 'l2Book'; coin: string }
  | { type: 'trades'; coin: string }
  | { type: 'user'; user: string }
  | { type: 'userEvents'; user: string }
  | { type: 'userFills'; user: string }
  | { type: 'candle'; coin: string; interval: string };

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
  // Tracks subscriptions actually live on the current socket (serialized keys).
  // Compared against the desired set on every reconcile to compute a diff
  // and send the minimum necessary subscribe/unsubscribe frames.
  const activeSubsRef = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);

  // Keep refs fresh so closures never see a stale subs array
  onMessageRef.current = onMessage;
  subsRef.current = subscriptions;

  // Stable string key for the *content* of the desired subscriptions, so the
  // reconcile effect only runs when the subscription set actually changes
  // (not on every parent re-render that produces a new array reference).
  const desiredKey = subscriptions
    .map((s) => JSON.stringify(s))
    .sort()
    .join('|');

  const reconcileSubscriptions = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;

    const desired = new Map<string, Subscription>();
    for (const sub of subsRef.current) {
      desired.set(JSON.stringify(sub), sub);
    }

    // Unsubscribe from channels we no longer want (e.g. previously-selected coin)
    for (const key of Array.from(activeSubsRef.current)) {
      if (!desired.has(key)) {
        try {
          ws.send(
            JSON.stringify({
              method: 'unsubscribe',
              subscription: JSON.parse(key) as Subscription,
            }),
          );
        } catch {
          // ignore send errors — socket may have just closed
        }
        activeSubsRef.current.delete(key);
      }
    }

    // Subscribe to new channels (e.g. newly-selected coin)
    for (const [key, sub] of desired) {
      if (!activeSubsRef.current.has(key)) {
        try {
          ws.send(JSON.stringify({ method: 'subscribe', subscription: sub }));
        } catch {
          // ignore — handled by reconnect
        }
        activeSubsRef.current.add(key);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(HL_WS_URL);

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectRef.current);
      // Fresh socket = no live subscriptions on the wire. Clear the tracking
      // set so reconcile re-sends every desired subscription from scratch.
      activeSubsRef.current.clear();
      reconcileSubscriptions();
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
      activeSubsRef.current.clear();
      // Exponential-ish back-off: 2s
      reconnectRef.current = setTimeout(connect, 2_000);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [enabled, reconcileSubscriptions]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    const activeSubscriptions = activeSubsRef.current;
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      activeSubscriptions.clear();
    };
  }, [connect, enabled]);

  // React to subscription set changes while the socket is already open.
  // Without this, switching coin would leave the old l2Book subscription
  // active and never start the new one — incoming frames would be dropped
  // by the consumer's coin guard.
  useEffect(() => {
    reconcileSubscriptions();
  }, [desiredKey, reconcileSubscriptions]);

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

  // Drop the stale book the moment the user switches markets so the UI shows
  // a loading state instead of the previous coin's depth labelled as the new one.
  useEffect(() => {
    setBook(null);
  }, [coin]);

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

  // Wipe the trade tape on coin change so the new market doesn't inherit
  // the previous market's tape briefly.
  useEffect(() => {
    setTrades([]);
  }, [coin]);

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
    if (channel === 'user' || channel === 'userEvents' || channel === 'userFills') {
      onFillRef.current(data);
    }
  }, []);

  const subs: Subscription[] = masterAddress
    ? [
        { type: 'userEvents', user: masterAddress },
        { type: 'userFills', user: masterAddress },
      ]
    : [];

  return useHyperliquidWebSocket(
    subs,
    handleMessage,
    enabled && !!masterAddress,
  );
}
