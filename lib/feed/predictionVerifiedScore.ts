export function buildPredictionVerifiedScoreProxyPath(postId: string) {
  return `/api/backend/api/v2/feed/prediction/${encodeURIComponent(
    postId,
  )}/verified-score`;
}
