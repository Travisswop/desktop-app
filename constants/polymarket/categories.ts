export type CategoryId =
  | 'trending'
  | 'politics'
  | 'finance'
  | 'business'
  | 'crypto'
  | 'sports'
  | 'tech'
  | 'ai'
  | 'geopolitics'
  | 'world'
  | 'middle-east'
  | 'economy'
  | 'elections'
  | 'culture'
  | 'weather'
  | 'science';

export interface Category {
  id: CategoryId;
  label: string;
  tagId: number | null;
}

export const CATEGORIES: Category[] = [
  {
    id: 'trending',
    label: 'Trending',
    tagId: null,
  },
  {
    id: 'sports',
    label: 'Sports',
    tagId: 1,
  },
  {
    id: 'politics',
    label: 'Politics',
    tagId: 2,
  },
  {
    id: 'elections',
    label: 'Elections',
    tagId: 144,
  },
  {
    id: 'world',
    label: 'World',
    tagId: 101970,
  },
  {
    id: 'middle-east',
    label: 'Middle East',
    tagId: 154,
  },
  {
    id: 'geopolitics',
    label: 'Geopolitics',
    tagId: 100265,
  },
  {
    id: 'economy',
    label: 'Economy',
    tagId: 100328,
  },
  {
    id: 'finance',
    label: 'Finance',
    tagId: 120,
  },
  {
    id: 'business',
    label: 'Business',
    tagId: 107,
  },
  {
    id: 'crypto',
    label: 'Crypto',
    tagId: 21,
  },
  {
    id: 'ai',
    label: 'AI',
    tagId: 439,
  },
  {
    id: 'tech',
    label: 'Tech',
    tagId: 1401,
  },
  {
    id: 'culture',
    label: 'Culture',
    tagId: 596,
  },
  {
    id: 'weather',
    label: 'Weather',
    tagId: 84,
  },
  {
    id: 'science',
    label: 'Science',
    tagId: 74,
  },
];

export const DEFAULT_CATEGORY: CategoryId = 'trending';

export function getCategoryById(
  id: CategoryId,
): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// ─── Sports Subcategories ────────────────────────────────────────────────────

export type SportSubcategoryId =
  | 'all'
  | 'nfl'
  | 'nba'
  | 'nbasl'
  | 'wnba'
  | 'mlb'
  | 'nhl'
  | 'soccer'
  | 'tennis'
  | 'cricket'
  | 'esports'
  | 'mma'
  | 'f1'
  | 'cfb'
  | 'cfl'
  | 'ncaa'
  | 'ncaab'
  | 'boxing'
  | 'powerslap'
  | 'golf'
  | 'table-tennis'
  | 'volleyball'
  | 'rugby'
  | 'lacrosse'
  | 'pickleball'
  | 'cycling'
  | 'chess'
  | 'ncaaw'
  | 'basketball-intl'
  | 'hockey-intl'
  | 'baseball-intl';

export interface SportLeague {
  id: string;
  label: string;
  tagId: number;
}

export interface SportSubcategory {
  id: SportSubcategoryId;
  label: string;
  /** Polymarket Gamma API tag ID — null means "all sports" (tag 1) */
  tagId: number | null;
  emoji: string;
  /**
   * Umbrella sport this belongs to for the top-level tab row, e.g. NBA/WNBA/
   * Summer League/NCAAB/NCAAW all share group 'basketball'. 'all' has no
   * group — it's rendered as its own pseudo-tab. Mirrors the `group` field
   * on polymarket-backend's sportsTaxonomy.js (kept in sync manually since
   * this is a static copy, not a live fetch from that taxonomy).
   */
  group?: string;
  /**
   * Competitions under this sport, shown as a second chip row when set.
   * Not exhaustive — Polymarket lists far more than these (e.g. ~300 soccer
   * competitions); this covers the highest-profile ones per sport, verified
   * against Gamma directly (label + live active-events check).
   */
  leagues?: SportLeague[];
}

