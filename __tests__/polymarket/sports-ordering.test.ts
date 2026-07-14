import {
  orderSportsMarkets,
  compareSportsGames,
  parseMarketDateMs,
} from '@/lib/polymarket/sports-ordering';
import {
  groupFlatMarketsIntoGames,
  type SportsGameGroup,
} from '@/lib/polymarket/sports-grouping';
import type { PolymarketMarket } from '@/hooks/polymarket';

const NOW = Date.parse('2026-07-13T18:00:00Z');

function iso(offsetHours: number): string {
  return new Date(NOW + offsetHours * 60 * 60 * 1000).toISOString();
}

function market(overrides: Partial<PolymarketMarket>): PolymarketMarket {
  return {
    id: 'market',
    question: 'Team A vs. Team B',
    slug: 'market',
    active: true,
    closed: false,
    outcomes: '["Team A","Team B"]',
    outcomePrices: '["0.5","0.5"]',
    clobTokenIds: '["a-token","b-token"]',
    eventTeams: [
      { name: 'Team A', league: 'nba' },
      { name: 'Team B', league: 'nba' },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('parseMarketDateMs', () => {
  it('parses Postgres timestamptz values (space + 2-digit offset)', () => {
    expect(parseMarketDateMs('2026-07-12 01:00:00+00')).toBe(
      Date.parse('2026-07-12T01:00:00Z'),
    );
  });

  it('does not corrupt date-only values', () => {
    expect(parseMarketDateMs('2026-07-12')).toBe(Date.parse('2026-07-12'));
  });

  it('returns null for empty or invalid input', () => {
    expect(parseMarketDateMs(undefined)).toBeNull();
    expect(parseMarketDateMs('not a date')).toBeNull();
  });
});

describe('orderSportsMarkets', () => {
  const liveGame = market({
    id: 'live-ml',
    eventId: 'ev-live',
    eventTitle: 'Live A vs. Live B',
    eventLive: true,
    gameStartTime: iso(-1),
    volume: '100',
  });
  const upcomingMajor = market({
    id: 'major-ml',
    eventId: 'ev-major',
    eventTitle: 'Major A vs. Major B',
    slug: 'nba-major-a-major-b',
    gameStartTime: iso(4),
    volume: '50',
  });
  const upcomingOtherSooner = market({
    id: 'tennis-ml',
    eventId: 'ev-tennis',
    eventTitle: 'Player A vs. Player B',
    slug: 'tennis-player-a-player-b',
    eventTeams: [
      { name: 'Player A', league: 'atp' },
      { name: 'Player B', league: 'atp' },
    ],
    gameStartTime: iso(1),
    volume: '900',
  });
  const finishedGame = market({
    id: 'final-ml',
    eventId: 'ev-final',
    eventTitle: 'Done A vs. Done B',
    eventEnded: true,
    gameStartTime: iso(-8),
    volume: '5000',
  });
  const future = market({
    id: 'future',
    eventId: 'ev-future',
    eventTitle: 'Championship Winner',
    question: 'Will Team A win the championship?',
    eventTeams: undefined,
    gameStartTime: undefined,
    endDate: iso(24 * 90),
    volume: '9999',
  });

  it('orders live → upcoming majors → upcoming others → played → futures, ignoring volume order', () => {
    const ordered = orderSportsMarkets([
      future,
      finishedGame,
      upcomingOtherSooner,
      upcomingMajor,
      liveGame,
    ]);
    expect(ordered.map((m) => m.id)).toEqual([
      'live-ml',
      'major-ml',
      'tennis-ml',
      'final-ml',
      'future',
    ]);
  });

  it('sorts upcoming games within a tier by soonest kickoff', () => {
    const laterMajor = market({
      id: 'major-later',
      eventId: 'ev-major-later',
      eventTitle: 'Major C vs. Major D',
      gameStartTime: iso(9),
    });
    const ordered = orderSportsMarkets([laterMajor, upcomingMajor]);
    expect(ordered.map((m) => m.id)).toEqual(['major-ml', 'major-later']);
  });

  it('treats a recently-started open game as live despite a stale live flag', () => {
    const staleFlag = market({
      id: 'stale-live',
      eventId: 'ev-stale',
      eventTitle: 'Stale A vs. Stale B',
      eventLive: false,
      gameStartTime: iso(-2),
    });
    const ordered = orderSportsMarkets([upcomingMajor, staleFlag]);
    expect(ordered.map((m) => m.id)).toEqual(['stale-live', 'major-ml']);
  });

  it('sinks finished games most-recent-first', () => {
    const olderFinal = market({
      id: 'older-final',
      eventId: 'ev-older-final',
      eventTitle: 'Old A vs. Old B',
      eventEnded: true,
      gameStartTime: iso(-30),
    });
    const ordered = orderSportsMarkets([olderFinal, finishedGame]);
    expect(ordered.map((m) => m.id)).toEqual(['final-ml', 'older-final']);
  });

  it('keeps one event\'s markets contiguous so grouping stays intact', () => {
    const majorSpread = market({
      id: 'major-spread',
      eventId: 'ev-major',
      eventTitle: 'Major A vs. Major B',
      slug: 'nba-major-a-major-b-spread',
      question: 'Spread: Major A (-1.5)',
      outcomes: '["Major A","Major B"]',
      gameStartTime: iso(4),
      volume: '10',
    });
    // Volume order interleaves another event between the two ev-major markets.
    const ordered = orderSportsMarkets([
      liveGame,
      upcomingMajor,
      upcomingOtherSooner,
      majorSpread,
    ]);
    const majorIndexes = ordered
      .map((m, i) => (m.eventId === 'ev-major' ? i : -1))
      .filter((i) => i >= 0);
    expect(majorIndexes[1] - majorIndexes[0]).toBe(1);

    const games = groupFlatMarketsIntoGames(ordered);
    const majorGame = games.find((g) => g.title === 'Major A vs. Major B');
    expect(majorGame?.moneyline).toBeTruthy();
    expect(majorGame?.spread).toBeTruthy();
  });
});

describe('compareSportsGames', () => {
  function game(markets: PolymarketMarket[]): SportsGameGroup {
    return groupFlatMarketsIntoGames(markets)[0];
  }

  it('ranks a live game ahead of an upcoming one', () => {
    const live = game([
      market({
        id: 'g-live',
        eventId: 'ev-a',
        eventTitle: 'A1 vs. A2',
        eventLive: true,
        gameStartTime: iso(-1),
      }),
    ]);
    const upcoming = game([
      market({
        id: 'g-upcoming',
        eventId: 'ev-b',
        eventTitle: 'B1 vs. B2',
        gameStartTime: iso(2),
      }),
    ]);
    expect(compareSportsGames(live, upcoming)).toBeLessThan(0);
    expect(compareSportsGames(upcoming, live)).toBeGreaterThan(0);
  });

  it('ranks upcoming games by kickoff, not start-time recency', () => {
    const sooner = game([
      market({
        id: 'g-sooner',
        eventId: 'ev-c',
        eventTitle: 'C1 vs. C2',
        gameStartTime: iso(1),
      }),
    ]);
    const later = game([
      market({
        id: 'g-later',
        eventId: 'ev-d',
        eventTitle: 'D1 vs. D2',
        gameStartTime: iso(6),
      }),
    ]);
    expect(compareSportsGames(sooner, later)).toBeLessThan(0);
  });
});
