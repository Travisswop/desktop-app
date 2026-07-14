'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import {
  DEFAULT_SPORT_SUBCATEGORY,
  type CategoryId,
  type SportSubcategoryId,
  getCategoryById,
  getSportSubcategoryById,
} from '@/constants/polymarket';
import {
  useMarkets,
  useSportsEvents,
  type PolymarketMarket,
} from '@/hooks/polymarket';
import { usePolymarketTeams } from '@/hooks/polymarket/usePolymarketTeams';
import { useSportsMeta } from '@/hooks/polymarket/useSportsMeta';
import {
  groupFlatMarketsIntoGames,
  enrichGamesWithTeamLogos,
  isValidGameCard,
  type SportsGameGroup,
} from '@/lib/polymarket/sports-grouping';
import { orderSportsMarkets } from '@/lib/polymarket/sports-ordering';

interface BrowseMarketsBentoProps {
  /** Click any market title or non-sports outcome → opens detail modal */
  onMarketClick: (market: PolymarketMarket) => void;
  /** Click a sports outcome (ML / spread / total cell) */
  onSportsOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
  /** Click a compact sports game / odds grid → opens the game odds sheet */
  onSportsGameClick?: (game: SportsGameGroup) => void;
  /** "View all →" chip in the Sports hero — drills into Sports detail (screen A2) */
  onBrowseSports?: (sportSub: SportSubcategoryId) => void;
  /** "Browse" button on a category card — drills into that category detail */
  onBrowseCategory?: (id: CategoryId) => void;
}

const HAIR = 'rgba(0,0,0,0.06)';
const HAIR2 = 'rgba(0,0,0,0.04)';
const POS_GREEN = '#19a974';
const POS_GREEN_SOFT = 'rgba(25,169,116,0.10)';
const NEG_RED = '#e5484d';
const NEG_RED_SOFT = 'rgba(229,72,77,0.08)';
const LIVE_RED = '#ff5a5f';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const BENTO_PREFETCH_ROOT_MARGIN = '900px 0px';
const BENTO_REFETCH_INTERVAL_MS = 30_000;

// Categories rendered in the lower bento grid (sports gets the full-width
// hero above, so it's excluded here). "Trending" is also excluded — it has
// no canonical tag and would just duplicate the others.
const BENTO_CATEGORIES: {
  id: CategoryId;
  tone: string;
}[] = [
  { id: 'politics', tone: '#3548e3' },
  { id: 'elections', tone: '#4b5eea' },
  { id: 'world', tone: '#2f6dd8' },
  { id: 'middle-east', tone: '#8b5cf6' },
  { id: 'geopolitics', tone: '#9b6cf2' },
  { id: 'crypto', tone: '#f08c2e' },
  { id: 'business', tone: '#0e7c66' },
  { id: 'ai', tone: '#0a0a0c' },
  { id: 'tech', tone: '#0a0a0c' },
  { id: 'economy', tone: '#c4501a' },
  { id: 'finance', tone: '#0e7c66' },
  { id: 'culture', tone: '#e15d9f' },
  { id: 'weather', tone: '#348fce' },
  { id: 'science', tone: '#4f8f41' },
];

// Sport tabs shown inside the sports hero card.
export const SPORT_TABS: SportSubcategoryId[] = [
  'all',
  'nba',
  'wnba',
  'nfl',
  'cfb',
  'mlb',
  'nhl',
  'soccer',
  'f1',
  'mma',
  'tennis',
];

// ─── Helpers ────────────────────────────────────────────────────────

