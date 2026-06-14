import { displaySideForMarket } from '@/lib/polymarket/side-labels';
import type { TeamsMap } from '@/hooks/polymarket';

const teamsMap: TeamsMap = {
  teams: [
    { id: 'pit', name: 'Pittsburgh Penguins', abbreviation: 'PIT' },
    { id: 'phi', name: 'Philadelphia Flyers', abbreviation: 'PHI' },
    { id: 'sas', name: 'San Antonio Spurs', abbreviation: 'SAS' },
    { id: 'den', name: 'Denver Nuggets', abbreviation: 'DEN' },
    { id: 'min', name: 'Minnesota Timberwolves', abbreviation: 'MIN' },
  ],
  byKey: new Map(),
};

describe('Polymarket side labels', () => {
  it('labels sports moneyline matchups as team selections', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Penguins vs. Flyers',
          outcome: 'No',
          eventSlug: 'nhl-penguins-flyers-2026-04-26',
          teamsMap,
        },
        1,
      ),
    ).toBe('TEAM SELECTED');
  });

  it('labels claimed-win matchup rows without team metadata as team selections', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Penguins vs. Flyers',
          outcome: 'No',
        },
        1,
      ),
    ).toBe('TEAM SELECTED');
  });

  it('labels sports spread markets as team selections', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Spread: Spurs (-5.5)',
          outcome: 'No',
          eventSlug: 'nba-spurs-clippers-2026-04-16',
          teamsMap,
        },
        1,
      ),
    ).toBe('TEAM SELECTED');
  });

  it('labels claimed-win spread rows without event metadata as team selections', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Spread: Spurs (-5.5)',
          outcome: 'No',
        },
        1,
      ),
    ).toBe('TEAM SELECTED');
  });

  it('keeps sports totals as binary sides', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Nuggets vs. Timberwolves: O/U 232.5',
          outcome: 'No',
          eventSlug: 'nba-nuggets-timberwolves-2026-04-24',
          teamsMap,
        },
        1,
      ),
    ).toBe('NO');
  });

  it('keeps non-sports binary markets as yes/no', () => {
    expect(
      displaySideForMarket(
        {
          title: 'Bitcoin Up or Down - April 21, 10:30PM-10:35PM ET',
          outcome: 'No',
        },
        1,
      ),
    ).toBe('NO');
  });
});
