import { resolveBtcSettledWinner } from '@/components/feed/PredictionFeedCard';

describe('BTC prediction feed settlement', () => {
  it('prefers Polymarket settled prices over a contradictory candle fallback', () => {
    expect(
      resolveBtcSettledWinner({
        yesPrice: 1,
        noPrice: 0,
        candleWinner: 'Down',
      }),
    ).toBe('Up');
  });

  it('uses the candle fallback while Polymarket prices are not settled', () => {
    expect(
      resolveBtcSettledWinner({
        yesPrice: 0.56,
        noPrice: 0.44,
        candleWinner: 'Down',
      }),
    ).toBe('Down');
  });

  it('falls back to decisive prices when no candle winner is available', () => {
    expect(
      resolveBtcSettledWinner({
        yesPrice: 0,
        noPrice: 1,
        candleWinner: null,
      }),
    ).toBe('Down');
  });
});
