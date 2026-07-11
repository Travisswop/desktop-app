"use client";

import { useEffect, useMemo, useState } from "react";

type ChartPoint = { timestamp: number; value: number };
type ChartData = { points: ChartPoint[]; now: number; sincePostPct: number };
type ChartConfig = {
  market?: { coin: string; name: string; markPrice: number };
  bias?: "long" | "short";
  entry?: number;
  takeProfit?: number;
  stopLoss?: number;
  hypothesis?: string;
};

const RANGES = ["1D", "1W", "1M", "1Y", "ALL"];

export default function ChartPostCard({
  widgetId,
  config,
  mode = "public",
}: {
  widgetId?: string;
  config: ChartConfig;
  mode?: "public" | "builder";
}) {
  const [range, setRange] = useState("1W");
  const [data, setData] = useState<ChartData | null>(null);
  const bias = config.bias || "long";

  useEffect(() => {
    if (!widgetId || mode === "builder") return;
    const controller = new AbortController();
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/${widgetId}/chart-data?range=${range}`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => setData(body.data || null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [mode, range, widgetId]);

  const values = useMemo(
    () =>
      data?.points.map((point) => point.value) ||
      previewValues(Number(config.entry || config.market?.markPrice || 100)),
    [config.entry, config.market?.markPrice, data],
  );
  const now = data?.now || values.at(-1) || 0;
  const points = toPoints(values);
  const since =
    data?.sincePostPct ??
    (config.entry
      ? ((now - config.entry) / config.entry) * 100 * (bias === "short" ? -1 : 1)
      : 0);
  const color = bias === "long" ? "#10B981" : "#F43F5E";

  return (
    <article className="overflow-hidden rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-950">{config.market?.name || "Select a market"}</p>
          <p className="text-sm text-gray-500">${format(now)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${bias === "long" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {bias.toUpperCase()}
        </span>
      </div>
      <div className="relative mt-3 h-40">
        <svg viewBox="0 0 320 150" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`chart-post-${widgetId || "preview"}`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor={color} stopOpacity=".32" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={`0,150 ${points} 320,150`} fill={`url(#chart-post-${widgetId || "preview"})`} />
          <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <Marker top="10%" label={`TP $${format(Number(config.takeProfit || 0))}`} />
        <Marker top="46%" label={`NOW $${format(now)}`} />
        <Marker top="77%" label={`ENTRY $${format(Number(config.entry || 0))}`} />
      </div>
      <div className="mt-1 flex justify-between">
        {RANGES.map((item) => (
          <button key={item} type="button" disabled={mode === "builder"} onClick={() => setRange(item)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${range === item ? "bg-black text-white" : "text-gray-400"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 border-y border-black/10 py-3 text-center">
        <Level label="Entry" value={config.entry} />
        <Level label="Target" value={config.takeProfit} />
        <Level label="Stop" value={config.stopLoss} />
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-700">{config.hypothesis || "Add your market hypothesis."}</p>
      <p className={`mt-3 text-sm font-black ${since >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
        {since >= 0 ? "+" : ""}{since.toFixed(2)}% since post
      </p>
    </article>
  );
}

function Marker({ top, label }: { top: string; label: string }) {
  return <div className="absolute inset-x-0 flex items-center" style={{ top }}><span className="flex-1 border-t border-dashed border-slate-400/40" /><span className="ml-2 text-[9px] font-bold text-slate-500">{label}</span></div>;
}

function Level({ label, value }: { label: string; value?: number }) {
  return <div><p className="text-[9px] font-bold uppercase text-gray-400">{label}</p><p className="text-xs font-bold text-gray-900">${format(Number(value || 0))}</p></div>;
}

function previewValues(base: number) {
  return [base * 0.96, base * 0.98, base * 0.975, base * 1.01, base * 0.995, base * 1.035, base * 1.02];
}

function toPoints(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 320},${140 - ((value - min) / span) * 125}`).join(" ");
}

function format(value: number) {
  return value >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value.toFixed(value < 10 ? 4 : 2);
}
