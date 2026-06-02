import {
  findFundingOnrampIntent,
  normalizeFundingOnrampSourceText,
} from '@/lib/chat/fundingOnrampIntent';

describe('funding onramp chat intent', () => {
  test('detects fund wallet requests with default Polygon funding', () => {
    expect(findFundingOnrampIntent('Astro fund my wallet with $35')).toEqual({
      initialNetwork: 'polygon',
      initialAmount: '35',
      sourceText: 'fund my wallet with 35',
    });
  });

  test('detects spaced on ramp requests and Solana destination hints', () => {
    expect(findFundingOnrampIntent('on ramp 20 usdc to Solana')).toMatchObject({
      initialNetwork: 'solana',
      initialAmount: '20',
    });
  });

  test('detects perps funding as Arbitrum USDC', () => {
    expect(findFundingOnrampIntent('add funds for perps')).toMatchObject({
      initialNetwork: 'arbitrum',
      initialAmount: '20',
    });
  });

  test('does not treat Hyperliquid funding history as wallet onramp', () => {
    expect(findFundingOnrampIntent('show BTC funding history')).toBeNull();
  });

  test('normalizes Astro mention out of source text', () => {
    expect(normalizeFundingOnrampSourceText('@astro on ramp $20')).toBe(
      'on ramp 20'
    );
  });
});
