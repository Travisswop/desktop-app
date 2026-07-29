/**
 * Render coverage for the "Copy Bet" call-to-action on open prediction feed
 * cards — it replaced the pair of odds buttons, which navigated through a
 * market rebuilt from the feed post and so could land on a detail view with no
 * tradable tokens. Copy Bet routes by the real market id and carries the
 * poster's outcome + stake in the URL instead.
 *
 * @jest-environment jsdom
 */
const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch: jest.fn() }),
}));

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PredictionFeedCard, {
  type PredictionContent,
} from '@/components/feed/PredictionFeedCard';

beforeEach(() => {
  push.mockClear();
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
  marketId: '0xfed-sept',
  status: 'open',
};

describe('prediction feed card "Copy Bet"', () => {
  it('links to the real market with the poster pick and stake pre-filled', () => {
    render(<PredictionFeedCard content={openBet} userName="Travis" />);

    const cta = screen.getByRole('link', { name: /Copy Bet/ });
    expect(cta).toHaveAttribute(
      'href',
      `/prediction/market/${encodeURIComponent('0xfed-sept')}?outcome=yes&amount=25`,
    );
  });

  it('allows the anchor to perform its normal navigation', () => {
    render(<PredictionFeedCard content={openBet} userName="Travis" />);

    const cta = screen.getByRole('link', { name: /Copy Bet/ });
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    cta.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('copies the "no" side when that is what the poster backed', () => {
    render(
      <PredictionFeedCard
        content={{ ...openBet, outcome: 'No' }}
        userName="Travis"
      />,
    );

    expect(screen.getByRole('link', { name: /Copy Bet/ })).toHaveAttribute(
      'href',
      expect.stringContaining('outcome=no'),
    );
  });

  it('stays off a SELL — the position is cashed out, there is no bet to copy', () => {
    render(
      <PredictionFeedCard
        content={{ ...openBet, side: 'SELL' }}
        userName="Travis"
      />,
    );

    expect(screen.queryByText(/Copy Bet/)).toBeNull();
    expect(screen.getByRole('link', { name: /Market/ })).toBeInTheDocument();
  });

  it('falls back to a disabled button when the post has no market id', () => {
    render(
      <PredictionFeedCard
        content={{ ...openBet, marketId: undefined }}
        userName="Travis"
      />,
    );

    expect(screen.queryByRole('link', { name: /Copy Bet/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Copy Bet/ })).toBeDisabled();
  });

  it('no longer renders the old odds buttons', () => {
    render(<PredictionFeedCard content={openBet} userName="Travis" />);

    expect(screen.queryByTitle(/Open Yes market/)).toBeNull();
    expect(screen.queryByTitle(/Open No market/)).toBeNull();
  });

  it('opens the sell ticket and shows the author streak for the owner', () => {
    render(
      <PredictionFeedCard
        content={openBet}
        userName="Travis"
        isOwner
        streak={{ result: 'W', count: 5, label: '5W', kind: 'win' }}
      />,
    );

    const cta = screen.getByRole('link', { name: /Sell Bet/ });
    expect(cta).toHaveAttribute(
      'href',
      `/prediction/market/${encodeURIComponent(
        '0xfed-sept',
      )}?outcome=yes&amount=41.67&side=SELL`,
    );
    expect(
      screen.getByLabelText('5 win streak'),
    ).toHaveTextContent('5W streak');
    expect(screen.queryByText(/Copy Bet/)).toBeNull();
  });
});
