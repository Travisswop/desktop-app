import {
  groupEventMarkets,
  groupFlatMarketsIntoGames,
  isValidGameCard,
  type GammaEventMarket,
} from '@/lib/polymarket/sports-grouping';
import type { PolymarketMarket } from '@/hooks/polymarket';

const teams = [
  { name: 'Netherlands', abbreviation: 'NED' },
  { name: 'Japan', abbreviation: 'JPN' },
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
    gameStartTime: '2026-06-14 20:00:00+00',
    eventTeams: teams,
    ...overrides,
  };
}

describe('sports grouping', () => {
  it('merges soccer moneyline and More Markets companions into one game', () => {
    const games = groupFlatMarketsIntoGames([
      market({
        id: 'ml-netherlands',
        eventId: '351724',
        eventTitle: 'Netherlands vs. Japan',
        question: 'Will Netherlands win on 2026-06-14?',
        outcomePrices: '["0.465","0.535"]',
        clobTokenIds: '["ned-yes","ned-no"]',
      }),
      market({
        id: 'ml-japan',
        eventId: '351724',
        eventTitle: 'Netherlands vs. Japan',
        question: 'Will Japan win on 2026-06-14?',
        outcomePrices: '["0.265","0.735"]',
        clobTokenIds: '["jpn-yes","jpn-no"]',
      }),
      market({
        id: 'ml-draw',
        eventId: '351724',
        eventTitle: 'Netherlands vs. Japan',
        question: 'Will Netherlands vs. Japan end in a draw?',
        outcomePrices: '["0.285","0.715"]',
        clobTokenIds: '["draw-yes","draw-no"]',
      }),
      market({
        id: 'spread',
        eventId: '511475',
        eventTitle: 'Netherlands vs. Japan - More Markets',
        question: 'Spread: Netherlands (-1.5)',
        outcomes: '["Netherlands","Japan"]',
        outcomePrices: '["0.235","0.765"]',
        clobTokenIds: '["spread-ned","spread-jpn"]',
      }),
      market({
        id: 'total',
        eventId: '511475',
        eventTitle: 'Netherlands vs. Japan - More Markets',
        question: 'Netherlands vs. Japan: O/U 2.5',
        outcomes: '["Over","Under"]',
        outcomePrices: '["0.455","0.545"]',
        clobTokenIds: '["over","under"]',
      }),
    ]).filter(isValidGameCard);

    expect(games).toHaveLength(1);
    expect(games[0].title).toBe('Netherlands vs. Japan');
    expect(games[0].moneyline?.outcomes.map((outcome) => outcome.label)).toEqual([
      'Netherlands',
      'Japan',
      'Draw',
    ]);
    expect(games[0].spread?.outcomes.map((outcome) => outcome.label)).toEqual([
      'Netherlands -1.5',
      'Japan +1.5',
    ]);
    expect(games[0].total?.outcomes.map((outcome) => outcome.label)).toEqual([
      'O 2.5',
      'U 2.5',
    ]);
  });
});

function eventMarket(
  overrides: Partial<GammaEventMarket>,
): GammaEventMarket {
  return {
    id: 'market',
    question: 'Question',
    active: true,
    closed: false,
    outcomes: '["Over","Under"]',
    outcomePrices: '["0.5","0.5"]',
    clobTokenIds: '["over-token","under-token"]',
    ...overrides,
  };
}

describe('groupEventMarkets', () => {
  it('routes player props and period markets into `other`, not the total alt-lines', () => {
    const grouped = groupEventMarkets(
      [
        eventMarket({
          id: 'game-total',
          question: 'Royals vs. Tigers: O/U 7.5',
        }),
        eventMarket({
          id: 'player-prop',
          question: 'Bobby Witt Jr.: Hits O/U 1.5',
        }),
        eventMarket({
          id: 'period-market',
          question: '1st 5 Innings: Total Runs O/U 2.5',
        }),
      ],
      undefined,
      'Kansas City Royals vs. Detroit Tigers',
    );

    expect(grouped.total?.market.id).toBe('game-total');
    expect(grouped.totalLines?.map((line) => line.market.id)).toEqual([
      'game-total',
    ]);
    expect(grouped.other?.map((entry) => entry.market.id).sort()).toEqual([
      'period-market',
      'player-prop',
    ]);
  });

  it('does not misroute a real game total that happens to share Over/Under outcomes with a prop', () => {
    const grouped = groupEventMarkets([
      eventMarket({
        id: 'moneyline',
        question: 'Will the Royals win?',
        outcomes: '["Yes","No"]',
      }),
      eventMarket({
        id: 'game-total',
        question: 'Royals vs. Tigers: Total runs O/U 7.5',
      }),
    ]);

    expect(grouped.total?.market.id).toBe('game-total');
    expect(grouped.other ?? []).toHaveLength(0);
  });
});
