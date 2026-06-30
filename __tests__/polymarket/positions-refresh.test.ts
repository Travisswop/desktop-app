import {
  applyFreshPositionPrices,
  selectEventSlugsForPositionRefresh,
  selectPositionPriceTokenIds,
} from '@/lib/polymarket/positions-refresh';

const now = Date.parse('2026-06-30T17:00:00Z');

const basePosition = {
  asset: 'token-live',
  conditionId: 'condition-1',
  size: 10,
  avgPrice: 0.25,
  initialValue: 2.5,
  currentValue: 3,
  cashPnl: 0.5,
  percentPnl: 20,
  curPrice: 0.3,
  redeemable: false,
  eventSlug: 'team-a-vs-team-b',
  title: 'Team A vs. Team B',
  endDate: '2026-06-30T17:30:00Z',
  outcomeIndex: 0,
};

describe('Polymarket position refresh helpers', () => {
  it('selects closure checks for open event positions and prioritizes likely stale markets', () => {
    const slugs = selectEventSlugsForPositionRefresh(
      [
        {
          ...basePosition,
          eventSlug: 'future-politics',
          title: 'Will policy pass in 2027?',
          endDate: '2027-01-01T00:00:00Z',
        },
        {
          ...basePosition,
          eventSlug: 'past-sports',
          endDate: '2026-06-30T16:00:00Z',
        },
        {
          ...basePosition,
          eventSlug: 'pending-resolution',
          marketResolutionPending: true,
        },
        {
          ...basePosition,
          eventSlug: 'already-redeemable',
          redeemable: true,
        },
      ],
      { now, limit: 2 },
    );

    expect(slugs).toEqual(['pending-resolution', 'past-sports']);
  });

  it('selects only active held token ids for fresh price refresh', () => {
    const tokenIds = selectPositionPriceTokenIds([
      basePosition,
      {
        ...basePosition,
        asset: 'token-redeemable',
        redeemable: true,
        currentValue: 100,
      },
      {
        ...basePosition,
        asset: 'token-zero-size',
        size: 0,
      },
      {
        ...basePosition,
        asset: 'token-high-value',
        currentValue: 50,
      },
    ]);

    expect(tokenIds).toEqual(['token-high-value', 'token-live']);
  });

  it('applies fresh bid prices to active positions and recomputes value and pnl', () => {
    const [updated] = applyFreshPositionPrices([basePosition], {
      'token-live': { bid: '0.42', ask: '0.45' },
    });

    expect(updated).toMatchObject({
      curPrice: 0.42,
      currentPrice: 0.42,
      currentValue: 4.2,
      cashPnl: 1.7000000000000002,
    });
    expect(updated.percentPnl).toBeCloseTo(68);
  });

  it('does not overwrite redeemable positions or positions without a fresh bid', () => {
    const positions = [
      { ...basePosition, redeemable: true },
      { ...basePosition, asset: 'token-no-bid' },
    ];

    expect(
      applyFreshPositionPrices(positions, {
        'token-live': { bid: '0.9' },
        'token-no-bid': { ask: '0.8' },
      }),
    ).toEqual(positions);
  });
});
