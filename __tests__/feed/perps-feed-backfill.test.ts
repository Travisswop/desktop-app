import { shouldSkipPerpsPositionBackfill } from '@/components/feed/perpsBackfillHelpers';

describe('shouldSkipPerpsPositionBackfill', () => {
  it('skips position upserts when user fills are degraded and no open timestamp is available', () => {
    expect(
      shouldSkipPerpsPositionBackfill({
        fillsDegraded: true,
        openedFill: null,
      }),
    ).toBe(true);
  });

  it('keeps healthy cold-start positions eligible for backfill', () => {
    expect(
      shouldSkipPerpsPositionBackfill({
        fillsDegraded: false,
        openedFill: null,
      }),
    ).toBe(false);
  });

  it('keeps known-open positions eligible even during degraded fills reads', () => {
    expect(
      shouldSkipPerpsPositionBackfill({
        fillsDegraded: true,
        openedFill: {
          timestamp: '2026-06-28T09:00:00.000Z',
        },
      }),
    ).toBe(false);
  });
});
