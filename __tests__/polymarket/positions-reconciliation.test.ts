import {
  reconcilePositionWithEventLive,
  reconcilePositionsWithEventLive,
} from '@/lib/polymarket/positions-reconciliation';

const basePosition = {
  asset: 'losing-token',
  conditionId: 'condition-1',
  size: 12,
  avgPrice: 0.35,
  initialValue: 4.2,
  currentValue: 1.8,
  cashPnl: -2.4,
  percentPnl: -57.14,
  curPrice: 0.15,
  redeemable: false,
  eventSlug: 'resolved-game',
  outcomeIndex: 0,
};

const resolvedEvent = {
  closed: true,
  ended: true,
  markets: [
    {
      conditionId: 'condition-1',
      closed: true,
      active: false,
      outcomePrices: '["0", "1"]',
      clobTokenIds: '["losing-token", "winning-token"]',
    },
  ],
};

describe('Polymarket position reconciliation', () => {
  it('marks a stale winning position as redeemable from Gamma market resolution', () => {
    const reconciled = reconcilePositionWithEventLive(
      {
        ...basePosition,
        asset: 'winning-token',
        outcomeIndex: 1,
      },
      resolvedEvent,
    );

    expect(reconciled).toMatchObject({
      redeemable: true,
      curPrice: 1,
      currentValue: 12,
      cashPnl: 7.8,
      marketClosed: true,
      marketResolutionPending: false,
      marketResolutionSource: 'event-live',
      resolvedOutcomeIndex: 1,
      resolvedOutcomePrice: 1,
    });
    expect(reconciled.percentPnl).toBeCloseTo(185.71428571428572);
  });

  it('marks a stale losing position as settled with no claimable payout', () => {
    const reconciled = reconcilePositionWithEventLive(
      basePosition,
      resolvedEvent,
    );

    expect(reconciled).toMatchObject({
      redeemable: true,
      curPrice: 0,
      currentValue: 0,
      cashPnl: -4.2,
      percentPnl: -100,
      marketClosed: true,
      marketResolutionPending: false,
      resolvedOutcomeIndex: 1,
      resolvedOutcomePrice: 0,
    });
  });

  it('keeps a closed but unresolved market in a waiting-to-redeem state', () => {
    const reconciled = reconcilePositionWithEventLive(basePosition, {
      closed: true,
      ended: true,
      markets: [
        {
          conditionId: 'condition-1',
          closed: true,
          active: false,
          outcomePrices: '["0.5", "0.5"]',
          clobTokenIds: '["losing-token", "winning-token"]',
        },
      ],
    });

    expect(reconciled).toMatchObject({
      redeemable: false,
      marketClosed: true,
      marketResolutionPending: true,
      marketResolutionSource: 'event-live',
    });
  });

  it('trusts an event-level closed state when a matching nested market lags', () => {
    const reconciled = reconcilePositionWithEventLive(
      {
        ...basePosition,
        asset: 'winning-token',
        outcomeIndex: 1,
      },
      {
        closed: true,
        ended: true,
        markets: [
          {
            conditionId: 'condition-1',
            closed: false,
            active: true,
            outcomePrices: '["0", "1"]',
            clobTokenIds: '["losing-token", "winning-token"]',
          },
        ],
      },
    );

    expect(reconciled).toMatchObject({
      redeemable: true,
      curPrice: 1,
      currentValue: 12,
      marketClosed: true,
      marketResolutionPending: false,
      resolvedOutcomeIndex: 1,
    });
  });

  it('does not alter positions when the matching market is still open', () => {
    const reconciled = reconcilePositionsWithEventLive(
      [basePosition],
      {
        'resolved-game': {
          closed: false,
          ended: false,
          markets: [
            {
              conditionId: 'condition-1',
              closed: false,
              active: true,
              outcomePrices: '["0.48", "0.52"]',
              clobTokenIds: '["losing-token", "winning-token"]',
            },
          ],
        },
      },
    );

    expect(reconciled[0]).toEqual(basePosition);
  });
});
