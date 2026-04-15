import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One entry from the Gamma GET /teams response.
 * Field names normalised: logoUrl is the resolved logo URL regardless of
 * which key the API used (logo, logoUrl, imageUrl, image).
 */
export interface PolymarketTeam {
  id?: number | string;
  /** Full team name, e.g. "Orlando Magic" */
  name?: string;
  /** 2–4 letter abbreviation, e.g. "ORL" */
  abbreviation?: string;
  /** Resolved logo URL (normalised from logo / logoUrl / imageUrl) */
  logoUrl?: string;
  /** Sport identifier, e.g. "NBA", "NFL" */
  sport?: string;
  [key: string]: unknown;
}

export interface TeamsMap {
  /** Raw list exactly as returned by the Gamma API */
  teams: PolymarketTeam[];
  /**
   * Lookup keyed by every plausible lower-cased identifier for the team:
   *   - full name          "orlando magic"
   *   - abbreviation       "orl"
   *   - nickname (last word) "magic"
   * First entry wins on conflicts (NBA before NFL etc.).
   */
  byKey: Map<string, PolymarketTeam>;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

function normaliseTeam(raw: Record<string, unknown>): PolymarketTeam {
  const logoUrl =
    (raw.logoUrl as string | undefined) ??
    (raw.logo as string | undefined) ??
    (raw.imageUrl as string | undefined) ??
    (raw.image as string | undefined);

  // Spread raw fields first so any unknown extras are preserved, then
  // override with normalised/typed fields (avoids duplicate key error).
  return {
    ...raw,
    id: raw.id as number | string | undefined,
    name: raw.name as string | undefined,
    abbreviation:
      (raw.abbreviation as string | undefined) ??
      (raw.abbrev as string | undefined),
    logoUrl,
    sport:
      (raw.sport as string | undefined) ??
      (raw.league as string | undefined),
  };
}

function buildByKey(teams: PolymarketTeam[]): Map<string, PolymarketTeam> {
  const map = new Map<string, PolymarketTeam>();

  const set = (key: string, team: PolymarketTeam) => {
    if (!map.has(key)) map.set(key, team);
  };

  for (const team of teams) {
    if (team.name) {
      set(team.name.toLowerCase(), team);

      const words = team.name.trim().split(/\s+/);
      // Nickname = last word(s) after the city, e.g. "Magic" from "Orlando Magic"
      if (words.length > 1) {
        set(words[words.length - 1].toLowerCase(), team);
        // Also last two words for two-word nicknames like "Trail Blazers"
        if (words.length > 2)
          set(words.slice(-2).join(' ').toLowerCase(), team);
      }
    }

    if (team.abbreviation) {
      set(team.abbreviation.toLowerCase(), team);
    }
  }

  return map;
}

async function fetchTeamsMeta(): Promise<TeamsMap> {
  const res = await fetch('/api/polymarket/teams');
  if (!res.ok) throw new Error(`Teams metadata fetch failed: ${res.status}`);

  const raw = await res.json();
  const rawList: Record<string, unknown>[] = Array.isArray(raw)
    ? raw
    : (raw?.results ?? raw?.teams ?? raw?.data ?? []);

  const teams = rawList.map(normaliseTeam);
  const byKey = buildByKey(teams);

  return { teams, byKey };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and caches the Gamma /teams list.
 *
 * Returns a `byKey` Map so callers can resolve a team name or abbreviation
 * from the Polymarket moneyline/spread outcome labels into a full team object
 * (with logo URL).
 *
 * Usage:
 *   const { data: teamsData } = usePolymarketTeams();
 *   const logo = teamsData?.byKey.get('magic')?.logoUrl;
 */
export function usePolymarketTeams() {
  return useQuery({
    queryKey: ['polymarket-teams'],
    queryFn: fetchTeamsMeta,
    staleTime: 60 * 60 * 1000,      // 1 hour
    gcTime: 24 * 60 * 60 * 1000,    // keep in GC 24 h
    retry: 2,
  });
}
