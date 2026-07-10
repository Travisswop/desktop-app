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
  | 'ncaab';

export interface SportSubcategory {
  id: SportSubcategoryId;
  label: string;
  /** Polymarket Gamma API tag ID — null means "all sports" (tag 1) */
  tagId: number | null;
  emoji: string;
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
  { id: 'soccer', label: 'Soccer', tagId: 100350, emoji: '⚽' },
  { id: 'mlb', label: 'MLB', tagId: 100381, emoji: '⚾' },
  { id: 'nhl', label: 'NHL', tagId: 899, emoji: '🏒' },
  { id: 'tennis', label: 'Tennis', tagId: 864, emoji: '🎾' },
  { id: 'mma', label: 'MMA / UFC', tagId: 279, emoji: '🥊' },
  { id: 'f1', label: 'F1', tagId: 435, emoji: '🏎️' },
  { id: 'cricket', label: 'Cricket', tagId: 517, emoji: '🏏' },
  { id: 'esports', label: 'Esports', tagId: 64, emoji: '🎮' },
];

export const DEFAULT_SPORT_SUBCATEGORY: SportSubcategoryId = 'all';

export function getSportSubcategoryById(
  id: SportSubcategoryId,
): SportSubcategory | undefined {
  return SPORT_SUBCATEGORIES.find((s) => s.id === id);
}
