import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Detects the state where the app looks signed in but cannot sign anything.
 *
 * The backend JWT cookie lasts 30 days and outlives the Privy session by a
 * wide margin. When the Privy session lapses, `authenticated` stays true, the
 * page renders, balances load, and server-relayed actions still succeed —
 * only operations needing the user's key fail, and several of those fail
 * silently because they run with `showWalletUIs: false`. That is how a
 * prediction claim could land on-chain while its USDC.e→pUSD conversion died
 * unnoticed, stranding the payout.
 *
 * `getAccessToken()` resolving to null while `authenticated` is true is the
 * reliable tell, so surface it instead of letting each caller rediscover it.
 */
export type WalletSessionHealth = {
  /** Privy reports a user, so the UI shows a signed-in state. */
  authenticated: boolean;
  /** Privy can still mint a token, so signing should work. */
  canSign: boolean;
  /** Looks signed in but cannot sign — the dangerous, silent case. */
  isStale: boolean;
  /** Null until the first probe resolves; avoids a warning flash on load. */
  checkedAt: number | null;
  recheck: () => Promise<boolean>;
};

export function useWalletSessionHealth(): WalletSessionHealth {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [canSign, setCanSign] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const probe = useCallback(async () => {
    if (!ready || !authenticated) {
      setCanSign(true); // Signed out is an honest state, not a stale one.
      setCheckedAt(Date.now());
      return true;
    }
    try {
      const token = await getAccessToken();
      const ok = Boolean(token);
      setCanSign(ok);
      setCheckedAt(Date.now());
      return ok;
    } catch {
      setCanSign(false);
      setCheckedAt(Date.now());
      return false;
    }
  }, [authenticated, getAccessToken, ready]);

  useEffect(() => {
    void probe();
    // Re-probe when the tab regains focus: sessions usually lapse while away,
    // and that is exactly when the user returns to claim something.
    const onFocus = () => void probe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [probe]);

  return {
    authenticated: ready && authenticated,
    canSign,
    isStale: ready && authenticated && checkedAt !== null && !canSign,
    checkedAt,
    recheck: probe,
  };
}
