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
  | 'ncaaw';

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
  { id: 'esports', label: 'Esports', tagId: 64, emoji: '🎮', group: 'esports' },
  // Added after live review of polymarket.com/sports (2026-07-25) — verified
  // against Gamma directly (label + live active-events check).
  { id: 'boxing', label: 'Boxing', tagId: 683, emoji: '🥊', group: 'combat' },
  { id: 'powerslap', label: 'Power Slap', tagId: 104084, emoji: '🖐️', group: 'combat' },
  { id: 'golf', label: 'Golf', tagId: 100219, emoji: '⛳', group: 'golf' },
  { id: 'table-tennis', label: 'Table Tennis', tagId: 103767, emoji: '🏓', group: 'table-tennis' },
  { id: 'volleyball', label: 'Volleyball', tagId: 102883, emoji: '🏐', group: 'volleyball' },
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
  { id: 'pickleball', label: 'Pickleball', tagId: 102471, emoji: '🏓', group: 'pickleball' },
  { id: 'cycling', label: 'Cycling', tagId: 102142, emoji: '🚴', group: 'cycling' },
  { id: 'chess', label: 'Chess', tagId: 256, emoji: '♟️', group: 'chess' },
  { id: 'ncaaw', label: 'NCAAW', tagId: 102003, emoji: '🏀', group: 'basketball' },
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
