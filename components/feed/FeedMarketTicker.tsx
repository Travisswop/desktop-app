"use client";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PolymarketMarket } from "@/hooks/polymarket";
import MarketService from "@/services/market-service";
import {
  useMarketDetailStore,
  marketRouteKey,
} from "@/zustandStore/marketDetailStore";
import styles from "./FeedMarketTicker.module.css";

const TICKER_LIMIT = 16;
const SPORTS_PARENT_TAG_ID = 1;
const STOCKS_TAG_ID = 120;
const TICKER_BASE_SPEED_SECONDS = 52;
const TICKER_SPEED_PER_ENTRY_SECONDS = 1.1;
const TICKER_MIN_SPEED_SECONDS = 52;
const TICKER_MAX_SPEED_SECONDS = 160;

type MarketCategory = "sports" | "stocks" | "crypto";

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  sports: "Sports",
  stocks: "Stocks",
  crypto: "Crypto",
};

const FALLBACK_MARKET_QUESTIONS: TickerPredictionMarket[] = [
  {
    id: "market-stocks-1",
    title: "Apple stock moves above 30-day average by Q4?",
    href: "/prediction",
    outcomeA: "Yes",
    outcomeB: "No",
    status: "No live data",
  },
  {
    id: "market-stocks-2",
    title: "Tesla shares beat earnings expectations this quarter?",
    href: "/prediction",
    outcomeA: "Beat",
    outcomeB: "Miss",
    status: "No live data",
  },
  {
    id: "market-stocks-3",
    title: "Alphabet shares close above 1-year high this week?",
    href: "/prediction",
    outcomeA: "Above",
    outcomeB: "Below",
    status: "No live data",
  },
];

const FALLBACK_MARKET_QUICK: TickerPredictionMarket[] = [
  {
    id: "market-crypto-1",
    title: "Bitcoin breaks previous high this month?",
    href: "/prediction",
    outcomeA: "Yes",
    outcomeB: "No",
    status: "No live data",
  },
  {
    id: "market-crypto-2",
    title: "ETH ETF approvals shift BTC spot flows in 48h?",
    href: "/prediction",
    outcomeA: "Higher",
    outcomeB: "Lower",
    status: "No live data",
  },
  {
    id: "market-crypto-3",
    title: "SOL over $200 by end of week?",
    href: "/prediction",
    outcomeA: "Yes",
    outcomeB: "No",
    status: "No live data",
  },
];

type MarketDataShape = {
  id: string;
  symbol?: string;
  name?: string;
  image?: string;
  price?: number;
  currentPrice?: number;
  current_price?: number;
  priceChangePercentage24h?: number;
  price_change_percentage_24h?: number;
  priceChange24h?: number;
};

type TickerMarket = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price?: number;
  changePct?: number;
};

type TickerPredictionMarket = {
  id: string;
  title: string;
  href: string;
  status: string;
  outcomeA: string;
  outcomeB: string;
  priceA?: number;
  priceB?: number;
  outcomeLabels?: [string, string];
  sourceMarket?: PolymarketMarket;
};

type TickerGameMarket = {
  id: string;
  league: string;
  href: string;
  title: string;
  subtitle: string;
  status: string;
  outcomeA?: string;
  outcomeB?: string;
  scoreLabel: string;
  teamA: {
    label: string;
    priceLabel: string;
    logo?: string;
    color?: string;
    score: number | null;
  };
  teamB: {
    label: string;
    priceLabel: string;
    logo?: string;
    color?: string;
    score: number | null;
  };
  outcomeLabels?: [string, string];
  sourceMarket?: PolymarketMarket;
};

type TickerEntryCategory = {
  key: string;
  category: MarketCategory;
  market:
    | TickerMarket
    | TickerPredictionMarket
    | TickerGameMarket;
};

const CATEGORY_BADGE_STYLE: Record<MarketCategory, string> = {
  sports: "bg-red-600",
  stocks: "bg-blue-500",
  crypto: "bg-indigo-500",
};

function formatPrice(price?: number) {
  if (typeof price !== "number" || Number.isNaN(price)) return "...";

  return price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1000 ? 0 : 2,
    maximumFractionDigits: price < 1 ? 5 : price >= 1000 ? 0 : 2,
  });
}

function formatCurrency(price?: number) {
  if (typeof price !== "number" || Number.isNaN(price)) return "—";

  return formatPrice(price);
}

