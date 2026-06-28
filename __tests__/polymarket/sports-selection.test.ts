import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  groupFlatMarketsIntoGames,
  isValidGameCard,
} from '@/lib/polymarket/sports-grouping';
import {
  getSportsGameMarketOutcomes,
  getSportsMoneylineDisplayOutcomes,
  getSportsOutcomeSelection,
} from '@/lib/polymarket/sports-selection';

const eventTeams = [
  { name: 'Croatia', abbreviation: 'CRO' },
  { name: 'Ghana', abbreviation: 'GHA' },
];

function market(
  overrides: Partial<PolymarketMarket>,
): PolymarketMarket {
  return {
    id: 'market',
    question: 'Question',
    slug: 'market',
    active: true,
    closed: false,
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.5","0.5"]',
    clobTokenIds: '["yes-token","no-token"]',
    gameStartTime: '2026-06-27 21:00:00+00',
    eventTeams,
    ...overrides,
  };
}

describe('sports market selection', () => {
  it('turns split binary moneyline contracts into team-facing ticket labels', () => {
    const croatia = market({
      id: 'ml-croatia',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Will Croatia win on 2026-06-27?',
      outcomePrices: '["0.52","0.48"]',
      clobTokenIds: '["cro-yes","cro-no"]',
    });
    const ghana = market({
      id: 'ml-ghana',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Will Ghana win on 2026-06-27?',
      outcomePrices: '["0.17","0.83"]',
      clobTokenIds: '["gha-yes","gha-no"]',
    });

    const [game] = groupFlatMarketsIntoGames([croatia, ghana]).filter(
      isValidGameCard,
    );
    const selection = getSportsOutcomeSelection(
      ghana,
      'Ghana',
      'gha-yes',
      getSportsGameMarketOutcomes(game, ghana),
      game,
    );

    expect(selection).toEqual({
      initialOutcome: 'yes',
      outcomeLabels: ['Ghana', 'Croatia'],
    });
    expect(
      getSportsMoneylineDisplayOutcomes(game)?.map((outcome) => ({
        label: outcome.label,
        price: outcome.price,
        tokenId: outcome.tokenId,
      })),
    ).toEqual([
      { label: 'Croatia', price: 0.52, tokenId: 'cro-yes' },
      { label: 'Ghana', price: 0.17, tokenId: 'gha-yes' },
    ]);
  });

  it('preserves paired spread and total labels for one game', () => {
    const spread = market({
      id: 'spread',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Spread: Croatia (-1.5)',
      outcomes: '["Croatia","Ghana"]',
      outcomePrices: '["0.25","0.74"]',
      clobTokenIds: '["spread-cro","spread-gha"]',
    });
    const total = market({
      id: 'total',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Croatia vs. Ghana: O/U 3.5',
      outcomes: '["Over","Under"]',
      outcomePrices: '["0.19","0.80"]',
      clobTokenIds: '["over","under"]',
    });

    const [game] = groupFlatMarketsIntoGames([
      market({
        id: 'ml-croatia',
        eventTitle: 'Croatia vs. Ghana',
        question: 'Will Croatia win on 2026-06-27?',
        outcomePrices: '["0.52","0.48"]',
        clobTokenIds: '["cro-yes","cro-no"]',
      }),
      market({
        id: 'ml-ghana',
        eventTitle: 'Croatia vs. Ghana',
        question: 'Will Ghana win on 2026-06-27?',
        outcomePrices: '["0.17","0.83"]',
        clobTokenIds: '["gha-yes","gha-no"]',
      }),
      spread,
      total,
    ]).filter(isValidGameCard);

    expect(
      getSportsOutcomeSelection(
        spread,
        'Ghana +1.5',
        'spread-gha',
        getSportsGameMarketOutcomes(game, spread),
        game,
      ),
    ).toEqual({
      initialOutcome: 'no',
      outcomeLabels: ['Croatia -1.5', 'Ghana +1.5'],
    });
    expect(
      getSportsOutcomeSelection(
        total,
        'U 3.5',
        'under',
        getSportsGameMarketOutcomes(game, total),
        game,
      ),
    ).toEqual({
      initialOutcome: 'no',
      outcomeLabels: ['O 3.5', 'U 3.5'],
    });
  });

  it('does not mistake game dates for spread lines', () => {
    const [game] = groupFlatMarketsIntoGames([
      market({
        id: 'ml-jordan',
        eventTitle: 'Jordan vs. Argentina',
        question: 'Will Jordan win on 2026-06-27?',
        eventTeams: [
          { name: 'Jordan', abbreviation: 'JOR' },
          { name: 'Argentina', abbreviation: 'ARG' },
        ],
        outcomePrices: '["0.01","0.99"]',
        clobTokenIds: '["jor-yes","jor-no"]',
      }),
      market({
        id: 'ml-argentina',
        eventTitle: 'Jordan vs. Argentina',
        question: 'Will Argentina win on 2026-06-27?',
        eventTeams: [
          { name: 'Jordan', abbreviation: 'JOR' },
          { name: 'Argentina', abbreviation: 'ARG' },
        ],
        outcomePrices: '["0.99","0.01"]',
        clobTokenIds: '["arg-yes","arg-no"]',
      }),
    ]).filter(isValidGameCard);

    expect(game.moneyline?.outcomes.map((outcome) => outcome.label)).toEqual([
      'Jordan',
      'Argentina',
    ]);
    expect(game.spread).toBeNull();
  });

  it('keeps alternate spread lines grouped with the same game', () => {
    const firstSpread = market({
      id: 'spread-1',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Spread: Croatia (-1.5)',
      outcomes: '["Croatia","Ghana"]',
      outcomePrices: '["0.25","0.74"]',
      clobTokenIds: '["spread-cro-1","spread-gha-1"]',
    });
    const alternateSpread = market({
      id: 'spread-2',
      eventTitle: 'Croatia vs. Ghana',
      question: 'Spread: Croatia (-2.5)',
      outcomes: '["Croatia","Ghana"]',
      outcomePrices: '["0.13","0.88"]',
      clobTokenIds: '["spread-cro-2","spread-gha-2"]',
    });

    const [game] = groupFlatMarketsIntoGames([
      market({
        id: 'ml-croatia',
        eventTitle: 'Croatia vs. Ghana',
        question: 'Will Croatia win on 2026-06-27?',
        outcomePrices: '["0.52","0.48"]',
        clobTokenIds: '["cro-yes","cro-no"]',
      }),
      market({
        id: 'ml-ghana',
        eventTitle: 'Croatia vs. Ghana',
        question: 'Will Ghana win on 2026-06-27?',
        outcomePrices: '["0.17","0.83"]',
        clobTokenIds: '["gha-yes","gha-no"]',
      }),
      firstSpread,
      alternateSpread,
    ]).filter(isValidGameCard);

    expect(game.spread?.outcomes.map((outcome) => outcome.label)).toEqual([
      'Croatia -1.5',
      'Ghana +1.5',
    ]);
    expect(game.spreadLines?.map((line) => line.outcomes[0].label)).toEqual([
      'Croatia -1.5',
      'Croatia -2.5',
    ]);
  });
});
