import {
  derivePredictionMatchup,
  resolveMarketState,
  resolvePickedSide,
  resolveTradeState,
  type LiveScore,
  type PredictionContent,
} from '@/components/feed/PredictionFeedCard';

// The Jul 19 "Will Argentina win?" regression: a settled binary Yes/No market
// whose picked outcome is the compound "Moneyline · Argentina" label. The card
// rendered "Closed +$0.00" because the pick never mapped to the yes side.
const argentinaContent: PredictionContent = {
  marketTitle: 'Will Argentina win on 2026-07-19?',
  outcome: 'Moneyline · Argentina',
  side: 'BUY',
  cost: 10,
  potentialWin: 38.1,
  price: 0.26,
  yesOutcome: 'Yes',
  noOutcome: 'No',
  yesTokenId: 'tok-yes',
  noTokenId: 'tok-no',
  marketId: 'cond-1',
  eventSlug: 'arg-fra-2026-07-19',
};

const settledLiveScore: LiveScore = {
  live: false,
  ended: true,
  closed: true,
  period: 'FT',
  elapsed: null,
  teams: [
    { name: 'France', abbreviation: 'FRA', score: 2 },
    { name: 'Argentina', abbreviation: 'ARG', score: 1 },
  ],
  markets: [
    {
      id: 'cond-1',
      conditionId: 'cond-1',
      question: 'Will Argentina win on 2026-07-19?',
      closed: true,
      active: false,
      outcomePrices: '["0", "1"]',
      outcomes: '["Yes", "No"]',
      clobTokenIds: '["tok-yes", "tok-no"]',
    },
  ],
};

describe('resolvePickedSide', () => {
  it('maps literal yes/no and named outcomes', () => {
    expect(resolvePickedSide('Yes', 'Yes', 'No')).toBe('yes');
    expect(resolvePickedSide('No', 'Yes', 'No')).toBe('no');
    expect(resolvePickedSide('Pacers', 'Knicks', 'Pacers')).toBe('no');
  });

  it('strips spread/total lines before matching', () => {
    expect(resolvePickedSide('Over 220.5', 'Over', 'Under')).toBe('yes');
    expect(resolvePickedSide('Columbia +2.5', 'Columbia', 'Swiss')).toBe('yes');
  });

  it('returns null for compound labels that match neither side', () => {
    expect(resolvePickedSide('Moneyline · Argentina', 'Yes', 'No')).toBeNull();
  });
});

describe('binary market settlement', () => {
  it('marks a settled 0¢ binary pick as lost for the full stake', () => {
    const marketState = resolveMarketState(argentinaContent, settledLiveScore);

    expect(marketState.closed).toBe(true);
    // Unknown compound pick defaults to the yes side (the question subject).
    expect(marketState.pickedPrice).toBe(0);

    const state = resolveTradeState(argentinaContent, false, marketState);
    expect(state.state).toBe('lost');
    expect(state.amount).toBeCloseTo(-10);
  });

  it('marks a settled 1$ binary pick as won', () => {
    const wonScore: LiveScore = {
      ...settledLiveScore,
      teams: [
        { name: 'France', abbreviation: 'FRA', score: 1 },
        { name: 'Argentina', abbreviation: 'ARG', score: 2 },
      ],
      markets: [
        {
          ...settledLiveScore.markets![0],
          outcomePrices: '["1", "0"]',
        },
      ],
    };
    const marketState = resolveMarketState(argentinaContent, wonScore);

    expect(marketState.pickedPrice).toBe(1);
    const state = resolveTradeState(argentinaContent, false, marketState);
    expect(state.state).toBe('won');
    expect(state.amount).toBeCloseTo(28.1);
  });

  it('does not let index-fallback scores decide a binary market without a matchup', () => {
    // Scores in event order would map France (winner) to the yes slot; the
    // settled prices, not the misassigned scores, must decide.
    const noMatchupContent: PredictionContent = {
      ...argentinaContent,
      eventSlug: undefined,
      marketSlug: undefined,
      marketTitle: 'Will the home side prevail?',
    };
    const marketState = resolveMarketState(noMatchupContent, settledLiveScore);

    expect(marketState.pickedWon).toBeUndefined();
    expect(marketState.pickedPrice).toBe(0);
    expect(resolveTradeState(noMatchupContent, false, marketState).state).toBe(
      'lost',
    );
  });
});

describe('derivePredictionMatchup', () => {
  it('derives both sides from a -vs- event slug', () => {
    expect(
      derivePredictionMatchup(
        argentinaContent,
        'argentina-vs-france-2026-07-19',
      ),
    ).toEqual({ a: 'Argentina', b: 'France' });
  });

  it('orients an event-title matchup so the question subject is the yes side', () => {
    expect(
      derivePredictionMatchup(
        { ...argentinaContent, eventTitle: 'France vs Argentina' },
        undefined,
      ),
    ).toEqual({ a: 'Argentina', b: 'France' });
  });

  it('parses "Will A beat B" questions', () => {
    expect(
      derivePredictionMatchup(
        {
          ...argentinaContent,
          marketTitle: 'Will USA beat Brazil on July 18?',
        },
        undefined,
      ),
    ).toEqual({ a: 'USA', b: 'Brazil' });
  });

  it('recovers the opponent from live-score teams when only the subject is named', () => {
    expect(
      derivePredictionMatchup(
        argentinaContent,
        'arg-fra-2026-07-19',
        settledLiveScore.teams,
      ),
    ).toEqual({ a: 'Argentina', b: 'France' });
  });

  it('prefers stored teams over everything else', () => {
    expect(
      derivePredictionMatchup(
        {
          ...argentinaContent,
          yesTeam: { name: 'Argentina' },
          noTeam: { name: 'France' },
          eventTitle: 'Wrong vs Order',
        },
        undefined,
      ),
    ).toEqual({ a: 'Argentina', b: 'France' });
  });

  it('returns null when no source names both sides', () => {
    expect(
      derivePredictionMatchup(
        {
          ...argentinaContent,
          eventSlug: undefined,
          marketTitle: 'Will it rain tomorrow?',
        },
        undefined,
      ),
    ).toBeNull();
  });
});
