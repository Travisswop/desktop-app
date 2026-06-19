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
  resolveBtcSettledWinner,
  resolvePredictionDisplayPnl,
  resolveTradeState,
  type ResolvedMarketState,
} from '@/components/feed/PredictionFeedCard';
import { selectPerpsChartMarkerEntries } from '@/components/feed/PerpsPositionFeedCard';
import {
  btcUpWonFeedPost,
  mexicoClaimedOverrideFeedPost,
  repeatedMorphoPerpsEntries,
} from './fixtures/feed-card-fixtures';

describe('feed card contracts', () => {
  it('renders the known BTC Up settlement as a win even when a candle fallback disagrees', () => {
    const winner = resolveBtcSettledWinner({
      yesPrice: 1,
      noPrice: 0,
      candleWinner: 'Down',
    });
    expect(winner).toBe('Up');

    const marketState: ResolvedMarketState = {
      closed: true,
      yesPrice: 1,
      noPrice: 0,
      pickedPrice: 1,
      pickedWon: winner === btcUpWonFeedPost.outcome,
    };
    const tradeState = resolveTradeState(
      btcUpWonFeedPost,
      false,
      marketState,
    );
    const displayPnl = resolvePredictionDisplayPnl({
      isOpen: false,
      tradeState,
      liveDelta: -btcUpWonFeedPost.cost,
    });

    expect(tradeState.state).toBe('won');
    expect(tradeState.label).toBe('Won');
    expect(displayPnl).toBeCloseTo(1.595384);
    expect(displayPnl).toBeGreaterThan(0);
  });

  it('lets a stored claimed result override a stale losing market snapshot', () => {
    const tradeState = resolveTradeState(
      mexicoClaimedOverrideFeedPost,
      false,
      {
        closed: true,
        pickedPrice: 0,
        pickedWon: false,
      },
    );
    const displayPnl = resolvePredictionDisplayPnl({
      isOpen: false,
      tradeState,
      liveDelta: -mexicoClaimedOverrideFeedPost.cost,
    });

    expect(tradeState.state).toBe('won');
    expect(displayPnl).toBeCloseTo(3.347826);
    expect(displayPnl).toBeGreaterThan(0);
  });

  it('fails neutral for closed prediction cards without enough settlement evidence', () => {
    const tradeState = resolveTradeState(
      {
        ...btcUpWonFeedPost,
        claimed: false,
        redeemed: false,
        status: undefined,
        result: undefined,
      },
      false,
      { closed: true },
    );

    expect(tradeState.state).toBe('sold');
    expect(tradeState.label).toBe('Closed');
    expect(tradeState.tone).toBe('blue');
  });

  it('keeps perps chart markers to one canonical opening avatar', () => {
    expect(selectPerpsChartMarkerEntries(repeatedMorphoPerpsEntries)).toEqual([
      repeatedMorphoPerpsEntries[0],
    ]);
  });
});
