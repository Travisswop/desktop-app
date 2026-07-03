import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';
import {
  getRedeemablePayout,
  isMarketUnresolvedRedeemError,
  isOpenOrClaimablePosition,
  isStaleNonceRedeemError,
  isVisiblePortfolioPosition,
  isZeroPositionBalanceRedeemError,
} from '@/lib/polymarket/position-payout';

const DUST = 0.01;

function position(
  overrides: Partial<PolymarketPosition> = {},
): PolymarketPosition {
  return {
    proxyWallet: '0xSafe',
    asset: 'yes-token',
    conditionId: 'condition-1',
    size: 10,
    avgPrice: 0.5,
    initialValue: 5,
    currentValue: 4.5,
    cashPnl: -0.5,
    percentPnl: -10,
    totalBought: 10,
    realizedPnl: 0,
    percentRealizedPnl: 0,
    curPrice: 0.45,
    redeemable: false,
    mergeable: false,
    title: 'Will this market resolve yes?',
    slug: 'will-this-market-resolve-yes',
    icon: '',
    eventSlug: 'event-1',
    outcome: 'Yes',
    outcomeIndex: 0,
    oppositeOutcome: 'No',
    oppositeAsset: 'no-token',
    endDate: '2099-01-01T00:00:00.000Z',
    negativeRisk: false,
    ...overrides,
  };
}

describe('Polymarket position payout visibility', () => {
  it('keeps live open positions visible', () => {
    expect(isOpenOrClaimablePosition(position(), DUST)).toBe(true);
  });

  it('keeps settled positions with claimable payout visible', () => {
    const claimable = position({
      redeemable: true,
      size: 17.24,
      initialValue: 10,
      currentValue: 17.24,
      cashPnl: 7.24,
      curPrice: 1,
      marketClosed: true,
    });

    expect(getRedeemablePayout(claimable)).toBeCloseTo(17.24);
    expect(isOpenOrClaimablePosition(claimable, DUST)).toBe(true);
  });

  it('filters settled no-payout positions from open-position lists', () => {
    const noPayout = position({
      redeemable: true,
      currentValue: 0,
      cashPnl: -5,
      percentPnl: -100,
      curPrice: 0,
      marketClosed: true,
    });

    expect(isVisiblePortfolioPosition(noPayout, DUST)).toBe(true);
    expect(getRedeemablePayout(noPayout)).toBe(0);
    expect(isOpenOrClaimablePosition(noPayout, DUST)).toBe(false);
  });

  it('filters dust balances even when the market is still open', () => {
    expect(
      isOpenOrClaimablePosition(
        position({
          size: 0.001,
          currentValue: 0.001,
        }),
        DUST,
      ),
    ).toBe(false);
  });
});

describe('redeem error classification', () => {
  // Only these two precheck failures mean the payout is settled — everything
  // else (unresolved oracle, stale nonce) is still owed and must NOT be shown
  // to the user as "already redeemed".
  it('treats gone-position and no-payout prechecks as already redeemed', () => {
    expect(
      isZeroPositionBalanceRedeemError(
        new Error('PRECHECK_SKIPPED: redeem skipped: zero position balance'),
      ),
    ).toBe(true);
    expect(
      isZeroPositionBalanceRedeemError(
        new Error('PRECHECK_SKIPPED: redeem skipped: outcome has no payout'),
      ),
    ).toBe(true);
  });

  it('does not swallow unresolved-market or stale-nonce prechecks as already redeemed', () => {
    const unresolved = new Error(
      'PRECHECK_SKIPPED: redeem skipped: market is not resolved',
    );
    const staleNonce = new Error(
      'PRECHECK_SKIPPED: redeem skipped: stale Safe nonce (provided 4, on-chain 5)',
    );

    expect(isZeroPositionBalanceRedeemError(unresolved)).toBe(false);
    expect(isZeroPositionBalanceRedeemError(staleNonce)).toBe(false);
    expect(isMarketUnresolvedRedeemError(unresolved)).toBe(true);
    expect(isStaleNonceRedeemError(staleNonce)).toBe(true);
  });
});
