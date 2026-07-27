import { resolvePredictionPotentialPayout } from '@/components/feed/PredictionFeedCard';

// The "To win" line on an open bet card: winning shares redeem at $1.00, so the
// promised payout is the share count — never shown once the bet is no longer a
// live BUY that actually filled.
describe('resolvePredictionPotentialPayout', () => {
  const openBuy = {
    entryIsEstimate: false,
    isOpen: true,
    side: 'BUY' as const,
    shares: 41.666,
  };

  it('promises the share count as the gross payout on a live BUY', () => {
    expect(resolvePredictionPotentialPayout(openBuy)).toBeCloseTo(41.666, 3);
  });

  it('stays silent once the market is settled', () => {
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, isOpen: false }),
    ).toBeUndefined();
  });

  it('stays silent for a SELL — the position already cashed out', () => {
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, side: 'SELL' }),
    ).toBeUndefined();
  });

  it('stays silent for a pre-fill quote, whose shares are only estimated', () => {
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, entryIsEstimate: true }),
    ).toBeUndefined();
  });

  it('stays silent when the share count is missing or non-positive', () => {
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, shares: undefined }),
    ).toBeUndefined();
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, shares: 0 }),
    ).toBeUndefined();
    expect(
      resolvePredictionPotentialPayout({ ...openBuy, shares: Number.NaN }),
    ).toBeUndefined();
  });
});