function formatVol(raw: string | number | undefined): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : (raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function getYesPrice(market: PolymarketMarket): number {
  try {
    const prices = JSON.parse(
      market.outcomePrices ?? '[]',
    ) as string[];
    const yes = parseFloat(prices[0] ?? '0');
    return Number.isFinite(yes) ? yes : 0;
  } catch {
    return 0;
  }
}

function getYesTokenId(market: PolymarketMarket): string {
  try {
    const ids = JSON.parse(market.clobTokenIds ?? '[]') as string[];
    return ids[0] ?? '';
  } catch {
    return '';
  }
}

function getNoTokenId(market: PolymarketMarket): string {
  try {
    const ids = JSON.parse(market.clobTokenIds ?? '[]') as string[];
    return ids[1] ?? '';
  } catch {
    return '';
  }
}

function gameTimeLabel(startDate: string | undefined): {
  label: string;
  isLive: boolean;
} {
  if (!startDate) return { label: '', isLive: false };
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return { label: '', isLive: false };
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return { label: 'LIVE', isLive: true };
  const hrs = ms / 3_600_000;
  if (hrs < 1)
    return {
      label: `${Math.max(1, Math.round(ms / 60_000))}m`,
      isLive: false,
    };
  if (hrs < 24) {
    return {
      label: d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      isLive: false,
    };
  }
  return {
    label: d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    isLive: false,
  };
}

/** Format a 0-1 probability as a whole-percent string (0.64 → "64%").
 *  Polymarket prices both sides as probabilities, so percentages are the
 *  honest unit — sportsbook-style American odds and a "−110" vig don't
 *  apply here. */
function priceToPct(price: number | undefined): string {
  if (price == null || !Number.isFinite(price) || price <= 0 || price >= 1)
    return '—';
  return `${Math.round(price * 100)}%`;
}

function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    if (isNearViewport) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: BENTO_PREFETCH_ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isNearViewport]);

  return [ref, isNearViewport] as const;
}

/** "+1.5" / "-1.5" style spread label — pulls the line off the outcome. */
function compactSpreadLine(label: string): string {
  const m = label.match(/[+-]\d+\.?\d*/);
  return m ? m[0] : label;
}

// ─── Subcomponents ──────────────────────────────────────────────────

function CategoryDot({ tone }: { tone: string }) {
  return (
    <span
      className="w-2 h-2 rounded-sm flex-shrink-0"
      style={{ background: tone }}
    />
  );
}

interface OddsPillProps {
  tone: 'yes' | 'no';
  cents: number;
  onClick: () => void;
  disabled?: boolean;
}

function OddsPill({ tone, cents, onClick, disabled }: OddsPillProps) {
  const palette =
    tone === 'yes'
      ? {
          bg: POS_GREEN_SOFT,
          fg: POS_GREEN,
          border: 'rgba(25,169,116,0.2)',
        }
      : {
          bg: NEG_RED_SOFT,
          fg: NEG_RED,
          border: 'rgba(229,72,77,0.2)',
        };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center px-2 py-1.5 rounded-[10px] border min-w-[56px] hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
        fontFamily: MONO,
      }}
    >
      <span className="text-[13px] font-semibold tabular-nums leading-none tracking-tight">
        {cents}¢
      </span>
      <span className="text-[9px] font-semibold tracking-[0.4px] uppercase opacity-70 mt-1">
        {tone}
      </span>
    </button>
  );
}

interface CompactSportsOutcome {
  label: string;
  price: number;
  tokenId: string;
}

export function getCompactSportsOutcomeSelection(
  market: PolymarketMarket | undefined,
  outcome: CompactSportsOutcome | undefined,
  eventFinal: boolean,
) {
  if (!market || !outcome || eventFinal) return null;
  return {
    market,
    outcome: outcome.label,
    price: outcome.price,
    tokenId: outcome.tokenId,
  };
}

interface CompactGameCardProps {
  game: SportsGameGroup;
  onOutcomeClick: BrowseMarketsBentoProps['onSportsOutcomeClick'];
  onGameClick?: BrowseMarketsBentoProps['onSportsGameClick'];
  withRightBorder?: boolean;
}

/**
 * Compact sportsbook-style game card for the bento preview. Shows ML /
 * Spread / Total in a 4-column grid (team · ML · Spread · Total),
 * mirroring wire-a-feed.jsx's preview within the Sports hero.
 */
