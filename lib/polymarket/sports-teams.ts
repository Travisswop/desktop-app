/**
 * Static sports team metadata used to display team abbreviations and brand
 * colours in the SportsGameCard UI.
 *
 * Lookup priority (see findTeam):
 *   1. Short/nick name from the moneyline outcome (e.g. "Magic", "76ers")
 *   2. 3-4 letter abbreviation from the spread outcome  (e.g. "ORL", "PHI")
 *   3. City name partial match
 */

export interface SportTeam {
  /** Official 2-4 letter abbreviation, e.g. "ORL" */
  abbrev: string;
  /** Nickname used in Polymarket outcomes, e.g. "Magic" */
  shortName: string;
  /** Primary team colour (hex) */
  color: string;
  city?: string;
}

// ─── NBA ──────────────────────────────────────────────────────────────────────
const NBA: SportTeam[] = [
  { abbrev: 'ATL', shortName: 'Hawks',          city: 'Atlanta',       color: '#E03A3E' },
  { abbrev: 'BOS', shortName: 'Celtics',         city: 'Boston',        color: '#007A33' },
  { abbrev: 'BKN', shortName: 'Nets',            city: 'Brooklyn',      color: '#000000' },
  { abbrev: 'CHA', shortName: 'Hornets',         city: 'Charlotte',     color: '#1D1160' },
  { abbrev: 'CHI', shortName: 'Bulls',           city: 'Chicago',       color: '#CE1141' },
  { abbrev: 'CLE', shortName: 'Cavaliers',       city: 'Cleveland',     color: '#860038' },
  { abbrev: 'DAL', shortName: 'Mavericks',       city: 'Dallas',        color: '#00538C' },
  { abbrev: 'DEN', shortName: 'Nuggets',         city: 'Denver',        color: '#0E2240' },
  { abbrev: 'DET', shortName: 'Pistons',         city: 'Detroit',       color: '#C8102E' },
  { abbrev: 'GSW', shortName: 'Warriors',        city: 'Golden State',  color: '#1D428A' },
  { abbrev: 'HOU', shortName: 'Rockets',         city: 'Houston',       color: '#CE1141' },
  { abbrev: 'IND', shortName: 'Pacers',          city: 'Indiana',       color: '#002D62' },
  { abbrev: 'LAC', shortName: 'Clippers',        city: 'Los Angeles',   color: '#C8102E' },
  { abbrev: 'LAL', shortName: 'Lakers',          city: 'Los Angeles',   color: '#552583' },
  { abbrev: 'MEM', shortName: 'Grizzlies',       city: 'Memphis',       color: '#5D76A9' },
  { abbrev: 'MIA', shortName: 'Heat',            city: 'Miami',         color: '#98002E' },
  { abbrev: 'MIL', shortName: 'Bucks',           city: 'Milwaukee',     color: '#00471B' },
  { abbrev: 'MIN', shortName: 'Timberwolves',    city: 'Minnesota',     color: '#0C2340' },
  { abbrev: 'NOP', shortName: 'Pelicans',        city: 'New Orleans',   color: '#0C2340' },
  { abbrev: 'NYK', shortName: 'Knicks',          city: 'New York',      color: '#006BB6' },
  { abbrev: 'OKC', shortName: 'Thunder',         city: 'Oklahoma City', color: '#007AC1' },
  { abbrev: 'ORL', shortName: 'Magic',           city: 'Orlando',       color: '#0077C0' },
  { abbrev: 'PHI', shortName: '76ers',           city: 'Philadelphia',  color: '#006BB6' },
  { abbrev: 'PHX', shortName: 'Suns',            city: 'Phoenix',       color: '#1D1160' },
  { abbrev: 'POR', shortName: 'Trail Blazers',   city: 'Portland',      color: '#E03A3E' },
  { abbrev: 'SAC', shortName: 'Kings',           city: 'Sacramento',    color: '#5A2D81' },
  { abbrev: 'SAS', shortName: 'Spurs',           city: 'San Antonio',   color: '#8A8D8F' },
  { abbrev: 'TOR', shortName: 'Raptors',         city: 'Toronto',       color: '#CE1141' },
  { abbrev: 'UTA', shortName: 'Jazz',            city: 'Utah',          color: '#002B5C' },
  { abbrev: 'WAS', shortName: 'Wizards',         city: 'Washington',    color: '#002B5C' },
];

