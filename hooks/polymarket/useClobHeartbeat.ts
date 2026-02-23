import { useEffect, useRef } from "react";
import type { ClobClient } from "@polymarket/clob-client";

// Polymarket cancels all open limit orders if no heartbeat is received within
// 10 seconds (with a 5-second buffer). Send every 5 seconds to stay safe.
const HEARTBEAT_INTERVAL_MS = 5_000;

export function useClobHeartbeat(clobClient: ClobClient | null) {
  const heartbeatIdRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!clobClient) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        heartbeatIdRef.current = "";
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const resp = await clobClient.postHeartbeat(heartbeatIdRef.current);
        // Store the returned heartbeat_id for the next call
        heartbeatIdRef.current = resp?.heartbeat_id ?? resp?.id ?? "";
      } catch (err: any) {
        // A 400 response means our heartbeat_id expired — the server returns
        // the correct one. Extract it to resync, otherwise reset to "".
        const correctId = err?.response?.data?.heartbeat_id;
        heartbeatIdRef.current = correctId ?? "";
        console.warn("[Polymarket] Heartbeat error, resyncing:", err?.message);
      }
    };

    // Send immediately on session start, then every 5 seconds
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        heartbeatIdRef.current = "";
      }
    };
  }, [clobClient]);
}
