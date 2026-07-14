/**
 * Sportsbook feed ordering — mirrors the mobile comparator in
 * Expo-Moon-App/src/app/(app)/predictions.tsx (compareSportsMarkets).
 *
 * The /desktop/markets endpoint returns volume-ordered pages, which scatters
 * a day's slate: finished blowouts outrank tonight's tip-offs. This module
 * reorders the feed: live games first, then upcoming games in strict kickoff
 * order (major US sports — football/basketball/baseball/hockey — ahead of
 * the rest), then games already played, then futures/props.
 *
 * Every sort key is EVENT-level, so all markets of one game rank identically
 * and the game's moneyline/spread/total stay contiguous through
 * groupFlatMarketsIntoGames.
 */

import type { PolymarketMarket } from '@/hooks/polymarket';
import type { SportsGameGroup } from './sports-grouping';

const SPORTS_ORDER_TIER = {
  live: 5,
  upcomingMajor: 4,
  upcomingOther: 3,
  pastGame: 2,
  nonGame: 1,
} as const;

// A game whose kickoff passed but that Polymarket hasn't flagged live is
// usually in progress with a stale flag — but only within a game's realistic
// duration. Older ones are finished games awaiting settlement.
const STARTED_GAME_LIVE_WINDOW_MS = 5 * 60 * 60 * 1000;

const MAJOR_SPORT_RE =
  /(^|[^a-z0-9])(nfl|ncaaf|college football|super bowl|nba|wnba|nbasl|summer league|ncaab|march madness|mlb|world series|nhl|stanley cup)([^a-z0-9]|$)/;

function parseNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse a market date to epoch ms. `gameStartTime` arrives from the backend
 * as a Postgres timestamptz ("2026-07-12 01:00:00+00") — a space instead of
 * "T" and a 2-digit UTC offset — which strict Date parsers (Safari) reject.
 * Normalize to ISO 8601 first so the real kickoff parses reliably.
 */
export function parseMarketDateMs(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null;
  let iso = value.trim();
  if (!iso) return null;
  if (iso.includes(' ') && !iso.includes('T')) iso = iso.replace(' ', 'T');
  // Only touch a trailing UTC offset when a time part exists — otherwise the
  // regex would corrupt the "-12" day of a date-only value like "2026-07-12".
  if (iso.includes('T')) {
    iso = iso
      .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
      .replace(/([+-]\d{2})$/, '$1:00');
  }
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : null;
}

/** True when the market looks like a head-to-head game (vs. a future/prop). */
export function isSportsGameMarket(market: PolymarketMarket): boolean {
  if (Array.isArray(market.eventTeams) && market.eventTeams.length >= 2)
    return true;
  const text = `${market.question ?? ''} ${market.eventTitle ?? ''}`.toLowerCase();
  return /\bvs\.?\b|\bat\b| @ /.test(text);
}

function isMajorSportMarket(market: PolymarketMarket): boolean {
  const teamLeague = Array.isArray(market.eventTeams)
    ? market.eventTeams.map((team) => team.league).filter(Boolean).join(' ')
    : '';
  const text = `${teamLeague} ${market.eventTitle ?? ''} ${market.slug ?? ''}`.toLowerCase();
  return MAJOR_SPORT_RE.test(text);
}

/**
 * Prefer the actual game kickoff (`gameStartTime`) over `eventStartDate` —
 * the latter is when the betting market OPENED on Polymarket (often days
 * earlier), which makes upcoming games look like they'd already happened.
 */
export function sportsEventTime(market: PolymarketMarket): number | null {
  return parseMarketDateMs(
    market.gameStartTime ||
      market.eventStartDate ||
      market.endDate ||
      market.endDateIso,
  );
}

function sportsOrderTier(
  market: PolymarketMarket,
  eventTime: number | null,
): number {
  if (!isSportsGameMarket(market)) return SPORTS_ORDER_TIER.nonGame;
  const gameOpen = !market.eventEnded && !market.eventClosed;
  if (market.eventLive && gameOpen) return SPORTS_ORDER_TIER.live;
  if (eventTime == null) return SPORTS_ORDER_TIER.pastGame;
  const sinceStart = Date.now() - eventTime;
  if (sinceStart >= 0) {
    return gameOpen && sinceStart <= STARTED_GAME_LIVE_WINDOW_MS
      ? SPORTS_ORDER_TIER.live
      : SPORTS_ORDER_TIER.pastGame;
  }
  return isMajorSportMarket(market)
    ? SPORTS_ORDER_TIER.upcomingMajor
    : SPORTS_ORDER_TIER.upcomingOther;
}

export function compareSportsMarkets(
  a: PolymarketMarket,
  b: PolymarketMarket,
): number {
  const aTime = sportsEventTime(a);
  const bTime = sportsEventTime(b);
  const aTier = sportsOrderTier(a, aTime);
  const bTier = sportsOrderTier(b, bTime);
  if (aTier !== bTier) return bTier - aTier;

  if (aTime != null && bTime != null && aTime !== bTime) {
    // Upcoming (and live) games run soonest-kickoff first; finished games run
    // most-recent first so stale results sink as they age.
    return aTier === SPORTS_ORDER_TIER.pastGame ? bTime - aTime : aTime - bTime;
  }
  if ((aTime == null) !== (bTime == null)) return aTime == null ? 1 : -1;

  // Same tier + kickoff: keep each event's markets adjacent, then let volume
  // order within the event (and break ties between simultaneous games).
  const aEvent = String(a.eventId || a.eventSlug || a.eventTitle || '');
  const bEvent = String(b.eventId || b.eventSlug || b.eventTitle || '');
  if (aEvent !== bEvent) return aEvent < bEvent ? -1 : 1;
  return (
    parseNumber(b.volume ?? b.volume24hr) - parseNumber(a.volume ?? a.volume24hr)
  );
}

/**
 * Sort a flat market list into sportsbook feed order. Call this BEFORE
 * groupFlatMarketsIntoGames — the grouper preserves insertion order, so the
 * sorted flat list directly determines game-card order.
 */
export function orderSportsMarkets(
  markets: PolymarketMarket[],
): PolymarketMarket[] {
  return [...markets].sort(compareSportsMarkets);
}

function gamePrimaryMarket(game: SportsGameGroup): PolymarketMarket | null {
  return (
    game.moneyline?.market ?? game.spread?.market ?? game.total?.market ?? null
  );
}

/**
 * Same ordering for already-grouped game cards, compared via each game's
 * primary market (which carries the event-level live/kickoff fields).
 */
export function compareSportsGames(
  a: SportsGameGroup,
  b: SportsGameGroup,
): number {
  const aMarket = gamePrimaryMarket(a);
  const bMarket = gamePrimaryMarket(b);
  if (aMarket && bMarket) return compareSportsMarkets(aMarket, bMarket);
  if (aMarket || bMarket) return aMarket ? -1 : 1;
  return 0;
}
