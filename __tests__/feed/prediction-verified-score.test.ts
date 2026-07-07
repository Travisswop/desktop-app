import { buildPredictionVerifiedScoreProxyPath } from '@/lib/feed/predictionVerifiedScore';

describe('prediction verified-score proxy path', () => {
  it('routes verified-score writes through the same-origin backend proxy', () => {
    expect(buildPredictionVerifiedScoreProxyPath('post 123/abc')).toBe(
      '/api/backend/api/v2/feed/prediction/post%20123%2Fabc/verified-score',
    );
  });
});
