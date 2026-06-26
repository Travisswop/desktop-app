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
  inferPerpsRiskPriceHit,
  inferPerpsRiskPriceHitFromPrices,
  normalizePerpsRiskPricesForDisplay,
  resolvePerpsPositionDisplayState,
  selectPerpsChartMarkerEntries,
  type PerpsEntryMarker,
} from '@/components/feed/PerpsPositionFeedCard';

describe('perps feed chart markers', () => {
  it('renders one canonical opening marker when entries repeat', () => {
    const entries: PerpsEntryMarker[] = [
      {
        event: 'open',
        orderId: 'open-1',
        price: 1.94,
        timestamp: '2026-06-18T18:51:51.278Z',
      },
      {
        event: 'add',
        orderId: 'add-1',
        price: 1.96,
        timestamp: '2026-06-19T02:05:01.115Z',
      },
      {
        event: 'add',
        orderId: 'add-2',
        price: 1.97,
        timestamp: '2026-06-19T02:07:22.015Z',
      },
    ];

    expect(selectPerpsChartMarkerEntries(entries)).toEqual([entries[0]]);
  });

  it('falls back to the first marker if no opening entry is available', () => {
    const entries: PerpsEntryMarker[] = [
      {
        event: 'add',
        orderId: 'add-1',
        price: 1.96,
        timestamp: '2026-06-19T02:05:01.115Z',
      },
      {
        event: 'add',
        orderId: 'add-2',
        price: 1.97,
        timestamp: '2026-06-19T02:07:22.015Z',
      },
    ];

    expect(selectPerpsChartMarkerEntries(entries)).toEqual([entries[0]]);
  });
});

describe('perps feed risk price display', () => {
  it('keeps short TP below entry and SL above entry', () => {
    expect(
      normalizePerpsRiskPricesForDisplay({
        side: 'short',
        entryPrice: 59787,
        takeProfitPrice: 59446,
        stopLossPrice: 60298,
      }),
    ).toEqual({
      takeProfitPrice: 59446,
      stopLossPrice: 60298,
    });
  });

  it('swaps inverted long TP/SL prices before rendering', () => {
    expect(
      normalizePerpsRiskPricesForDisplay({
        side: 'long',
        entryPrice: 72.48,
        takeProfitPrice: 71.76,
        stopLossPrice: 73.58,
      }),
    ).toEqual({
      takeProfitPrice: 73.58,
      stopLossPrice: 71.76,
    });
  });

  it('swaps inverted short TP/SL prices before rendering', () => {
    expect(
      normalizePerpsRiskPricesForDisplay({
        side: 'short',
        entryPrice: 72.48,
        takeProfitPrice: 73.58,
        stopLossPrice: 71.76,
      }),
    ).toEqual({
      takeProfitPrice: 71.76,
      stopLossPrice: 73.58,
    });
  });
});

describe('perps feed TP/SL hit inference', () => {
  it('detects a short stop loss hit when mark trades above the stop', () => {
    expect(
      inferPerpsRiskPriceHit({
        side: 'short',
        markPrice: 73.76,
        takeProfitPrice: 71.76,
        stopLossPrice: 73.58,
      }),
    ).toBe('stopLoss');
  });

  it('detects a long stop loss hit when mark trades below the stop', () => {
    expect(
      inferPerpsRiskPriceHit({
        side: 'long',
        markPrice: 68.9,
        takeProfitPrice: 78,
        stopLossPrice: 69,
      }),
    ).toBe('stopLoss');
  });

  it('detects take profit hits for long and short positions', () => {
    expect(
      inferPerpsRiskPriceHit({
        side: 'long',
        markPrice: 80,
        takeProfitPrice: 79.5,
        stopLossPrice: 70,
      }),
    ).toBe('takeProfit');

    expect(
      inferPerpsRiskPriceHit({
        side: 'short',
        markPrice: 69.5,
        takeProfitPrice: 70,
        stopLossPrice: 80,
      }),
    ).toBe('takeProfit');
  });

  it('leaves an open position alone when neither risk price was crossed', () => {
    expect(
      inferPerpsRiskPriceHit({
        side: 'short',
        markPrice: 72.9,
        takeProfitPrice: 71.76,
        stopLossPrice: 73.58,
      }),
    ).toBeNull();
  });

  it('keeps a stop loss hit after live mark retraces below the stop', () => {
    expect(
      inferPerpsRiskPriceHitFromPrices({
        side: 'short',
        prices: [73.18, 73.76],
        takeProfitPrice: 71.76,
        stopLossPrice: 73.58,
      }),
    ).toBe('stopLoss');
  });
});

describe('perps feed display state', () => {
  it('keeps a live open position open even when market price crosses TP', () => {
    const riskPriceHit = inferPerpsRiskPriceHit({
      side: 'long',
      markPrice: 70.34,
      takeProfitPrice: 70.34,
      stopLossPrice: 67.33,
    });

    expect(riskPriceHit).toBe('takeProfit');
    expect(
      resolvePerpsPositionDisplayState({
        storedStatus: 'open',
        hasInferredLiquidation: false,
        riskPriceHit,
      }),
    ).toEqual({
      status: 'open',
      riskPriceHit: null,
    });
  });

  it('uses TP/SL hit labels only for rows already closed by reconciliation', () => {
    expect(
      resolvePerpsPositionDisplayState({
        storedStatus: 'closed',
        hasInferredLiquidation: false,
        riskPriceHit: 'takeProfit',
      }),
    ).toEqual({
      status: 'closed',
      riskPriceHit: 'takeProfit',
    });
  });
});
