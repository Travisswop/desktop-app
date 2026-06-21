import {
  resolvePredictionDisplayPnl,
  resolveTradeState,
  type PredictionContent,
  type ResolvedMarketState,
} from '@/components/feed/PredictionFeedCard';

const baseContent: PredictionContent = {
  marketTitle: 'Spread: Mexico (-1.5)',
  outcome: 'Mexico',
  side: 'BUY',
  cost: 1,
  potentialWin: 4.347825,
  price: 0.23,
};

describe('prediction feed terminal result display', () => {
  it('uses stored terminal result PnL before stale live-price deltas', () => {
    expect(
      resolvePredictionDisplayPnl({
        isOpen: false,
        tradeState: { amount: 3.347825 },
        liveDelta: -1,
      }),
    ).toBeCloseTo(3.347825);
  });

  it('keeps live cards marked to market while open', () => {
    expect(
      resolvePredictionDisplayPnl({
        isOpen: true,
        tradeState: { amount: 3.347825 },
        liveDelta: -1,
      }),
    ).toBe(-1);
  });

  it('computes winning settlement as payout minus cost', () => {
    const marketState: ResolvedMarketState = {
      closed: true,
      pickedPrice: 1,
    };

    const state = resolveTradeState(baseContent, false, marketState);

    expect(state.state).toBe('won');
    expect(state.amount).toBeCloseTo(3.347825);
  });

  it('lets an explicit claimed feed result override stale market snapshots', () => {
    const marketState: ResolvedMarketState = {
      closed: true,
      pickedPrice: 0,
    };

    const state = resolveTradeState(
      {
        ...baseContent,
        claimed: true,
        claimAmount: 4.347825,
      },
      false,
      marketState,
    );

    expect(state.state).toBe('won');
    expect(state.amount).toBeCloseTo(3.347825);
  });
});
