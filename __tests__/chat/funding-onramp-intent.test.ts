import {
  findFundingOnrampIntent,
  normalizeFundingOnrampSourceText,
} from '@/lib/chat/fundingOnrampIntent';

describe('funding onramp chat intent', () => {
  test('detects fund wallet requests with default Ethereum funding', () => {
    expect(findFundingOnrampIntent('Astro fund my wallet with $35')).toEqual({
      initialNetwork: 'ethereum',
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

  test('routes perps funding to the default Swop wallet onramp', () => {
    expect(findFundingOnrampIntent('add funds for perps')).toMatchObject({
      initialNetwork: 'ethereum',
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
