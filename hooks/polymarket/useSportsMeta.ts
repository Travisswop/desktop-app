import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One entry from the Gamma GET /sports response.
 * The exact shape varies; we access known fields safely and forward the rest.
 */
export interface GammaSportEntry {
  id?: number | string;
  /** Human-readable name, e.g. "NBA Basketball" */
  name?: string;
  /** URL-friendly slug, e.g. "nba", "nfl" */
  slug?: string;
  /** Polymarket tag ID used to filter /events and /markets */
  tagId?: number;
  /** Alias field name sometimes used in the response */
  tag_id?: number;
  /** Icon / logo URL */
  icon?: string;
  logo?: string;
  imageUrl?: string;
  [key: string]: unknown;
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

  for (const entry of sports) {
    // Some responses use tag_id (snake_case), some use tagId (camelCase)
    const tagId = entry.tagId ?? (entry.tag_id as number | undefined);
    const icon = entry.icon ?? entry.logo ?? entry.imageUrl;

    if (entry.slug) {
      const slug = entry.slug.toLowerCase();
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