// ─── NFL ──────────────────────────────────────────────────────────────────────
const NFL: SportTeam[] = [
  { abbrev: 'ARI', shortName: 'Cardinals',    city: 'Arizona',       color: '#97233F' },
  { abbrev: 'ATL', shortName: 'Falcons',      city: 'Atlanta',       color: '#A71930' },
  { abbrev: 'BAL', shortName: 'Ravens',       city: 'Baltimore',     color: '#241773' },
  { abbrev: 'BUF', shortName: 'Bills',        city: 'Buffalo',       color: '#00338D' },
  { abbrev: 'CAR', shortName: 'Panthers',     city: 'Carolina',      color: '#0085CA' },
  { abbrev: 'CHI', shortName: 'Bears',        city: 'Chicago',       color: '#0B162A' },
  { abbrev: 'CIN', shortName: 'Bengals',      city: 'Cincinnati',    color: '#FB4F14' },
  { abbrev: 'CLE', shortName: 'Browns',       city: 'Cleveland',     color: '#311D00' },
  { abbrev: 'DAL', shortName: 'Cowboys',      city: 'Dallas',        color: '#003594' },
  { abbrev: 'DEN', shortName: 'Broncos',      city: 'Denver',        color: '#FB4F14' },
  { abbrev: 'DET', shortName: 'Lions',        city: 'Detroit',       color: '#0076B6' },
  { abbrev: 'GB',  shortName: 'Packers',      city: 'Green Bay',     color: '#203731' },
  { abbrev: 'HOU', shortName: 'Texans',       city: 'Houston',       color: '#03202F' },
  { abbrev: 'IND', shortName: 'Colts',        city: 'Indianapolis',  color: '#002C5F' },
  { abbrev: 'JAX', shortName: 'Jaguars',      city: 'Jacksonville',  color: '#006778' },
  { abbrev: 'KC',  shortName: 'Chiefs',       city: 'Kansas City',   color: '#E31837' },
  { abbrev: 'LV',  shortName: 'Raiders',      city: 'Las Vegas',     color: '#000000' },
  { abbrev: 'LAC', shortName: 'Chargers',     city: 'Los Angeles',   color: '#0080C6' },
  { abbrev: 'LAR', shortName: 'Rams',         city: 'Los Angeles',   color: '#003594' },
  { abbrev: 'MIA', shortName: 'Dolphins',     city: 'Miami',         color: '#008E97' },
  { abbrev: 'MIN', shortName: 'Vikings',      city: 'Minnesota',     color: '#4F2683' },
  { abbrev: 'NE',  shortName: 'Patriots',     city: 'New England',   color: '#002244' },
  { abbrev: 'NO',  shortName: 'Saints',       city: 'New Orleans',   color: '#9F8958' },
  { abbrev: 'NYG', shortName: 'Giants',       city: 'New York',      color: '#0B2265' },
  { abbrev: 'NYJ', shortName: 'Jets',         city: 'New York',      color: '#125740' },
  { abbrev: 'PHI', shortName: 'Eagles',       city: 'Philadelphia',  color: '#004C54' },
  { abbrev: 'PIT', shortName: 'Steelers',     city: 'Pittsburgh',    color: '#101820' },
  { abbrev: 'SF',  shortName: '49ers',        city: 'San Francisco', color: '#AA0000' },
  { abbrev: 'SEA', shortName: 'Seahawks',     city: 'Seattle',       color: '#002244' },
  { abbrev: 'TB',  shortName: 'Buccaneers',   city: 'Tampa Bay',     color: '#D50A0A' },
  { abbrev: 'TEN', shortName: 'Titans',       city: 'Tennessee',     color: '#0C2340' },
  { abbrev: 'WAS', shortName: 'Commanders',   city: 'Washington',    color: '#5A1414' },
];

