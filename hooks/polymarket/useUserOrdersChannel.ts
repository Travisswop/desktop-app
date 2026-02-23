import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CLOB_WS_USER_URL } from "@/constants/polymarket";
import type { UserApiCredentials } from "./useUserApiCredentials";

/**
 * Subscribes to the Polymarket user WebSocket channel to receive real-time
 * order and trade lifecycle events.
 *
 * On `order` events (PLACEMENT / UPDATE / CANCELLATION): invalidates active-orders cache.
 * On `trade` events (MATCHED / MINED / CONFIRMED): invalidates positions cache.
 *
 * Requires valid API credentials (from a completed trading session).
 */
export function useUserOrdersChannel(
  apiCredentials: UserApiCredentials | null | undefined
) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!apiCredentials?.key || !apiCredentials?.secret || !apiCredentials?.passphrase) {
      return;
    }

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      const ws = new WebSocket(CLOB_WS_USER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }

        // Subscribe to all markets (omit `markets` field = receive all)
        ws.send(
          JSON.stringify({
            type: "user",
            auth: {
              apiKey: apiCredentials.key,
              secret: apiCredentials.secret,
              passphrase: apiCredentials.passphrase,
            },
          })
        );

        // Keep-alive ping every 10s
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("PING");
        }, 10_000);
      };

      ws.onmessage = (event) => {
        if (event.data === "PONG") return;

        try {
          const msg = JSON.parse(event.data);

          if (msg.event_type === "order") {
            // PLACEMENT, UPDATE (partial fill), or CANCELLATION
            queryClient.invalidateQueries({ queryKey: ["active-orders"] });
          } else if (msg.event_type === "trade") {
            // MATCHED, MINED, CONFIRMED, RETRYING, FAILED
            queryClient.invalidateQueries({ queryKey: ["active-orders"] });
            queryClient.invalidateQueries({ queryKey: ["polymarket-positions"] });
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        if (!destroyed) setTimeout(connect, 3_000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [apiCredentials?.key, apiCredentials?.secret, apiCredentials?.passphrase, queryClient]);
}
