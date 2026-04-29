import { useEffect, useRef } from "react";
import { TradingSession } from "@/lib/polymarket/session";
import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";
import { useUser } from "@/lib/UserContext";

const HEARTBEAT_INTERVAL_MS = 5_000;

export function useClobHeartbeat(
  session: TradingSession | null,
  safeAddress: string | undefined,
) {
  const { accessToken } = useUser();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isEnabled = !!session?.apiCredentials?.key && !!safeAddress && !!accessToken;

    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await fetch(`${POLYMARKET_BACKEND_URL}/api/prediction-markets/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            apiCreds: session!.apiCredentials,
            safeAddress,
          }),
        });
      } catch {
        // Heartbeat errors are non-fatal
      }
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.apiCredentials, safeAddress, accessToken]);
}