// ─── NHL ──────────────────────────────────────────────────────────────────────
const NHL: SportTeam[] = [
  { abbrev: 'ANA', shortName: 'Ducks',         city: 'Anaheim',       color: '#FC4C02' },
  { abbrev: 'ARI', shortName: 'Coyotes',       city: 'Arizona',       color: '#8C2633' },
  { abbrev: 'BOS', shortName: 'Bruins',        city: 'Boston',        color: '#FCB514' },
  { abbrev: 'BUF', shortName: 'Sabres',        city: 'Buffalo',       color: '#003087' },
  { abbrev: 'CGY', shortName: 'Flames',        city: 'Calgary',       color: '#D2001C' },
  { abbrev: 'CAR', shortName: 'Hurricanes',    city: 'Carolina',      color: '#CC0000' },
  { abbrev: 'CHI', shortName: 'Blackhawks',    city: 'Chicago',       color: '#CF0A2C' },
  { abbrev: 'COL', shortName: 'Avalanche',     city: 'Colorado',      color: '#6F263D' },
  { abbrev: 'CBJ', shortName: 'Blue Jackets',  city: 'Columbus',      color: '#002654' },
  { abbrev: 'DAL', shortName: 'Stars',         city: 'Dallas',        color: '#006847' },
  { abbrev: 'DET', shortName: 'Red Wings',     city: 'Detroit',       color: '#CE1126' },
  { abbrev: 'EDM', shortName: 'Oilers',        city: 'Edmonton',      color: '#FC4C02' },
  { abbrev: 'FLA', shortName: 'Panthers',      city: 'Florida',       color: '#041E42' },
  { abbrev: 'LAK', shortName: 'Kings',         city: 'Los Angeles',   color: '#111111' },
  { abbrev: 'MIN', shortName: 'Wild',          city: 'Minnesota',     color: '#154734' },
  { abbrev: 'MTL', shortName: 'Canadiens',     city: 'Montreal',      color: '#AF1E2D' },
  { abbrev: 'NSH', shortName: 'Predators',     city: 'Nashville',     color: '#FFB81C' },
  { abbrev: 'NJD', shortName: 'Devils',        city: 'New Jersey',    color: '#CE1126' },
  { abbrev: 'NYI', shortName: 'Islanders',     city: 'New York',      color: '#003087' },
  { abbrev: 'NYR', shortName: 'Rangers',       city: 'New York',      color: '#0038A8' },
  { abbrev: 'OTT', shortName: 'Senators',      city: 'Ottawa',        color: '#CF0A2C' },
  { abbrev: 'PHI', shortName: 'Flyers',        city: 'Philadelphia',  color: '#F74902' },
  { abbrev: 'PIT', shortName: 'Penguins',      city: 'Pittsburgh',    color: '#FCB514' },
  { abbrev: 'SEA', shortName: 'Kraken',        city: 'Seattle',       color: '#001628' },
  { abbrev: 'SJS', shortName: 'Sharks',        city: 'San Jose',      color: '#006D75' },
  { abbrev: 'STL', shortName: 'Blues',         city: 'St. Louis',     color: '#002F87' },
  { abbrev: 'TBL', shortName: 'Lightning',     city: 'Tampa Bay',     color: '#002868' },
  { abbrev: 'TOR', shortName: 'Maple Leafs',   city: 'Toronto',       color: '#003E7E' },
  { abbrev: 'UTA', shortName: 'Utah HC',       city: 'Utah',          color: '#6CACE4' },
  { abbrev: 'VAN', shortName: 'Canucks',       city: 'Vancouver',     color: '#00205B' },
  { abbrev: 'VGK', shortName: 'Golden Knights',city: 'Vegas',         color: '#B4975A' },
  { abbrev: 'WSH', shortName: 'Capitals',      city: 'Washington',    color: '#CF0A2C' },
  { abbrev: 'WPG', shortName: 'Jets',          city: 'Winnipeg',      color: '#041E42' },
];

