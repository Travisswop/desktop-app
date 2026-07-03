/**
 * Render-level (React Testing Library) coverage for DefiFeedCard.
 * Projection math is covered in defi-feed-card.test.ts; these tests assert
 * the card copy for each lifecycle/action combination.
 *
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DefiFeedCard from '@/components/feed/DefiFeedCard';

describe('DefiFeedCard rendering', () => {
  it('renders an open supply position as earning interest', () => {
    render(
      <DefiFeedCard
        content={{
          action: 'supply',
          status: 'open',
          symbol: 'USDC',
          amount: 12500,
          amountUsd: 12500,
          supplyApy: 0.0482,
          chain: 'base',
          protocol: 'Aave v3',
        }}
      />,
    );

    // The status label renders in the header badge and the footer chip.
    expect(screen.getAllByText('Supplied').length).toBeGreaterThan(0);
    expect(screen.getByText('Supplied to Aave')).toBeInTheDocument();
    expect(screen.getByText('Earning interest')).toBeInTheDocument();
    expect(screen.getAllByText('4.82%').length).toBeGreaterThan(0);
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expect(screen.getByText('Aave v3')).toBeInTheDocument();
    expect(screen.getByText(/Base/)).toBeInTheDocument();
    expect(screen.getByText('Aave APY vs bank APY')).toBeInTheDocument();
  });

  it('renders an open borrow position with borrow copy and APR framing', () => {
    render(
      <DefiFeedCard
        content={{
          action: 'borrow',
          status: 'open',
          symbol: 'USDC',
          amount: 4000,
          amountUsd: 4000,
          variableBorrowApy: 0.063,
          chain: 'ethereum',
        }}
      />,
    );

    // The status label renders in the header badge and the footer chip.
    expect(screen.getAllByText('Borrowed').length).toBeGreaterThan(0);
    expect(screen.getByText('Borrowed from Aave')).toBeInTheDocument();
    expect(screen.getByText('Variable borrow')).toBeInTheDocument();
    expect(screen.getAllByText('6.30%').length).toBeGreaterThan(0);
    expect(screen.getByText('Aave APR vs card APR')).toBeInTheDocument();
  });

  it('renders a withdrawn supply position as closed', () => {
    render(
      <DefiFeedCard
        content={{
          action: 'supply',
          status: 'withdrawn',
          symbol: 'ETH',
          amount: 2,
          amountUsd: 5000,
          supplyApy: 0.021,
          chain: 'base',
        }}
      />,
    );

    // The status label renders in the header badge and the footer chip.
    expect(screen.getAllByText('Withdrawn').length).toBeGreaterThan(0);
    expect(screen.getByText('Withdrawn from Aave')).toBeInTheDocument();
    expect(screen.getByText('Position withdrawn')).toBeInTheDocument();
    expect(screen.queryByText('Earning interest')).not.toBeInTheDocument();
  });
});
