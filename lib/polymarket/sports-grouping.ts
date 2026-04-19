/**
 * Pure functions for grouping Polymarket sports event markets into
 * Moneyline / Spread / Total buckets.
 *
 * Example — Orlando Magic vs. Philadelphia 76ers:
 *
 *   Moneyline market
 *     outcomes: ["Magic", "76ers"]           prices: [0.47, 0.54]
 *     → buttons: "Magic (.47)"  "76ers (.54)"
 *
 *   Spread market
 *     outcomes: ["ORL +1.5", "PHI -1.5"]    prices: [0.50, 0.51]
 *     → buttons: "ORL +1.5 (.50)"  "PHI -1.5 (.51)"
 *
 *   Total market
 *     question: "Magic vs. 76ers O/U 220.5"
 *     outcomes: ["Over", "Under"]            prices: [0.54, 0.47]
 *     → buttons: "O 220.5 (.54)"  "U 220.5 (.47)"
 */

import type { PolymarketMarket } from '@/hooks/polymarket';

// ─── Public types ─────────────────────────────────────────────────────────────

export type MarketType = 'moneyline' | 'spread' | 'total';

export interface ParsedOutcome {
  /** Display label, e.g. "Magic", "ORL +1.5", "O 220.5" */
  label: string;
  /** 0–1 probability price, e.g. 0.47 */
  price: number;
  tokenId: string;
}

export interface GroupedMarket {
  type: MarketType;
  /** Full PolymarketMarket — passed directly to the order modal */
  market: PolymarketMarket;
  /** Two parsed outcomes for the row buttons */
  outcomes: ParsedOutcome[];
}

/** Normalised per-team metadata from the event's `teams` array. */
export interface ResolvedTeamMeta {
  /** Full name as returned by Polymarket, e.g. "Kolkata Knight Riders" */
  name: string;
  /** Team logo URL attached by Polymarket to the event */
  logoUrl?: string;
  /** Polymarket-supplied abbreviation, e.g. "KOL" (already upper-cased) */
  abbrev?: string;
  /** Brand colour hex, e.g. "#613698" */
  color?: string;
}

export interface SportsGameGroup {
  eventId: string;
  /** Full matchup title, e.g. "Orlando Magic vs. Philadelphia 76ers" */
  title: string;
  /** e.g. "Orlando Magic" */
  teamA: string;
  /** e.g. "Philadelphia 76ers" */
  teamB: string;
  startDate?: string;
  icon?: string;
  /** Team logo URL from the live Gamma /teams API — undefined when not yet loaded */
  teamALogo?: string;
  /** Team logo URL from the live Gamma /teams API — undefined when not yet loaded */
  teamBLogo?: string;
  /**
   * Per-team metadata (logo, abbrev, colour) resolved from the event-level
   * `teams` array. Preferred over the static sports-teams map since it works
   * for all leagues Polymarket covers (cricket, soccer, esports, etc.).
   */
  teamAMeta?: ResolvedTeamMeta;
  teamBMeta?: ResolvedTeamMeta;
  /** null when the event has no moneyline market available */
  moneyline: GroupedMarket | null;
  spread: GroupedMarket | null;
  total: GroupedMarket | null;
}

// ─── Raw Gamma API shapes ─────────────────────────────────────────────────────

export interface GammaEventMarket {
  id: string;
  question: string;
  slug?: string;
  active?: boolean;
  closed?: boolean;
  /** JSON-encoded string array, e.g. '["Over","Under"]' */
  outcomes?: string;
  /** JSON-encoded string array, e.g. '["0.54","0.47"]' */
  outcomePrices?: string;
  /** JSON-encoded string array of CLOB token IDs */
  clobTokenIds?: string;
  negRisk?: boolean;
  orderMinSize?: number;
  gameStartTime?: string;
  [key: string]: unknown;
}