// ─── MLB ──────────────────────────────────────────────────────────────────────
const MLB: SportTeam[] = [
  { abbrev: 'ARI', shortName: 'D-backs',       city: 'Arizona',       color: '#A71930' },
  { abbrev: 'ATL', shortName: 'Braves',         city: 'Atlanta',       color: '#CE1141' },
  { abbrev: 'BAL', shortName: 'Orioles',        city: 'Baltimore',     color: '#DF4601' },
  { abbrev: 'BOS', shortName: 'Red Sox',        city: 'Boston',        color: '#BD3039' },
  { abbrev: 'CHC', shortName: 'Cubs',           city: 'Chicago',       color: '#0E3386' },
  { abbrev: 'CWS', shortName: 'White Sox',      city: 'Chicago',       color: '#27251F' },
  { abbrev: 'CIN', shortName: 'Reds',           city: 'Cincinnati',    color: '#C6011F' },
  { abbrev: 'CLE', shortName: 'Guardians',      city: 'Cleveland',     color: '#00385D' },
  { abbrev: 'COL', shortName: 'Rockies',        city: 'Colorado',      color: '#333366' },
  { abbrev: 'DET', shortName: 'Tigers',         city: 'Detroit',       color: '#0C2340' },
  { abbrev: 'HOU', shortName: 'Astros',         city: 'Houston',       color: '#002D62' },
  { abbrev: 'KC',  shortName: 'Royals',         city: 'Kansas City',   color: '#004687' },
  { abbrev: 'LAA', shortName: 'Angels',         city: 'Los Angeles',   color: '#BA0021' },
  { abbrev: 'LAD', shortName: 'Dodgers',        city: 'Los Angeles',   color: '#005A9C' },
  { abbrev: 'MIA', shortName: 'Marlins',        city: 'Miami',         color: '#00A3E0' },
  { abbrev: 'MIL', shortName: 'Brewers',        city: 'Milwaukee',     color: '#12284B' },
  { abbrev: 'MIN', shortName: 'Twins',          city: 'Minnesota',     color: '#002B5C' },
  { abbrev: 'NYM', shortName: 'Mets',           city: 'New York',      color: '#002D72' },
  { abbrev: 'NYY', shortName: 'Yankees',        city: 'New York',      color: '#003087' },
  { abbrev: 'OAK', shortName: 'Athletics',      city: 'Oakland',       color: '#003831' },
  { abbrev: 'PHI', shortName: 'Phillies',       city: 'Philadelphia',  color: '#E81828' },
  { abbrev: 'PIT', shortName: 'Pirates',        city: 'Pittsburgh',    color: '#27251F' },
  { abbrev: 'SD',  shortName: 'Padres',         city: 'San Diego',     color: '#2F241D' },
  { abbrev: 'SF',  shortName: 'Giants',         city: 'San Francisco', color: '#FD5A1E' },
  { abbrev: 'SEA', shortName: 'Mariners',       city: 'Seattle',       color: '#0C2C56' },
  { abbrev: 'STL', shortName: 'Cardinals',      city: 'St. Louis',     color: '#C41E3A' },
  { abbrev: 'TB',  shortName: 'Rays',           city: 'Tampa Bay',     color: '#092C5C' },
  { abbrev: 'TEX', shortName: 'Rangers',        city: 'Texas',         color: '#003278' },
  { abbrev: 'TOR', shortName: 'Blue Jays',      city: 'Toronto',       color: '#134A8E' },
  { abbrev: 'WSH', shortName: 'Nationals',      city: 'Washington',    color: '#AB0003' },
];

