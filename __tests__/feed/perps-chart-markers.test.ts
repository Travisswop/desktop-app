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
  normalizePerpsRiskPricesForDisplay,
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
