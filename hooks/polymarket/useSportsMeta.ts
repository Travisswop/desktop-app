import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One entry from the Gamma GET /sports response.
 * The exact shape varies; we access known fields safely and forward the rest.
 */
export interface GammaSportEntry {
  id?: number | string;
  /** Gamma /sports often uses this compact league slug, e.g. "nba" */
  sport?: string;
  /** Human-readable name, e.g. "NBA Basketball" */
  name?: string;
  /** URL-friendly slug, e.g. "nba", "nfl" */
  slug?: string;
  /** Polymarket tag ID used to filter /events and /markets */
  tagId?: number;
  /** Alias field name sometimes used in the response */
  tag_id?: number;
  /** Comma-separated Polymarket tag IDs, e.g. "1,745,100639" */
  tags?: string;
  /** Icon / logo URL */
  icon?: string;
  logo?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

const SPORT_PARENT_TAG_ID = 1;
const GAMES_PARENT_TAG_ID = 100639;

const PREFERRED_TAG_BY_SPORT: Record<string, number> = {
  nba: 745,
  wnba: 100254,
  nfl: 450,
  cfb: 100351,
  ncaab: 100149,
  mlb: 100381,
  nhl: 899,
  tennis: 864,
  f1: 435,
  cricket: 517,
  ipl: 517,
  esports: 64,
  mlbb: 64,
  sc: 64,
};

const SPORT_TAG_OVERRIDES: Record<string, number> = {
  ufc: 279,
  mma: 279,
};

function parseTags(raw: unknown): number[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((tagId) => Number.isFinite(tagId));
}

function resolveSportTagId(entry: GammaSportEntry): number | undefined {
  const explicit = entry.tagId ?? entry.tag_id;
  if (explicit != null) return Number(explicit);

  const tags = parseTags(entry.tags);
  const slug = String(entry.slug ?? entry.sport ?? entry.name ?? '')
    .trim()
    .toLowerCase();
  const override = SPORT_TAG_OVERRIDES[slug];
  if (override != null) return override;

  const preferred = PREFERRED_TAG_BY_SPORT[slug];
  if (preferred != null && tags.includes(preferred)) return preferred;

  return tags.find(
    (tagId) =>
      tagId !== SPORT_PARENT_TAG_ID && tagId !== GAMES_PARENT_TAG_ID,
  );
}

export interface SportsMeta {
  /** Raw list exactly as returned by the Gamma API */
  sports: GammaSportEntry[];
  /**
   * Resolved tag ID lookup keyed by lower-cased slug OR lower-cased name.
   * e.g.  "nba" → 745,  "nfl" → 450
   */
  tagIdBySlug: Map<string, number>;
  /**
   * Icon URL lookup keyed by lower-cased slug.
   * e.g.  "nba" → "https://..."
   */
  iconBySlug: Map<string, string>;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchSportsMeta(): Promise<SportsMeta> {
  const res = await fetch('/api/polymarket/sports');
  if (!res.ok) throw new Error(`Sports metadata fetch failed: ${res.status}`);

  const raw = await res.json();
  // Gamma may return a plain array or wrap it
  const sports: GammaSportEntry[] = Array.isArray(raw)
    ? raw
    : (raw?.results ?? raw?.sports ?? raw?.data ?? []);

  const tagIdBySlug = new Map<string, number>();
  const iconBySlug = new Map<string, string>();
  tagIdBySlug.set('sports', SPORT_PARENT_TAG_ID);
  tagIdBySlug.set('games', GAMES_PARENT_TAG_ID);

  for (const entry of sports) {
    // Some responses use tag_id (snake_case), some use tagId (camelCase)
    const tagId = resolveSportTagId(entry);
    const icon = entry.icon ?? entry.logo ?? entry.imageUrl;
    const slugRaw = entry.slug ?? entry.sport;

    if (slugRaw) {
      const slug = String(slugRaw).toLowerCase();
      if (tagId != null) tagIdBySlug.set(slug, Number(tagId));
      if (icon) iconBySlug.set(slug, icon as string);
    }

    // Also key by name for broader matching ("NBA Basketball" → "nba basketball")
    if (entry.name) {
      const nameLower = entry.name.toLowerCase();
      if (tagId != null && !tagIdBySlug.has(nameLower))
        tagIdBySlug.set(nameLower, Number(tagId));
    }
  }

  return { sports, tagIdBySlug, iconBySlug };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and caches the Gamma /sports metadata (tag IDs, icons per league).
 *
 * Usage:
 *   const { data: sportsMeta } = useSportsMeta();
 *   const nbaTagId = sportsMeta?.tagIdBySlug.get('nba');
 */
export function useSportsMeta() {
  return useQuery({
    queryKey: ['polymarket-sports-meta'],
    queryFn: fetchSportsMeta,
    // Sports metadata is very stable — 1 hour stale time, keep in GC for a day
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
}
