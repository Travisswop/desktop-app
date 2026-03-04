import { useEffect, useRef } from 'react';
import { pmApi } from '@/lib/polymarket/polymarketApi';

// Polymarket cancels all open limit orders if no heartbeat is received within
// 10 seconds (with a 5-second buffer). Send every 5 seconds to stay safe.
const HEARTBEAT_INTERVAL_MS = 5_000;

export function useClobHeartbeat(
  apiCreds:
    | { key: string; secret: string; passphrase: string }
    | null
    | undefined,
  safeAddress: string | null | undefined,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!apiCreds || !safeAddress) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = () => {
      pmApi('/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ apiCreds, safeAddress }),
      }).catch((err) => {
        console.warn('[Polymarket] Heartbeat error:', err?.message);
      });
    };

    // Send immediately on session start, then every 5 seconds
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [apiCreds, safeAddress]);
}
