import {
  hyperliquidMarketForPosition,
  hyperliquidMarketMatchesPosition,
} from '@/lib/perps/hyperliquidMarketIdentity';
import type { HLMarket } from '@/services/hyperliquid/types';

function market(overrides: Partial<HLMarket>): HLMarket {
  return {
    index: 0,
    name: 'ETH-PERP',
    coin: 'ETH',
    displayCoin: 'ETH',
    markPrice: '1800',
    midPrice: '1800',
    fundingRate: '0',
    szDecimals: 4,
    maxLeverage: 50,
    openInterest: '0',
    dayVolume: '0',
    change24h: 0,
    isDelisted: false,
    ...overrides,
  };
}

describe('hyperliquid market identity', () => {
  const markets = [
    market({ index: 0, coin: 'ETH', markPrice: '1800' }),
    market({
      index: 110000,
      coin: 'ETH',
      dex: 'builder-dex',
      dexName: 'Builder DEX',
      markPrice: '1814',
    }),
  ];

  it('prefers exact asset index over the first matching coin', () => {
    expect(
      hyperliquidMarketForPosition(markets, {
        coin: 'ETH',
        assetIndex: 110000,
      })?.index
    ).toBe(110000);
  });

  it('matches duplicate symbols by DEX when asset index is not present', () => {
    expect(
      hyperliquidMarketForPosition(markets, {
        coin: 'ETH',
        dex: 'builder-dex',
      })?.index
    ).toBe(110000);
  });

  it('keeps main DEX positions on the main market', () => {
    expect(hyperliquidMarketForPosition(markets, { coin: 'ETH' })?.index).toBe(
      0
    );
  });

  it('normalizes DEX name case when matching a position to a market', () => {
    expect(
      hyperliquidMarketMatchesPosition(markets[1], {
        coin: 'ETH',
        dex: 'BUILDER-DEX',
      })
    ).toBe(true);
  });
});
