import {
  getSafePolymarketMaxBuyAmount,
  getSafePolymarketMaxLimitShares,
} from '@/lib/polymarket/validation';

describe('Polymarket max buy amount', () => {
  it('leaves a one-cent buffer below the displayed balance', () => {
    expect(getSafePolymarketMaxBuyAmount(3.4)).toBe(3.39);
    expect(getSafePolymarketMaxBuyAmount(3.409999)).toBe(3.39);
  });

  it('floors to cents instead of rounding up', () => {
    expect(getSafePolymarketMaxBuyAmount(3.999)).toBe(3.98);
  });

  it('returns zero for empty or invalid balances', () => {
    expect(getSafePolymarketMaxBuyAmount(0)).toBe(0);
    expect(getSafePolymarketMaxBuyAmount(-1)).toBe(0);
    expect(getSafePolymarketMaxBuyAmount(Number.NaN)).toBe(0);
  });

  it('uses the buffered amount when computing max limit shares', () => {
    expect(getSafePolymarketMaxLimitShares(3.4, 0.34)).toBe(9);
    expect(getSafePolymarketMaxLimitShares(3.4, 0)).toBe(0);
  });
});
