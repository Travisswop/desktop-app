"use client";
import { useEffect, useMemo, useState } from "react";

type PortfolioRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

type ChartPoint = { timestamp: number; value: number };

type VenueStat = {
  rank: number | null;
  pnlUsd: number;
  pnlPct: number | null;
  value: number;
  positionsCount?: number;
  avgLeverage?: number;
  openBets?: number;
};

type TraderStatsData = {
  portfolioValue: number;
  allTimePnl: number;
  allTimePnlPct: number;
  history: { timestamp: string; value: number }[];
  perps: VenueStat;
  predictions: VenueStat;
};

const RANGES: PortfolioRange[] = ["1D", "1W", "1M", "1Y", "ALL"];
const RANGE_MS: Record<Exclude<PortfolioRange, "ALL">, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};
const RANGE_TEXT: Record<PortfolioRange, string> = {
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
  "1Y": "1Y",
  ALL: "All",
};
const CHART_W = 320;
const CHART_H = 150;

export default function TraderStatsCard({ widgetId }: { widgetId: string }) {
  const [data, setData] = useState<TraderStatsData | null>(null);
  // Default to 1W: the all-time % is a snapshot delta that deposits inflate,
  // so it makes a poor first impression; the venue sub-cards carry the honest
  // all-time numbers.
  const [range, setRange] = useState<PortfolioRange>("1W");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/${widgetId}/trader-stats`)
        .then((r) => r.json())
        .then((b) => {
          if (!cancelled && b?.data) setData(b.data);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [widgetId]);

  const points = useMemo(() => (data ? historyForRange(data, range) : []), [data, range]);

  if (!data) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#F6F6F6] font-mono text-sm text-gray-400">
        Loading trader stats…
      </div>
    );
  }

  const rangePnl = pnlForRange(data, points, range);
  const path = chartPath(points.map((p) => p.value));

  return (
    <div className="flex flex-col gap-2 font-mono">
      <div className="rounded-2xl border border-black/[0.06] bg-[#F6F6F6] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-gray-500">Balance</p>
          <ChangePill pct={rangePnl.pct} />
        </div>
        <p className="mt-1 text-[30px] font-bold tracking-tight text-gray-950">
          {usd(data.portfolioValue)}
        </p>

        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="mt-3 h-40 w-full"
        >
          <defs>
            <linearGradient id={`stats-${widgetId}`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#0F172A" stopOpacity=".09" />
              <stop offset="1" stopColor="#0F172A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`}
            fill={`url(#stats-${widgetId})`}
          />
          <path
            d={path}
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="mt-2 flex items-center justify-center gap-5">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === range}
              onClick={(event) => {
                // The builder preview wraps this card in an edit-trigger div;
                // a range tap must not open the widget editor.
                event.stopPropagation();
                setRange(item);
              }}
              className={`min-h-8 text-[13px] transition-colors ${
                item === range
                  ? "font-bold text-gray-950"
                  : "font-medium text-gray-400 hover:text-gray-600"
              }`}
            >
              {RANGE_TEXT[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="PERPS"
          labelClass="text-gray-500"
          value={data.perps?.value ?? 0}
          pnlPct={data.perps?.pnlPct ?? null}
          detail={perpsDetail(data.perps)}
        />
        <Stat
          label="PREDICTIONS"
          labelClass="text-amber-600"
          value={data.predictions?.value ?? 0}
          pnlPct={data.predictions?.pnlPct ?? null}
          detail={predictionsDetail(data.predictions)}
        />
      </div>
    </div>
  );
}

function ChangePill({ pct }: { pct: number | null | undefined }) {
  if (pct == null) {
    return (
      <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[12px] font-semibold text-gray-400">
        —
      </span>
    );
  }
  const gain = pct >= 0;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        gain ? "bg-emerald-600/10 text-emerald-600" : "bg-red-600/10 text-red-600"
      }`}
    >
      {gain ? "▲" : "▼"} {gain ? "+" : "-"}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Stat({
  label,
  labelClass,
  value,
  pnlPct,
  detail,
}: {
  label: string;
  labelClass: string;
  value: number;
  pnlPct: number | null;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-[#F6F6F6] p-4">
      <p className={`text-[11px] font-semibold tracking-[.2em] ${labelClass}`}>{label}</p>
      <p className="text-[22px] font-bold tracking-tight text-gray-950">{usdCompact(value)}</p>
      <div className="flex">
        <ChangePill pct={pnlPct} />
      </div>
      <p className="truncate text-[12px] text-gray-500">{detail}</p>
    </div>
  );
}

function perpsDetail(perps?: VenueStat) {
  const count = perps?.positionsCount ?? 0;
  if (!count) return "No open positions";
  const label = `${count} position${count === 1 ? "" : "s"}`;
  return perps?.avgLeverage
    ? `${label} · ${perps.avgLeverage.toFixed(1)}× avg`
    : label;
}

function predictionsDetail(predictions?: VenueStat) {
  const count = predictions?.openBets ?? 0;
  if (!count) return "No open bets";
  return `${count} open bet${count === 1 ? "" : "s"}`;
}

function normalizedHistory(data: TraderStatsData): ChartPoint[] {
  const points = (data.history || [])
    .map((point) => ({
      timestamp: new Date(point.timestamp).getTime(),
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .sort((a, b) => a.timestamp - b.timestamp);
  return points.length
    ? points
    : [{ timestamp: Date.now(), value: Number(data.portfolioValue) || 0 }];
}

function historyForRange(data: TraderStatsData, range: PortfolioRange): ChartPoint[] {
  const points = normalizedHistory(data);
  if (range === "ALL" || points.length < 2) return points;
  const cutoff = Date.now() - RANGE_MS[range];
  const firstInRange = points.findIndex((point) => point.timestamp >= cutoff);
  if (firstInRange < 0) return points.slice(-2);
  // Keep the last point before the cutoff as the range-opening baseline.
  return points.slice(Math.max(0, firstInRange - 1));
}

function pnlForRange(data: TraderStatsData, points: ChartPoint[], range: PortfolioRange) {
  if (range === "ALL") return { usd: data.allTimePnl, pct: data.allTimePnlPct };
  const start = points[0]?.value ?? data.portfolioValue;
  const end = points.at(-1)?.value ?? data.portfolioValue;
  const pnl = end - start;
  return { usd: pnl, pct: start > 0 ? (pnl / start) * 100 : 0 };
}

function chartPath(values: number[]) {
  if (values.length < 2) return `M0 ${CHART_H / 2} L${CHART_W} ${CHART_H / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map(
      (value, index) =>
        `${index ? "L" : "M"}${(index / (values.length - 1)) * CHART_W} ${
          CHART_H - ((value - min) / span) * (CHART_H - 16) - 8
        }`,
    )
    .join(" ");
}

const usd = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
// Sub-card values drop insignificant cents ($533, but $66.86) like the design.
const usdCompact = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
