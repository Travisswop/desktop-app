jest.mock('d3-shape', () => ({
  line: () => ({
    curve: () => () => '',
  }),
  curveLinear: 'curveLinear',
  curveNatural: 'curveNatural',
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidCandles', () => ({
  useHyperliquidCandles: () => ({ bars: [], isLoading: false }),
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidWebSocket', () => ({
  useAllMids: () => ({ mids: {} }),
}));

jest.mock('@/components/feed/useLivePerpsMarkPrice', () => ({
  normalizePerpsCoin: (coin: string) => ({
    requestCoin: String(coin || '').toUpperCase(),
  }),
  useLivePerpsMarkPrice: () => null,
}));

import {
  inferPerpsRiskPriceHitFromBars,
  perpsRiskActiveSinceMs,
  type PerpsRiskDetectionBar,
} from '@/components/feed/PerpsPositionFeedCard';

const HOUR_S = 60 * 60;

function bar(
  timeSeconds: number,
  low: number,
  high: number,
  close = (low + high) / 2,
): PerpsRiskDetectionBar {
  return { time: timeSeconds, low, high, close };
}

describe('inferPerpsRiskPriceHitFromBars', () => {
  const riskSetAtMs = Date.parse('2026-07-03T16:00:00.000Z');
  const riskSetAtS = riskSetAtMs / 1000;

  it('ignores candles from before the TP/SL became active (regression: adding an SL to an open position must not read as a stop-out)', () => {
    // Real incident: AAVE long, entry 86.46, SL 84.63 added later. The week's
    // chart history contained lows below 84.63, and the card flipped to
    // "SL hit" the moment the SL was saved.
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [
        bar(riskSetAtS - 5 * 24 * HOUR_S, 80.1, 88.2), // old low below SL
        bar(riskSetAtS - 2 * 24 * HOUR_S, 83.9, 86.5), // old low below SL
      ],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [86.4, 86.46, 86.4], // snapshot + live prices above SL
      takeProfitPrice: 88.28,
      stopLossPrice: 84.63,
    });

    expect(hit).toBeNull();
  });

  it('excludes the candle that straddles the activation moment', () => {
    // A bar that opened before the SL existed can contain pre-SL prices, so
    // it must not count even though it closes after activation.
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [bar(riskSetAtS - HOUR_S / 2, 84.0, 86.5)],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [86.4],
      takeProfitPrice: null,
      stopLossPrice: 84.63,
    });

    expect(hit).toBeNull();
  });

  it('detects a genuine stop-loss cross on candles after activation (long)', () => {
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [
        bar(riskSetAtS + HOUR_S, 85.2, 86.9),
        bar(riskSetAtS + 2 * HOUR_S, 84.5, 85.4), // low crosses SL 84.63
      ],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [85.0],
      takeProfitPrice: 88.28,
      stopLossPrice: 84.63,
    });

    expect(hit).toBe('stopLoss');
  });

  it('detects a genuine take-profit cross on candles after activation (long)', () => {
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [bar(riskSetAtS + HOUR_S, 86.9, 88.5)], // high crosses TP 88.28
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [87.0],
      takeProfitPrice: 88.28,
      stopLossPrice: 84.63,
    });

    expect(hit).toBe('takeProfit');
  });

  it('detects hits from live/snapshot prices even with no usable candles', () => {
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [bar(riskSetAtS - 24 * HOUR_S, 80, 88)], // pre-activation, ignored
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [84.2], // live price below SL
      takeProfitPrice: null,
      stopLossPrice: 84.63,
    });

    expect(hit).toBe('stopLoss');
  });

  it('ignores all candles when the activation time is unknown', () => {
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [bar(riskSetAtS - 24 * HOUR_S, 80, 88)],
      riskActiveSinceMs: null,
      extraPrices: [86.4],
      takeProfitPrice: 88.28,
      stopLossPrice: 84.63,
    });

    expect(hit).toBeNull();
  });

  it('applies the same rules for shorts (SL above entry, TP below)', () => {
    const oldHighAboveSl = inferPerpsRiskPriceHitFromBars({
      side: 'short',
      bars: [bar(riskSetAtS - 24 * HOUR_S, 86, 92)], // old high above SL 90
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [87.5],
      takeProfitPrice: 82,
      stopLossPrice: 90,
    });
    expect(oldHighAboveSl).toBeNull();

    const freshHighAboveSl = inferPerpsRiskPriceHitFromBars({
      side: 'short',
      bars: [bar(riskSetAtS + HOUR_S, 88, 90.5)],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [88],
      takeProfitPrice: 82,
      stopLossPrice: 90,
    });
    expect(freshHighAboveSl).toBe('stopLoss');

    const freshLowBelowTp = inferPerpsRiskPriceHitFromBars({
      side: 'short',
      bars: [bar(riskSetAtS + HOUR_S, 81.5, 84)],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [83],
      takeProfitPrice: 82,
      stopLossPrice: 90,
    });
    expect(freshLowBelowTp).toBe('takeProfit');
  });

  it('reports no hit when nothing crossed either level', () => {
    const hit = inferPerpsRiskPriceHitFromBars({
      side: 'long',
      bars: [bar(riskSetAtS + HOUR_S, 85.1, 87.9)],
      riskActiveSinceMs: riskSetAtMs,
      extraPrices: [86.2],
      takeProfitPrice: 88.28,
      stopLossPrice: 84.63,
    });

    expect(hit).toBeNull();
  });
});

describe('perpsRiskActiveSinceMs', () => {
  it('prefers updatedAt — the write that carried the current TP/SL', () => {
    expect(
      perpsRiskActiveSinceMs(
        {
          updatedAt: '2026-07-03T16:00:00.000Z',
          openedAt: '2026-07-01T10:00:00.000Z',
        },
        '2026-06-30T00:00:00.000Z',
      ),
    ).toBe(Date.parse('2026-07-03T16:00:00.000Z'));
  });

  it('falls back to openedAt, then limitPlacedAt, then the feed createdAt', () => {
    expect(
      perpsRiskActiveSinceMs({ openedAt: '2026-07-01T10:00:00.000Z' }),
    ).toBe(Date.parse('2026-07-01T10:00:00.000Z'));

    expect(
      perpsRiskActiveSinceMs({ limitPlacedAt: '2026-07-01T09:00:00.000Z' }),
    ).toBe(Date.parse('2026-07-01T09:00:00.000Z'));

    expect(perpsRiskActiveSinceMs({}, '2026-06-30T00:00:00.000Z')).toBe(
      Date.parse('2026-06-30T00:00:00.000Z'),
    );
  });

  it('returns null when no timestamp is available (disables candle scanning)', () => {
    expect(perpsRiskActiveSinceMs({})).toBeNull();
    expect(perpsRiskActiveSinceMs({ updatedAt: 'not-a-date' })).toBeNull();
  });
});
