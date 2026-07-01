const RETRYABLE_PREDICTION_VERIFIED_SCORE_STATUSES = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

export function buildPredictionVerifiedScoreProxyPath(postId: string) {
  return `/api/backend/api/v2/feed/prediction/${encodeURIComponent(
    postId,
  )}/verified-score`;
}

export function isPredictionVerifiedScoreRetryableStatus(status: number) {
  return RETRYABLE_PREDICTION_VERIFIED_SCORE_STATUSES.has(status);
}
