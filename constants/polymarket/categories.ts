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
  | 'volleyball';

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
  { id: 'nfl', label: 'NFL', tagId: 450, emoji: '🏈' },
  { id: 'nba', label: 'NBA', tagId: 745, emoji: '🏀' },
  { id: 'nbasl', label: 'Summer League', tagId: 105577, emoji: '🏀' },
  { id: 'wnba', label: 'WNBA', tagId: 100254, emoji: '🏀' },
  { id: 'cfb', label: 'CFB', tagId: 100351, emoji: '🏈' },
  { id: 'ncaab', label: 'NCAAB', tagId: 101178, emoji: '🏐' },
  {
    id: 'soccer',
    label: 'Soccer',
    tagId: 100350,
    emoji: '⚽',
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
  { id: 'mlb', label: 'MLB', tagId: 100381, emoji: '⚾' },
  { id: 'nhl', label: 'NHL', tagId: 899, emoji: '🏒' },
  {
    id: 'tennis',
    label: 'Tennis',
    tagId: 864,
    emoji: '🎾',
    leagues: [
      { id: 'atp', label: 'ATP', tagId: 101232 },
      { id: 'wta', label: 'WTA', tagId: 102123 },
    ],
  },
  { id: 'mma', label: 'MMA / UFC', tagId: 279, emoji: '🥊' },
  { id: 'f1', label: 'F1', tagId: 435, emoji: '🏎️' },
  { id: 'cricket', label: 'Cricket', tagId: 517, emoji: '🏏' },
  { id: 'esports', label: 'Esports', tagId: 64, emoji: '🎮' },
  // Added after live review of polymarket.com/sports (2026-07-25) — verified
  // against Gamma directly (label + live active-events check).
  { id: 'boxing', label: 'Boxing', tagId: 683, emoji: '🥊' },
  { id: 'powerslap', label: 'Power Slap', tagId: 104084, emoji: '🖐️' },
  { id: 'golf', label: 'Golf', tagId: 100219, emoji: '⛳' },
  { id: 'table-tennis', label: 'Table Tennis', tagId: 103767, emoji: '🏓' },
  { id: 'volleyball', label: 'Volleyball', tagId: 102883, emoji: '🏐' },
];

export const DEFAULT_SPORT_SUBCATEGORY: SportSubcategoryId = 'all';

export function getSportSubcategoryById(
  id: SportSubcategoryId,
): SportSubcategory | undefined {
  return SPORT_SUBCATEGORIES.find((s) => s.id === id);
}