/**
 * Tag IDs verified from https://gamma-api.polymarket.com/sports
 * Sports parent tag 1 is the broad Polymarket sports tag. Many leagues also
 * carry the Games tag 100639, but using 1 surfaces more available events.
 */
export const SPORT_SUBCATEGORIES: SportSubcategory[] = [
  { id: 'all', label: 'All Sports', tagId: null, emoji: '🏆' },
  { id: 'nfl', label: 'NFL', tagId: 450, emoji: '🏈', group: 'football' },
  { id: 'nba', label: 'NBA', tagId: 745, emoji: '🏀', group: 'basketball' },
  { id: 'nbasl', label: 'Summer League', tagId: 105577, emoji: '🏀', group: 'basketball' },
  { id: 'wnba', label: 'WNBA', tagId: 100254, emoji: '🏀', group: 'basketball' },
  { id: 'cfb', label: 'CFB', tagId: 100351, emoji: '🏈', group: 'football' },
  { id: 'cfl', label: 'CFL', tagId: 105200, emoji: '🏈', group: 'football' },
  { id: 'ncaab', label: 'NCAAB', tagId: 101178, emoji: '🏐', group: 'basketball' },
  {
    id: 'soccer',
    label: 'Soccer',
    tagId: 100350,
    emoji: '⚽',
    group: 'soccer',
    // Verified against Gamma directly, 2026-07-25. EPL needs both tags —
    // 306 ("EPL") and 82 ("Premier League") are both live and Gamma's
    // related_tags doesn't bridge them (confirmed empirically); the
    // /taxonomy backend endpoint's LEAGUE_TAG_EXPANSIONS merges them when
    // this tagId is requested.
    leagues: [
      { id: 'epl', label: 'EPL', tagId: 306 },
      { id: 'laliga', label: 'La Liga', tagId: 780 },
      { id: 'bundesliga', label: 'Bundesliga', tagId: 1494 },
      { id: 'ligue1', label: 'Ligue 1', tagId: 102070 },
      { id: 'seriea', label: 'Serie A', tagId: 101962 },
      { id: 'ucl', label: 'Champions League', tagId: 100977 },
      { id: 'uel', label: 'Europa League', tagId: 101787 },
      { id: 'mls', label: 'MLS', tagId: 100100 },
      { id: 'ligamx', label: 'Liga MX', tagId: 102448 },
      { id: 'brasileirao', label: 'Brazil Série A', tagId: 102648 },
    ],
  },
  { id: 'mlb', label: 'MLB', tagId: 100381, emoji: '⚾', group: 'baseball' },
  { id: 'nhl', label: 'NHL', tagId: 899, emoji: '🏒', group: 'hockey' },
  {
    id: 'tennis',
    label: 'Tennis',
    tagId: 864,
    emoji: '🎾',
    group: 'tennis',
    leagues: [
      { id: 'atp', label: 'ATP', tagId: 101232 },
      { id: 'wta', label: 'WTA', tagId: 102123 },
    ],
  },
  { id: 'mma', label: 'MMA / UFC', tagId: 279, emoji: '🥊', group: 'combat' },
  { id: 'f1', label: 'F1', tagId: 435, emoji: '🏎️', group: 'motorsports' },
  { id: 'cricket', label: 'Cricket', tagId: 517, emoji: '🏏', group: 'cricket' },
  {
    id: 'esports',
    label: 'Esports',
    tagId: 64,
    emoji: '🎮',
    group: 'esports',
    leagues: [
      { id: 'lol', label: 'League of Legends', tagId: 65 },
      { id: 'cs2', label: 'Counter-Strike 2', tagId: 100780 },
      { id: 'val', label: 'Valorant', tagId: 101672 },
      { id: 'dota2', label: 'Dota 2', tagId: 102366 },
      { id: 'mlbb', label: 'Mobile Legends: Bang Bang', tagId: 102750 },
      { id: 'ow', label: 'Overwatch', tagId: 102753 },
      { id: 'r6siege', label: 'Rainbow Six Siege', tagId: 102755 },
      { id: 'rl', label: 'Rocket League', tagId: 102756 },
      { id: 'hok', label: 'Honor of Kings', tagId: 102757 },
      { id: 'sc1', label: 'StarCraft', tagId: 103065 },
      { id: 'codmw', label: 'Call of Duty', tagId: 100230 },
    ],
  },
  // Added after live review of polymarket.com/sports (2026-07-25) — verified
  // against Gamma directly (label + live active-events check).
  { id: 'boxing', label: 'Boxing', tagId: 683, emoji: '🥊', group: 'combat' },
  { id: 'powerslap', label: 'Power Slap', tagId: 104084, emoji: '🖐️', group: 'combat' },
  {
    id: 'golf',
    label: 'Golf',
    tagId: 100219,
    emoji: '⛳',
    group: 'golf',
    leagues: [{ id: 'pga', label: 'PGA Tour', tagId: 102112 }],
  },
  {
    id: 'table-tennis',
    label: 'Table Tennis',
    tagId: 103767,
    emoji: '🏓',
    group: 'table-tennis',
    leagues: [
      { id: 'wttmen', label: "WTT Men's Singles", tagId: 103773 },
      { id: 'wttwom', label: "WTT Women's Singles", tagId: 103774 },
      { id: 'ttelite', label: 'TT Elite Series', tagId: 105708 },
      { id: 'ttcup', label: 'TT Cup', tagId: 105710 },
      { id: 'ttchallenger', label: 'Challenger Series', tagId: 105711 },
      { id: 'ttworldcup', label: 'ITTF World Cup', tagId: 105328 },
      { id: 'ttworlds', label: 'ITTF World Championships', tagId: 105329 },
      { id: 'ttolympics', label: 'Olympic Table Tennis', tagId: 105330 },
      { id: 'ttcl', label: 'Table Tennis Champions League', tagId: 105331 },
      { id: 'tteuropecup', label: 'Table Tennis Europe Cup', tagId: 105332 },
      { id: 'ttbl', label: 'TTBL (German Bundesliga)', tagId: 105333 },
      { id: 'czechligapro', label: 'Czech Liga Pro', tagId: 105709 },
      { id: 'setkameua', label: 'Setka Cup Ukraine Men', tagId: 105716 },
      { id: 'setkamemd', label: 'Setka Cup Moldova Men', tagId: 105717 },
      { id: 'setkamecz', label: 'Setka Cup Czechia Men', tagId: 105718 },
      { id: 'setkawoua', label: 'Setka Cup Ukraine Women', tagId: 105719 },
    ],
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    tagId: 102883,
    emoji: '🏐',
    group: 'volleyball',
    leagues: [
      { id: 'vbvnl', label: 'FIVB Nations League', tagId: 105342 },
      { id: 'vbworlds', label: 'FIVB World Championship', tagId: 105344 },
      { id: 'vbeuro', label: 'Volleyball European Championship', tagId: 105345 },
      { id: 'vbcl', label: 'CEV Champions League', tagId: 105343 },
      { id: 'vbplusliga', label: 'PlusLiga', tagId: 105335 },
      { id: 'vbsuperlega', label: 'SuperLega', tagId: 105334 },
      { id: 'vbsuperliga', label: 'Superliga', tagId: 105337 },
      { id: 'vbbundesliga', label: 'Volleyball Bundesliga', tagId: 105339 },
      { id: 'vbliguea', label: 'Ligue A', tagId: 105338 },
      { id: 'vbefeler', label: 'Efeler Ligi', tagId: 105336 },
      { id: 'vbsvleague', label: 'SV.League', tagId: 105340 },
      { id: 'vbvleague', label: 'V-League', tagId: 105341 },
    ],
  },
  // Added after a full 351-entry verification pass against Gamma's /sports
  // catalog (2026-07-25) — sports Swop had no tab for at all.
  {
    id: 'rugby',
    label: 'Rugby',
    tagId: 102193,
    emoji: '🏉',
    group: 'rugby',
    leagues: [
      { id: 'top14', label: 'Top 14', tagId: 103055 },
      { id: 'premiership', label: 'Premiership', tagId: 103054 },
      { id: 'sixnations', label: 'Six Nations', tagId: 103111 },
      { id: 'championscup', label: 'Champions Cup', tagId: 103113 },
      { id: 'urc', label: 'United Rugby Championship', tagId: 103112 },
      { id: 'superrugbypacific', label: 'Super Rugby Pacific', tagId: 103114 },
      { id: 'rugbychampionship', label: 'The Rugby Championship', tagId: 103115 },
    ],
  },
  {
    id: 'lacrosse',
    label: 'Lacrosse',
    tagId: 102393,
    emoji: '🥍',
    group: 'lacrosse',
    leagues: [
      { id: 'pll', label: 'Premier Lacrosse League', tagId: 102391 },
      { id: 'wll', label: 'WLL', tagId: 103911 },
    ],
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    tagId: 102471,
    emoji: '🏓',
    group: 'pickleball',
    leagues: [{ id: 'mlp', label: 'MLP', tagId: 105057 }],
  },
  { id: 'cycling', label: 'Cycling', tagId: 102142, emoji: '🚴', group: 'cycling' },
  { id: 'chess', label: 'Chess', tagId: 256, emoji: '♟️', group: 'chess' },
  { id: 'ncaaw', label: 'NCAAW', tagId: 102003, emoji: '🏀', group: 'basketball' },
  // International/domestic-league buckets added 2026-07-25, verified against
  // Gamma directly (label + live-events check). Each is a new member of an
  // existing sport group, with a leagues drill-down for the competition.
  {
    id: 'basketball-intl',
    label: 'International',
    tagId: 28,
    emoji: '🏀',
    group: 'basketball',
    leagues: [
      { id: 'euroleague', label: 'Euroleague Basketball', tagId: 102669 },
      { id: 'bkcl', label: 'Basketball Champions League', tagId: 103093 },
      { id: 'bkeurocup', label: 'EuroCup', tagId: 105266 },
      { id: 'bkligend', label: 'Liga Endesa', tagId: 103094 },
      { id: 'bkseriea', label: 'Basketball Series A', tagId: 103095 },
      { id: 'bknbl', label: 'NBL', tagId: 103096 },
      { id: 'bkcba', label: 'CBA', tagId: 103097 },
      { id: 'bkfr1', label: 'Pro A', tagId: 103098 },
      { id: 'bkarg', label: 'LNB', tagId: 103099 },
      { id: 'bkkbl', label: 'KBL', tagId: 103100 },
      { id: 'bkvtb', label: 'VTB United League', tagId: 104344 },
      { id: 'bkbbl', label: 'Germany BBL', tagId: 104345 },
      { id: 'bkaba', label: 'ABA League', tagId: 104346 },
      { id: 'bkbsl', label: 'Turkey BSL', tagId: 104347 },
      { id: 'bkgr1', label: 'Greek Basketball League', tagId: 104348 },
      { id: 'bkjpn', label: 'Japan B League', tagId: 104349 },
      { id: 'bkfibaqaf', label: 'FIBA WCQ Africa', tagId: 104350 },
      { id: 'bkfibaqam', label: 'FIBA WCQ Americas', tagId: 104351 },
      { id: 'bkfibaqas', label: 'FIBA WCQ Asia', tagId: 104352 },
      { id: 'bkfibaqeu', label: 'FIBA WCQ Europe', tagId: 104353 },
      { id: 'bklkl', label: 'LKL', tagId: 105267 },
      { id: 'bkisrsl', label: 'Super League (Israel)', tagId: 105268 },
      { id: 'bkplk', label: 'PLK', tagId: 105269 },
      { id: 'bkkls', label: 'KLS', tagId: 105270 },
      { id: 'bknbb', label: 'NBB', tagId: 105271 },
      { id: 'bkbsn', label: 'BSN', tagId: 105272 },
      { id: 'bkvensl', label: 'SuperLiga (Venezuela)', tagId: 105273 },
      { id: 'bkibl', label: 'IBL', tagId: 105274 },
      { id: 'bkcebl', label: 'CEBL', tagId: 105275 },
      { id: 'bkligarg', label: 'Liga Argentina', tagId: 105276 },
    ],
  },
  {
    id: 'hockey-intl',
    label: 'International',
    tagId: 100088,
    emoji: '🏒',
    group: 'hockey',
    leagues: [
      { id: 'ahl', label: 'AHL', tagId: 102907 },
      { id: 'shl', label: 'SHL', tagId: 102906 },
      { id: 'khl', label: 'KHL', tagId: 102908 },
      { id: 'dehl', label: 'DEHL', tagId: 102909 },
      { id: 'cehl', label: 'CEHL', tagId: 102910 },
      { id: 'wch', label: 'IIHF', tagId: 102151 },
      { id: 'mwoh', label: "Men's Winter Olympics Hockey", tagId: 103666 },
      { id: 'wwoh', label: "Women's Winter Olympics Hockey", tagId: 103667 },
    ],
  },
  {
    id: 'baseball-intl',
    label: 'International',
    tagId: 678,
    emoji: '⚾',
    group: 'baseball',
    leagues: [
      { id: 'npb', label: 'NPB', tagId: 105452 },
      { id: 'cpbl', label: 'CPBL', tagId: 105454 },
      { id: 'kbo', label: 'KBO', tagId: 102668 },
      { id: 'cuba', label: 'Serie Nacional', tagId: 105453 },
      { id: 'lidom', label: 'LIDOM', tagId: 105455 },
      { id: 'lvbp', label: 'LVBP', tagId: 105456 },
      { id: 'wbc', label: 'World Baseball Classic', tagId: 103894 },
    ],
  },
];

