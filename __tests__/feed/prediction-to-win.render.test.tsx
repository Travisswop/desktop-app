/**
 * Render coverage for the "To win" line on prediction feed cards — the payout
 * an open bet collects if the pick hits. Settled cards keep showing the real
 * payout instead; SELLs and pre-fill quotes show neither.
 *
 * @jest-environment jsdom
 */
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PredictionFeedCard, {
  type PredictionContent,
} from '@/components/feed/PredictionFeedCard';

// The card polls CLOB prices / live scores on mount; keep every fetch empty so
// the render reflects the post's own numbers.
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openBet: PredictionContent = {
  marketTitle: 'Will the Fed cut rates in September?',
  outcome: 'Yes',
  side: 'BUY',
  cost: 25,
  price: 0.6,
  executedCost: 25,
  executedPrice: 0.6,
  executedShares: 41.666,
  yesOutcome: 'Yes',
  noOutcome: 'No',
  yesTokenId: 'tok-yes',
  noTokenId: 'tok-no',
  marketId: 'cond-fed-sept',
  status: 'open',
};

describe('prediction feed card "To win"', () => {
  it('promises the gross payout while the bet is live', () => {
    render(<PredictionFeedCard content={openBet} userName="Travis" />);

    expect(screen.getByText('To win $41.67')).toBeInTheDocument();
    // The existing entry summary is untouched.
    expect(screen.getByText(/\$25\.00 · 41\.7 sh @ 60¢/)).toBeInTheDocument();
  });

  it('shows the settled payout instead of a promise once the bet has won', () => {
    render(
      <PredictionFeedCard
        content={{
          ...openBet,
          status: 'won',
          pnl: 16.67,
          currentPrice: 1,
          pickedWon: true,
        }}
        userName="Travis"
      />,
    );

    expect(screen.queryByText(/To win/)).not.toBeInTheDocument();
    expect(screen.getByText('$41.67 payout')).toBeInTheDocument();
  });

  it('stays silent on a SELL — the position already cashed out', () => {
    render(
      <PredictionFeedCard
        content={{ ...openBet, side: 'SELL' }}
        userName="Travis"
      />,
    );

    expect(screen.queryByText(/To win/)).not.toBeInTheDocument();
  });
});
