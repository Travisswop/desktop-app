import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";
import { safeLocalStorage } from "@/lib/browserStorage";

// Kept as an offline mirror only. The setting itself lives on the account —
// the backend sweeper claims with no browser open, so a per-device flag could
// never describe what it does. Older builds still read this key, so writing it
// keeps a downgraded/second tab consistent.
const AUTO_CLAIM_STORAGE_KEY = "swop:prediction:auto-claim-wins";

const endpoint = () =>
  `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/api/v5/wallet/prediction-auto-claim`;

/**
 * Account-level "claim my winnings automatically" preference.
 *
 * Defaults to enabled, matching the server: a settled winning position is
 * unambiguously the user's money, so leaving it unclaimed is the failure mode
 * rather than a choice.
 */
export function usePredictionAutoClaim() {
  const { accessToken } = useUser();
  const [enabled, setEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!accessToken || !process.env.NEXT_PUBLIC_API_URL) {
      // No session yet — fall back to whatever this browser last knew, so the
      // switch does not visibly flip while the token resolves.
      const cached = safeLocalStorage.getItem(AUTO_CLAIM_STORAGE_KEY);
      if (cached !== null) setEnabled(cached === "true");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(endpoint(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return;
        const body = await response.json();
        const next = body?.data?.enabled;
        if (cancelled || typeof next !== "boolean") return;
        setEnabled(next);
        safeLocalStorage.setItem(
          AUTO_CLAIM_STORAGE_KEY,
          next ? "true" : "false",
        );
      } catch {
        // Offline or backend down — the cached value already seeded state.
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const update = useCallback(
    async (next: boolean) => {
      // Optimistic: the switch should never lag behind the tap.
      setEnabled(next);
      safeLocalStorage.setItem(
        AUTO_CLAIM_STORAGE_KEY,
        next ? "true" : "false",
      );

      if (!accessToken || !process.env.NEXT_PUBLIC_API_URL) return;

      try {
        const response = await fetch(endpoint(), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ enabled: next }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.warn("[Predictions] auto-claim preference save failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [accessToken],
  );

  return { autoClaimEnabled: enabled, isLoaded, setAutoClaim: update };
}
