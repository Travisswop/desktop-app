/**
 * Render-level (React Testing Library) coverage for PerpsPositionFeedCard.
 *
 * The pure-logic rules behind these scenarios are covered in
 * perps-risk-price-hit.test.ts and perps-chart-markers.test.ts; these tests
 * assert what the card actually shows the user for the same inputs.
 *
 * @jest-environment jsdom
 */
const mockUseHyperliquidCandles = jest.fn();
const mockUseAllMids = jest.fn();

jest.mock('d3-shape', () => ({
  line: () => ({
    curve: () => () => '',
  }),
  curveLinear: 'curveLinear',
  curveNatural: 'curveNatural',
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidCandles', () => ({
  useHyperliquidCandles: (...args: unknown[]) =>
    mockUseHyperliquidCandles(...args),
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidWebSocket', () => ({
  useAllMids: (...args: unknown[]) => mockUseAllMids(...args),
}));

jest.mock('@/components/feed/useLivePerpsMarkPrice', () => ({
  normalizePerpsCoin: (coin: string) => ({
    requestCoin: String(coin || '').toUpperCase(),
  }),
  useLivePerpsMarkPrice: () => null,
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PerpsPositionFeedCard from '@/components/feed/PerpsPositionFeedCard';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function bar(timeMs: number, low: number, high: number, close = (low + high) / 2) {
  return { time: Math.floor(timeMs / 1000), low, high, close, open: close };
}

/** The big price readout sits directly above the "<COIN> price" label. */
function displayedPrice(coin: string) {
  return screen.getByText(`${coin} price`).previousElementSibling;
}

function returnCell() {
  return screen.getByText('Return').nextElementSibling;
}

describe('PerpsPositionFeedCard rendering', () => {
  beforeEach(() => {
    mockUseHyperliquidCandles.mockReset();
    mockUseAllMids.mockReset();
    mockUseHyperliquidCandles.mockReturnValue({ bars: [], isLoading: false });
    mockUseAllMids.mockReturnValue({ mids: {} });
  });

  it('keeps an open long with TP/SL open when only pre-activation candles dipped below the SL (July 2026 false stop-out regression)', () => {
    // Real incident shape: AAVE long, entry 86.46, SL 84.63 added one hour
    // ago. The week's candles contain lows below the SL, but they all predate
    // the SL — the card must show the live position, not "SL hit".
    const now = Date.now();
    const riskSetAt = now - 1 * HOUR_MS;
    mockUseHyperliquidCandles.mockReturnValue({
      bars: [
        bar(now - 5 * DAY_MS, 80.1, 88.2),
        bar(now - 2 * DAY_MS, 83.9, 86.5),
      ],
      isLoading: false,
    });
    mockUseAllMids.mockReturnValue({ mids: { AAVE: '86.4' } });

    render(
      <PerpsPositionFeedCard
        feed={{
          content: {
            coin: 'AAVE',
            side: 'long',
            status: 'open',
            leverage: 10,
            entryPrice: 86.46,
            markPrice: 86.4,
            takeProfitPrice: 88.28,
            stopLossPrice: 84.63,
            openedAt: iso(now - 6 * DAY_MS),
            updatedAt: iso(riskSetAt),
          },
          createdAt: iso(now - 6 * DAY_MS),
        }}
      />,
    );

    expect(screen.getByText('long 10x')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(displayedPrice('AAVE')).toHaveTextContent('$86.40');
    expect(screen.queryByText(/SL hit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stop hit/)).not.toBeInTheDocument();
  });

  it('renders a stored closed position with its exit price and stored return', () => {
    const now = Date.now();

    render(
      <PerpsPositionFeedCard
        feed={{
          content: {
            coin: 'ETH',
            side: 'long',
            status: 'closed',
            leverage: 5,
            entryPrice: 80,
            exitPrice: 90,
            returnPct: 12.34,
            openedAt: iso(now - 2 * DAY_MS),
            closedAt: iso(now - 1 * HOUR_MS),
            updatedAt: iso(now - 1 * HOUR_MS),
          },
          createdAt: iso(now - 2 * DAY_MS),
        }}
      />,
    );

    expect(screen.getByText('Closed 5x')).toBeInTheDocument();
    expect(displayedPrice('ETH')).toHaveTextContent('$90.00');
    // The stored return must win over the entry/exit recalculation (+62.50%).
    expect(returnCell()).toHaveTextContent('+12.34%');
    expect(screen.queryByText('+62.50%')).not.toBeInTheDocument();
  });

  it('flips to "SL hit" with the stop price displayed when candles cross the SL after activation', () => {
    const now = Date.now();
    const riskSetAt = now - 1 * HOUR_MS;
    mockUseHyperliquidCandles.mockReturnValue({
      bars: [
        // Pre-activation low below the SL: must not be the reason.
        bar(now - 2 * DAY_MS, 80, 88),
        // Post-activation candle crossing the 84.63 stop.
        bar(now - 30 * 60 * 1000, 84.5, 85.4, 85.0),
      ],
      isLoading: false,
    });

    render(
      <PerpsPositionFeedCard
        feed={{
          content: {
            coin: 'AAVE',
            side: 'long',
            status: 'open',
            leverage: 10,
            entryPrice: 86.46,
            markPrice: 86.4,
            takeProfitPrice: 88.28,
            stopLossPrice: 84.63,
            openedAt: iso(now - 6 * DAY_MS),
            updatedAt: iso(riskSetAt),
          },
          createdAt: iso(now - 6 * DAY_MS),
        }}
      />,
    );

    expect(screen.getByText('SL hit 10x')).toBeInTheDocument();
    expect(screen.getByText('SL hit')).toBeInTheDocument();
    // The stop price becomes the displayed exit price.
    expect(displayedPrice('AAVE')).toHaveTextContent('$84.63');
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });

  it('renders a limit order with a Limit badge, the limit price, and no return %', () => {
    const now = Date.now();

    render(
      <PerpsPositionFeedCard
        feed={{
          content: {
            coin: 'SOL',
            side: 'long',
            status: 'limit',
            leverage: 3,
            limitPrice: 42,
            entryPrice: 42,
            limitPlacedAt: iso(now - 1 * HOUR_MS),
            updatedAt: iso(now - 1 * HOUR_MS),
          },
          createdAt: iso(now - 1 * HOUR_MS),
        }}
      />,
    );

    expect(screen.getByText('Limit long 3x')).toBeInTheDocument();
    expect(screen.getByText('Limit')).toBeInTheDocument();
    expect(screen.getByText('Limit price')).toBeInTheDocument();
    expect(screen.queryByText('Entry price')).not.toBeInTheDocument();
    expect(returnCell()).toHaveTextContent('-');
    expect(returnCell()).not.toHaveTextContent('%');
  });
});