function formatChange(change?: number) {
  if (typeof change !== "number" || Number.isNaN(change)) return "—";

  const precision = Math.abs(change) >= 10 ? 1 : 2;
  return `${change >= 0 ? "+" : ""}${change.toFixed(precision)}%`;
}

function formatOutcomePrice(price?: number) {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return "--";
  }

  const cents = price * 100;
  return `${cents >= 10 ? cents.toFixed(0) : cents.toFixed(1)}c`;
}

function safeParseStringArray(value?: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function safeParseNumberArray(value?: unknown): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item));
      }
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeMarket(market: MarketDataShape): TickerMarket | null {
  if (!market?.id || !market.symbol) return null;

  const price = market.currentPrice ?? market.price ?? market.current_price ?? undefined;
  const changePct =
    market.priceChangePercentage24h ??
    market.price_change_percentage_24h ??
    market.priceChange24h ??
    undefined;

  return {
    id: market.id,
    symbol: market.symbol.toUpperCase(),
    name: market.name || market.symbol.toUpperCase(),
    image: market.image,
    price,
    changePct,
  };
}

const TICKER_CHAIN_BY_SYMBOL: Record<string, string> = {
  ETH: "ETHEREUM",
  SOL: "SOLANA",
  MATIC: "POLYGON",
  POL: "POLYGON",
};

function buildWalletTickerHref(market: TickerMarket) {
  const params = new URLSearchParams({
    chartToken: market.symbol,
    chartTokenId: market.id,
    chartTokenName: market.name,
    source: "feedTicker",
  });

  const chain = TICKER_CHAIN_BY_SYMBOL[market.symbol.toUpperCase()];
  if (chain) params.set("chartTokenChain", chain);
  if (market.image) params.set("chartTokenImage", market.image);
  if (typeof market.price === "number" && Number.isFinite(market.price)) {
    params.set("chartTokenPrice", String(market.price));
  }
  if (typeof market.changePct === "number" && Number.isFinite(market.changePct)) {
    params.set("chartTokenChange", String(market.changePct));
  }

  return `/wallet?${params.toString()}`;
}

function getGameStatus(market: PolymarketMarket) {
  if (market.eventClosed || market.eventEnded) return "FINAL";
  if (market.eventLive) return "LIVE";

  const period = market.eventPeriod?.trim();
  const elapsed = market.eventElapsed?.trim();
  if (period || elapsed) {
    return [period, elapsed].filter(Boolean).join(" ").trim() || "LIVE";
  }

  return "Upcoming";
}

function buildGameSubtitle(market: PolymarketMarket): string {
  const title = market.eventTitle || market.question || market.slug || market.id;
  if (!title) return "Game market";
  return title.trim() || "Game market";
}

function getTeamFromEventMarkets(
  market: PolymarketMarket,
  fallback: string,
): string {
  const teams = Array.isArray(market.eventTeams)
    ? market.eventTeams
    : [];

  const teamName = teams[0]?.name || fallback;
  const abbr = teams[0]?.abbreviation;

  if (abbr && abbr.length <= 5) {
    return abbr.toUpperCase();
  }

  const clean = String(teamName || "").trim();
  if (!clean) return "TBD";
  if (clean.length <= 14) return clean;
  const parts = clean.split(/\s+/);

  return parts.length > 1 ? parts.slice(-2).join(" ") : clean;
}

function toTickerGame(market: PolymarketMarket): TickerGameMarket | null {
  const outcomes = safeParseStringArray(market.outcomes);
  const outcomePrices = safeParseNumberArray(market.outcomePrices);
  const outcomeA = outcomes[0]?.trim() || "Team A";
  const outcomeB = outcomes[1]?.trim() || "Team B";
  const teams = Array.isArray(market.eventTeams)
    ? market.eventTeams
    : [];
  const teamA = teams[0] || {};
  const teamB = teams[1] || {};
  const scoreA = teamA.score != null && Number.isFinite(Number(teamA.score))
    ? Number(teamA.score)
    : null;
  const scoreB = teamB.score != null && Number.isFinite(Number(teamB.score))
    ? Number(teamB.score)
    : null;

  return {
    id: market.id,
    href: `/prediction/market/${market.id}`,
    league: getLeague(market, teams),
    title: market.eventTitle || market.question || market.id,
    subtitle: buildGameSubtitle(market),
    status: getGameStatus(market),
    scoreLabel:
      market.eventScore ||
      `${formatNullableScore(scoreA)}-${formatNullableScore(scoreB)}` ||
      "Live",
    teamA: {
      label: getTeamFromEventMarkets(market, outcomeA),
    priceLabel: formatOutcomePrice(outcomePrices[0]),
      logo: teamA.logo,
      color: teamA.color,
      score: scoreA,
    },
    teamB: {
      label: getTeamFromEventMarkets({ ...market, eventTeams: [teamB, teamA] as never }, outcomeB),
      priceLabel: formatOutcomePrice(outcomePrices[1]),
      logo: teamB.logo,
      color: teamB.color,
      score: scoreB,
    },
    outcomeA,
    outcomeB,
    outcomeLabels: [outcomeA, outcomeB],
    sourceMarket: market,
  };
}

