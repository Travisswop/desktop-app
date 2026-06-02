'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTrading } from '@/providers/polymarket';
import {
  useSportsEvents,
  type UseSportsEventsOptions,
} from '@/hooks/polymarket/useSportsEvents';
import { usePolymarketTeams } from '@/hooks/polymarket/usePolymarketTeams';
import { useUserPositions } from '@/hooks/polymarket';
import {
  groupFlatMarketsIntoGames,
  enrichGamesWithTeamLogos,
  isValidGameCard,
  type SportsGameGroup,
  type ParsedOutcome,
} from '@/lib/polymarket/sports-grouping';
import {
  findTeam,
  FALLBACK_TEAM_COLOR,
} from '@/lib/polymarket/sports-teams';
import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  useMarketDetailStore,
  marketRouteKey,
} from '@/zustandStore/marketDetailStore';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';

// ─── Single source of truth for the A2 hairline / mono helpers ──────────────
const HAIR = 'rgba(0,0,0,0.06)';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const LIVE_RED = '#ff5a5f';

// Sportsbook column template — matches wire-a2-sports.jsx exactly.
// Mobile widths shrink the right columns to fit; desktop matches A2.
const COLS_DESKTOP = '1fr 92px 100px 100px';
const COLS_MOBILE = '1fr 72px 78px 78px';

interface FuturesMarketGroup {
  id: string;
  title: string;
  markets: PolymarketMarket[];
}

interface FuturesOutcomeRow {
  label: string;
  price: number;
  tokenId: string;
}