// ─── Soccer (EPL + common European) ──────────────────────────────────────────
const SOCCER: SportTeam[] = [
  { abbrev: 'ARS', shortName: 'Arsenal',            color: '#EF0107' },
  { abbrev: 'AVL', shortName: 'Aston Villa',         color: '#670E36' },
  { abbrev: 'BHA', shortName: 'Brighton',            color: '#0057B8' },
  { abbrev: 'BRN', shortName: 'Burnley',             color: '#6C1D45' },
  { abbrev: 'CHE', shortName: 'Chelsea',             color: '#034694' },
  { abbrev: 'CPL', shortName: 'Crystal Palace',      color: '#1B458F' },
  { abbrev: 'EVE', shortName: 'Everton',             color: '#003399' },
  { abbrev: 'FUL', shortName: 'Fulham',              color: '#000000' },
  { abbrev: 'LIV', shortName: 'Liverpool',           color: '#C8102E' },
  { abbrev: 'LUT', shortName: 'Luton',               color: '#F78F1E' },
  { abbrev: 'MCI', shortName: 'Man City',            color: '#6CABDD' },
  { abbrev: 'MUN', shortName: 'Man United',          color: '#DA291C' },
  { abbrev: 'NEW', shortName: 'Newcastle',           color: '#241F20' },
  { abbrev: 'NFO', shortName: "Nottm Forest",        color: '#DD0000' },
  { abbrev: 'SHU', shortName: 'Sheffield Utd',       color: '#EE2737' },
  { abbrev: 'TOT', shortName: 'Tottenham',           color: '#132257' },
  { abbrev: 'WHU', shortName: 'West Ham',            color: '#7A263A' },
  { abbrev: 'WOL', shortName: 'Wolves',              color: '#FDB913' },
  { abbrev: 'BAR', shortName: 'Barcelona',           color: '#A50044' },
  { abbrev: 'RMA', shortName: 'Real Madrid',         color: '#00529F' },
  { abbrev: 'ATM', shortName: 'Atletico Madrid',     color: '#CB3524' },
  { abbrev: 'PSG', shortName: 'PSG',                 color: '#004170' },
  { abbrev: 'BAY', shortName: 'Bayern',              color: '#DC052D' },
  { abbrev: 'DOR', shortName: 'Dortmund',            color: '#FDE100' },
  { abbrev: 'JUV', shortName: 'Juventus',            color: '#000000' },
  { abbrev: 'MIL', shortName: 'AC Milan',            color: '#FB090B' },
  { abbrev: 'INT', shortName: 'Inter Milan',         color: '#010E80' },
];

// ─── Build lookup maps ────────────────────────────────────────────────────────

const ALL_TEAMS: SportTeam[] = [...NBA, ...NFL, ...NHL, ...MLB, ...SOCCER];

/** Keyed by lower-cased short name */
const byShortName = new Map<string, SportTeam>();
/** Keyed by upper-cased abbreviation — first match wins (NBA before NFL etc.) */
const byAbbrev = new Map<string, SportTeam>();
/** Keyed by lower-cased city */
const byCity = new Map<string, SportTeam>();

for (const team of ALL_TEAMS) {
  const sn = team.shortName.toLowerCase();
  if (!byShortName.has(sn)) byShortName.set(sn, team);

  const ab = team.abbrev.toUpperCase();
  if (!byAbbrev.has(ab)) byAbbrev.set(ab, team);

  if (team.city) {
    const ci = team.city.toLowerCase();
    if (!byCity.has(ci)) byCity.set(ci, team);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Find team metadata by any string that might identify a team:
 *   "Magic"     → ORL / #0077C0
 *   "76ers"     → PHI / #006BB6
 *   "ORL"       → ORL / #0077C0
 *   "ORL +1.5"  → ORL / #0077C0   (first word extracted)
 *
 * Lookup order: shortName → abbreviation → city partial match
 */
export function findTeam(query: string): SportTeam | undefined {
  if (!query) return undefined;
  const q = query.trim();

  // 1. Exact short name
  const byName = byShortName.get(q.toLowerCase());
  if (byName) return byName;

  // 2. Extract first word — handles "ORL +1.5" or "ORL" from spread outcomes
  const firstWord = q.split(/\s+/)[0].toUpperCase();
  if (/^[A-Z0-9]{2,5}$/.test(firstWord)) {
    const byAb = byAbbrev.get(firstWord);
    if (byAb) return byAb;
  }

  // 3. City partial match
  const lower = q.toLowerCase();
  for (const [city, team] of byCity) {
    if (lower.includes(city) || city.includes(lower)) return team;
  }

  // 4. Partial short name match
  for (const [sn, team] of byShortName) {
    if (lower.includes(sn)) return team;
  }

  return undefined;
}

/** Fallback colour when no team metadata is found */
export const FALLBACK_TEAM_COLOR = '#4B5563'; // gray-600