function formatNullableScore(score: number | null) {
  return score == null ? "-" : String(score);
}

function getLeague(market: PolymarketMarket, teams: { abbreviation?: string; league?: string }[]) {
  const teamLeague = teams.find((team) => team.league)?.league;
  if (teamLeague) return teamLeague.toUpperCase();
  return "Sports";
}

function toTickerPrediction(
  market: PolymarketMarket,
  defaults?: { status: string },
): TickerPredictionMarket | null {
  const outcomes = safeParseStringArray(market.outcomes);
  const prices = safeParseNumberArray(market.outcomePrices);
  const tokenIds = safeParseStringArray(market.clobTokenIds);
  const outcomeA = outcomes[0] || "Yes";
  const outcomeB = outcomes[1] || "No";
  const status =
    defaults?.status ||
    (market.eventLive
      ? "LIVE"
      : getStatusFromGameDate(market.gameStartTime) || "Prediction");

  const priceA = tokenIds[0]
    ? Number(market.realtimePrices?.[tokenIds[0]]?.bidPrice) || prices[0]
    : prices[0];
  const priceB = tokenIds[1]
    ? Number(market.realtimePrices?.[tokenIds[1]]?.bidPrice) || prices[1]
    : prices[1];

  return {
    id: market.id,
    title: trimQuestion(market.question || market.eventTitle || market.slug || market.id),
    href: `/prediction/market/${market.id}`,
    status,
    outcomeA: outcomeA.slice(0, 20),
    outcomeB: outcomeB.slice(0, 20),
    priceA: Number.isFinite(priceA) ? priceA : undefined,
    priceB: Number.isFinite(priceB) ? priceB : undefined,
    outcomeLabels: [outcomeA.slice(0, 20), outcomeB.slice(0, 20)],
    sourceMarket: market,
  };
}

function trimQuestion(value: string) {
  const withoutPrefix = value
    .replace(/\s*\((?:yes|no|up|down)\)/gi, "")
    .replace(/\s*\[[^\]]+\]$/, "")
    .trim();
  return withoutPrefix.slice(0, 130);
}

