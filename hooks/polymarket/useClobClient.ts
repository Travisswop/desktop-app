import { useMemo } from "react";
import { TradingSession } from "@/lib/polymarket/session";

// Returns a truthy object when the trading session is active, null otherwise.
// Consumers use !!clobClient as a readiness flag; actual API calls go through the backend proxy.
export function useClobClient(
  tradingSession: TradingSession | null,
  isTradingSessionComplete: boolean | undefined
) {
  const clobClient = useMemo(() => {
    if (!isTradingSessionComplete || !tradingSession?.apiCredentials) return null;
    const { key, secret, passphrase } = tradingSession.apiCredentials;
    if (!key || !secret || !passphrase) return null;
    return {};
  }, [isTradingSessionComplete, tradingSession?.apiCredentials]);

  return { clobClient };
}