export interface GammaEvent {
  id: string;
  title?: string;
  slug?: string;
  startDate?: string;
  icon?: string;
  markets?: GammaEventMarket[];
  [key: string]: unknown;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function safeParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Classify a market using outcome labels first, then falling back to the
 * question text for markets that use Yes/No outcomes (Polymarket's common
 * format for spread and some total markets).
 *
 *   Total     — outcome is "Over"/"Under", OR question contains O/U language
 *   Spread    — outcome ends with ±decimal, OR question contains spread language
 *   Moneyline — everything else
 */
function detectMarketType(outcomes: string[], question = ''): MarketType {
  // ── Outcome-label detection (fast path) ──────────────────────────────────
  if (outcomes.some((o) => /^(over|under)$/i.test(o.trim()))) return 'total';
  if (outcomes.some((o) => /[+-]\d+\.?\d*$/.test(o.trim()))) return 'spread';

  // ── Question-text detection (for Yes/No binary markets) ──────────────────
  const q = question.toLowerCase();

  // Total signals: "o/u", "over/under", "total points/goals/runs"
  if (/\bo\/?u\b/.test(q) || /over.{0,4}under/i.test(q) || /\btotal\s+\w*(point|goal|run|yard)/i.test(q))
    return 'total';

  // Spread signals: "spread", "cover", "ats", or a ±number buried in the question
  if (/\bspread\b|\bcover\b|\bats\b/.test(q)) return 'spread';
  // ±X or ±X.5 appears in the question (but NOT a total question already caught above)
  if (/[+-]\d+\.?\d*/.test(question)) return 'spread';

  return 'moneyline';
}

/**
 * Format an "Over"/"Under" label with the line extracted from the question.
 *   "Over"  + "Magic vs. 76ers O/U 220.5" → "O 220.5"
 *   "Under" + same question               → "U 220.5"
 */
function formatTotalLabel(outcome: string, question: string): string {
  const isOver = /^over$/i.test(outcome.trim());
  const isUnder = /^under$/i.test(outcome.trim());
  if (!isOver && !isUnder) return outcome;

  const match =
    question.match(/O\/U\s*([\d]+\.?\d*)/i) ??
    question.match(/\bOU\s+([\d]+\.?\d*)/i) ??
    question.match(/Total[^0-9]*([\d]+\.?\d*)/i) ??
    question.match(/([\d]+\.?\d*)$/);

  const line = match?.[1] ?? '';
  return isOver
    ? `O${line ? ` ${line}` : ''}`
    : `U${line ? ` ${line}` : ''}`;
}

/**
 * Format a spread outcome label.
 *
 * If the outcome already carries a point value (e.g. "ORL +1.5") it is
 * returned unchanged.  When the outcome is a plain "Yes"/"No" (Polymarket's
 * binary format for spread markets) we extract the spread line from the
 * question text so the UI shows something like "-1.5" and "+1.5" instead of
 * the unhelpful "Yes" / "No".
 *
 *   "Yes"  + "Will Magic cover -1.5 vs 76ers?" → "-1.5"
 *   "No"   + same question                     → "+1.5"
 */
function formatSpreadLabel(outcome: string, question: string): string {
  const trimmed = outcome.trim();

  // Already has a spread value in the label — keep as-is
  if (/[+-]\d+\.?\d*$/.test(trimmed)) return trimmed;

  // Only reformat plain Yes/No outcomes
  if (!/^(yes|no)$/i.test(trimmed)) return trimmed;

  // Try to extract the line: "−1.5", "+3", "−6.5", etc.
  const lineMatch = question.match(/([+-]\d+\.?\d*)/) ?? question.match(/\b(\d+\.?\d*)\s*(?:spread|point|pt)/i);
  if (!lineMatch) return trimmed; // nothing to extract — keep "Yes"/"No"

  const raw = lineMatch[1];
  const isNeg = raw.startsWith('-');
  const isYes = /^yes$/i.test(trimmed);

  // "Yes" means covering the listed line; "No" means the opposite side
  const label = isYes ? raw : (isNeg ? raw.replace('-', '+') : raw.replace('+', '-'));
  return label.startsWith('+') || label.startsWith('-') ? label : `+${label}`;
}

/** Convert a raw Gamma event market to PolymarketMarket for order-modal compatibility. */
function toPolymarketMarket(
  raw: GammaEventMarket,
  realtimePrices?: Record<
    string,
    { bidPrice: number; askPrice: number; midPrice: number; spread: number }
  >,
): PolymarketMarket {
  return {
    id: raw.id,
    question: raw.question,
    slug: (raw.slug as string) ?? '',
    active: raw.active ?? true,
    closed: raw.closed ?? false,
    outcomes: raw.outcomes,
    outcomePrices: raw.outcomePrices,
    clobTokenIds: raw.clobTokenIds,
    negRisk: raw.negRisk ?? false,
    orderMinSize: raw.orderMinSize,
    gameStartTime: raw.gameStartTime,
    realtimePrices,
  };
}

function buildParsedOutcomes(
  raw: GammaEventMarket,
  type: MarketType,
  realtimePrices?: Record<string, { bidPrice: number }>,
): ParsedOutcome[] {
  const outcomes = safeParseJson<string[]>(raw.outcomes, []);
  const staticPrices = safeParseJson<string[]>(raw.outcomePrices, []).map(Number);
  const tokenIds = safeParseJson<string[]>(raw.clobTokenIds, []);

  return outcomes.map((label, i) => {
    const tokenId = tokenIds[i] ?? '';
    const realtimePrice = tokenId ? realtimePrices?.[tokenId]?.bidPrice : undefined;
    const price = realtimePrice ?? staticPrices[i] ?? 0;
    const displayLabel =
      type === 'total'
        ? formatTotalLabel(label, raw.question)
        : type === 'spread'
          ? formatSpreadLabel(label, raw.question)
          : label;
    return { label: displayLabel, price, tokenId };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Group the raw markets of a single event into moneyline / spread / total.
 * Skips closed or inactive markets. Picks the first matching market for each
 * type so duplicate lines don't create extra rows.
 */
export function groupEventMarkets(
  markets: GammaEventMarket[],
  realtimePrices?: Record<
    string,
    { bidPrice: number; askPrice: number; midPrice: number; spread: number }
  >,
): Pick<SportsGameGroup, 'moneyline' | 'spread' | 'total'> {
  const result: Pick<SportsGameGroup, 'moneyline' | 'spread' | 'total'> = {
    moneyline: null,
    spread: null,
    total: null,
  };

  for (const raw of markets) {
    if (raw.closed || raw.active === false) continue;
    const outcomes = safeParseJson<string[]>(raw.outcomes, []);
    if (outcomes.length < 2) continue;

    const type = detectMarketType(outcomes, raw.question);
    if (result[type]) continue; // already found this bucket

    const market = toPolymarketMarket(raw, realtimePrices);
    const parsedOutcomes = buildParsedOutcomes(raw, type, realtimePrices);
    result[type] = { type, market, outcomes: parsedOutcomes };
  }

  return result;
}

/**
 * Strip a league/competition prefix that Polymarket sometimes prepends to
 * event titles. Examples:
 *   "Indian Premier League: Kolkata Knight Riders" → "Kolkata Knight Riders"
 *   "NBA: Lakers"                                  → "Lakers"
 *   "Orlando Magic"                                → "Orlando Magic"
 *
 * Only strips when the prefix is clearly a league label (contains a colon and
 * the segment before it is not itself part of the team name). The heuristic:
 * remove everything up to and including the last colon in the string.
 */
function stripLeaguePrefix(name: string): string {
  if (!name) return '';
  const colonIdx = name.lastIndexOf(':');
  if (colonIdx >= 0 && colonIdx < name.length - 1) {
    return name.slice(colonIdx + 1).trim();
  }
  return name.trim();
}

const RESERVED_OUTCOME_LABELS = /^(yes|no|over|under|draw|tie)$/i;

/**
 * Split an event title on "vs." / "vs" to extract the two team names.
 * Strips any league prefix from the first side.
 *   "Orlando Magic vs. Philadelphia 76ers"
 *     → ["Orlando Magic", "Philadelphia 76ers"]
 *   "Indian Premier League: Kolkata Knight Riders vs Rajasthan Royals"
 *     → ["Kolkata Knight Riders", "Rajasthan Royals"]
 */
export function parseTeams(title: string): [string, string] {
  if (!title) return ['', ''];
  const match = title.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (!match) return [stripLeaguePrefix(title), ''];
  return [stripLeaguePrefix(match[1]), stripLeaguePrefix(match[2])];
}

/**
 * Resolve the two team display names for a game.
 *
 * Priority:
 *   1. Moneyline outcome labels — these are always clean (e.g. "Kolkata Knight Riders")
 *      and authoritative because Polymarket uses them as order book labels.
 *   2. Title parsing with league-prefix stripping — used when moneyline is
 *      missing or carries generic Yes/No/Over/Under outcomes.
 */
function resolveTeamNames(
  title: string,
  moneyline: GroupedMarket | null,
): [string, string] {
  const outcomes = moneyline?.outcomes;
  if (outcomes && outcomes.length >= 2) {
    const a = outcomes[0]?.label?.trim() ?? '';
    const b = outcomes[1]?.label?.trim() ?? '';
    if (
      a &&
      b &&
      !RESERVED_OUTCOME_LABELS.test(a) &&
      !RESERVED_OUTCOME_LABELS.test(b)
    ) {
      return [stripLeaguePrefix(a), stripLeaguePrefix(b)];
    }
  }
  return parseTeams(title);
}

/**
 * Select the best icon URL for an event, falling back through the standard
 * Polymarket priority chain: market.icon → market.image → event.icon/eventIcon.
 * Matches how Polymarket's own UI resolves icons for consistency across cards.
 */
/**
 * Raw team shape from Polymarket's event.teams array. Kept loose so the same
 * type can represent both our typed `eventTeams` and the raw `GammaEvent.teams`.
 */
interface RawEventTeam {
  name?: string;
  logo?: string;
  abbreviation?: string;
  color?: string;
}

/**
 * Find the best match for a team name in the event.teams array.
 * Matching (case-insensitive):
 *   1. Exact name match — "Kolkata Knight Riders" → "Kolkata Knight Riders"
 *   2. Substring either direction — covers abbreviated outcome labels
 *      ("Magic" in "Orlando Magic") and title-parsed names that include a
 *      city the `teams[]` entry lacks.
 *   3. Abbreviation match — "kol" → "Kolkata Knight Riders"
 */
function findEventTeam(
  teamName: string,
  teams: RawEventTeam[] | undefined,
): RawEventTeam | undefined {
  if (!teamName || !teams?.length) return undefined;
  const needle = teamName.trim().toLowerCase();
  if (!needle) return undefined;

  // Exact name match
  const exact = teams.find((t) => t.name?.trim().toLowerCase() === needle);
  if (exact) return exact;

  // Substring match — "magic" ⊂ "orlando magic" and vice-versa
  const substring = teams.find((t) => {
    const n = t.name?.trim().toLowerCase();
    if (!n) return false;
    return n.includes(needle) || needle.includes(n);
  });
  if (substring) return substring;

  // Abbreviation match
  return teams.find(
    (t) => t.abbreviation?.trim().toLowerCase() === needle,
  );
}

/**
 * Convert a raw event-team entry into the normalised ResolvedTeamMeta shape.
 * Returns undefined when the raw entry is missing so callers can tell the
 * difference between "Polymarket gave us team meta" and "no match found"
 * (the latter must skip the static NBA/NFL map to avoid false positives like
 * "Rajasthan Royals" → "KC Royals").
 */
function toResolvedTeamMeta(
  fallbackName: string,
  raw: RawEventTeam | undefined,
): ResolvedTeamMeta | undefined {
  if (!raw) return undefined;
  return {
    name: raw.name ?? fallbackName,
    logoUrl: raw.logo || undefined,
    abbrev: raw.abbreviation ? raw.abbreviation.toUpperCase() : undefined,
    color: raw.color || undefined,
  };
}

function resolveEventIcon(
  market: PolymarketMarket | GammaEventMarket,
  eventIcon?: string,
): string | undefined {
  const m = market as Record<string, unknown>;
  return (
    (m.icon as string | undefined) ||
    (m.image as string | undefined) ||
    (m.eventIcon as string | undefined) ||
    eventIcon
  );
}

// ─── Flat-market grouping (used by useSportsEvents via /markets route) ────────

/**
 * Classify and extract parsed outcomes directly from a PolymarketMarket
 * (prices already attached via realtimePrices).
 */
function buildGroupFromMarket(
  market: PolymarketMarket,
  type: MarketType,
): GroupedMarket {
  const outcomes = safeParseJson<string[]>(market.outcomes, []);
  const staticPrices = safeParseJson<string[]>(market.outcomePrices, []).map(Number);
  const tokenIds = safeParseJson<string[]>(market.clobTokenIds, []);

  const parsedOutcomes: ParsedOutcome[] = outcomes.map((label, i) => {
    const tokenId = tokenIds[i] ?? '';
    const realtimePrice = tokenId
      ? market.realtimePrices?.[tokenId]?.bidPrice
      : undefined;
    const price = realtimePrice ?? staticPrices[i] ?? 0;
    const displayLabel =
      type === 'total'
        ? formatTotalLabel(label, market.question)
        : type === 'spread'
          ? formatSpreadLabel(label, market.question)
          : label;
    return { label: displayLabel, price, tokenId };
  });

  return { type, market, outcomes: parsedOutcomes };
}

/**
 * Group a flat list of PolymarketMarkets (already price-enriched) into
 * Moneyline / Spread / Total buckets for a single event.
 */
function groupPolymarketMarketsForEvent(
  markets: PolymarketMarket[],
): Pick<SportsGameGroup, 'moneyline' | 'spread' | 'total'> {
  const result: Pick<SportsGameGroup, 'moneyline' | 'spread' | 'total'> = {
    moneyline: null,
    spread: null,
    total: null,
  };

  for (const market of markets) {
    if (market.closed) continue;
    const outcomes = safeParseJson<string[]>(market.outcomes, []);
    if (outcomes.length < 2) continue;

    const type = detectMarketType(outcomes, market.question);
    if (result[type]) continue; // first match wins

    result[type] = buildGroupFromMarket(market, type);
  }

  return result;
}

// ─── Game-card validity ───────────────────────────────────────────────────────

/**
 * Returns true only when the grouped event looks like a real head-to-head game:
 *
 *   ✓  "Orlando Magic vs. Philadelphia 76ers"  — has "vs", two real team names
 *   ✗  "Will the Hawks win the championship?"  — no "vs", teamB is empty
 *   ✗  outcomes: ["Yes", "No"] on the moneyline — prop / novelty market
 */
export function isValidGameCard(game: SportsGameGroup): boolean {
  // Must have a "vs" matchup title and two non-empty team names
  if (!game.teamA || !game.teamB) return false;
  if (!/\bvs\.?\b/i.test(game.title)) return false;

  // Moneyline outcomes, when present, must not both be plain Yes / No
  if (game.moneyline) {
    const [outA, outB] = game.moneyline.outcomes;
    const isYesNo =
      /^yes$/i.test(outA?.label?.trim() ?? '') &&
      /^no$/i.test(outB?.label?.trim() ?? '');
    if (isYesNo) return false;
  }

  return true;
}

/**
 * Ensure the spread's two outcomes are in the same row-order as the moneyline
 * (outcomes[0] → teamA row, outcomes[1] → teamB row).
 *
 * Polymarket spread markets often list teams in a different order than the
 * corresponding moneyline.  E.g. the moneyline might have
 *   outcomes[0] = "Magic"   (teamA)
 *   outcomes[1] = "76ers"   (teamB)
 * while the spread question "Will 76ers cover -1.5?" yields
 *   outcomes[0] = "76ers"   → should be in teamB row
 *   outcomes[1] = "Magic"   → should be in teamA row
 *
 * The function swaps outcomes when the first spread outcome's label is a better
 * match for teamB than for teamA.  Token IDs travel with their outcomes so
 * order placement is not affected.
 */
function alignSpreadToTeams(
  spread: GroupedMarket,
  teamA: string,
  teamB: string,
): GroupedMarket {
  if (spread.outcomes.length < 2) return spread;
  const [out0, out1] = spread.outcomes;

  /** Score how well a label string matches a team name (higher = better). */
  function score(label: string, team: string): number {
    if (!label || !team) return 0;
    const l = label.toLowerCase();
    const t = team.toLowerCase();
    if (l === t) return 3;
    // Any significant word of the team name found in the label
    const words = t.split(/\s+/).filter((w) => w.length > 2);
    const hits = words.filter((w) => l.includes(w)).length;
    if (hits > 0) return hits;
    // Label is a substring of the team name (e.g. "Magic" inside "Orlando Magic")
    if (t.includes(l) && l.length > 2) return 1;
    return 0;
  }

  const label0 = out0.label;
  const label1 = out1.label;

  const a0 = score(label0, teamA);
  const b0 = score(label0, teamB);
  const a1 = score(label1, teamA);
  const b1 = score(label1, teamB);

  // If out0 is clearly a better match for teamB, swap
  const shouldSwap =
    b0 > a0 && a1 >= b1; // out0 fits B, out1 fits A better (or equally)

  if (!shouldSwap) return spread;

  return { ...spread, outcomes: [out1, out0] };
}

/**
 * Group a flat PolymarketMarket[] (from /markets?tag_id=…) into SportsGameGroups
 * by the eventId field.  Markets that share an eventId belong to the same game.
 *
 * Falls back to the market's own id when eventId is absent so every market
 * still produces a card rather than being silently dropped.
 */
export function groupFlatMarketsIntoGames(
  markets: PolymarketMarket[],
): SportsGameGroup[] {
  // Preserve insertion order so the grid keeps the server's volume ordering
  const eventMap = new Map<string, PolymarketMarket[]>();

  for (const market of markets) {
    const key = (market.eventId as string | undefined) ?? market.id;
    if (!eventMap.has(key)) eventMap.set(key, []);
    eventMap.get(key)!.push(market);
  }

  const groups: SportsGameGroup[] = [];

  for (const [eventId, eventMarkets] of eventMap) {
    const first = eventMarkets[0];
    // Prefer the event-level title; fall back to the market question
    const title =
      (first.eventTitle as string | undefined) ?? first.question ?? '';

    const grouped = groupPolymarketMarketsForEvent(eventMarkets);

    // Derive team names from moneyline outcomes when available (clean),
    // otherwise parse the title and strip any league prefix.
    const [teamA, teamB] = resolveTeamNames(title, grouped.moneyline);

    // Align spread outcomes to the same row order as the moneyline so that
    // row A always shows teamA's spread and row B shows teamB's spread.
    const spread = grouped.spread
      ? alignSpreadToTeams(grouped.spread, teamA, teamB)
      : null;

    // Per-team metadata from the event-level `teams` array (added by the
    // backend). Works for every Polymarket-covered sport, unlike the static
    // NBA/NFL map.
    const eventTeams = first.eventTeams as RawEventTeam[] | undefined;
    const teamAMeta = toResolvedTeamMeta(
      teamA,
      findEventTeam(teamA, eventTeams),
    );
    const teamBMeta = toResolvedTeamMeta(
      teamB,
      findEventTeam(teamB, eventTeams),
    );

    groups.push({
      eventId,
      title,
      teamA,
      teamB,
      startDate: first.gameStartTime,
      icon: resolveEventIcon(first),
      teamAMeta,
      teamBMeta,
      teamALogo: teamAMeta?.logoUrl,
      teamBLogo: teamBMeta?.logoUrl,
      ...grouped,
      spread,
    });
  }

  return groups;
}

// ─── Live team logo enrichment ────────────────────────────────────────────────

/**
 * Minimal interface for the TeamsMap returned by usePolymarketTeams.
 * Kept here as a plain interface so sports-grouping.ts stays hook-free.
 */
export interface LiveTeamsMap {
  byKey: Map<string, { logoUrl?: string }>;
}

/**
 * Resolve a logo URL from the live teams map, trying:
 *   1. Lower-cased full name   "orlando magic" → logo
 *   2. Each individual word    "magic"          → logo
 */
function resolveLogoFromLiveMap(
  teamName: string,
  map: LiveTeamsMap,
): string | undefined {
  if (!teamName) return undefined;
  const lower = teamName.toLowerCase();

  const direct = map.byKey.get(lower);
  if (direct?.logoUrl) return direct.logoUrl;

  for (const word of lower.split(/\s+/)) {
    const byWord = map.byKey.get(word);
    if (byWord?.logoUrl) return byWord.logoUrl;
  }

  return undefined;
}

/**
 * Enrich a list of SportsGameGroups with logo URLs from the live Gamma /teams
 * data.  Returns a new array; does not mutate the originals.
 *
 * Call this after groupFlatMarketsIntoGames whenever the teamsMap is ready.
 */
export function enrichGamesWithTeamLogos(
  games: SportsGameGroup[],
  teamsMap: LiveTeamsMap,
): SportsGameGroup[] {
  return games.map((game) => {
    // Prefer the per-event logo attached via `event.teams` — it is always
    // accurate for the specific matchup.  Fall back to the global /teams map
    // only when the event didn't include a team-specific logo.
    const teamALogo =
      game.teamALogo ?? resolveLogoFromLiveMap(game.teamA, teamsMap);
    const teamBLogo =
      game.teamBLogo ?? resolveLogoFromLiveMap(game.teamB, teamsMap);

    if (teamALogo === game.teamALogo && teamBLogo === game.teamBLogo) {
      return game; // nothing changed — keep same reference
    }

    return { ...game, teamALogo, teamBLogo };
  });
}

/** Transform a raw Gamma event into a SportsGameGroup ready for the UI. */
export function toSportsGameGroup(
  event: GammaEvent,
  realtimePrices?: Record<
    string,
    { bidPrice: number; askPrice: number; midPrice: number; spread: number }
  >,
): SportsGameGroup {
  const title = (event.title as string) ?? 'Unknown Event';
  const grouped = groupEventMarkets(event.markets ?? [], realtimePrices);
  const [teamA, teamB] = resolveTeamNames(title, grouped.moneyline);

  // Align spread outcomes to match the moneyline row order
  const spread = grouped.spread
    ? alignSpreadToTeams(grouped.spread, teamA, teamB)
    : null;

  const firstMarket = event.markets?.[0];
  const eventLevelIcon =
    (event.image as string | undefined) ??
    (event.icon as string | undefined);

  const eventTeams = event.teams as RawEventTeam[] | undefined;
  const teamAMeta = toResolvedTeamMeta(
    teamA,
    findEventTeam(teamA, eventTeams),
  );
  const teamBMeta = toResolvedTeamMeta(
    teamB,
    findEventTeam(teamB, eventTeams),
  );

  return {
    eventId: event.id,
    title,
    teamA,
    teamB,
    startDate: event.startDate as string | undefined,
    icon: firstMarket
      ? resolveEventIcon(firstMarket, eventLevelIcon)
      : eventLevelIcon,
    teamAMeta,
    teamBMeta,
    teamALogo: teamAMeta?.logoUrl,
    teamBLogo: teamBMeta?.logoUrl,
    ...grouped,
    spread,
  };
}
