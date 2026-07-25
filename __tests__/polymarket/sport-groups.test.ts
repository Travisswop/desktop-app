import {
  getSportGroups,
  getGroupIdForSport,
  SPORT_SUBCATEGORIES,
} from '@/constants/polymarket';

describe('sport groups (top-level tab hierarchy)', () => {
  it('collapses multi-league sports into one umbrella group', () => {
    const groups = getSportGroups();
    const basketball = groups.find((g) => g.id === 'basketball');
    expect(basketball).toBeTruthy();
    expect(basketball!.label).toBe('Basketball');
    expect(basketball!.members.map((m) => m.id).sort()).toEqual(
      ['basketball-intl', 'nba', 'nbasl', 'ncaab', 'ncaaw', 'wnba'].sort(),
    );

    const football = groups.find((g) => g.id === 'football');
    expect(football!.members.map((m) => m.id).sort()).toEqual(
      ['cfb', 'cfl', 'nfl'].sort(),
    );

    const combat = groups.find((g) => g.id === 'combat');
    expect(combat!.members.map((m) => m.id).sort()).toEqual(
      ['boxing', 'mma', 'powerslap'].sort(),
    );
  });

  it('keeps single-sport groups as one-member groups, not folded into "all"', () => {
    const groups = getSportGroups();
    const soccer = groups.find((g) => g.id === 'soccer');
    expect(soccer!.members).toHaveLength(1);
    expect(soccer!.members[0].id).toBe('soccer');

    const tennis = groups.find((g) => g.id === 'tennis');
    expect(tennis!.members).toHaveLength(1);
  });

  it('excludes the "all" pseudo-entry from any group', () => {
    const groups = getSportGroups();
    const allEntries = groups.flatMap((g) => g.members.map((m) => m.id));
    expect(allEntries).not.toContain('all');
  });

  it('every real sport belongs to exactly one group', () => {
    const groups = getSportGroups();
    const seen = new Map<string, string>();
    for (const group of groups) {
      for (const member of group.members) {
        expect(seen.has(member.id)).toBe(false);
        seen.set(member.id, group.id);
      }
    }
    const realSports = SPORT_SUBCATEGORIES.filter((s) => s.id !== 'all');
    expect(seen.size).toBe(realSports.length);
  });

  it('resolves the owning group id for a given sport, and undefined for "all"', () => {
    expect(getGroupIdForSport('nba')).toBe('basketball');
    expect(getGroupIdForSport('ncaaw')).toBe('basketball');
    expect(getGroupIdForSport('soccer')).toBe('soccer');
    expect(getGroupIdForSport('all')).toBeUndefined();
  });
});
