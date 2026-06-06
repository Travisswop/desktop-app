"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import MarketService from "@/services/market-service";
import styles from "./FeedMarketTicker.module.css";

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

const TICKER_LIMIT = 16;

const FALLBACK_MARKETS: TickerMarket[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "tron", symbol: "TRX", name: "TRON" },
];

function formatPrice(price?: number) {
  if (typeof price !== "number" || Number.isNaN(price)) return "...";

  return price.toLocaleString("en-US", {
    minimumFractionDigits: price >= 1000 ? 0 : 2,
    maximumFractionDigits: price < 1 ? 5 : price >= 1000 ? 0 : 2,
  });
}

function formatChange(change?: number) {
  if (typeof change !== "number" || Number.isNaN(change)) return "...";

  const precision = Math.abs(change) >= 10 ? 1 : 2;
  return `${change >= 0 ? "+" : ""}${change.toFixed(precision)}%`;
}

function normalizeMarket(market: MarketDataShape): TickerMarket | null {
  if (!market?.id || !market.symbol) return null;

  const price =
    market.currentPrice ?? market.price ?? market.current_price ?? undefined;
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
  if (
    typeof market.changePct === "number" &&
    Number.isFinite(market.changePct)
  ) {
    params.set("chartTokenChange", String(market.changePct));
  }

  return `/wallet?${params.toString()}`;
}

async function fetchFeedMarkets(accessToken?: string | null) {
  const markets = await MarketService.getTopMarketData(
    TICKER_LIMIT,
    accessToken || undefined,
  );

  return markets
    .map((market) => normalizeMarket(market as MarketDataShape))
    .filter((market): market is TickerMarket => Boolean(market));
}

export default function FeedMarketTicker({
  accessToken,
  className = "",
}: {
  accessToken?: string | null;
  className?: string;
}) {
  const { data: markets = [], isLoading, isFetching } = useQuery({
    queryKey: ["feed-market-ticker", TICKER_LIMIT, Boolean(accessToken)],
    queryFn: () => fetchFeedMarkets(accessToken),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const displayMarkets = markets.length > 0 ? markets : FALLBACK_MARKETS;
  const shouldAnimate = displayMarkets.length > 4;
  const repeatedMarkets = useMemo(
    () => [...displayMarkets, ...displayMarkets],
    [displayMarkets],
  );

  return (
    <section
      aria-label="Live crypto markets"
      className={[
        "flex h-12 w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-[#F7F7F9] shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative z-10 flex h-full shrink-0 items-center gap-2 border-r border-slate-200 bg-[#F7F7F9] px-3 sm:px-4">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-slate-950">
          Markets
        </span>
        {isLoading || isFetching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        ) : null}
      </div>

      <div className={styles.tickerViewport}>
        <div
          className={[
            styles.tickerTrack,
            shouldAnimate ? "" : styles.tickerTrackPaused,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {repeatedMarkets.map((market, index) => (
            <TickerPill
              key={`${market.id}-${index}`}
              market={market}
              muted={markets.length === 0}
              ariaHidden={index >= displayMarkets.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TickerPill({
  market,
  muted,
  ariaHidden,
}: {
  market: TickerMarket;
  muted: boolean;
  ariaHidden: boolean;
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
        ${formatPrice(market.price)}
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
