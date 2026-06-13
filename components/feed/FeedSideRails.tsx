"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  BellOff,
  Check,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trophy,
  UserPlus,
} from "lucide-react";
import type { PolymarketMarket } from "@/hooks/polymarket";
import {
  groupFlatMarketsIntoGames,
  isValidGameCard,
  type SportsGameGroup,
} from "@/lib/polymarket/sports-grouping";
import { cn } from "@/lib/utils";

type RailSide = "left" | "right";
type RailVisibilityKey = "leaderboard" | "boxScore";

type LeaderboardEntry = {
  userId: string;
  smartsiteId: string;
  name: string;
  handle?: string;
  swopId?: string;
  profileSlug?: string;
  profilePic?: string;
  avgReturnPct: number;
  bestReturnPct: number;
  latestReturnPct?: number;
  latestTradeType?: string;
  winRatePct?: number;
  positiveTradeCount?: number;
  negativeTradeCount?: number;
  flatTradeCount?: number;
  tradeCount: number;
  swapCount: number;
  perpsCount: number;
  predictionCount: number;
  isSelf?: boolean;
  isFollowing?: boolean;
  tradeNotificationsEnabled?: boolean;
};

type LiveScoreTeam = {
  name: string | null;
  abbreviation: string | null;
  logo?: string | null;
  color?: string | null;
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

type BoxScoreGame = {
  id: string;
  league: string;
  href: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  isLive: boolean;
};

type PanelState<T> = {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  updatedAt: Date | null;
  refresh: () => Promise<void>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LEADERBOARD_LIMIT = 5;
const BOXSCORE_LIMIT = 4;
const PANEL_FETCH_RETRY_DELAYS_MS = [350, 900];
const SIDE_WIDGET_HEIGHT_CLASS = "h-[348px]";
const FEED_RAIL_VISIBILITY_EVENT = "swop:feed-rail-visibility";
const FEED_RAIL_STORAGE_KEYS: Record<RailVisibilityKey, string> = {
  leaderboard: "swop.feed.hideLeaderboard",
  boxScore: "swop.feed.hideBoxScore",
};
const LIVE_SPORT_TAGS = [
  { tagId: 899, league: "NHL" },
  { tagId: 100381, league: "MLB" },
  { tagId: 450, league: "NFL" },
  { tagId: 745, league: "NBA" },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function useStoredRailHidden(
  key: RailVisibilityKey,
): [boolean, (hidden: boolean) => void] {
  const [hidden, setHiddenState] = useState(false);
  const storageKey = FEED_RAIL_STORAGE_KEYS[key];

  useEffect(() => {
    try {
      setHiddenState(window.localStorage.getItem(storageKey) === "true");
    } catch {
      setHiddenState(false);
    }
  }, [storageKey]);

  useEffect(() => {
    const handleVisibilityChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          key?: RailVisibilityKey;
          hidden?: boolean;
        }>
      ).detail;

      if (detail?.key === key && typeof detail.hidden === "boolean") {
        setHiddenState(detail.hidden);
      }
    };

    window.addEventListener(FEED_RAIL_VISIBILITY_EVENT, handleVisibilityChange);
    return () =>
      window.removeEventListener(
        FEED_RAIL_VISIBILITY_EVENT,
        handleVisibilityChange,
      );
  }, [key]);

  const setStoredHidden = useCallback(
    (nextHidden: boolean) => {
      setHiddenState(nextHidden);

      try {
        window.localStorage.setItem(storageKey, String(nextHidden));
        window.dispatchEvent(
          new CustomEvent(FEED_RAIL_VISIBILITY_EVENT, {
            detail: { key, hidden: nextHidden },
          }),
        );
      } catch {
        // Local storage can be unavailable in hardened browser contexts.
      }
    },
    [key, storageKey],
  );

  return [hidden, setStoredHidden];
}