export const DEFAULT_SPORT_SUBCATEGORY: SportSubcategoryId = 'all';

export function getSportSubcategoryById(
  id: SportSubcategoryId,
): SportSubcategory | undefined {
  return SPORT_SUBCATEGORIES.find((s) => s.id === id);
}

/** Display metadata for umbrella groups with more than one member sport. */
const SPORT_GROUP_META: Record<string, { label: string; emoji: string }> = {
  basketball: { label: 'Basketball', emoji: '🏀' },
  football: { label: 'Football', emoji: '🏈' },
  combat: { label: 'Combat', emoji: '🥊' },
};

export interface SportGroup {
  /** Group key (e.g. 'basketball'), or the member's own id for single-member groups. */
  id: string;
  label: string;
  emoji: string;
  members: SportSubcategory[];
}

/**
 * Groups SPORT_SUBCATEGORIES (minus 'all') by their `group` field for the
 * top-level tab row — e.g. NBA/WNBA/Summer League/NCAAB/NCAAW collapse into
 * one "Basketball" tab that reveals its members on selection. Sports with no
 * sibling (Soccer, Tennis, Cricket, Golf, ...) come back as single-member
 * groups so callers can skip the drill-down UI for them.
 */
export function getSportGroups(): SportGroup[] {
  const byGroup = new Map<string, SportSubcategory[]>();
  for (const sub of SPORT_SUBCATEGORIES) {
    if (sub.id === 'all') continue;
    const key = sub.group ?? sub.id;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(sub);
  }
  return Array.from(byGroup.entries()).map(([id, members]) => ({
    id,
    label: SPORT_GROUP_META[id]?.label ?? members[0].label,
    emoji: SPORT_GROUP_META[id]?.emoji ?? members[0].emoji,
    members,
  }));
}

/** The sport-group id (e.g. 'basketball') that a given sport sub-tab belongs to. */
export function getGroupIdForSport(id: SportSubcategoryId): string | undefined {
  return getSportSubcategoryById(id)?.group ?? (id === 'all' ? undefined : id);
}
