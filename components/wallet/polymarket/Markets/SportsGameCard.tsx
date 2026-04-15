'use client';

import Image from 'next/image';
import type { SportsGameGroup, ParsedOutcome } from '@/lib/polymarket/sports-grouping';
import type { PolymarketMarket } from '@/hooks/polymarket';
import { findTeam, FALLBACK_TEAM_COLOR } from '@/lib/polymarket/sports-teams';
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
  return line ? `${abbrev} ${line}` : abbrev;
}

/** 0.47 → "47¢",  0.50 → "50¢" */
function centsPrice(price: number): string {
  if (price <= 0) return '';
  return `${Math.round(price * 100)}¢`;
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
  if (diffMin <= 60) return { label: `~${Math.round(diffMin)}m`, status: 'imminent' };
  return {
    label: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    status: 'upcoming',
  };
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
    : (fullName.trim().split(/\s+/)[0] ?? '').slice(0, 3).toUpperCase();

  return { abbrev, color: FALLBACK_TEAM_COLOR };
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
  logoUrl,
  disabled,
  market,
  onOutcomeClick,
}: {
  outcome: ParsedOutcome;
  abbrev: string;
  color: string;
  logoUrl: string | undefined;
  disabled: boolean;
  market: PolymarketMarket;
  onOutcomeClick: SportsGameCardProps['onOutcomeClick'];
}) {
  const isDisabled = disabled || market.closed || !outcome.tokenId;
  return (
    <button
      disabled={isDisabled}
      onClick={() => onOutcomeClick(market, outcome.label, outcome.price, outcome.tokenId)}
      style={isDisabled || logoUrl ? undefined : { backgroundColor: color }}
      className={`h-9 w-full flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-opacity ${
        isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : logoUrl
            ? 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800'
            : 'text-white hover:opacity-90 active:opacity-75'
      }`}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={abbrev}
          width={20}
          height={20}
          className="w-5 h-5 object-contain"
          unoptimized
        />
      ) : (
        abbrev
      )}
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
      onClick={() => onOutcomeClick(market, outcome.label, outcome.price, outcome.tokenId)}
      className={`h-9 w-full flex items-center justify-between px-2 rounded-lg text-xs transition-colors bg-gray-100 ${
        isDisabled
          ? 'text-gray-300 cursor-not-allowed'
          : 'hover:bg-gray-200 active:bg-gray-300 text-gray-700 cursor-pointer'
      }`}
    >
      <span className="font-medium truncate mr-1">{outcome.label}</span>
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
  const { label: timeLabel, status } = formatGameTime(game.startDate);

  // Raw outcome data for each team
  const mlA = game.moneyline?.outcomes[0];
  const mlB = game.moneyline?.outcomes[1];
  const spA = game.spread?.outcomes[0];
  const spB = game.spread?.outcomes[1];
  const totA = game.total?.outcomes[0];
  const totB = game.total?.outcomes[1];

  // Resolve team abbrev + colour using static metadata lookup (always available)
  const teamA = resolveTeam(mlA?.label, spA?.label, game.teamA);
  const teamB = resolveTeam(mlB?.label, spB?.label, game.teamB);

  // Short team display name comes from the moneyline outcome label (e.g. "Magic")
  const nameA = mlA?.label ?? game.teamA;
  const nameB = mlB?.label ?? game.teamB;

  // Live logo URLs injected from the Gamma /teams API (undefined = not loaded yet)
  const logoA = game.teamALogo;
  const logoB = game.teamBLogo;

  const volume = formatVolume(
    game.moneyline?.market?.volume24hr ?? game.moneyline?.market?.volume,
  );

  return (
    <Card className="px-3 py-2.5 overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: time + volume */}
        <div className="flex items-center gap-2 text-[11px]">
          {status && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                status === 'live'
                  ? 'text-red-500'
                  : status === 'imminent'
                    ? 'text-orange-500'
                    : 'text-gray-500'
              }`}
            >
              {status === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {timeLabel}
            </span>
          )}
          {volume && <span className="text-green-600 font-medium">{volume}</span>}
        </div>

        {/* Right: column labels — use flex-1 per label to match the cells below */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
          {/* spacer that matches the team-info column below */}
          <div className="w-[92px]" />
          <span className="flex-1 text-center min-w-[64px]">Moneyline</span>
          <span className="flex-1 text-center min-w-[64px]">Spread</span>
          <span className="flex-1 text-center min-w-[64px]">Total</span>
        </div>
      </div>

      <div className="border-t border-gray-100 mb-1" />

      {/* ── Team rows ────────────────────────────────────────────────────── */}
      {(
        [
          { team: teamA, name: nameA, logoUrl: logoA, ml: mlA, sp: spA, tot: totA },
          { team: teamB, name: nameB, logoUrl: logoB, ml: mlB, sp: spB, tot: totB },
        ] as const
      ).map(({ team, name, logoUrl, ml, sp, tot }, i) => {
        // Reformat the spread label: always use the team abbreviation regardless
        // of whether the raw label is a nickname ("Magic"), abbrev+line ("ORL +1.5"),
        // or a bare line ("+1.5"). Result: "ORL", "ORL +1.5", "PHI -1.5", etc.
        const spFormatted = sp
          ? { ...sp, label: spreadLabel(team.abbrev, sp.label) }
          : undefined;

        return (
        <div key={i} className={`flex items-center gap-1 ${i === 0 ? 'mb-1' : ''}`}>
          {/* Team badge + name — fixed width so column labels stay aligned */}
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[92px] min-w-0">
            <TeamBadge logoUrl={logoUrl} abbrev={team.abbrev} color={team.color} />
            <span className="text-xs font-semibold text-gray-800 truncate">{name}</span>
          </div>

          {/* Market cells — flex-1 so they fill remaining space and column labels align */}
          <div className="flex gap-1 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              {ml && game.moneyline ? (
                <MoneylineBtn
                  outcome={ml}
                  abbrev={team.abbrev}
                  color={team.color}
                  logoUrl={logoUrl}
                  disabled={disabled}
                  market={game.moneyline.market}
                  onOutcomeClick={onOutcomeClick}
                />
              ) : (
                <div className="h-9" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {spFormatted && game.spread ? (
                <MarketCell
                  outcome={spFormatted}
                  disabled={disabled}
                  market={game.spread.market}
                  onOutcomeClick={onOutcomeClick}
                />
              ) : (
                <div className="h-9" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {tot && game.total ? (
                <MarketCell
                  outcome={tot}
                  disabled={disabled}
                  market={game.total.market}
                  onOutcomeClick={onOutcomeClick}
                />
              ) : (
                <div className="h-9" />
              )}
            </div>
          </div>
        </div>
        );
      })}
    </Card>
  );
}