function useLiveLeaderboard(
  accessToken?: string,
  userId?: string,
  enabled = true,
): PanelState<LeaderboardEntry> {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        limit: String(LEADERBOARD_LIMIT),
      });
      if (userId) qs.set("viewerUserId", userId);

      const json = await fetchPanelJson<{ data?: LeaderboardEntry[] }>(
        `/api/feed/trader-leaderboard?${qs.toString()}`,
        {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          cache: "no-store",
        },
        "Failed to load leaderboard.",
      );

      setData(Array.isArray(json?.data) ? json.data : []);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, enabled, userId]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  return { data, loading, refreshing, error, updatedAt, refresh };
}

function useLiveBoxScores(enabled = true): PanelState<BoxScoreGame> {
  const [data, setData] = useState<BoxScoreGame[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      let games = await fetchSportsGames(true);

      if (games.length === 0) {
        games = await fetchSportsGames(false);
      }

      setData(games.slice(0, BOXSCORE_LIMIT));
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load box scores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  return { data, loading, refreshing, error, updatedAt, refresh };
}

async function fetchSportsGames(liveOnly: boolean): Promise<BoxScoreGame[]> {
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();

  const results = await Promise.all(
    LIVE_SPORT_TAGS.map(async ({ tagId, league }) => {
      try {
        const qs = new URLSearchParams({
          limit: "24",
          offset: "0",
          tag_id: String(tagId),
          kind: "gamelines",
          quality: "relaxed",
        });

        if (liveOnly) {
          qs.set("live", "true");
        } else {
          qs.set("date_from", dateFrom);
          qs.set("date_to", dateTo);
        }

        const markets = (
          await fetchPanelJson<PolymarketMarket[]>(
            `/api/polymarket/desktop/markets?${qs.toString()}`,
            { cache: "no-store" },
            "Failed to load box scores.",
          )
        ).map((market) => ({
          ...market,
          feedRailLeague: league,
        }));

        return groupFlatMarketsIntoGames(markets).filter(isValidGameCard);
      } catch {
        return [];
      }
    }),
  );

  const grouped = results
    .flat()
    .sort(compareSportsGames)
    .slice(0, BOXSCORE_LIMIT);

  return Promise.all(grouped.map(toBoxScoreGame));
}

async function fetchPanelJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  failureMessage: string,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PANEL_FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(input, init);
      const json = await response.json().catch(() => null);

      if (response.ok) {
        return json as T;
      }

      const errorMessage =
        typeof json?.message === "string"
          ? json.message
          : typeof json?.error === "string"
            ? json.error
            : failureMessage;
      const error = new Error(errorMessage);

      lastError = error;

      if (!isRetriableStatus(response.status) || attempt === PANEL_FETCH_RETRY_DELAYS_MS.length) {
        break;
      }
    } catch (err) {
      lastError = err;

      if (attempt === PANEL_FETCH_RETRY_DELAYS_MS.length) {
        break;
      }
    }

    await wait(PANEL_FETCH_RETRY_DELAYS_MS[attempt]);
  }

  throw lastError instanceof Error ? lastError : new Error(failureMessage);
}

function isRetriableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function toBoxScoreGame(game: SportsGameGroup): Promise<BoxScoreGame> {
  const primaryMarket = getGamePrimaryMarket(game);
  const embeddedScore = getEmbeddedScore(primaryMarket);
  const fetchedScore = primaryMarket?.eventSlug
    ? await fetchLiveScore(primaryMarket.eventSlug)
    : null;
  const scoreState = pickScoreState(fetchedScore, embeddedScore);
  const scoreA = pickTeamScore(
    game.teamA,
    game.teamAMeta?.abbrev,
    scoreState.teams,
    0,
  );
  const scoreB = pickTeamScore(
    game.teamB,
    game.teamBMeta?.abbrev,
    scoreState.teams,
    1,
  );
  const isLive = Boolean(
    scoreState.live ||
      primaryMarket?.eventLive ||
      scoreState.period ||
      scoreState.elapsed,
  );
  const league =
    (primaryMarket?.feedRailLeague as string | undefined) ||
    getLeagueFromTitle(game.title);

  return {
    id: game.eventId,
    league,
    href: primaryMarket ? `/prediction/market/${primaryMarket.id}` : "/prediction",
    teamA: game.teamAMeta?.abbrev || shortTeamName(game.teamA),
    teamB: game.teamBMeta?.abbrev || shortTeamName(game.teamB),
    scoreA,
    scoreB,
    status: formatGameStatus(scoreState, primaryMarket),
    isLive,
  };
}

