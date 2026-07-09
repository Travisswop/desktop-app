"use client";

import { FC, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useGeoblock } from "@/hooks/polymarket/useGeoblock";

export interface PredictionMarketConfig {
  conditionId?: string;
  slug?: string;
  marketId?: string;
  question?: string;
  outcomes?: string[];
  image?: string;
  eventSlug?: string;
}

interface Props {
  config: PredictionMarketConfig;
  /** builder: static preview (no Bet CTA); public: live odds + Bet link. */
  mode: "builder" | "public";
}

type MarketSnapshot = {
  id?: string;
  conditionId?: string;
  question?: string;
  outcomes?: string;
  outcomePrices?: string;
  image?: string;
  icon?: string;
  eventIcon?: string;
  closed?: boolean;
  eventClosed?: boolean;
  active?: boolean;
};

const POLL_INTERVAL_MS = 30_000;

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const PredictionMarketCard: FC<Props> = ({ config, mode }) => {
  const marketRef =
    config?.conditionId || config?.slug || config?.marketId || "";
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const { isBlocked } = useGeoblock();
  const isPublic = mode === "public";

  useEffect(() => {
    if (!marketRef) return;

    let cancelled = false;

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const response = await fetch(
          `/api/polymarket/market?id=${encodeURIComponent(marketRef)}`,
        );
        if (!response.ok) throw new Error(`market fetch ${response.status}`);
        const data = (await response.json()) as MarketSnapshot;
        if (!cancelled) {
          setMarket(data);
          setFailed(false);
        }
      } catch (error) {
        console.warn("Prediction market widget fetch failed:", error);
        if (!cancelled) setFailed(true);
      }
    };

    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [marketRef]);

  const outcomes = useMemo(() => {
    const labels = market
      ? parseJsonArray(market.outcomes)
      : parseJsonArray(config?.outcomes);
    const prices = market ? parseJsonArray(market.outcomePrices) : [];
    return labels.map((label, index) => {
      const price = Number(prices[index]);
      return {
        label,
        probability: Number.isFinite(price)
          ? Math.round(price * 100)
          : null,
      };
    });
  }, [market, config?.outcomes]);

  const question = market?.question || config?.question || "Prediction market";
  const image = market?.image || market?.eventIcon || market?.icon || config?.image;
  const isClosed = Boolean(market?.closed || market?.eventClosed);
  const betTarget = market?.conditionId || market?.id || config?.conditionId;
  const isLoading = !market && !failed;

  if (!marketRef && !config?.question) {
    return null;
  }

  return (
    <div className="w-full my-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-start gap-3">
        {image ? (
          <Image
            src={image}
            alt={question}
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold leading-snug tracking-tight text-gray-950">
              {question}
            </p>
            {isClosed && (
              <span className="flex-shrink-0 rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Closed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Prediction market
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {isLoading && outcomes.length === 0 ? (
          <div className="h-8 w-full animate-pulse rounded-xl bg-black/[0.04]" />
        ) : (
          outcomes.map((outcome) => (
            <div
              key={outcome.label}
              className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2"
            >
              <span className="truncate text-[13px] font-medium text-gray-950">
                {outcome.label}
              </span>
              <span className="ml-2 flex-shrink-0 text-[13px] font-semibold text-gray-950">
                {outcome.probability !== null ? `${outcome.probability}%` : "—"}
              </span>
            </div>
          ))
        )}
      </div>

      {isPublic &&
        !isClosed &&
        betTarget &&
        (isBlocked ? (
          <p className="mt-3 text-center text-[11px] font-medium text-gray-400">
            Not available in your region
          </p>
        ) : (
          <div className="mt-3 flex gap-2">
            {(outcomes.length > 0 ? outcomes.slice(0, 2) : [{ label: "" }]).map(
              (outcome) => (
                <Link
                  key={outcome.label || "bet"}
                  href={`/prediction/market/${encodeURIComponent(betTarget)}${
                    outcome.label
                      ? `?outcome=${encodeURIComponent(outcome.label)}`
                      : ""
                  }`}
                  onClick={(event) => event.stopPropagation()}
                  className="flex-1 rounded-full bg-gray-950 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-gray-800"
                >
                  {outcome.label ? `Bet ${outcome.label}` : "Bet"}
                </Link>
              ),
            )}
          </div>
        ))}
    </div>
  );
};

export default PredictionMarketCard;
