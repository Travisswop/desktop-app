import {
  buildPredictionVerifiedScoreProxyPath,
  isPredictionVerifiedScoreRetryableStatus,
} from '@/lib/feed/predictionVerifiedScore';

describe('prediction verified score helpers', () => {
  it('builds the same-origin proxy path for verified-score writes', () => {
    expect(buildPredictionVerifiedScoreProxyPath('post-123')).toBe(
      '/api/backend/api/v2/feed/prediction/post-123/verified-score',
    );
  });

  it('encodes post ids in the proxy path', () => {
    expect(buildPredictionVerifiedScoreProxyPath('post/123')).toBe(
      '/api/backend/api/v2/feed/prediction/post%2F123/verified-score',
    );
  });

  it('retries transient verified-score failures but not terminal ones', () => {
    expect(isPredictionVerifiedScoreRetryableStatus(502)).toBe(true);
    expect(isPredictionVerifiedScoreRetryableStatus(503)).toBe(true);
    expect(isPredictionVerifiedScoreRetryableStatus(409)).toBe(false);
    expect(isPredictionVerifiedScoreRetryableStatus(422)).toBe(false);
  });
});