function getStatusFromGameDate(gameStartDate?: string) {
  if (!gameStartDate) return "";

  const dateMs = Date.parse(gameStartDate);
  if (!Number.isFinite(dateMs)) return "";

  return new Date(dateMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchCryptoMarkets() {
  const markets = await MarketService.getTopMarketData(
    TICKER_LIMIT,
    undefined,
  );
  return markets
    .map((market) => normalizeMarket(market as MarketDataShape))
    .filter((market): market is TickerMarket => Boolean(market));
}

async function fetchTickerCategoryMarkets(tagId: number): Promise<TickerPredictionMarket[]> {
  const qs = new URLSearchParams({
    limit: String(TICKER_LIMIT),
    offset: "0",
    quality: "relaxed",
    tag_id: String(tagId),
  });

  const response = await fetch(`/api/polymarket/desktop/markets?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load ticker markets");
  }

  const raw = (await response.json()) as PolymarketMarket[];
  const markets = Array.isArray(raw) ? raw : [];
  const result = markets
    .map((market) => toTickerPrediction(market))
    .filter((market): market is TickerPredictionMarket => Boolean(market))
    .filter((market) => market.title.trim())
    .slice(0, TICKER_LIMIT);

  return result;
}

async function fetchLiveGames(): Promise<TickerGameMarket[]> {
  const qs = new URLSearchParams({
    limit: String(TICKER_LIMIT),
    offset: "0",
    tag_id: String(SPORTS_PARENT_TAG_ID),
    kind: "gamelines",
    quality: "relaxed",
    live: "true",
  });

  const response = await fetch(`/api/polymarket/desktop/markets?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load live game markets.");
  }

  const raw = (await response.json()) as PolymarketMarket[];
  const markets = Array.isArray(raw) ? raw : [];

  return markets
    .map(toTickerGame)
    .filter((market): market is TickerGameMarket => Boolean(market))
    .slice(0, TICKER_LIMIT);
}

function buildTickerEntriesForCategory(
  category: MarketCategory,
  markets:
    | TickerMarket[]
    | TickerPredictionMarket[]
    | TickerGameMarket[],
): TickerEntryCategory[] {
  return markets.map((market, index) => ({
    key: `${category}-${market.id}-${index}`,
    category,
    market,
  }));
}

function combineByRoundRobin(
  groups: TickerEntryCategory[][],
): TickerEntryCategory[] {
  const maxLen = Math.max(0, ...groups.map((group) => group.length));
  const entries: TickerEntryCategory[] = [];

  for (let index = 0; index < maxLen; index += 1) {
    for (const group of groups) {
      if (group[index]) {
        entries.push(group[index]);
      }
    }
  }

  return entries;
}

async function fetchMarketsTickerData() {
  const [stocksResult, cryptoResult, gamesResult] = await Promise.allSettled([
    fetchTickerCategoryMarkets(STOCKS_TAG_ID),
    fetchCryptoMarkets(),
    fetchLiveGames(),
  ]);

  const stocks = stocksResult.status === "fulfilled" && stocksResult.value.length > 0
    ? stocksResult.value
    : FALLBACK_MARKET_QUESTIONS;
  const crypto = cryptoResult.status === "fulfilled" && cryptoResult.value.length > 0
    ? cryptoResult.value
    : FALLBACK_MARKET_QUICK;
  const sports = gamesResult.status === "fulfilled" ? gamesResult.value : [];

  const buckets = [
    buildTickerEntriesForCategory("sports", sports),
    buildTickerEntriesForCategory("stocks", stocks),
    buildTickerEntriesForCategory("crypto", crypto),
  ];

  return combineByRoundRobin(buckets);
}

function buildTickerKey() {
  return ["feed-market-ticker", "markets"];
}

function normalizeMarketListLength<T>(items: T[]) {
  if (items.length === 0) return [];
  return items.length > 4 ? [...items, ...items] : items;
}

function getTickerAnimationDuration(itemCount: number) {
  if (itemCount <= 0) return TICKER_MAX_SPEED_SECONDS;

  const computed =
    TICKER_BASE_SPEED_SECONDS + itemCount * TICKER_SPEED_PER_ENTRY_SECONDS;

  return Math.max(
    TICKER_MIN_SPEED_SECONDS,
    Math.min(TICKER_MAX_SPEED_SECONDS, computed),
  );
}

export default function FeedMarketTicker({
  accessToken,
  className = "",
}: {
  accessToken?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const stashMarketDetail = useMarketDetailStore((s) => s.set);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [...buildTickerKey(), Boolean(accessToken)],
    queryFn: fetchMarketsTickerData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const markets = (data || []) as TickerEntryCategory[];
  const repeatedMarkets = normalizeMarketListLength(markets);
  const shouldAnimate = repeatedMarkets.length > 4;
  const tickerDuration = getTickerAnimationDuration(markets.length);

  const handlePredictionMarketNavigation = useCallback(
    (market: TickerPredictionMarket | TickerGameMarket) => {
      const fallbackHref = market.href || "/prediction";
      const routeMarket = market.sourceMarket;

      if (!routeMarket) {
        router.push(fallbackHref);
        return;
      }

      const routeKey = marketRouteKey(routeMarket);
      if (!routeKey) {
        router.push(fallbackHref);
        return;
      }

      const normalizedOutcomeLabels =
        market.outcomeLabels ??
        (market.outcomeA && market.outcomeB
          ? [market.outcomeA, market.outcomeB]
          : undefined);

      stashMarketDetail(routeKey, {
        market: routeMarket,
        outcomeLabels: normalizedOutcomeLabels,
        yesShares: 0,
        noShares: 0,
      });
      router.push(`/prediction/market/${encodeURIComponent(routeKey)}`);
    },
    [router, stashMarketDetail],
  );

  return (
    <section
      aria-label="Feed market ticker"
      className={[
        "flex h-12 w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-[#F7F7F9] shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative z-10 flex h-full shrink-0 items-center gap-2 border-r border-slate-200 bg-[#F7F7F9] px-3 sm:px-4">
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
          Markets
        </span>
        {isLoading || isFetching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        ) : null}
      </div>

      <div className={styles.tickerViewport}>
        {repeatedMarkets.length > 0 ? (
          <div
            className={[
              styles.tickerTrack,
              shouldAnimate ? "" : styles.tickerTrackPaused,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ animationDuration: `${tickerDuration}s` }}
          >
            {repeatedMarkets.map((entry, index) => {
              if (entry.category === "sports") {
                return (
                  <TickerGamePill
                    key={`${entry.key}-${index}`}
                    game={entry.market as TickerGameMarket}
                    category={entry.category}
                    onNavigate={handlePredictionMarketNavigation}
                    ariaHidden={index >= markets.length}
                    muted={markets.length === 0}
                  />
                );
              }

              if (entry.category === "crypto") {
                return (
                  <TickerPill
                    key={`${entry.key}-${index}`}
                    market={entry.market as TickerMarket}
                    category={entry.category}
                    ariaHidden={index >= markets.length}
                    muted={markets.length === 0}
                  />
                );
              }

              return (
                <TickerPredictionPill
                  key={`${entry.key}-${index}`}
                  market={entry.market as TickerPredictionMarket}
                  category={entry.category}
                  onNavigate={handlePredictionMarketNavigation}
                  ariaHidden={index >= markets.length}
                  muted={markets.length === 0}
                />
              );
            })}
          </div>
        ) : isError ? (
          <div className="flex h-full items-center px-3" aria-live="polite">
            <StatusPill message="Unable to load market ticker data" />
          </div>
        ) : (
          <div className="flex h-full items-center px-3" aria-live="polite">
            <StatusPill message="Loading ticker markets" />
          </div>
        )}
      </div>
    </section>
  );
}

function TickerPill({
  market,
  muted,
  ariaHidden,
  category,
}: {
  market: TickerMarket;
  muted: boolean;
  ariaHidden: boolean;
  category: MarketCategory;
}) {
  const change = market.changePct ?? 0;
  const isPositive = change >= 0;
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Link
      href={buildWalletTickerHref(market)}
      prefetch={false}
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-label={`Open ${market.symbol} chart in wallet`}
      className={[
        "flex h-9 min-w-max items-center gap-2 rounded-md border border-white bg-white px-2.5 text-xs shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-3",
        "transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        muted ? "animate-pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
        title={`${market.name} ${formatPrice(market.price)} ${formatChange(
        market.changePct,
      )}`}
    >
      <span
        className={[
          "rounded px-1 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-slate-100",
          CATEGORY_BADGE_STYLE[category],
        ].join(" ")}
      >
        {CATEGORY_LABELS[category]}
      </span>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[9px] font-black uppercase text-slate-500">
        {market.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          market.symbol.slice(0, 2)
        )}
      </span>
      <span className="font-mono text-[12px] font-black uppercase text-slate-950">
        {market.symbol}
      </span>
      <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-700">
        ${formatCurrency(market.price)}
      </span>
      <span
        className={[
          "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums",
          isPositive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-600",
        ].join(" ")}
      >
        <ChangeIcon className="h-3 w-3" />
        {formatChange(market.changePct)}
      </span>
    </Link>
  );
}

function TickerPredictionPill({
  market,
  muted,
  ariaHidden,
  category,
  onNavigate,
}: {
  market: TickerPredictionMarket;
  muted: boolean;
  ariaHidden: boolean;
  category: Exclude<MarketCategory, "sports" | "crypto">;
  onNavigate: (
    market: TickerPredictionMarket | TickerGameMarket,
  ) => void;
}) {
  return (
    <Link
      href={market.href}
      prefetch={false}
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-label={`Open ${market.title}`}
      className={[
        "flex h-9 min-w-max items-center gap-2 rounded-md border border-white bg-white px-2.5 text-xs shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-3",
        "transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        muted ? "animate-pulse" : "",
      ].join(" ")}
      title={`${market.title} ${market.outcomeA} ${market.outcomeB}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(market);
      }}
    >
      <span
        className={[
          "rounded px-1 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-slate-100",
          CATEGORY_BADGE_STYLE[category],
        ].join(" ")}
      >
        {CATEGORY_LABELS[category]}
      </span>
      <span className="max-w-[170px] truncate font-mono text-[11px] font-black uppercase text-slate-950">
        {market.title}
      </span>
      <span className="flex min-w-max items-center gap-1.5 rounded bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-white">
        <span className="text-emerald-300">{market.status}</span>
      </span>
      <span className="ml-2 flex min-w-max items-center gap-1.5 font-mono text-[11px] font-black uppercase text-slate-700">
        <span className="rounded bg-slate-950 px-1.5 py-0.5 text-white">{market.outcomeA}</span>
        <span className="rounded border border-slate-200 px-1.5 py-0.5">
          {formatOutcomePrice(market.priceA)}
        </span>
        <span className="rounded bg-slate-950 px-1.5 py-0.5 text-white">{market.outcomeB}</span>
        <span className="rounded border border-slate-200 px-1.5 py-0.5">
          {formatOutcomePrice(market.priceB)}
        </span>
      </span>
    </Link>
  );
}

function TickerGamePill({
  game,
  category,
  muted,
  ariaHidden,
  onNavigate,
}: {
  game: TickerGameMarket;
  category: Exclude<MarketCategory, "crypto" | "stocks">;
  muted: boolean;
  ariaHidden: boolean;
  onNavigate: (market: TickerPredictionMarket | TickerGameMarket) => void;
}) {
  return (
    <Link
      href={game.href}
      prefetch={false}
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-label={`Open ${game.title} market`}
      className={[
        "flex h-9 min-w-[360px] max-w-[480px] items-center gap-2.5 rounded-md border border-white bg-white px-2.5 text-xs shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:min-w-[400px] sm:px-3",
        "transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        muted ? "animate-pulse" : "",
      ].join(" ")}
      title={`${game.title} ${game.teamA.label} ${game.scoreLabel} ${game.teamB.label}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(game);
      }}
    >
      <span className="flex shrink-0 flex-col justify-center gap-1 leading-none">
        <span className="flex items-center gap-1.5">
          <span
            className={[
              "rounded px-1 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-slate-100",
              CATEGORY_BADGE_STYLE[category],
            ].join(" ")}
          >
            {CATEGORY_LABELS[category]}
          </span>
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-red-600">
            {game.league}
          </span>
          <span className="font-mono text-[9px] font-black uppercase tabular-nums text-slate-500">
            {game.status}
          </span>
        </span>
        <span className="max-w-[220px] truncate font-mono text-[11px] font-black uppercase text-slate-900">
          {game.subtitle}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        <TeamMark team={game.teamA} />
        <span className="max-w-[86px] truncate font-mono text-[12px] font-black uppercase text-slate-950">
          {game.teamA.label}
        </span>
        <span className="max-w-[138px] truncate rounded bg-slate-950 px-2 py-1 font-mono text-[12px] font-black tabular-nums text-white">
          {game.scoreLabel}
        </span>
        <span className="max-w-[86px] truncate font-mono text-[12px] font-black uppercase text-slate-950">
          {game.teamB.label}
        </span>
        <TeamMark team={game.teamB} />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="font-mono text-[10px] font-black uppercase tabular-nums text-emerald-700">
          {game.teamA.priceLabel}
        </span>
        <span className="font-mono text-[10px] font-black uppercase tabular-nums text-emerald-700">
          {game.teamB.priceLabel}
        </span>
      </span>
    </Link>
  );
}

function TeamMark({
  team,
}: {
  team: { score: number | null; logo?: string; color?: string; label: string };
}) {
  const style =
    !team.logo && team.color ? { backgroundColor: team.color } : undefined;

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-mono text-[8px] font-black uppercase text-slate-500"
      style={style}
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={team.color ? "text-white" : ""}>{team.label.slice(0, 2)}</span>
      )}
    </span>
  );
}

function StatusPill({ message }: { message: string }) {
  return (
    <div className="flex h-10 min-w-max items-center gap-2 rounded-md border border-white bg-white px-3 text-xs shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <Activity className="h-3.5 w-3.5 text-slate-500" />
      <span className="font-mono text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">
        {message}
      </span>
    </div>
  );
}
