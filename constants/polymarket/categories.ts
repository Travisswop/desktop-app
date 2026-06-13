export type CategoryId =
  | 'trending'
  | 'politics'
  | 'finance'
  | 'crypto'
  | 'sports'
  | 'tech'
  | 'geopolitics'
  | 'economy'
  | 'elections'
  | 'memes';

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
    tagId: 100639,
  },
  {
    id: 'politics',
    label: 'Politics',
    tagId: 2,
  },
  {
    id: 'elections',
    label: 'Elections',
    tagId: 339,
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
    id: 'crypto',
    label: 'Crypto',
    tagId: 21,
  },
  {
    id: 'tech',
    label: 'Tech',
    tagId: 1401,
  },
  {
    id: 'memes',
    label: 'Memes',
    tagId: 596,
  },
  {
    id: 'geopolitics',
    label: 'Geopolitics',
    tagId: 100265,
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
  | 'mlb'
  | 'nhl'
  | 'soccer'
  | 'tennis'
  | 'cricket'
  | 'esports'
  | 'mma'
  | 'ncaa'
  | 'ncaab'
  | 'wnba';

export interface SportSubcategory {
  id: SportSubcategoryId;
  label: string;
  /** Polymarket Gamma API tag ID — null means "all sports" (tag 100639) */
  tagId: number | null;
  emoji: string;
}

/**
 * Tag IDs verified from https://gamma-api.polymarket.com/sports
 * Sports parent tag is always 100639 (used as fallback for "All").
 */
export const SPORT_SUBCATEGORIES: SportSubcategory[] = [
  { id: 'all', label: 'All Sports', tagId: null, emoji: '🏆' },
  { id: 'nfl', label: 'NFL', tagId: 450, emoji: '🏈' },
  { id: 'nba', label: 'NBA', tagId: 745, emoji: '🏀' },
  { id: 'ncaab', label: 'NCAAB', tagId: 101178, emoji: '🏐' },
  { id: 'soccer', label: 'Soccer', tagId: 100350, emoji: '⚽' },
  { id: 'mlb', label: 'MLB', tagId: 100381, emoji: '⚾' },
  { id: 'nhl', label: 'NHL', tagId: 899, emoji: '🏒' },
  { id: 'tennis', label: 'Tennis', tagId: 864, emoji: '🎾' },
  { id: 'mma', label: 'MMA / UFC', tagId: 100639, emoji: '🥊' },
  { id: 'cricket', label: 'Cricket', tagId: 517, emoji: '🏏' },
  { id: 'esports', label: 'Esports', tagId: 64, emoji: '🎮' },
];

export const DEFAULT_SPORT_SUBCATEGORY: SportSubcategoryId = 'all';

export function getSportSubcategoryById(
  id: SportSubcategoryId,
): SportSubcategory | undefined {
  return SPORT_SUBCATEGORIES.find((s) => s.id === id);
}
