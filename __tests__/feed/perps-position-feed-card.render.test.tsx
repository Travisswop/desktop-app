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
  curveMonotoneX: 'curveMonotoneX',
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

// The card resolves bare tickers against the live market index; these tests
// assert card behaviour, not that resolution, so keep the coin as stored.
jest.mock('@/components/feed/usePerpsMarketCoin', () => ({
  usePerpsMarketCoin: (coin: string) => ({
    requestCoin: String(coin || '').toUpperCase(),
    displayCoin: String(coin || '').toUpperCase(),
  }),
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

  it('shows Close Trade and the current streak on an owner position', () => {
    const now = Date.now();
    render(
      <PerpsPositionFeedCard
        isOwner
        streak={{ result: 'L', count: 2, label: '2L', kind: 'loss' }}
        feed={{
          content: {
            coin: 'BTC',
            side: 'long',
            status: 'open',
            leverage: 5,
            entryPrice: 100,
            markPrice: 105,
            sizeCoins: 0.1,
            openedAt: iso(now - HOUR_MS),
          },
          createdAt: iso(now - HOUR_MS),
        }}
      />,
    );

    const cta = screen.getByRole('link', { name: 'Close Trade' });
    expect(cta).toHaveAttribute('href', expect.stringContaining('manage=1'));
    expect(screen.getByLabelText('2 loss streak')).toHaveTextContent(
      '2L streak',
    );
    expect(screen.queryByText('Copy Trade')).toBeNull();
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

  it('flips a stale "Limit" post to open once the chart shows price crossed the limit (viewer is not the post owner)', () => {
    // Reported bug: a limit order's chart clearly crosses its limit price,
    // but the feed post's stored status stays 'limit' forever because the
    // only writer that flips it is the post owner's own client-side backfill
    // — which never runs for anyone just viewing the post in their feed.
    const now = Date.now();
    const placedAt = now - 21 * HOUR_MS;
    mockUseHyperliquidCandles.mockReturnValue({
      bars: [
        bar(placedAt + HOUR_MS, 1855, 2013.1), // crosses 1860.50 on the way up
        bar(now - HOUR_MS, 1780, 1870),
      ],
      isLoading: false,
    });
    mockUseAllMids.mockReturnValue({ mids: { ETH: '1864.55' } });

    render(
      <PerpsPositionFeedCard
        feed={{
          content: {
            coin: 'ETH',
            side: 'long',
            status: 'limit',
            leverage: 25,
            limitPrice: 1860.5,
            takeProfitPrice: 2013.1,
            stopLossPrice: 1801,
            limitPlacedAt: iso(placedAt),
            // Stale-status bug: the backend reconciler keeps bumping
            // updatedAt forward while the order rests, well after the cross.
            updatedAt: iso(now - 5 * 60 * 1000),
          },
          createdAt: iso(placedAt),
        }}
      />,
    );

    expect(screen.queryByText(/Limit/)).not.toBeInTheDocument();
    expect(screen.getByText('long 25x')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(displayedPrice('ETH')).toHaveTextContent('$1,864.55');
    expect(returnCell()).toHaveTextContent('%');
    expect(returnCell()).not.toHaveTextContent('-');
  });
});
