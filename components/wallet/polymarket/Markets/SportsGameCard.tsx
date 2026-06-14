'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type {
  SportsGameGroup,
  ParsedOutcome,
  ResolvedTeamMeta,
} from '@/lib/polymarket/sports-grouping';
import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  findTeam,
  FALLBACK_TEAM_COLOR,
} from '@/lib/polymarket/sports-teams';
import Card from '../shared/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SportsGameCardProps {
  game: SportsGameGroup;
  disabled?: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract just the ±number from a spread label.
 *   "ORL +1.5"  → "+1.5"
 *   "+1.5"      → "+1.5"
 *   "Magic"     → ""        (team name only, no line)
 *   "Yes"       → ""
 */
function extractSpreadLine(label: string): string {
  const m = label.match(/([+-]\d+\.?\d*)$/);
  return m ? m[1] : '';
}

/**
 * Format the spread cell label as "<ABBREV> <line>" or just "<ABBREV>".
 *   abbrev="ORL", label="Magic"    → "ORL"
 *   abbrev="ORL", label="ORL +1.5" → "ORL +1.5"
 *   abbrev="PHI", label="-1.5"     → "PHI -1.5"
 */
function spreadLabel(abbrev: string, rawLabel: string): string {
  const line = extractSpreadLine(rawLabel);
  return line ? `${line}` : abbrev;
}

/** 0.47 → "47%",  0.50 → "50%" */
function centsPrice(price: number): string {
  if (price <= 0) return '';
  return `${Math.round(price * 100)}%`;
}

function formatVolume(raw: string | number | undefined): string {
  if (!raw) return '';
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M Vol.`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K Vol.`;
  return `$${n.toFixed(0)} Vol.`;
}

function formatGameTime(startDate: string | undefined): {
  label: string;
  status: 'live' | 'imminent' | 'upcoming' | null;
} {
  if (!startDate) return { label: '', status: null };
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return { label: '', status: null };
  const diffMin = (d.getTime() - Date.now()) / 60_000;
  if (diffMin <= 0) return { label: 'LIVE', status: 'live' };
  if (diffMin <= 60)
    return { label: `~${Math.round(diffMin)}m`, status: 'imminent' };

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const datePart = isToday
    ? 'Today'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return { label: `${timeStr} ${datePart}`, status: 'upcoming' };
}

function parseScorePair(raw: string | null | undefined): [number | null, number | null] {
  if (!raw) return [null, null];
  const match = String(raw).match(/(\d+)\D+(\d+)/);
  if (!match) return [null, null];
  const first = Number(match[1]);
  const second = Number(match[2]);
  return [
    Number.isFinite(first) ? first : null,
    Number.isFinite(second) ? second : null,
  ];
}

/**
 * Resolve team metadata (abbreviation + brand colour) for one side of a game.
 *
 * Lookup priority:
 *   1. Moneyline outcome label  — "Magic", "76ers"  → most unique / reliable
 *   2. Spread outcome label     — "ORL +1.5"         → contains 3-letter code
 *   3. Full team name           — "Orlando Magic"    → city + nickname
 */
function resolveTeam(
  mlLabel: string | undefined,
  spLabel: string | undefined,
  fullName: string,
): { abbrev: string; color: string } {
  const meta =
    findTeam(mlLabel ?? '') ??
    findTeam(spLabel ?? '') ??
    findTeam(fullName);

  if (meta) return { abbrev: meta.abbrev, color: meta.color };

  // Fallback: extract abbreviation from spread ("ORL +1.5" → "ORL") or first 3 of name
  const spFirst = (spLabel ?? '').trim().split(/\s+/)[0] ?? '';
  const abbrev = /^[A-Z]{2,4}$/.test(spFirst)
    ? spFirst
    : firstThreeLetters(fullName);

  return { abbrev, color: FALLBACK_TEAM_COLOR };
}

