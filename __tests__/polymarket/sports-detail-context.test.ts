import type { PolymarketMarket } from '@/hooks/polymarket';
import { recoverSportsGameDetailContext } from '@/lib/polymarket/sports-detail-context';

const eventTeams = [
  { name: 'Croatia', abbreviation: 'CRO' },
  { name: 'Ghana', abbreviation: 'GHA' },
];

function market(overrides: Partial<PolymarketMarket>): PolymarketMarket {
  return {
    id: 'market',
    question: 'Question',
    slug: 'market',
    active: true,
    closed: false,
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.5","0.5"]',
    clobTokenIds: '["yes-token","no-token"]',
    gameStartTime: '2026-06-27T21:00:00Z',
    eventStartDate: '2026-06-27T21:00:00Z',
    eventTitle: 'Croatia vs. Ghana',
    eventSlug: 'fifwc-hrv-gha-2026-06-27',
    eventTeams,
    ...overrides,
  };
}

describe('sports detail context recovery', () => {
  it('rebuilds grouped game lines for a binary team-win detail market', () => {
    const croatia = market({
      id: '1897423',
      conditionId: '0x2cc',
      question: 'Will Croatia win on 2026-06-27?',
      outcomePrices: '["0.515","0.485"]',
      clobTokenIds: '["cro-yes","cro-no"]',
    });
    const ghana = market({
      id: '1897427',
      conditionId: '0x137',
      question: 'Will Ghana win on 2026-06-27?',
      outcomePrices: '["0.175","0.825"]',
      clobTokenIds: '["gha-yes","gha-no"]',
    });
    const draw = market({
      id: '1897425',
      conditionId: '0x4b3',
      question: 'Will Croatia vs. Ghana end in a draw?',
      outcomePrices: '["0.315","0.685"]',
      clobTokenIds: '["draw-yes","draw-no"]',
    });
    const spread = market({
      id: '2323752',
      conditionId: '0x42e',
      question: 'Spread: Croatia (-1.5)',
      eventTitle: 'Croatia vs. Ghana - More Markets',
      eventSlug: 'fifwc-hrv-gha-2026-06-27-more-markets',
      outcomes: '["Croatia","Ghana"]',
      outcomePrices: '["0.255","0.745"]',
      clobTokenIds: '["spread-cro","spread-gha"]',
    });
    const total = market({
      id: '2323758',
      conditionId: '0x709',
      question: 'Croatia vs. Ghana: O/U 2.5',
      eventTitle: 'Croatia vs. Ghana - More Markets',
      eventSlug: 'fifwc-hrv-gha-2026-06-27-more-markets',
      outcomes: '["Over","Under"]',
      outcomePrices: '["0.365","0.635"]',
      clobTokenIds: '["over","under"]',
    });

    const context = recoverSportsGameDetailContext(
      croatia,
      [ghana, draw, spread, total],
      'yes',
    );

    expect(context?.selection).toEqual({
      initialOutcome: 'yes',
      outcomeLabels: ['Croatia', 'Ghana'],
    });
    expect(context?.game.moneyline?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Croatia', 'Ghana', 'Draw']);
    expect(context?.game.spread?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Croatia -1.5', 'Ghana +1.5']);
    expect(context?.game.total?.outcomes.map((outcome) => outcome.label))
      .toEqual(['O 2.5', 'U 2.5']);
  });

  it('rebuilds grouped game lines for conventional two-team sports markets', () => {
    const teams = [
      { name: 'Los Angeles Lakers', abbreviation: 'LAL' },
      { name: 'Boston Celtics', abbreviation: 'BOS' },
    ];
    const base = {
      eventTitle: 'Los Angeles Lakers vs. Boston Celtics',
      eventSlug: 'nba-lal-bos-2026-06-27',
      eventTeams: teams,
    };
    const moneyline = market({
      ...base,
      id: 'nba-ml',
      conditionId: '0xaaa',
      question: 'Los Angeles Lakers vs. Boston Celtics',
      outcomes: '["Los Angeles Lakers","Boston Celtics"]',
      outcomePrices: '["0.44","0.57"]',
      clobTokenIds: '["lal-ml","bos-ml"]',
    });
    const spread = market({
      ...base,
      id: 'nba-spread',
      conditionId: '0xbbb',
      question: 'Spread: Boston Celtics (-4.5)',
      outcomes: '["Los Angeles Lakers","Boston Celtics"]',
      outcomePrices: '["0.48","0.53"]',
      clobTokenIds: '["lal-spread","bos-spread"]',
    });
    const total = market({
      ...base,
      id: 'nba-total',
      conditionId: '0xccc',
      question: 'Los Angeles Lakers vs. Boston Celtics: O/U 218.5',
      outcomes: '["Over","Under"]',
      outcomePrices: '["0.51","0.50"]',
      clobTokenIds: '["over","under"]',
    });

    const context = recoverSportsGameDetailContext(
      moneyline,
      [spread, total],
      'no',
    );

    expect(context?.selection).toEqual({
      initialOutcome: 'no',
      outcomeLabels: ['Los Angeles Lakers', 'Boston Celtics'],
    });
    expect(context?.game.moneyline?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Los Angeles Lakers', 'Boston Celtics']);
    expect(context?.game.spread?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Los Angeles Lakers +4.5', 'Boston Celtics -4.5']);
    expect(context?.game.total?.outcomes.map((outcome) => outcome.label))
      .toEqual(['O 218.5', 'U 218.5']);
  });

  it('uses related team metadata when a direct-linked active market is sparse', () => {
    const activeJordan = market({
      id: '1897440',
      conditionId: '0xjor',
      question: 'Will Jordan win on 2026-06-27?',
      eventTitle: 'Jordan vs. Argentina',
      eventSlug: 'fifwc-jor-arg-2026-06-27',
      eventId: '351785',
      eventTeams: undefined,
      outcomePrices: '["0.0015","0.9985"]',
      clobTokenIds: '["jor-yes","jor-no"]',
    });
    const jordanWithTeams = market({
      ...activeJordan,
      eventTeams: [
        { name: 'Jordan', abbreviation: 'JOR' },
        { name: 'Argentina', abbreviation: 'ARG' },
      ],
    });
    const argentina = market({
      id: '1897442',
      conditionId: '0xarg',
      question: 'Will Argentina win on 2026-06-27?',
      eventTitle: 'Jordan vs. Argentina',
      eventSlug: 'fifwc-jor-arg-2026-06-27',
      eventTeams: jordanWithTeams.eventTeams,
      outcomePrices: '["0.995","0.005"]',
      clobTokenIds: '["arg-yes","arg-no"]',
    });
    const draw = market({
      id: '1897441',
      conditionId: '0xdraw',
      question: 'Will Jordan vs. Argentina end in a draw?',
      eventTitle: 'Jordan vs. Argentina',
      eventSlug: 'fifwc-jor-arg-2026-06-27',
      eventTeams: jordanWithTeams.eventTeams,
      outcomePrices: '["0.0055","0.9945"]',
      clobTokenIds: '["draw-yes","draw-no"]',
    });
    const spread = market({
      id: '2323722',
      conditionId: '0xspread',
      question: 'Spread: Argentina (-2.5)',
      eventTitle: 'Jordan vs. Argentina - More Markets',
      eventSlug: 'fifwc-jor-arg-2026-06-27-more-markets',
      eventTeams: jordanWithTeams.eventTeams,
      outcomes: '["Argentina","Jordan"]',
      outcomePrices: '["0.745","0.255"]',
      clobTokenIds: '["arg-spread","jor-spread"]',
    });
    const total = market({
      id: '2323726',
      conditionId: '0xtotal',
      question: 'Jordan vs. Argentina: O/U 3.5',
      eventTitle: 'Jordan vs. Argentina - More Markets',
      eventSlug: 'fifwc-jor-arg-2026-06-27-more-markets',
      eventTeams: jordanWithTeams.eventTeams,
      outcomes: '["Over","Under"]',
      outcomePrices: '["0.615","0.385"]',
      clobTokenIds: '["over","under"]',
    });

    const context = recoverSportsGameDetailContext(
      activeJordan,
      [jordanWithTeams, argentina, draw, spread, total],
      'yes',
    );

    expect(context?.game.moneyline?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Jordan', 'Argentina', 'Draw']);
    expect(context?.game.spread?.outcomes.map((outcome) => outcome.label))
      .toEqual(['Jordan +2.5', 'Argentina -2.5']);
    expect(context?.game.total?.outcomes.map((outcome) => outcome.label))
      .toEqual(['O 3.5', 'U 3.5']);
  });
});
