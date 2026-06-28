import {
  getPerpsFeedBackfillDelayLabel,
  INITIAL_PERPS_FEED_BACKFILL_HEALTH_STATE,
  resolvePerpsFeedBackfillHealthState,
} from '@/components/feed/perpsBackfillHealth';

describe('resolvePerpsFeedBackfillHealthState', () => {
  it('marks user fills failures as stale with a typed reason', () => {
    expect(
      resolvePerpsFeedBackfillHealthState(
        INITIAL_PERPS_FEED_BACKFILL_HEALTH_STATE,
        {
          stale: true,
          reason: 'userFills',
          updatedAt: 123,
        },
      ),
    ).toEqual({
      stale: true,
      reason: 'userFills',
      updatedAt: 123,
    });
  });

  it('clears stale state after a healthy backfill run', () => {
    expect(
      resolvePerpsFeedBackfillHealthState(
        {
          stale: true,
          reason: 'reconcile',
          updatedAt: 100,
        },
        {
          stale: false,
          updatedAt: 456,
        },
      ),
    ).toEqual({
      stale: false,
      reason: null,
      updatedAt: 456,
    });
  });

  it('maps stale reasons to user-facing delay labels', () => {
    expect(
      getPerpsFeedBackfillDelayLabel({
        stale: true,
        reason: 'userFills',
        updatedAt: 1,
      }),
    ).toBe('fills refresh delayed');

    expect(
      getPerpsFeedBackfillDelayLabel({
        stale: true,
        reason: 'reconcile',
        updatedAt: 1,
      }),
    ).toBe('position sync delayed');
  });
});