function CompactGameCard({
  game,
  onOutcomeClick,
  onGameClick,
  withRightBorder,
}: CompactGameCardProps) {
  const { label: scheduledLabel, isLive: scheduledLive } = gameTimeLabel(game.startDate);
  const eventPeriod = game.eventPeriod ?? null;
  const eventScore = game.eventScore ?? null;
  const eventFinal = Boolean(
    game.eventEnded ||
      game.eventClosed ||
      /^(ft|final)$/i.test(String(eventPeriod || '').trim()),
  );
  const isLive = Boolean(!eventFinal && (game.eventLive || scheduledLive));
  const timeLabel = eventFinal
    ? `FINAL${eventScore ? ` · ${eventScore}` : ''}`
    : isLive
      ? 'LIVE'
      : scheduledLabel;
  const ml = game.moneyline;
  const sp = game.spread;
  const tot = game.total;

  const teamRows = useMemo(() => {
    // Determine which outcome (index 0 or 1) belongs to teamA vs teamB.
    const matchOutcomeForTeam = (
      teamName: string,
      outcomes:
        | { label: string; price: number; tokenId: string }[]
        | undefined,
    ) => {
      if (!outcomes) return undefined;
      const lower = teamName.toLowerCase();
      const match = outcomes.find(
        (o) =>
          lower.includes(o.label.toLowerCase()) ||
          o.label
            .toLowerCase()
            .includes(lower.split(' ').pop() ?? lower),
      );
      return match ?? outcomes[0];
    };

    return [
      {
        team: game.teamA,
        meta: game.teamAMeta,
        logo: game.teamALogo,
        ml: matchOutcomeForTeam(game.teamA, ml?.outcomes),
        spread: sp?.outcomes?.[0],
        total: tot?.outcomes?.[0],
      },
      {
        team: game.teamB,
        meta: game.teamBMeta,
        logo: game.teamBLogo,
        ml: matchOutcomeForTeam(game.teamB, ml?.outcomes),
        spread: sp?.outcomes?.[1],
        total: tot?.outcomes?.[1],
      },
    ];
  }, [game, ml, sp, tot]);

  const openOutcome = (
    market: PolymarketMarket | undefined,
    outcome:
      | { label: string; price: number; tokenId: string }
      | undefined,
  ) => {
    const selection = getCompactSportsOutcomeSelection(
      market,
      outcome,
      eventFinal,
    );
    if (!selection) return;
    onOutcomeClick(
      selection.market,
      selection.outcome,
      selection.price,
      selection.tokenId,
    );
  };

  return (
    <div
      className="px-4 pt-3.5 pb-4"
      style={
        withRightBorder
          ? { borderRight: `1px solid ${HAIR}` }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-2.5">
        {isLive ? (
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.5px]"
            style={{ color: LIVE_RED, fontFamily: MONO }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: LIVE_RED }}
            />
            LIVE
          </span>
        ) : (
          <span
            className="text-[10.5px] font-semibold tracking-[0.5px] text-gray-500"
            style={{ fontFamily: MONO }}
          >
            {timeLabel || 'TBD'}
          </span>
        )}
        <span className="text-[10.5px] text-gray-500 font-medium uppercase tracking-wide">
          {game.moneyline?.market?.eventTitle?.split(' ')[0] || ''}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid items-center pb-1.5 mb-1 border-b text-[9.5px] font-semibold tracking-[0.5px] uppercase text-gray-500"
        style={{
          gridTemplateColumns: '1fr 60px 60px 60px',
          columnGap: 6,
          borderColor: HAIR,
          fontFamily: MONO,
        }}
      >
        <span />
        <span className="text-center">ML</span>
        <span className="text-center">Spread</span>
        <span className="text-center">Total</span>
      </div>

      {teamRows.map((row, i) => (
        <div
          key={i}
          className="grid items-center py-1.5"
          style={{
            gridTemplateColumns: '1fr 60px 60px 60px',
            columnGap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => onGameClick?.(game)}
            className="flex min-w-0 items-center gap-2 text-left transition hover:opacity-80"
            aria-label={`Open all odds for ${game.title}`}
          >
            <div
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden"
              style={{
                background: row.meta?.color ?? '#e8e8e6',
                color: row.meta?.color ? '#fff' : '#0a0a0c',
              }}
            >
              {row.logo ? (
                <Image
                  src={row.logo}
                  alt={row.team}
                  width={22}
                  height={22}
                  className="rounded-md"
                />
              ) : (
                row.team.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <div
                className="text-[12px] font-semibold tracking-[-0.2px] truncate"
                style={{ color: '#0a0a0c' }}
              >
                {row.team}
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              openOutcome(ml?.market, row.ml);
            }}
            disabled={eventFinal || !row.ml || !ml}
            aria-label={`Open all odds for ${game.title}`}
            className="px-1 py-1 rounded-md border bg-white text-[11px] font-semibold tabular-nums hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: HAIR,
              fontFamily: MONO,
              color: '#0a0a0c',
            }}
          >
            {priceToPct(row.ml?.price)}
          </button>

          <button
            onClick={() => {
              openOutcome(sp?.market, row.spread);
            }}
            disabled={eventFinal || !row.spread || !sp}
            aria-label={`Open all odds for ${game.title}`}
            className="px-1 py-1 rounded-md border bg-white text-[11px] font-semibold tabular-nums hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed leading-tight"
            style={{
              borderColor: HAIR,
              fontFamily: MONO,
              color: '#0a0a0c',
            }}
          >
            <div>
              {row.spread ? compactSpreadLine(row.spread.label) : '—'}
            </div>
            {row.spread && (
              <div className="text-[9.5px] text-gray-500 font-medium">
                {priceToPct(row.spread.price)}
              </div>
            )}
          </button>

          <button
            onClick={() => {
              openOutcome(tot?.market, row.total);
            }}
            disabled={eventFinal || !row.total || !tot}
            aria-label={`Open all odds for ${game.title}`}
            className="px-1 py-1 rounded-md border bg-white text-[11px] font-semibold tabular-nums hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed leading-tight"
            style={{
              borderColor: HAIR,
              fontFamily: MONO,
              color: '#0a0a0c',
            }}
          >
            <div>
              {row.total ? compactTotalLine(row.total.label) : '—'}
            </div>
            {row.total && (
              <div className="text-[9.5px] text-gray-500 font-medium">
                {priceToPct(row.total.price)}
              </div>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function compactTotalLine(label: string): string {
  // "Over 218.5" → "o 218.5", "Under 218.5" → "u 218.5"
  const m = label.match(/^(over|under)\s*(\d+\.?\d*)/i);
  if (m) {
    const prefix = m[1].toLowerCase().startsWith('o') ? 'o' : 'u';
    return `${prefix} ${m[2]}`;
  }
  return label;
}

// ─── Sports hero card ───────────────────────────────────────────────

interface SportsHeroProps {
  activeSub: SportSubcategoryId;
  onChangeSub: (sub: SportSubcategoryId) => void;
  onSportsOutcomeClick: BrowseMarketsBentoProps['onSportsOutcomeClick'];
  onSportsGameClick?: BrowseMarketsBentoProps['onSportsGameClick'];
  onBrowse?: (sub: SportSubcategoryId) => void;
}

function SportsHeroCard({
  activeSub,
  onChangeSub,
  onSportsOutcomeClick,
  onSportsGameClick,
  onBrowse,
}: SportsHeroProps) {
  const { data: sportsMeta } = useSportsMeta();
  const { data: teamsData } = usePolymarketTeams();

  const tagId = useMemo(() => {
    const sub = getSportSubcategoryById(activeSub);
    if (!sub) return undefined;
    if (sub.id === 'all')
      return sportsMeta?.tagIdBySlug.get('sports') ?? 1;
    const liveTag = sportsMeta?.tagIdBySlug.get(sub.id);
    return liveTag ?? sub.tagId ?? undefined;
  }, [activeSub, sportsMeta]);

  const { data: sportsData, isLoading } = useSportsEvents({
    tagId,
    enabled: true,
    includeRealtimePrices: true,
    refetchIntervalMs: BENTO_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  const games = useMemo(() => {
    // Feed order (live first, then soonest kickoff) so the hero's two slots
    // show the most relevant games instead of the highest-volume ones.
    const flat = orderSportsMarkets(sportsData?.pages.flat() ?? []);
    const grouped =
      groupFlatMarketsIntoGames(flat).filter(isValidGameCard);
    const enriched = teamsData
      ? enrichGamesWithTeamLogos(grouped, teamsData)
      : grouped;
    return enriched.slice(0, 2);
  }, [sportsData, teamsData]);

  // Derive aggregate stats from the meta endpoint when we have one. The
  // wireframe shows total markets + 24h volume + LIVE count for the
  // selected sport.
  const stats = useMemo(() => {
    const all = sportsData?.pages.flat() ?? [];
    const liveCount = all.filter((m) =>
      Boolean(m.eventLive && !m.eventEnded && !m.eventClosed),
    ).length;
    const vol = all.reduce(
      (s, m) => s + (parseFloat(m.volume24hr as string) || 0),
      0,
    );
    return { count: all.length, liveCount, vol };
  }, [sportsData]);

  return (
    <div
      className="rounded-2xl bg-white border overflow-hidden"
      style={{
        borderColor: HAIR,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 20px 48px -20px rgba(10,10,12,0.18)',
      }}
    >
      {/* Card header */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{
          borderColor: HAIR,
          background:
            'linear-gradient(180deg, rgba(25,169,116,0.04), transparent)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <CategoryDot tone={POS_GREEN} />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold tracking-[-0.4px] text-gray-900">
              Sports
            </div>
            <div className="text-[11.5px] text-gray-500 font-medium mt-0.5">
              Moneyline · Spread · Totals · Live
            </div>
          </div>
          {stats.liveCount > 0 && (
            <span
              className="inline-flex items-center gap-1 ml-1 text-[10.5px] font-bold tracking-[0.5px]"
              style={{ color: LIVE_RED, fontFamily: MONO }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: LIVE_RED }}
              />
              {stats.liveCount} LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex gap-3 text-[11.5px] text-gray-500 font-semibold"
            style={{ fontFamily: MONO }}
          >
            <span>{stats.count} markets</span>
            <span style={{ color: '#d7d7d3' }}>·</span>
            <span>vol {formatVol(stats.vol)}</span>
          </div>
          <button
            onClick={() => onBrowse?.(activeSub)}
            className="inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11.5px] font-semibold text-gray-900 hover:bg-gray-50 transition"
            style={{ borderColor: HAIR }}
          >
            View all sports
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sport sub-tabs */}
      <div
        className="px-3 py-2.5 flex gap-1 overflow-x-auto border-b"
        style={{ borderColor: HAIR }}
      >
        {SPORT_TABS.map((id) => {
          const sub = getSportSubcategoryById(id);
          if (!sub) return null;
          const isActive = activeSub === id;
          return (
            <button
              key={id}
              onClick={() => onChangeSub(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition"
              style={{
                background: isActive ? '#0a0a0c' : 'transparent',
                color: isActive ? '#fff' : '#0a0a0c',
              }}
            >
              {sub.label === 'All Sports' ? 'All' : sub.label}
            </button>
          );
        })}
      </div>

      {/* 2-col game preview */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="px-4 py-5 animate-pulse"
              style={{
                borderRight:
                  i === 0 ? `1px solid ${HAIR}` : undefined,
              }}
            >
              <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-full bg-gray-200 rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12.5px] text-gray-500">
          No upcoming games for{' '}
          <span className="font-semibold text-gray-900">
            {getSportSubcategoryById(activeSub)?.label ??
              'this league'}
          </span>{' '}
          right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2">
          {games.map((g, i) => (
            <CompactGameCard
              key={g.eventId}
              game={g}
              onOutcomeClick={onSportsOutcomeClick}
              onGameClick={onSportsGameClick}
              withRightBorder={i === 0 && games.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category bento card ────────────────────────────────────────────

interface CategoryBentoCardProps {
  categoryId: CategoryId;
  tone: string;
  onMarketClick: (m: PolymarketMarket) => void;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
  onBrowse?: (id: CategoryId) => void;
}

function CategoryBentoCard({
  categoryId,
  tone,
  onMarketClick,
  onOutcomeClick,
  onBrowse,
}: CategoryBentoCardProps) {
  const [cardRef, shouldLoad] = useNearViewport<HTMLDivElement>();
  const { data, isLoading } = useMarkets({
    categoryId,
    enabled: shouldLoad,
    includeRealtimePrices: true,
    refetchIntervalMs: BENTO_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  const all = useMemo(() => data?.pages.flat() ?? [], [data]);
  const top = all.slice(0, 2);
  const remaining = Math.max(0, all.length - top.length);
  const isWaitingToLoad = !shouldLoad;

  const totalVol = useMemo(
    () =>
      all.reduce(
        (s, m) => s + (parseFloat(m.volume24hr as string) || 0),
        0,
      ),
    [all],
  );

  const category = getCategoryById(categoryId);

  return (
    <div
      ref={cardRef}
      className="rounded-2xl bg-white border overflow-hidden flex flex-col"
      style={{
        borderColor: HAIR,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b"
        style={{ borderColor: HAIR }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CategoryDot tone={tone} />
          <div className="text-[14.5px] font-semibold tracking-[-0.3px] text-gray-900 truncate">
            {category?.label ?? categoryId}
          </div>
        </div>
        <div
          className="flex gap-2.5 text-[11px] text-gray-500 font-semibold flex-shrink-0"
          style={{ fontFamily: MONO }}
        >
          <span>{all.length} markets</span>
          {totalVol > 0 && (
            <>
              <span style={{ color: '#d7d7d3' }}>·</span>
              <span>vol {formatVol(totalVol)}</span>
            </>
          )}
        </div>
      </div>

      {/* Top markets */}
      <div className="px-2 pt-1 pb-2 flex-1">
        {(isWaitingToLoad || isLoading) && top.length === 0 ? (
          <div className="px-2 py-4 space-y-2">
            <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded" />
          </div>
        ) : top.length === 0 ? (
          <div className="px-3 py-5 text-center text-[12px] text-gray-400">
            No active markets right now.
          </div>
        ) : (
          top.map((m, i) => {
            const yes = getYesPrice(m);
            const yesCents = Math.max(
              0,
              Math.min(100, Math.round(yes * 100)),
            );
            const noCents = Math.max(0, 100 - yesCents);
            const yesTokenId = getYesTokenId(m);
            const noTokenId = getNoTokenId(m);
            return (
              <div
                key={m.id}
                className="px-2.5 py-2.5 flex items-center gap-3 rounded-lg"
                style={
                  i === 0
                    ? undefined
                    : { borderTop: `1px solid ${HAIR}` }
                }
              >
                <button
                  onClick={() => onMarketClick(m)}
                  className="flex-1 min-w-0 text-left hover:opacity-80 transition"
                >
                  <div
                    className="text-[13px] font-semibold tracking-[-0.2px] truncate text-gray-900"
                    style={{ lineHeight: 1.3 }}
                  >
                    {m.question}
                  </div>
                  <div
                    className="text-[10.5px] text-gray-500 font-medium mt-1"
                    style={{ fontFamily: MONO }}
                  >
                    vol {formatVol(m.volume24hr ?? m.volume)}
                  </div>
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <OddsPill
                    tone="yes"
                    cents={yesCents}
                    onClick={() =>
                      onOutcomeClick(m, 'Yes', yes, yesTokenId)
                    }
                    disabled={!yesTokenId}
                  />
                  <OddsPill
                    tone="no"
                    cents={noCents}
                    onClick={() =>
                      onOutcomeClick(m, 'No', 1 - yes, noTokenId)
                    }
                    disabled={!noTokenId}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {top.length > 0 && (
        <div
          className="px-4 py-2.5 flex items-center justify-between border-t"
          style={{ borderColor: HAIR2 }}
        >
          <span className="text-[11px] text-gray-500 font-medium">
            {remaining > 0
              ? `${remaining} more in ${(category?.label ?? categoryId).toLowerCase()}`
              : 'Tap any odds to bet'}
          </span>
          <button
            onClick={() => onBrowse?.(categoryId)}
            className="inline-flex items-center gap-1 h-7 px-3 rounded-full border bg-white text-[11px] font-semibold text-gray-900 hover:bg-gray-50 transition"
            style={{ borderColor: HAIR }}
          >
            Browse
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Top-level component ────────────────────────────────────────────

export default function BrowseMarketsBento({
  onMarketClick,
  onSportsOutcomeClick,
  onSportsGameClick,
  onBrowseSports,
  onBrowseCategory,
}: BrowseMarketsBentoProps) {
  const [activeSportSub, setActiveSportSub] =
    useState<SportSubcategoryId>(DEFAULT_SPORT_SUBCATEGORY);

  return (
    <section className="space-y-3">
      {/* Section heading */}
      <div className="px-1">
        <div className="text-[22px] font-semibold tracking-[-0.6px] text-gray-900">
          Browse markets
        </div>
        <div className="text-[13px] text-gray-500 mt-0.5">
          By category · tap any odds to bet
        </div>
      </div>

      {/* Sports hero (full width) */}
      <SportsHeroCard
        activeSub={activeSportSub}
        onChangeSub={setActiveSportSub}
        onSportsOutcomeClick={onSportsOutcomeClick}
        onSportsGameClick={onSportsGameClick}
        onBrowse={onBrowseSports}
      />

      {/* Other categories — 2-col bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BENTO_CATEGORIES.map((c) => (
          <CategoryBentoCard
            key={c.id}
            categoryId={c.id}
            tone={c.tone}
            onMarketClick={onMarketClick}
            onOutcomeClick={(market, outcome, price, tokenId) =>
              onSportsOutcomeClick(market, outcome, price, tokenId)
            }
            onBrowse={onBrowseCategory}
          />
        ))}
      </div>
    </section>
  );
}
