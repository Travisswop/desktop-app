import {
  buildPerpsAccountSummary,
  sumUnrealizedPnl,
} from '@/lib/perps/hyperliquidAccountSummary';
import type { HLPosition } from '@/services/hyperliquid/types';

function position(overrides: Partial<HLPosition>): HLPosition {
  return {
    coin: 'BTC',
    szi: '1',
    entryPx: '100',
    unrealizedPnl: '0',
    returnOnEquity: '0',
    liquidationPx: null,
    marginUsed: '0',
    leverage: { type: 'cross', value: 5 },
    maxTradeSzs: ['0', '0'],
    positionValue: '0',
    cumFunding: {
      allTime: '0',
      sinceChange: '0',
      sinceOpen: '0',
    },
    ...overrides,
  };
}

describe('hyperliquid account summary', () => {
  it('sums open position unrealized PnL instead of using totalRawUsd', () => {
    const summary = buildPerpsAccountSummary(
      {
        assetPositions: [
          { position: position({ coin: 'BTC', unrealizedPnl: '-12.40' }) },
          { position: position({ coin: 'ETH', unrealizedPnl: '3.15' }) },
          {
            position: position({
              coin: 'SOL',
              szi: '0',
              unrealizedPnl: '-1000',
            }),
          },
        ],
        marginSummary: {
          accountValue: '239.29',
          totalNtlPos: '2178.53',
          totalRawUsd: '-1939.24',
          totalMarginUsed: '181.54',
        },
        crossMarginSummary: {
          accountValue: '57.75',
          totalNtlPos: '0',
          totalRawUsd: '57.75',
          totalMarginUsed: '0',
        },
        withdrawable: '21.43',
      },
      [],
    );

    expect(summary.unrealizedPnl).toBe('-9.25');
    expect(summary.marginUsed).toBe('181.54');
    expect(summary.accountValue).toBe('239.29');
    expect(summary.withdrawable).toBe('21.43');
    expect(summary.positions.map((item) => item.coin)).toEqual([
      'BTC',
      'ETH',
    ]);
  });

  it('keeps floating point noise out of the account-card total', () => {
    expect(
      sumUnrealizedPnl([
        { unrealizedPnl: '0.1' },
        { unrealizedPnl: '0.2' },
      ]).toFixed(2),
    ).toBe('0.30');
  });
});
