import {
  buildHyperliquidMarketPriceMap,
  lookupHyperliquidPositionPrice,
  resolveHyperliquidPositionMarkPrice,
} from '@/lib/perps/hyperliquidPositionPricing';

describe('hyperliquid position pricing', () => {
  it('looks up builder DEX marks by dex-qualified position identity', () => {
    const prices = buildHyperliquidMarketPriceMap([
      {
        coin: 'SPCX',
        displayCoin: 'SPCX',
        dex: 'xyz',
        markPrice: '208.7600',
      },
    ]);

    expect(
      lookupHyperliquidPositionPrice(
        { coin: 'xyz:SPCX', dex: 'xyz' },
        prices,
      ),
    ).toBe('208.7600');
    expect(
      lookupHyperliquidPositionPrice(
        { coin: 'SPCX', dex: 'xyz' },
        prices,
      ),
    ).toBe('208.7600');
  });

  it('prefers live or market marks over snapshot-derived marks', () => {
    expect(
      resolveHyperliquidPositionMarkPrice(
        {
          entryPx: '215.8000',
          positionValue: '436.3084',
          szi: '-2.09',
          unrealizedPnl: '14.71',
        },
        '209.1200',
      ),
    ).toBe(209.12);
  });

  it('derives mark from current notional when live marks are missing', () => {
    expect(
      resolveHyperliquidPositionMarkPrice({
        entryPx: '215.8000',
        positionValue: '436.3084',
        szi: '-2.09',
        unrealizedPnl: '14.71',
      }),
    ).toBeCloseTo(208.76, 2);
  });

  it('derives a profitable short mark from PnL when notional is missing', () => {
    expect(
      resolveHyperliquidPositionMarkPrice({
        entryPx: '215.8000',
        positionValue: '0',
        szi: '-2.09',
        unrealizedPnl: '14.71',
      }),
    ).toBeCloseTo(208.76, 2);
  });
});
