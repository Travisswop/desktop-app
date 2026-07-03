/**
 * Render-level (React Testing Library) coverage for PerpsFeedCard — the
 * adapter that maps legacy perps feed content onto PerpsPositionFeedCard.
 *
 * @jest-environment jsdom
 */
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

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PerpsFeedCard from '@/components/feed/PerpsFeedCard';

const HOUR_MS = 60 * 60 * 1000;

function iso(ms: number) {
  return new Date(ms).toISOString();
}

describe('PerpsFeedCard legacy adapter rendering', () => {
  it('renders a legacy close event as a closed position at the last mark price', () => {
    const now = Date.now();

    render(
      <PerpsFeedCard
        content={{
          coin: 'BTC',
          side: 'LONG',
          orderType: 'close',
          leverage: 10,
          sizeCoins: 0.5,
          entryPrice: 60000,
          markPrice: 63000,
          openedAt: iso(now - 3 * HOUR_MS),
          updatedAt: iso(now - 1 * HOUR_MS),
        }}
        userName="Alice"
        createdAt={iso(now - 3 * HOUR_MS)}
      />,
    );

    expect(screen.getByText('Closed 10x')).toBeInTheDocument();
    expect(
      screen.getByText('BTC price').previousElementSibling,
    ).toHaveTextContent('$63,000.00');
    // Legacy close computes return from entry → mark: (63k-60k)/60k * 10x.
    expect(screen.getByText('+50.00%')).toBeInTheDocument();
  });

  it('renders a legacy limit order as a pending limit with no return', () => {
    const now = Date.now();

    render(
      <PerpsFeedCard
        content={{
          coin: 'SOL',
          side: 'long',
          orderType: 'limit',
          leverage: 3,
          sizeCoins: 10,
          limitPrice: 42,
          openedAt: iso(now - 1 * HOUR_MS),
        }}
        userName="Alice"
        createdAt={iso(now - 1 * HOUR_MS)}
      />,
    );

    expect(screen.getByText('Limit long 3x')).toBeInTheDocument();
    expect(screen.getByText('Limit price')).toBeInTheDocument();
    expect(screen.getByText('Return').nextElementSibling).toHaveTextContent(
      '-',
    );
  });
});