/** First 3 letters of the team name, upper-cased. "Kolkata..." → "KOL". */
function firstThreeLetters(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .slice(0, 3)
    .toUpperCase();
}

/**
 * Resolve team display metadata with priority:
 *   1. Event-level team metadata from Polymarket (authoritative, per-sport)
 *   2. Static NBA/NFL/MLB/NHL map — ONLY when the moneyline/spread label looks
 *      like a US-league nickname or abbreviation (prevents false positives
 *      like "Rajasthan Royals" → "KC Royals").
 *   3. First 3 letters of the team name.
 */
function resolveTeamWithEventMeta(
  meta: ResolvedTeamMeta | undefined,
  mlLabel: string | undefined,
  spLabel: string | undefined,
  fullName: string,
): { abbrev: string; color: string } {
  // Priority 1: Polymarket event-level team meta
  if (meta) {
    return {
      abbrev: meta.abbrev || firstThreeLetters(meta.name || fullName),
      color: meta.color || FALLBACK_TEAM_COLOR,
    };
  }

  // Priority 2: static US-league map, but only for single-word nicknames
  // ("Magic", "76ers", "Royals"). Skip multi-word names like "Rajasthan Royals"
  // that would partial-match into the wrong league.
  const candidate = mlLabel?.trim() ?? '';
  const isSingleWord = candidate.length > 0 && !/\s/.test(candidate);
  if (isSingleWord) {
    const byName = findTeam(candidate);
    if (byName) return { abbrev: byName.abbrev, color: byName.color };
  }
  // Spread labels like "ORL +1.5" are still safe — they're abbreviation-first
  const bySpread = findTeam(spLabel ?? '');
  if (bySpread)
    return { abbrev: bySpread.abbrev, color: bySpread.color };

  // Priority 3: first 3 letters of the full team name
  return {
    abbrev: firstThreeLetters(fullName),
    color: FALLBACK_TEAM_COLOR,
  };
}

// ─── Live score ───────────────────────────────────────────────────────────────

type LiveScoreTeam = {
  name: string | null;
  abbreviation: string | null;
  score: number | null;
};

type LiveScoreState = {
  live: boolean;
  ended?: boolean;
  closed?: boolean;
  period: string | null;
  elapsed: string | null;
  startTime?: string | null;
  teams: LiveScoreTeam[];
};

const EMPTY_LIVE: LiveScoreState = {
  live: false,
  ended: false,
  closed: false,
  period: null,
  elapsed: null,
  startTime: null,
  teams: [],
};