function getGamePrimaryMarket(game: SportsGameGroup) {
  return game.moneyline?.market || game.spread?.market || game.total?.market || null;
}

async function fetchLiveScore(eventSlug: string): Promise<LiveScoreState | null> {
  try {
    const response = await fetch(
      `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;

    const json = (await response.json()) as LiveScoreState;
    return {
      live: Boolean(json.live),
      ended: Boolean(json.ended),
      closed: Boolean(json.closed),
      period: json.period ?? null,
      elapsed: json.elapsed ?? null,
      startTime: json.startTime ?? null,
      teams: Array.isArray(json.teams) ? json.teams : [],
    };
  } catch {
    return null;
  }
}

function getEmbeddedScore(market: PolymarketMarket | null): LiveScoreState {
  return {
    live: Boolean(market?.eventLive),
    period: market?.eventPeriod ?? null,
    elapsed: market?.eventElapsed ?? null,
    startTime: market?.eventStartDate || market?.gameStartTime || null,
    teams: Array.isArray(market?.eventTeams)
      ? market.eventTeams.map((team) => ({
          name: team.name ?? null,
          abbreviation: team.abbreviation ?? null,
          logo: team.logo ?? null,
          color: team.color ?? null,
          score:
            typeof team.score === "number"
              ? team.score
              : team.score == null
                ? null
                : Number(team.score),
        }))
      : [],
  };
}

function pickScoreState(
  fetched: LiveScoreState | null,
  embedded: LiveScoreState,
): LiveScoreState {
  const fetchedHasScores = Boolean(
    fetched?.teams.some((team) => team.score != null),
  );
  const embeddedHasScores = embedded.teams.some((team) => team.score != null);

  if (fetched && (fetchedHasScores || (!embeddedHasScores && (fetched.period || fetched.elapsed)))) {
    return fetched;
  }

  return embedded;
}

function pickTeamScore(
  teamName: string,
  teamAbbr: string | undefined,
  teams: LiveScoreTeam[],
  fallbackIndex: number,
) {
  if (!teams.length) return null;

  const label = teamName.trim().toLowerCase();
  const abbr = (teamAbbr || "").trim().toLowerCase();
  const byName = teams.find((team) => {
    const name = (team.name || "").toLowerCase();
    return name === label || Boolean(name && (name.includes(label) || label.includes(name)));
  });

  if (byName?.score != null) return byName.score;

  if (abbr) {
    const byAbbr = teams.find(
      (team) => (team.abbreviation || "").toLowerCase() === abbr,
    );
    if (byAbbr?.score != null) return byAbbr.score;
  }

  return teams[fallbackIndex]?.score ?? null;
}

function compareSportsGames(a: SportsGameGroup, b: SportsGameGroup) {
  const aMarket = getGamePrimaryMarket(a);
  const bMarket = getGamePrimaryMarket(b);
  const aLive = aMarket?.eventLive ? 1 : 0;
  const bLive = bMarket?.eventLive ? 1 : 0;
  if (aLive !== bLive) return bLive - aLive;

  const aClock = aMarket?.eventPeriod || aMarket?.eventElapsed ? 1 : 0;
  const bClock = bMarket?.eventPeriod || bMarket?.eventElapsed ? 1 : 0;
  if (aClock !== bClock) return bClock - aClock;

  return getGameStartMs(b) - getGameStartMs(a);
}

function getGameStartMs(game: SportsGameGroup) {
  const market = getGamePrimaryMarket(game);
  const raw = market?.gameStartTime || market?.eventStartDate || game.startDate || null;
  if (!raw) return 0;

  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function formatGameStatus(
  scoreState: LiveScoreState,
  market: PolymarketMarket | null,
) {
  const period = scoreState.period || market?.eventPeriod || null;
  const elapsed = scoreState.elapsed || market?.eventElapsed || null;
  const clock = [period, elapsed].filter(Boolean).join(" ");

  if (clock) return clock;
  if (scoreState.ended || scoreState.closed || market?.closed) return "FINAL";

  const rawStart = scoreState.startTime || market?.eventStartDate || market?.gameStartTime;
  if (!rawStart) return scoreState.live || market?.eventLive ? "LIVE" : "Upcoming";

  const start = new Date(rawStart);
  if (Number.isNaN(start.getTime())) {
    return scoreState.live || market?.eventLive ? "LIVE" : "Upcoming";
  }

  return start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortTeamName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "TBD";
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? parts.slice(-2).join(" ") : trimmed;
}

function getLeagueFromTitle(title: string) {
  const match = title.match(/^([A-Z]{2,5})\b/);
  return match?.[1] ?? "Sports";
}

function formatUpdatedAt(date: Date | null) {
  if (!date) return "Live";

  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function getLeaderboardName(entry: LeaderboardEntry) {
  return entry.name || entry.handle || "Swop trader";
}

function getLeaderboardSwopId(entry: LeaderboardEntry) {
  return entry.swopId || entry.handle || entry.name || "swop.id";
}

function getLeaderboardHref(entry: LeaderboardEntry) {
  const profile = entry.profileSlug || entry.swopId || entry.handle || entry.name;
  if (!profile) return null;
  return `/sp/${encodeURIComponent(profile)}`;
}

function formatReturnPct(value: number) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  const decimals = abs >= 100 ? 0 : 1;
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(decimals)}%`;
}

function getReturnTone(value: number) {
  if (value > 0) return "bg-emerald-50 text-emerald-700";
  if (value < 0) return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-600";
}

function formatTradeMix(entry: LeaderboardEntry) {
  const parts = [
    entry.swapCount > 0 ? `${entry.swapCount} swap${entry.swapCount === 1 ? "" : "s"}` : "",
    entry.perpsCount > 0 ? `${entry.perpsCount} perp${entry.perpsCount === 1 ? "" : "s"}` : "",
    entry.predictionCount > 0
      ? `${entry.predictionCount} pick${entry.predictionCount === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : `${entry.tradeCount} trades`;
}

function formatStatPercent(value: number | undefined) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function getTradeTypeLabel(value: string | undefined) {
  if (value === "swapTransaction") return "swap";
  if (value === "perpsPosition") return "perp";
  if (value === "prediction") return "pick";
  return "trade";
}

function getInitials(value: string) {
  const clean = value.replace(/\.swop\.id$/i, "").replace(/[^a-z0-9]+/gi, " ");
  const parts = clean.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SW";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getMixSegments(entry: LeaderboardEntry) {
  const total = Math.max(entry.tradeCount || 0, 1);
  return [
    {
      key: "swaps",
      label: "Swaps",
      count: entry.swapCount || 0,
      className: "bg-gray-950",
    },
    {
      key: "perps",
      label: "Perps",
      count: entry.perpsCount || 0,
      className: "bg-sky-500",
    },
    {
      key: "picks",
      label: "Picks",
      count: entry.predictionCount || 0,
      className: "bg-emerald-500",
    },
  ].map((segment) => ({
    ...segment,
    width: `${Math.max((segment.count / total) * 100, segment.count > 0 ? 8 : 0)}%`,
  }));
}

function RailShell({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden w-[275px] shrink-0 self-start pr-1 xl:block 2xl:w-[295px]">
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </aside>
  );
}

function RailPanel({
  title,
  icon: Icon,
  updatedAt,
  refreshing,
  onRefresh,
  onHide,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  updatedAt: Date | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onHide?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-gray-900" />
          <h2 className="truncate font-mono text-[10px] font-black uppercase tracking-[0.1em] text-gray-950">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
            {formatUpdatedAt(updatedAt)}
          </span>
          <button
            type="button"
            aria-label={`Refresh ${title}`}
            onClick={() => onRefresh()}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-950 transition-colors hover:bg-gray-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
          {onHide && (
            <button
              type="button"
              aria-label={`Hide ${title}`}
              title={`Hide ${title}`}
              onClick={onHide}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-950 transition-colors hover:bg-gray-50"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function RailRestoreButton({
  title,
  onShow,
  desktopSide,
}: {
  title: string;
  onShow: () => void;
  desktopSide?: RailSide;
}) {
  return (
    <button
      type="button"
      aria-label={`Show ${title}`}
      title={`Show ${title}`}
      onClick={onShow}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 font-mono text-[10px] font-black uppercase tracking-[0.1em] text-gray-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-gray-50",
        desktopSide ? "hidden xl:flex" : "w-full",
      )}
    >
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>Show {title}</span>
    </button>
  );
}

function LeaderboardBox({
  accessToken,
  userId,
  enabled,
  onHide,
}: {
  accessToken?: string;
  userId?: string;
  enabled: boolean;
  onHide?: () => void;
}) {
  const { data, loading, refreshing, error, updatedAt, refresh } =
    useLiveLeaderboard(accessToken, userId, enabled);

  return (
    <RailPanel
      title="Leaderboard"
      icon={Trophy}
      updatedAt={updatedAt}
      refreshing={refreshing}
      onRefresh={refresh}
      onHide={onHide}
      className={SIDE_WIDGET_HEIGHT_CLASS}
    >
      {loading && data.length === 0 ? (
        <LoadingRows />
      ) : error && data.length === 0 ? (
        <PanelError message={error} />
      ) : data.length === 0 ? (
        <PanelEmpty message="No trader returns yet." />
      ) : (
        <div>
          <LeaderboardSummary entries={data} />
          {data.map((entry, index) => (
            <LeaderboardRow
              key={entry.userId || `${entry.smartsiteId}-${index}`}
              entry={entry}
              rank={index + 1}
              accessToken={accessToken}
              userId={userId}
            />
          ))}
        </div>
      )}
    </RailPanel>
  );
}

function LeaderboardSummary({ entries }: { entries: LeaderboardEntry[] }) {
  const leader = entries[0];
  const totalTrades = entries.reduce(
    (sum, entry) => sum + (entry.tradeCount || 0),
    0,
  );
  const bestWinRate = entries.reduce(
    (best, entry) => Math.max(best, Number(entry.winRatePct || 0)),
    0,
  );

  return (
    <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50/70">
      <LeaderboardSummaryStat
        label="Top avg"
        value={leader ? formatReturnPct(leader.avgReturnPct) : "+0.0%"}
        tone={leader?.avgReturnPct}
      />
      <LeaderboardSummaryStat
        label="Leader win"
        value={formatStatPercent(leader?.winRatePct ?? bestWinRate)}
      />
      <LeaderboardSummaryStat
        label="Trades"
        value={String(totalTrades)}
      />
    </div>
  );
}

function LeaderboardSummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number;
}) {
  return (
    <div className="border-r border-gray-100 px-2.5 py-1.5 last:border-r-0">
      <p className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-[11px] font-black tabular-nums text-gray-950",
          tone !== undefined && tone > 0 && "text-emerald-700",
          tone !== undefined && tone < 0 && "text-red-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  accessToken,
  userId,
}: {
  entry: LeaderboardEntry;
  rank: number;
  accessToken?: string;
  userId?: string;
}) {
  const name = getLeaderboardName(entry);
  const swopId = getLeaderboardSwopId(entry);
  const href = getLeaderboardHref(entry);
  const [following, setFollowing] = useState(Boolean(entry.isFollowing));
  const [tradeAlerts, setTradeAlerts] = useState(
    Boolean(entry.tradeNotificationsEnabled),
  );
  const [followLoading, setFollowLoading] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const canFollow = Boolean(
    accessToken && userId && entry.userId && entry.smartsiteId && !entry.isSelf,
  );
  const canToggleAlerts = Boolean(
    API_URL && accessToken && userId && entry.smartsiteId && following && !entry.isSelf,
  );

  useEffect(() => {
    setFollowing(Boolean(entry.isFollowing));
    setTradeAlerts(Boolean(entry.tradeNotificationsEnabled));
  }, [entry.isFollowing, entry.tradeNotificationsEnabled]);

  const handleFollow = useCallback(async () => {
    if (!canFollow || following || !API_URL) return;

    setFollowLoading(true);
    setFollowError(null);
    setAlertError(null);

    try {
      const response = await fetch(`${API_URL}/api/v4/user/connect`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          pId: entry.userId,
          cId: entry.smartsiteId,
        }),
      });
      const json = await response.json().catch(() => null);
      const alreadyConnected = String(json?.message || "")
        .toLowerCase()
        .includes("already connected");

      if (!response.ok && !alreadyConnected) {
        throw new Error(json?.message || "Could not follow trader.");
      }

      setFollowing(true);
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : "Could not follow trader.");
    } finally {
      setFollowLoading(false);
    }
  }, [
    accessToken,
    canFollow,
    entry.smartsiteId,
    entry.userId,
    following,
    userId,
  ]);

  const handleTradeAlerts = useCallback(async () => {
    if (!canToggleAlerts || alertLoading || !API_URL) return;

    const nextEnabled = !tradeAlerts;
    setAlertLoading(true);
    setAlertError(null);

    try {
      const response = await fetch(`${API_URL}/api/v4/user/trade-notifications`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          smartsiteId: entry.smartsiteId,
          enabled: nextEnabled,
        }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.message || "Could not update trade alerts.");
      }

      setTradeAlerts(Boolean(json?.enabled ?? nextEnabled));
    } catch (err) {
      setAlertError(
        err instanceof Error ? err.message : "Could not update trade alerts.",
      );
    } finally {
      setAlertLoading(false);
    }
  }, [
    accessToken,
    alertLoading,
    canToggleAlerts,
    entry.smartsiteId,
    tradeAlerts,
  ]);

  const mixSegments = getMixSegments(entry);

  return (
    <div className="border-b border-gray-100 px-3 py-3 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-950 font-mono text-[10px] font-black text-white">
            {getInitials(swopId)}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded border border-white bg-white px-1 font-mono text-[8px] font-black text-gray-950 shadow-sm">
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {href ? (
              <Link
                href={href}
                className="min-w-0 break-all font-mono text-[12px] font-black leading-tight text-gray-950 hover:underline"
                aria-label={`Open ${swopId} profile`}
              >
                {swopId}
              </Link>
            ) : (
              <p className="min-w-0 break-all font-mono text-[12px] font-black leading-tight text-gray-950">
                {swopId}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={!canFollow || following || followLoading}
                onClick={handleFollow}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                  following || entry.isSelf
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-950 hover:bg-gray-100",
                  (!canFollow || followLoading) && "cursor-not-allowed opacity-60",
                )}
                aria-label={
                  entry.isSelf
                    ? `${swopId} is you`
                    : following
                      ? `Following ${swopId}`
                      : `Follow ${swopId}`
                }
                title={
                  entry.isSelf
                    ? "This is you"
                    : canFollow
                      ? following
                        ? "Following"
                        : "Follow trader"
                      : "Sign in to follow"
                }
              >
                {followLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : following || entry.isSelf ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
              </button>

              {following && !entry.isSelf && (
                <button
                  type="button"
                  disabled={!canToggleAlerts || alertLoading}
                  onClick={handleTradeAlerts}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                    tradeAlerts
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-950",
                    (!canToggleAlerts || alertLoading) &&
                      "cursor-not-allowed opacity-60",
                  )}
                  aria-pressed={tradeAlerts}
                  aria-label={
                    tradeAlerts
                      ? `Turn off trade alerts for ${swopId}`
                      : `Turn on trade alerts for ${swopId}`
                  }
                  title={tradeAlerts ? "Trade alerts on" : "Trade alerts off"}
                >
                  {alertLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : tradeAlerts ? (
                    <Bell className="h-3 w-3" />
                  ) : (
                    <BellOff className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {name !== swopId && (
            <p className="mt-0.5 truncate text-[11px] font-bold leading-tight text-gray-400">
              {name}
            </p>
          )}

          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[7px] font-black uppercase tracking-[0.12em] text-gray-400">
                Avg return
              </p>
              <p
                className={cn(
                  "font-mono text-[18px] font-black leading-none tabular-nums",
                  entry.avgReturnPct > 0
                    ? "text-emerald-700"
                    : entry.avgReturnPct < 0
                      ? "text-red-600"
                      : "text-gray-700",
                )}
              >
                {formatReturnPct(entry.avgReturnPct)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[7px] font-black uppercase tracking-[0.12em] text-gray-400">
                Latest {getTradeTypeLabel(entry.latestTradeType)}
              </p>
              <p
                className={cn(
                  "font-mono text-[10px] font-black tabular-nums",
                  getReturnTone(entry.latestReturnPct || 0),
                  "inline-block rounded px-1.5 py-0.5",
                )}
              >
                {formatReturnPct(entry.latestReturnPct || 0)}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.08em] text-gray-400">
            <span>
              Win{" "}
              <b className="text-gray-950">{formatStatPercent(entry.winRatePct)}</b>
            </span>
            <span>
              Best{" "}
              <b className="text-gray-950">{formatReturnPct(entry.bestReturnPct)}</b>
            </span>
            <span>
              Trades <b className="text-gray-950">{entry.tradeCount || 0}</b>
            </span>
          </div>

          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-bold text-gray-500">
                {formatTradeMix(entry)}
              </p>
              <p className="shrink-0 font-mono text-[8px] font-black uppercase tracking-[0.1em] text-gray-400">
                mix
              </p>
            </div>
            <div className="flex h-1 overflow-hidden rounded-full bg-gray-100">
              {mixSegments.map((segment) =>
                segment.count > 0 ? (
                  <span
                    key={segment.key}
                    className={segment.className}
                    style={{ width: segment.width }}
                    title={`${segment.label}: ${segment.count}`}
                  />
                ) : null,
              )}
            </div>
          </div>
        </div>
      </div>
      {(followError || alertError) && (
        <p className="mt-2 text-xs font-bold text-red-600">
          {followError || alertError}
        </p>
      )}
    </div>
  );
}

function BoxScoreBox({
  enabled,
  onHide,
}: {
  enabled: boolean;
  onHide?: () => void;
}) {
  const { data, loading, refreshing, error, updatedAt, refresh } =
    useLiveBoxScores(enabled);

  return (
    <RailPanel
      title="Box Score"
      icon={Activity}
      updatedAt={updatedAt}
      refreshing={refreshing}
      onRefresh={refresh}
      onHide={onHide}
      className={SIDE_WIDGET_HEIGHT_CLASS}
    >
      {loading && data.length === 0 ? (
        <LoadingRows />
      ) : error && data.length === 0 ? (
        <PanelError message={error} />
      ) : data.length === 0 ? (
        <PanelEmpty message="No live game lines right now." />
      ) : (
        <div className="divide-y divide-gray-100">
          {data.map((game) => (
            <BoxScoreRow key={game.id} game={game} />
          ))}
        </div>
      )}
    </RailPanel>
  );
}

function BoxScoreRow({ game }: { game: BoxScoreGame }) {
  return (
    <Link
      href={game.href}
      className="block px-4 py-3 transition-colors hover:bg-gray-50"
      aria-label={`Open ${game.teamA} vs ${game.teamB}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
          {game.league}
        </span>
        <span
          className={cn(
            "rounded px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.12em]",
            game.isLive
              ? "bg-red-50 text-red-600"
              : "bg-gray-950 text-white",
          )}
        >
          {game.status}
        </span>
      </div>
      <ScoreTeam name={game.teamA} score={game.scoreA} />
      <ScoreTeam name={game.teamB} score={game.scoreB} />
    </Link>
  );
}

function ScoreTeam({ name, score }: { name: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="truncate font-mono text-sm font-black uppercase text-gray-950">
        {name}
      </span>
      <span className="font-mono text-sm font-black tabular-nums text-gray-950">
        {score ?? "-"}
      </span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-gray-100" />
            <div className="h-2.5 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-4 text-xs font-bold text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="px-4 py-5 text-sm font-bold text-gray-500">{message}</div>
  );
}

export function FeedSideRail({
  side,
  accessToken,
  userId,
}: {
  side: RailSide;
  accessToken?: string;
  userId?: string;
}) {
  const enabled = useMediaQuery("(min-width: 1280px)");
  const railKey: RailVisibilityKey = side === "left" ? "leaderboard" : "boxScore";
  const [hidden, setHidden] = useStoredRailHidden(railKey);
  const title = side === "left" ? "Leaderboard" : "Box Score";

  if (!enabled) return null;

  if (hidden) {
    return (
      <RailShell>
        <RailRestoreButton
          title={title}
          onShow={() => setHidden(false)}
          desktopSide={side}
        />
      </RailShell>
    );
  }

  return (
    <RailShell>
      {side === "left" ? (
        <LeaderboardBox
          accessToken={accessToken}
          userId={userId}
          enabled={enabled}
          onHide={() => setHidden(true)}
        />
      ) : (
        <BoxScoreBox enabled={enabled} onHide={() => setHidden(true)} />
      )}
    </RailShell>
  );
}

export function FeedRightSideRail({
  accessToken,
  userId,
}: {
  accessToken?: string;
  userId?: string;
}) {
  const enabled = useMediaQuery("(min-width: 1280px)");
  const [leaderboardHidden, setLeaderboardHidden] =
    useStoredRailHidden("leaderboard");
  const [boxScoreHidden, setBoxScoreHidden] = useStoredRailHidden("boxScore");

  if (!enabled) return null;

  return (
    <RailShell>
      {leaderboardHidden ? (
        <RailRestoreButton
          title="Leaderboard"
          onShow={() => setLeaderboardHidden(false)}
          desktopSide="right"
        />
      ) : (
        <LeaderboardBox
          accessToken={accessToken}
          userId={userId}
          enabled={enabled}
          onHide={() => setLeaderboardHidden(true)}
        />
      )}
      {boxScoreHidden ? (
        <RailRestoreButton
          title="Box Score"
          onShow={() => setBoxScoreHidden(false)}
          desktopSide="right"
        />
      ) : (
        <BoxScoreBox
          enabled={enabled}
          onHide={() => setBoxScoreHidden(true)}
        />
      )}
    </RailShell>
  );
}

export function FeedSideRailMobile({
  accessToken,
  userId,
}: {
  accessToken?: string;
  userId?: string;
}) {
  const enabled = useMediaQuery("(max-width: 1279px)");
  const [leaderboardHidden, setLeaderboardHidden] =
    useStoredRailHidden("leaderboard");
  const [boxScoreHidden, setBoxScoreHidden] = useStoredRailHidden("boxScore");

  return (
    <div
      className={cn(
        "mb-4 grid gap-3 xl:hidden",
        enabled ? "grid-cols-1 sm:grid-cols-2" : "hidden",
      )}
    >
      {leaderboardHidden ? (
        <RailRestoreButton
          title="Leaderboard"
          onShow={() => setLeaderboardHidden(false)}
        />
      ) : (
        <LeaderboardBox
          accessToken={accessToken}
          userId={userId}
          enabled={enabled}
          onHide={() => setLeaderboardHidden(true)}
        />
      )}
      {boxScoreHidden ? (
        <RailRestoreButton
          title="Box Score"
          onShow={() => setBoxScoreHidden(false)}
        />
      ) : (
        <BoxScoreBox
          enabled={enabled}
          onHide={() => setBoxScoreHidden(true)}
        />
      )}
    </div>
  );
}
