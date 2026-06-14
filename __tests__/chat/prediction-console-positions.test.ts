import {
  normalizePredictionConsolePositions,
} from '@/lib/chat/ticketFormat';
import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';

function position(
  overrides: Partial<PolymarketPosition> = {}
): PolymarketPosition {
  return {
    proxyWallet: '0xSafe',
    asset: 'yes-token',
    conditionId: 'condition-iran',
    size: 10,
    avgPrice: 0.5,
    initialValue: 5,
    currentValue: 4.62,
    cashPnl: -0.38,
    percentPnl: -7.6,
    totalBought: 5,
    realizedPnl: 0,
    percentRealizedPnl: 0,
    curPrice: 0.462,
    redeemable: false,
    mergeable: false,
    title: 'US x Iran permanent peace',
    slug: 'us-iran-permanent-peace',
    icon: '',
    eventSlug: 'us-iran',
    outcome: 'YES',
    outcomeIndex: 0,
    oppositeOutcome: 'NO',
    oppositeAsset: 'no-token',
    endDate: '2099-01-01T00:00:00.000Z',
    negativeRisk: false,
    ...overrides,
  };
}

describe('normalizePredictionConsolePositions', () => {
  it('collapses exact Polymarket API echoes for the same wallet and outcome', () => {
    const normalized = normalizePredictionConsolePositions([
      position(),
      position(),
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      proxyWallet: '0xSafe',
      asset: 'yes-token',
      size: 10,
      currentValue: 4.62,
      cashPnl: -0.38,
    });
  });

  it('rolls up the same market outcome held in multiple prediction wallets', () => {
    const normalized = normalizePredictionConsolePositions([
      position(),
      position({
        proxyWallet: '0xDeposit',
        size: 4,
        initialValue: 2,
        currentValue: 1.72,
        cashPnl: -0.28,
        totalBought: 2,
      }),
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].size).toBe(14);
    expect(normalized[0].initialValue).toBe(7);
    expect(normalized[0].currentValue).toBeCloseTo(6.34);
    expect(normalized[0].cashPnl).toBeCloseTo(-0.66);
    expect(normalized[0].avgPrice).toBeCloseTo(0.5);
    expect(normalized[0].curPrice).toBeCloseTo(6.34 / 14);
    expect(normalized[0].percentPnl).toBeCloseTo((-0.66 / 7) * 100);
  });

  it('keeps opposite outcomes as separate console positions', () => {
    const normalized = normalizePredictionConsolePositions([
      position(),
      position({
        asset: 'no-token',
        outcome: 'NO',
        outcomeIndex: 1,
        oppositeOutcome: 'YES',
        oppositeAsset: 'yes-token',
        size: 3,
        initialValue: 1.5,
        currentValue: 1.65,
        cashPnl: 0.15,
      }),
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized.map((item) => item.asset)).toEqual([
      'yes-token',
      'no-token',
    ]);
  });
});