function useLiveEventScore(
  eventSlug: string | undefined,
  enabled: boolean,
): LiveScoreState {
  const [state, setState] = useState<LiveScoreState>(EMPTY_LIVE);

  useEffect(() => {
    if (!enabled || !eventSlug) {
      setState(EMPTY_LIVE);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as LiveScoreState;
        if (cancelled) return;
        setState({
          live: Boolean(json.live),
          ended: Boolean(json.ended),
          closed: Boolean(json.closed),
          period: json.period ?? null,
          elapsed: json.elapsed ?? null,
          startTime: json.startTime ?? null,
          teams: Array.isArray(json.teams) ? json.teams : [],
        });
        if (!cancelled && json.live) {
          timer = setTimeout(fetchOnce, 15_000);
        }
      } catch {
        // silently ignore — score UI is hidden when data is missing
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventSlug, enabled]);

  return state;
}

function pickTeamScore(
  outcomeLabel: string,
  outcomeAbbr: string,
  teams: LiveScoreTeam[],
  fallbackIndex: number,
): number | null {
  if (!teams.length) return null;
  const label = outcomeLabel.trim().toLowerCase();
  const abbr = outcomeAbbr.trim().toLowerCase();
  const byName = teams.find((t) => (t.name ?? '').toLowerCase() === label);
  if (byName?.score != null) return byName.score;
  const byContains = teams.find((t) => {
    const n = (t.name ?? '').toLowerCase();
    return n && (n.includes(label) || label.includes(n));
  });
  if (byContains?.score != null) return byContains.score;
  const byAbbr = teams.find(
    (t) => (t.abbreviation ?? '').toLowerCase() === abbr,
  );
  if (byAbbr?.score != null) return byAbbr.score;
  return teams[fallbackIndex]?.score ?? null;
}

// ─── Team badge ───────────────────────────────────────────────────────────────

/**
 * Renders either a logo image (from the live /teams API) or a coloured
 * abbreviation badge (static fallback).
 */
function TeamBadge({
  logoUrl,
  abbrev,
  color,
}: {
  logoUrl: string | undefined;
  abbrev: string;
  color: string;
}) {
  if (logoUrl) {
    return (
      <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
        <Image
          src={logoUrl}
          alt={abbrev}
          width={32}
          height={32}
          className="w-7 h-7 object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded text-white text-[10px] font-extrabold flex-shrink-0 tracking-wide"
      style={{ backgroundColor: color }}
    >
      {abbrev}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Filled prominent button for the Moneyline column. */
function MoneylineBtn({
  outcome,
  abbrev,
  color,
  disabled,
  market,
  onOutcomeClick,
}: {
  outcome: ParsedOutcome;
  abbrev: string;
  color: string;
  disabled: boolean;
  market: PolymarketMarket;
  onOutcomeClick: SportsGameCardProps['onOutcomeClick'];
}) {
  const isDisabled = disabled || market.closed || !outcome.tokenId;
  return (
    <button
      disabled={isDisabled}
      onClick={() =>
        onOutcomeClick(
          market,
          outcome.label,
          outcome.price,
          outcome.tokenId,
        )
      }
      style={isDisabled ? undefined : { backgroundColor: color }}
      className={`h-10 w-full flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-opacity ${
        isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'text-white hover:opacity-90 active:opacity-75'
      }`}
    >
      {/* <span>{abbrev}</span> */}
      {outcome.price > 0 && <span>{centsPrice(outcome.price)}</span>}
    </button>
  );
}

/** Compact text cell for Spread / Total columns. */
function MarketCell({
  outcome,
  disabled,
  market,
  onOutcomeClick,
}: {
  outcome: ParsedOutcome;
  disabled: boolean;
  market: PolymarketMarket;
  onOutcomeClick: SportsGameCardProps['onOutcomeClick'];
}) {
  const isDisabled = disabled || market.closed || !outcome.tokenId;
  return (
    <button
      disabled={isDisabled}
      onClick={() =>
        onOutcomeClick(
          market,
          outcome.label,
          outcome.price,
          outcome.tokenId,
        )
      }
      className={`h-10 w-full flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-xs transition-colors bg-gray-100 ${
        isDisabled
          ? 'text-gray-300 cursor-not-allowed'
          : 'hover:bg-gray-200 active:bg-gray-300 text-gray-700 cursor-pointer'
      }`}
    >
      <span className="font-medium truncate">{outcome.label}</span>

      {outcome.price > 0 && (
        <span className="font-bold flex-shrink-0 text-gray-900">
          {centsPrice(outcome.price)}
        </span>
      )}
    </button>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function SportsGameCard({
  game,
  disabled = false,
  onOutcomeClick,
}: SportsGameCardProps) {
  const {
    label: scheduledLabel,
    status: scheduledStatus,
  } = formatGameTime(game.startDate);
  const eventSlug = game.moneyline?.market?.eventSlug;
  const hasEventStatus =
    game.eventLive ||
    game.eventEnded ||
    game.eventClosed ||
    game.eventPeriod != null ||
    game.eventElapsed != null ||
    game.eventScore != null;
  const liveScore = useLiveEventScore(
    eventSlug,
    Boolean(eventSlug) &&
      (game.eventLive ||
        game.eventEnded ||
        game.eventClosed ||
        scheduledStatus === 'live'),
  );
  const eventFinal = Boolean(
    game.eventEnded || game.eventClosed || liveScore.ended || liveScore.closed,
  );
  const isLive = Boolean(
    !eventFinal &&
      (game.eventLive ||
        liveScore.live ||
        (!hasEventStatus && scheduledStatus === 'live')),
  );
  const status = eventFinal ? 'final' : isLive ? 'live' : scheduledStatus;
  const timeLabel = eventFinal ? 'FINAL' : isLive ? 'LIVE' : scheduledLabel;
  const cardDisabled = disabled || eventFinal;

  // Raw outcome data for each team
  const mlA = game.moneyline?.outcomes[0];
  const mlB = game.moneyline?.outcomes[1];
  const extraMoneylineOutcomes =
    game.moneyline?.outcomes.slice(2).filter((outcome) => outcome.market) ?? [];
  const spA = game.spread?.outcomes[0];
  const spB = game.spread?.outcomes[1];
  const totA = game.total?.outcomes[0];
  const totB = game.total?.outcomes[1];

  // Resolve team abbrev + colour.
  // Priority:
  //   1. Event-level team metadata from Polymarket (eventTeams) — accurate for
  //      every sport, including cricket/soccer/esports.
  //   2. Static NBA/NFL/MLB/NHL map.
  //   3. First 3 letters of the team name (requested fallback for unknown teams).
  const teamA = resolveTeamWithEventMeta(
    game.teamAMeta,
    mlA?.label,
    spA?.label,
    game.teamA,
  );
  const teamB = resolveTeamWithEventMeta(
    game.teamBMeta,
    mlB?.label,
    spB?.label,
    game.teamB,
  );

  // Short team display name comes from the moneyline outcome label (e.g. "Magic")
  const nameA = mlA?.label ?? game.teamA;
  const nameB = mlB?.label ?? game.teamB;

  const [eventScoreA, eventScoreB] = parseScorePair(game.eventScore);
  const shouldShowScore = isLive || eventFinal;
  const scoreA = shouldShowScore
    ? pickTeamScore(nameA, teamA.abbrev, liveScore.teams, 0) ?? eventScoreA
    : null;
  const scoreB = shouldShowScore
    ? pickTeamScore(nameB, teamB.abbrev, liveScore.teams, 1) ?? eventScoreB
    : null;
  const hasLiveScore = scoreA != null && scoreB != null;

  // Team-specific logos from Polymarket's event.teams array. No event-icon
  // fallback — when a team has no dedicated logo we render the coloured
  // abbreviation badge instead (matches Polymarket's behaviour).
  const logoA = game.teamAMeta?.logoUrl ?? game.teamALogo;
  const logoB = game.teamBMeta?.logoUrl ?? game.teamBLogo;

  const volume = formatVolume(
    game.moneyline?.market?.volume24hr ??
      game.moneyline?.market?.volume,
  );

  // When only the Moneyline column is present, stop stretching the button to
  // fill the row — Polymarket renders a compact, content-width pill instead.
  const onlyMoneyline = game.spread == null && game.total == null;
  const mlColClass = onlyMoneyline
    ? 'w-[150px] flex-shrink-0'
    : 'flex-1 min-w-0';
  // With only moneyline present there's room to show the full team name —
  // widen the team-info column and stop truncating.
  const teamColClass = onlyMoneyline
    ? 'flex items-center gap-1.5 flex-1 min-w-0'
    : 'flex items-center gap-1.5 flex-shrink-0 w-[120px] min-w-0';
  const teamNameClass = onlyMoneyline
    ? 'text-xs font-semibold text-gray-800'
    : 'text-xs font-semibold text-gray-800 truncate leading-tight';
  const moneylineRows = [
    {
      team: teamA,
      name: nameA,
      logoUrl: logoA,
      record: game.teamAMeta?.record,
      ml: mlA,
      sp: spA,
      tot: totA,
      mlMarket: mlA?.market ?? game.moneyline?.market,
    },
    {
      team: teamB,
      name: nameB,
      logoUrl: logoB,
      record: game.teamBMeta?.record,
      ml: mlB,
      sp: spB,
      tot: totB,
      mlMarket: mlB?.market ?? game.moneyline?.market,
    },
    ...extraMoneylineOutcomes.map((ml) => ({
      team: {
        abbrev: ml.label.trim().slice(0, 4).toUpperCase() || 'DRAW',
        color: '#6b7280',
      },
      name: ml.label,
      logoUrl: undefined,
      record: undefined,
      ml,
      sp: undefined,
      tot: undefined,
      mlMarket: ml.market ?? game.moneyline?.market,
    })),
  ];

  return (
    <Card className="px-3 py-2.5 overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col items-start text-[11px]">
          <span className="text-xs font-semibold text-gray-800">
            {game.teamA} vs {game.teamB}
          </span>
          {status && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                status === 'live'
                  ? 'text-red-500'
                  : status === 'final'
                    ? 'text-gray-500'
                  : status === 'imminent'
                    ? 'text-orange-500'
                    : 'text-gray-500'
              }`}
            >
              {status === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {timeLabel}
              {(status === 'live' || status === 'final') && hasLiveScore && (
                <span className="font-bold tabular-nums text-gray-900 ml-0.5">
                  {scoreA} – {scoreB}
                </span>
              )}
            </span>
          )}
          {/* {volume && (
            <span className="text-green-600 font-medium">
              {volume}
            </span>
          )} */}
        </div>
      </div>

      <div className="mb-1" />

      {/* ── Team rows ────────────────────────────────────────────────────── */}
      {moneylineRows.map(({ team, name, logoUrl, record, ml, sp, tot, mlMarket }, i) => {
        // Reformat the spread label: always use the team abbreviation regardless
        // of whether the raw label is a nickname ("Magic"), abbrev+line ("ORL +1.5"),
        // or a bare line ("+1.5"). Result: "ORL", "ORL +1.5", "PHI -1.5", etc.

        const spFormatted = sp
          ? { ...sp, label: spreadLabel(team.abbrev, sp.label) }
          : undefined;

        return (
          <div
            key={i}
            className={`flex items-center gap-1 ${
              i < moneylineRows.length - 1 ? 'mb-1' : ''
            }`}
          >
            {/* Team badge + name — fixed width so column labels stay aligned */}
            <div className={teamColClass}>
              <TeamBadge
                logoUrl={logoUrl}
                abbrev={team.abbrev}
                color={team.color}
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className={teamNameClass}>{name}</span>
                {record && (
                  <span className="text-[10px] text-gray-400 font-medium leading-tight">
                    {record}
                  </span>
                )}
              </div>
            </div>

            {/* Market cells — only render columns for available markets */}
            <div className="flex gap-1 flex-1 min-w-0 justify-end">
              <div className={mlColClass}>
                {ml && mlMarket ? (
                  <MoneylineBtn
                    outcome={ml}
                    abbrev={team.abbrev}
                    color={team.color}
                    disabled={cardDisabled}
                    market={mlMarket}
                    onOutcomeClick={onOutcomeClick}
                  />
                ) : (
                  <div className="h-9" />
                )}
              </div>

              {game.spread != null && (
                <div className="flex-1 min-w-0">
                  {spFormatted && game.spread ? (
                    <MarketCell
                      outcome={spFormatted}
                      disabled={cardDisabled}
                      market={game.spread.market}
                      onOutcomeClick={onOutcomeClick}
                    />
                  ) : (
                    <div className="h-9" />
                  )}
                </div>
              )}

              {game.total != null && (
                <div className="flex-1 min-w-0">
                  {tot && game.total ? (
                    <MarketCell
                      outcome={tot}
                      disabled={cardDisabled}
                      market={game.total.market}
                      onOutcomeClick={onOutcomeClick}
                    />
                  ) : (
                    <div className="h-9" />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
