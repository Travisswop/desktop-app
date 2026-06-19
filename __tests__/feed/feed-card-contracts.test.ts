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
  embeddedPredictionLiveScore,
  formatSportsGameClockLabel,
  formatSpreadOutcomeLabel,
  mergePredictionLiveScores,
  resolvePredictionLiveEventSlug,
  resolveSportsScorePickedWon,
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

  it('keeps the spread line in sports feed pick labels', () => {
    expect(
      formatSpreadOutcomeLabel({
        marketTitle: 'Spread: Mexico (-1.5)',
        pickedOutcome: 'Mexico',
        yesOutcome: 'Mexico',
        noOutcome: 'Korea Republic',
      }),
    ).toBe('Mexico -1.5');

    expect(
      formatSpreadOutcomeLabel({
        marketTitle: 'Spread: Mexico (-1.5)',
        pickedOutcome: 'Korea Republic',
        yesOutcome: 'Mexico',
        noOutcome: 'Korea Republic',
      }),
    ).toBe('Korea Republic +1.5');

    expect(
      formatSpreadOutcomeLabel({
        marketTitle: 'Spread: Mexico (-1.5)',
        pickedOutcome: 'Yes',
        yesOutcome: 'Mexico',
        noOutcome: 'Korea Republic',
      }),
    ).toBe('Mexico -1.5');
  });

  it('settles spread score fallbacks against the line, not moneyline', () => {
    expect(
      resolveSportsScorePickedWon({
        marketTitle: 'Spread: Mexico (-1.5)',
        pickedOutcome: 'Mexico',
        yesOutcome: 'Mexico',
        noOutcome: 'Korea Republic',
        yesScore: 1,
        noScore: 0,
      }),
    ).toBe(false);

    expect(
      resolveSportsScorePickedWon({
        marketTitle: 'Spread: Mexico (-1.5)',
        pickedOutcome: 'Korea Republic',
        yesOutcome: 'Mexico',
        noOutcome: 'Korea Republic',
        yesScore: 1,
        noScore: 0,
      }),
    ).toBe(true);
  });

  it('normalizes sports market slugs before fetching final scores', () => {
    expect(
      resolvePredictionLiveEventSlug({
        ...mexicoClaimedOverrideFeedPost,
        eventSlug: 'fifwc-mex-kr-2026-06-18-mex',
        yesTeam: { name: 'Mexico', abbreviation: 'MEX' },
        noTeam: { name: 'Korea Republic', abbreviation: 'KR' },
      }),
    ).toBe('fifwc-mex-kr-2026-06-18');

    expect(
      resolvePredictionLiveEventSlug({
        ...mexicoClaimedOverrideFeedPost,
        eventSlug: 'fifwc-mex-kr-2026-06-18-mex',
        yesTeam: undefined,
        noTeam: undefined,
      }),
    ).toBe('fifwc-mex-kr-2026-06-18');
  });

  it('uses embedded final score data when fetched sports teams lack scores', () => {
    const embedded = embeddedPredictionLiveScore({
      ...mexicoClaimedOverrideFeedPost,
      eventScore: '1-0',
      yesTeam: { name: 'Mexico', abbreviation: 'MEX' },
      noTeam: { name: 'Korea Republic', abbreviation: 'KR' },
      status: 'claimed',
    });

    expect(embedded?.teams.map((team) => team.score)).toEqual([1, 0]);

    const merged = mergePredictionLiveScores(
      {
        live: false,
        ended: true,
        closed: true,
        period: 'VFT',
        elapsed: '',
        teams: [
          { name: 'Mexico', abbreviation: 'MEX', score: null },
          { name: 'Korea Republic', abbreviation: 'KR', score: null },
        ],
      },
      embedded,
    );

    expect(merged?.teams.map((team) => team.score)).toEqual([1, 0]);
    expect(
      formatSportsGameClockLabel({
        hasScores: true,
        yesScore: 1,
        noScore: 0,
        liveScore: merged,
      }),
    ).toBe('1-0');
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
