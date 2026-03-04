import { useState, useEffect, useRef, useCallback } from 'react';
import { CLOB_WS_MARKET_URL } from '@/constants/polymarket';

const CLOB_REST_URL = 'https://clob.polymarket.com';

export function useTickSize(tokenId: string | null) {
  const [tickSize, setTickSize] = useState<number>(0.01);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTickSize = useCallback(async () => {
    if (!tokenId) return;

    setIsLoading(true);
    try {
      // Direct REST call — CLOB API is public (no auth required for reads)
      const res = await fetch(
        `${CLOB_REST_URL}/tick-size?token_id=${tokenId}`,
      );
      if (res.ok) {
        const json = await res.json();
        const raw =
          json?.minimum_tick_size ?? json?.tick_size ?? json;
        const parsed = typeof raw === 'string' ? parseFloat(raw) : raw;
        if (parsed && !isNaN(parsed) && parsed > 0) {
          setTickSize(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch tick size, using default:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  // Initial REST fetch
  useEffect(() => {
    fetchTickSize();
  }, [fetchTickSize]);

  // WebSocket subscription for tick_size_change events
  useEffect(() => {
    if (!tokenId) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      const ws = new WebSocket(CLOB_WS_MARKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) {
          ws.close();
          return;
        }
        ws.send(
          JSON.stringify({
            type: 'market',
            assets_ids: [tokenId],
            custom_feature_enabled: true,
          }),
        );
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('PING');
        }, 10_000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'PONG') return;
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.event_type === 'tick_size_change' &&
            msg.new_tick_size != null
          ) {
            const parsed = parseFloat(msg.new_tick_size);
            if (!isNaN(parsed) && parsed > 0) setTickSize(parsed);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (pingRef.current) {
          clearInterval(pingRef.current);
          pingRef.current = null;
        }
        if (!destroyed) setTimeout(connect, 3_000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      destroyed = true;
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [tokenId]);

  return { tickSize, isLoading, refetch: fetchTickSize };
}