function parseJsonArray<T>(raw: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function getFuturesOutcomeRows(
  market: PolymarketMarket,
): FuturesOutcomeRow[] {
  const outcomes = parseJsonArray<string>(market.outcomes);
  const staticPrices = parseJsonArray<string | number>(
    market.outcomePrices,
  ).map(Number);
  const tokenIds = parseJsonArray<string>(market.clobTokenIds);

  return outcomes.map((label, index) => {
    const tokenId = tokenIds[index] ?? '';
    const realtime = tokenId ? market.realtimePrices?.[tokenId] : undefined;
    const price =
      realtime?.midPrice ??
      realtime?.askPrice ??
      realtime?.bidPrice ??
      staticPrices[index] ??
      0;
    return { label, price, tokenId };
  });
}

function groupFuturesMarkets(
  markets: PolymarketMarket[],
): FuturesMarketGroup[] {
  const groups = new Map<string, FuturesMarketGroup>();

  for (const market of markets) {
    const title =
      (market.eventTitle as string | undefined) ||
      (market.events?.[0]?.title as string | undefined) ||
      'Futures';
    const id =
      (market.eventId as string | undefined) ||
      (market.eventSlug as string | undefined) ||
      title;
    if (!groups.has(id)) groups.set(id, { id, title, markets: [] });
    groups.get(id)!.markets.push(market);
  }

  return Array.from(groups.values());
}

function formatCents(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '--';
  return `${Math.round(price * 100)}¢`;
}

interface SportsTableViewProps {
  /** Polymarket tag ID for the active sport ("All" passes the parent
   *  sports tag). */
  tagId?: number | null;
  /** "Live" filter chip — backend returns only live events when true. */
  liveOnly?: boolean;
  /** "Game lines" / "Futures" filter chip. */
  kind?: UseSportsEventsOptions['kind'];
  /** ISO timestamp from the active date strip cell. */
  dateFrom?: string;
  /** ISO timestamp from the next date strip cell (exclusive upper bound). */
  dateTo?: string;
}

/**
 * Single-column sportsbook table (wireframe screen A2). Renders games as
 * flat hairline-divided rows inside the parent A2 card — replaces the
 * two-column grid of SportsGameCard cards used elsewhere.
 *
 * The parent card wraps everything; this component owns the column header
 * + game rows and is intentionally chrome-less (no padding, no border) so
 * it slots cleanly under the A2 chrome rows (league pills, sub-filter, date).
 */
export default function SportsTableView({
  tagId,
  liveOnly,
  kind,
  dateFrom,
  dateTo,
}: SportsTableViewProps) {
  const isFutures = kind === 'futures';
  const { isGeoblocked, safeAddress, portfolioAddresses } = useTrading();
  const { data: teamsData } = usePolymarketTeams();
  const { data: positions } = useUserPositions(
    portfolioAddresses.length ? portfolioAddresses : safeAddress,
  );

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSportsEvents({
    tagId,
    live: liveOnly,
    kind,
    dateFrom,
    dateTo,
  });

  const allMarkets = useMemo(() => data?.pages.flat() ?? [], [data]);
  const futuresGroups = useMemo(
    () => groupFuturesMarkets(allMarkets),
    [allMarkets],
  );
  const games = useMemo(() => {
    const grouped = groupFlatMarketsIntoGames(allMarkets).filter(
      isValidGameCard,
    );
    return teamsData
      ? enrichGamesWithTeamLogos(grouped, teamsData)
      : grouped;
  }, [allMarkets, teamsData]);

  // Infinite-scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Outcome clicks navigate to the market detail page with the clicked side
  // preselected. The market is stashed in the zustand hand-off store so the
  // page can read it without a separate fetch.
  const router = useRouter();
  const stashMarketDetail = useMarketDetailStore((s) => s.set);

  const handleOutcomeClick = useCallback(
    (
      market: PolymarketMarket,
      outcome: string,
      _price: number,
      tokenId: string,
    ) => {
      const tokenIds: string[] = market.clobTokenIds
        ? JSON.parse(market.clobTokenIds)
        : [];
      const yesTokenId = tokenIds[0] || tokenId;
      const isFirstOutcome = tokenId === yesTokenId;

      let outcomeLabels: [string, string] | undefined;
      const isSpreadLine = /^[+-]\d/.test(outcome);
      if (isSpreadLine) {
        const other = outcome.startsWith('+')
          ? '-' + outcome.slice(1)
          : '+' + outcome.slice(1);
        outcomeLabels = isFirstOutcome
          ? [outcome, other]
          : [other, outcome];
      }

      const tIds = tokenIds;
      const yesShares =
        positions?.find((p) => p.asset === tIds[0])?.size || 0;
      const noShares =
        positions?.find((p) => p.asset === tIds[1])?.size || 0;

      const key = marketRouteKey(market);
      if (!key) return;
      stashMarketDetail(key, {
        market,
        initialOutcome: isFirstOutcome ? 'yes' : 'no',
        outcomeLabels,
        yesShares,
        noShares,
      });
      router.push(`/prediction/market/${encodeURIComponent(key)}`);
    },
    [positions, router, stashMarketDetail],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const visibleItemCount = isFutures ? allMarkets.length : games.length;

  if (isLoading && visibleItemCount === 0) {
    return (
      <div className="px-4 py-6">
        <LoadingState
          message={isFutures ? 'Loading futures...' : 'Loading games...'}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          error={error}
          title={isFutures ? 'Error loading futures' : 'Error loading games'}
        />
      </div>
    );
  }

  if (!isLoading && visibleItemCount === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          title={isFutures ? 'No futures' : 'No games'}
          message={
            isFutures
              ? 'No futures markets found for the selected league.'
              : liveOnly
              ? 'No games are live right now. Try a different filter.'
              : 'No games on this date for the selected league. Try another day.'
          }
        />
      </div>
    );
  }

  if (isFutures) {
    return (
      <>
        {futuresGroups.map((group, groupIndex) => (
          <FuturesMarketGroupRows
            key={group.id}
            group={group}
            firstGroup={groupIndex === 0}
            disabled={isGeoblocked}
            onOutcomeClick={handleOutcomeClick}
          />
        ))}

        {(hasNextPage || isFetchingNextPage) && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400 border-t"
            style={{ borderColor: HAIR }}
          >
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading more futures...
          </div>
        )}
        {!hasNextPage && allMarkets.length > 0 && (
          <div
            className="text-center text-[11px] text-gray-400 py-3 border-t"
            style={{ borderColor: HAIR }}
          >
            All {allMarkets.length} futures loaded
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Column header — MATCHUP / MONEYLINE / SPREAD / TOTAL */}
      <div
        className="hidden sm:grid px-4 sm:px-[18px] py-2 border-b text-[9.5px] font-bold uppercase text-gray-500"
        style={{
          gridTemplateColumns: COLS_DESKTOP,
          columnGap: 10,
          letterSpacing: 0.6,
          borderColor: HAIR,
          fontFamily: MONO,
        }}
      >
        <span>Matchup</span>
        <span className="text-center">Moneyline</span>
        <span className="text-center">Spread</span>
        <span className="text-center">Total</span>
      </div>

      {/* Game rows */}
      {games.map((game, gi) => (
        <SportsTableRow
          key={game.eventId}
          game={game}
          firstRow={gi === 0}
          disabled={isGeoblocked}
          onOutcomeClick={handleOutcomeClick}
        />
      ))}

      {/* Infinite-scroll sentinel + footer status */}
      {(hasNextPage || isFetchingNextPage) && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4 gap-2 text-sm text-gray-400 border-t"
          style={{ borderColor: HAIR }}
        >
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading more games...
        </div>
      )}
      {!hasNextPage && games.length > 0 && (
        <div
          className="text-center text-[11px] text-gray-400 py-3 border-t"
          style={{ borderColor: HAIR }}
        >
          All {games.length} games loaded
        </div>
      )}

    </>
  );
}

function FuturesMarketGroupRows({
  group,
  firstGroup,
  disabled,
  onOutcomeClick,
}: {
  group: FuturesMarketGroup;
  firstGroup: boolean;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  return (
    <div style={firstGroup ? undefined : { borderTop: `1px solid ${HAIR}` }}>
      <div
        className="px-4 sm:px-[18px] py-2.5 flex items-center justify-between gap-3"
        style={{
          background: '#fafafa',
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase text-gray-500"
            style={{ fontFamily: MONO }}
          >
            Futures
          </div>
          <div className="text-[14px] sm:text-[15px] font-semibold text-gray-900 truncate">
            {group.title}
          </div>
        </div>
        <div
          className="text-[10.5px] font-semibold text-gray-500 shrink-0"
          style={{ fontFamily: MONO }}
        >
          {group.markets.length} markets
        </div>
      </div>

      {group.markets.map((market, marketIndex) => (
        <FuturesMarketRow
          key={market.id}
          market={market}
          firstRow={marketIndex === 0}
          disabled={disabled}
          onOutcomeClick={onOutcomeClick}
        />
      ))}
    </div>
  );
}

function FuturesMarketRow({
  market,
  firstRow,
  disabled,
  onOutcomeClick,
}: {
  market: PolymarketMarket;
  firstRow: boolean;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  const outcomes = getFuturesOutcomeRows(market);
  const icon = market.icon || market.image || market.eventIcon;
  const isClosed = market.closed || market.active === false;

  return (
    <div
      className="px-4 sm:px-[18px] py-3.5 grid gap-3 sm:grid-cols-[1fr_minmax(260px,360px)] sm:items-center"
      style={firstRow ? undefined : { borderTop: `1px solid ${HAIR}` }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <Image
            src={icon}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[14px] sm:text-[15px] font-semibold text-gray-900 leading-snug">
            {market.question}
          </div>
          <div
            className="mt-1 text-[10.5px] text-gray-500 font-semibold"
            style={{ fontFamily: MONO }}
          >
            {market.eventTitle || 'NBA futures'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {outcomes.slice(0, 4).map((outcome, index) => {
          const isYes =
            outcome.label.toLowerCase() === 'yes' ||
            (outcomes.length === 2 && index === 0);
          return (
            <button
              key={outcome.tokenId || `${market.id}-${index}`}
              type="button"
              disabled={disabled || isClosed || !outcome.tokenId}
              onClick={() =>
                onOutcomeClick(
                  market,
                  outcome.label,
                  outcome.price,
                  outcome.tokenId,
                )
              }
              className={`min-h-12 rounded-[12px] border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                disabled || isClosed || !outcome.tokenId
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : isYes
                    ? 'bg-emerald-50 text-gray-900 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
              }`}
              style={{
                borderColor: isYes ? 'rgba(25,169,116,0.38)' : HAIR,
              }}
            >
              <span className="font-semibold text-[13px] truncate">
                {outcome.label}
              </span>
              <span
                className={`font-bold text-[14px] tabular-nums ${
                  isYes ? 'text-emerald-600' : 'text-gray-700'
                }`}
                style={{ fontFamily: MONO }}
              >
                {formatCents(outcome.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SportsTableRow — one game block. Header row (LIVE indicator / time / sport)
// then two team rows with column-aligned ML / Spread / Total buttons.
// ────────────────────────────────────────────────────────────────────────────

function SportsTableRow({
  game,
  firstRow,
  disabled,
  onOutcomeClick,
}: {
  game: SportsGameGroup;
  firstRow: boolean;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  // Source one of the moneyline / spread / total markets to pull
  // event-level live metadata from (set on every market by the backend).
  const anyMarket =
    game.moneyline?.market ??
    game.spread?.market ??
    game.total?.market;

  const isLive = Boolean(anyMarket?.eventLive);
  const liveLabel = useMemo(() => {
    if (!isLive) return null;
    const period = anyMarket?.eventPeriod ?? null;
    const elapsed = anyMarket?.eventElapsed ?? null;
    if (period && elapsed) return `${period} · ${elapsed}`;
    return period || elapsed || 'NOW';
  }, [isLive, anyMarket]);

  const startTimeLabel = useMemo(
    () => formatStartTime(game.startDate),
    [game.startDate],
  );

  // Resolve team metadata (abbrev + colour + logo) for both sides.
  const mlA = game.moneyline?.outcomes[0];
  const mlB = game.moneyline?.outcomes[1];
  const spA = game.spread?.outcomes[0];
  const spB = game.spread?.outcomes[1];
  const totA = game.total?.outcomes[0];
  const totB = game.total?.outcomes[1];

  const teamA = resolveTeam(
    game.teamAMeta?.abbrev,
    game.teamAMeta?.color,
    mlA?.label,
    spA?.label,
    game.teamA,
  );
  const teamB = resolveTeam(
    game.teamBMeta?.abbrev,
    game.teamBMeta?.color,
    mlB?.label,
    spB?.label,
    game.teamB,
  );
  const logoA = game.teamAMeta?.logoUrl ?? game.teamALogo;
  const logoB = game.teamBMeta?.logoUrl ?? game.teamBLogo;

  return (
    <div
      className="px-4 sm:px-[18px] py-3.5"
      style={firstRow ? undefined : { borderTop: `1px solid ${HAIR}` }}
    >
      {/* Game meta row — LIVE indicator or kickoff time + league name */}
      <div
        className="flex items-center justify-between mb-2 pb-2"
        style={{ borderBottom: `1px dashed ${HAIR}` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isLive ? (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.5px]"
              style={{ color: LIVE_RED, fontFamily: MONO }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: LIVE_RED }}
              />
              LIVE{liveLabel ? ` · ${liveLabel}` : ''}
            </span>
          ) : (
            <span
              className="text-[10.5px] font-semibold tracking-[0.5px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              {startTimeLabel}
            </span>
          )}
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-500 font-medium truncate">
            {game.title}
          </span>
        </div>
      </div>

      {/* Team rows */}
      <TeamRow
        team={teamA}
        name={mlA?.label ?? game.teamA}
        record={game.teamAMeta?.record}
        logoUrl={logoA}
        ml={mlA}
        sp={spA}
        tot={totA}
        mlMarket={game.moneyline?.market ?? null}
        spMarket={game.spread?.market ?? null}
        totMarket={game.total?.market ?? null}
        disabled={disabled}
        onOutcomeClick={onOutcomeClick}
      />
      <div className="h-1" />
      <TeamRow
        team={teamB}
        name={mlB?.label ?? game.teamB}
        record={game.teamBMeta?.record}
        logoUrl={logoB}
        ml={mlB}
        sp={spB}
        tot={totB}
        mlMarket={game.moneyline?.market ?? null}
        spMarket={game.spread?.market ?? null}
        totMarket={game.total?.market ?? null}
        disabled={disabled}
        onOutcomeClick={onOutcomeClick}
      />
    </div>
  );
}

// ── Single team row (logo + name | ML | Spread | Total) ────────────────────

interface TeamRowProps {
  team: { abbrev: string; color: string };
  name: string;
  record?: string;
  logoUrl?: string;
  ml?: ParsedOutcome;
  sp?: ParsedOutcome;
  tot?: ParsedOutcome;
  mlMarket: PolymarketMarket | null;
  spMarket: PolymarketMarket | null;
  totMarket: PolymarketMarket | null;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}

function TeamRow({
  team,
  name,
  record,
  logoUrl,
  ml,
  sp,
  tot,
  mlMarket,
  spMarket,
  totMarket,
  disabled,
  onOutcomeClick,
}: TeamRowProps) {
  // Spread labels: prefer just the line ("+4.5", "-4.5") for a clean cell.
  const spLine = sp ? extractSpreadLine(sp.label) || sp.label : '';
  const totLine = tot?.label;

  return (
    <>
      {/* Desktop / tablet — A2 grid */}
      <div
        className="hidden sm:grid items-center"
        style={{ gridTemplateColumns: COLS_DESKTOP, columnGap: 10 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <TeamBadge logoUrl={logoUrl} abbrev={team.abbrev} color={team.color} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold tracking-[-0.3px] text-gray-900 truncate">
              {name}
            </div>
            <div
              className="text-[10.5px] text-gray-500 font-semibold mt-0.5"
              style={{ fontFamily: MONO }}
            >
              {team.abbrev}
              {record ? `  ·  ${record}` : ''}
            </div>
          </div>
        </div>

        <OddsButton
          primary={formatProbabilityPct(ml?.price)}
          disabled={disabled || !ml || !mlMarket}
          onClick={() =>
            ml &&
            mlMarket &&
            onOutcomeClick(mlMarket, ml.label, ml.price, ml.tokenId)
          }
        />
        <OddsButton
          primary={spLine}
          sub={formatProbabilityPct(sp?.price) || undefined}
          disabled={disabled || !sp || !spMarket}
          onClick={() =>
            sp &&
            spMarket &&
            onOutcomeClick(spMarket, sp.label, sp.price, sp.tokenId)
          }
        />
        <OddsButton
          primary={totLine ?? ''}
          sub={totLine ? formatProbabilityPct(tot?.price) || undefined : undefined}
          disabled={disabled || !tot || !totMarket}
          onClick={() =>
            tot &&
            totMarket &&
            onOutcomeClick(totMarket, tot.label, tot.price, tot.tokenId)
          }
        />
      </div>

      {/* Mobile — narrower grid (same shape, smaller buttons) */}
      <div
        className="sm:hidden grid items-center"
        style={{ gridTemplateColumns: COLS_MOBILE, columnGap: 6 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge logoUrl={logoUrl} abbrev={team.abbrev} color={team.color} />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-[-0.2px] text-gray-900 truncate">
              {name}
            </div>
            <div
              className="text-[10px] text-gray-500 font-semibold mt-0.5"
              style={{ fontFamily: MONO }}
            >
              {team.abbrev}
              {record ? ` · ${record}` : ''}
            </div>
          </div>
        </div>

        <OddsButton
          primary={formatProbabilityPct(ml?.price)}
          compact
          disabled={disabled || !ml || !mlMarket}
          onClick={() =>
            ml &&
            mlMarket &&
            onOutcomeClick(mlMarket, ml.label, ml.price, ml.tokenId)
          }
        />
        <OddsButton
          primary={spLine}
          sub={formatProbabilityPct(sp?.price) || undefined}
          compact
          disabled={disabled || !sp || !spMarket}
          onClick={() =>
            sp &&
            spMarket &&
            onOutcomeClick(spMarket, sp.label, sp.price, sp.tokenId)
          }
        />
        <OddsButton
          primary={totLine ?? ''}
          sub={totLine ? formatProbabilityPct(tot?.price) || undefined : undefined}
          compact
          disabled={disabled || !tot || !totMarket}
          onClick={() =>
            tot &&
            totMarket &&
            onOutcomeClick(totMarket, tot.label, tot.price, tot.tokenId)
          }
        />
      </div>
    </>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function TeamBadge({
  logoUrl,
  abbrev,
  color,
}: {
  logoUrl?: string;
  abbrev: string;
  color: string;
}) {
  if (logoUrl) {
    return (
      <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
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
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white text-[10px] font-extrabold tracking-wide shrink-0"
      style={{ backgroundColor: color }}
    >
      {abbrev}
    </span>
  );
}

function OddsButton({
  primary,
  sub,
  disabled,
  compact = false,
  onClick,
}: {
  primary: string;
  sub?: string;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  if (!primary) {
    return <div className={compact ? 'h-9' : 'h-10'} aria-hidden />;
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${
        compact ? 'h-9 px-1' : 'h-10 px-2'
      } w-full rounded-[10px] border bg-white flex flex-col items-center justify-center leading-tight transition-colors ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer'
      }`}
      style={{ borderColor: HAIR }}
    >
      <span
        className={`${
          compact ? 'text-[12px]' : 'text-[13px]'
        } font-semibold text-gray-900 tabular-nums`}
        style={{ fontFamily: MONO }}
      >
        {primary}
      </span>
      {sub && (
        <span
          className={`${
            compact ? 'text-[9px]' : 'text-[10px]'
          } text-gray-500 font-medium tabular-nums`}
          style={{ fontFamily: MONO }}
        >
          {sub}
        </span>
      )}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Format a 0-1 probability as a whole-percent string (e.g. 0.64 → "64%").
 *  Polymarket prices both sides of every market as probabilities, so this is
 *  the honest unit to show — sportsbook-style American odds and a hardcoded
 *  −110 vig don't apply here. */
function formatProbabilityPct(price: number | undefined): string {
  if (price == null || !Number.isFinite(price) || price <= 0 || price >= 1)
    return '';
  return `${Math.round(price * 100)}%`;
}

/** Extract just the ±line from a spread label.
 *   "ORL +1.5"  → "+1.5"
 *   "+1.5"      → "+1.5"
 *   "Magic"     → ""        */
function extractSpreadLine(label: string): string {
  const m = label.match(/([+-]\d+\.?\d*)$/);
  return m ? m[1] : '';
}

/**
 * Compact start-time label for non-live games (e.g. "Today 7:30 PM",
 * "Tue 8:00 PM ET"). Falls back to the raw ISO when parsing fails.
 */
function formatStartTime(startDate: string | undefined): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  if (isToday) return `${time} ET`;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${day} ${time} ET`;
}

/**
 * Resolve team abbreviation + brand colour with priority:
 *   1. Polymarket event-level metadata (already on the game group)
 *   2. Static NBA/NFL/MLB/NHL map via findTeam
 *   3. First three letters of the team name
 */
function resolveTeam(
  metaAbbrev: string | undefined,
  metaColor: string | undefined,
  mlLabel: string | undefined,
  spLabel: string | undefined,
  fullName: string,
): { abbrev: string; color: string } {
  if (metaAbbrev) {
    return {
      abbrev: metaAbbrev,
      color: metaColor || FALLBACK_TEAM_COLOR,
    };
  }
  const candidate = mlLabel?.trim() ?? '';
  if (candidate && !/\s/.test(candidate)) {
    const byName = findTeam(candidate);
    if (byName) return { abbrev: byName.abbrev, color: byName.color };
  }
  const bySpread = findTeam(spLabel ?? '');
  if (bySpread)
    return { abbrev: bySpread.abbrev, color: bySpread.color };
  return {
    abbrev: (fullName ?? '')
      .trim()
      .replace(/\s+/g, '')
      .slice(0, 3)
      .toUpperCase(),
    color: FALLBACK_TEAM_COLOR,
  };
}
