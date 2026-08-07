/**
 * Reports prediction-claim outcomes to the operational ledger.
 *
 * Mobile has done this since the claim-observability work landed; desktop
 * never did. So a web claim that failed left no server-side trace at all —
 * which is why the 2026-08-06 stranded payout had to be reconstructed from
 * on-chain state instead of simply being looked up. It also meant the
 * PREDICTION_CLAIM_FAILED alarm could not see web traffic.
 *
 * Every call is fire-and-forget: telemetry must never fail, delay, or
 * duplicate a money-moving action.
 */

const TELEMETRY_TIMEOUT_MS = 6000;

export type PredictionClaimStatus =
  | "started"
  | "awaiting_signature"
  | "submitted"
  | "confirmed"
  | "failed"
  | "rejected"
  | "cancelled";

export type PredictionClaimAttemptEvent = {
  attemptId: string;
  status: PredictionClaimStatus;
  stage: string;
  conditionId?: string | null;
  marketId?: string | null;
  asset?: string | null;
  outcome?: string | null;
  wallet?: string | null;
  amountUsd?: number | null;
  txHash?: string | null;
  errorMessage?: string | null;
  retryable?: boolean | null;
};

export function newClaimAttemptId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `prediction-claim:${random}`;
}

export async function reportPredictionClaimAttempt(
  event: PredictionClaimAttemptEvent,
  accessToken: string | null | undefined,
): Promise<boolean> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base || !accessToken) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${base}/api/v6/analytics/prediction-claim-attempts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          // Lets the ledger distinguish web failures from mobile ones.
          "x-client-surface": "desktop-web",
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      },
    );
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
