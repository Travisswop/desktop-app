"use client";

import React, { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMeta {
  name?: string | null;
  abbreviation?: string | null;
  color?: string | null;
  logo?: string | null;
}

interface LiveTeam {
  name: string | null;
  abbreviation: string | null;
  score: number | null;
}

interface LiveScore {
  live: boolean;
  period: string | null;
  elapsed: string | null;
  teams: LiveTeam[];
}

export interface PredictionContent {
  marketTitle: string;
  outcome: string;          // the outcome the user picked
  side: "BUY" | "SELL";
  cost: number;
  potentialWin?: number;
  price: number;            // decimal 0–1, price of the picked outcome
  orderId?: string;
  orderType?: string;
  marketId?: string;
  eventSlug?: string;
  // Sports panel (optional – present only for sports markets)
  yesOutcome?: string;      // "yes" outcome label, e.g., "Knicks"
  noOutcome?: string;       // "no" outcome label, e.g., "Hawks"
  yesTokenId?: string;
  noTokenId?: string;
  yesPrice?: number;        // decimal 0–1
  noPrice?: number;         // decimal 0–1
  gameStartTime?: string;   // ISO date string
  volume?: string;          // pre-formatted, e.g., "$528.16K Vol."
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
}

interface PredictionFeedCardProps {
  content: PredictionContent;
  userName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return "—";
  if (price >= 0.5) {
    return `-${Math.round((price / (1 - price)) * 100)}`;
  }
  return `+${Math.round(((1 - price) / price) * 100)}`;
}

function seededRand(seed: string, idx: number): number {
  let h = 5381;
  const s = seed + String(idx);
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

function formatHour(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Live score hook ──────────────────────────────────────────────────────────

function useLiveScore(eventSlug: string | undefined): LiveScore | null {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (!eventSlug) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchScore = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`
        );
        if (!res.ok || cancelled) return;
        const data: LiveScore = await res.json();
        if (cancelled) return;
        setScore(data);
        if (data.live) {
          timer = setTimeout(fetchScore, 15_000);
        }
      } catch {
        // silently ignore
      }
    };

    fetchScore();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventSlug]);

  return score;
}

// ─── Price history hook ───────────────────────────────────────────────────────

interface HistoryPoint {
  t: number;
  p: number;
}

function usePriceHistory(
  yesTokenId: string | undefined,
  noTokenId: string | undefined,
  enabled: boolean
): { yesHistory: HistoryPoint[]; noHistory: HistoryPoint[]; loading: boolean } {
  const [yesHistory, setYesHistory] = useState<HistoryPoint[]>([]);
  const [noHistory, setNoHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !yesTokenId || !noTokenId) return;
    let cancelled = false;
    setLoading(true);

    const fetchOne = (id: string) =>
      fetch(
        `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(id)}&interval=1d&fidelity=30`
      )
        .then((r) => (r.ok ? r.json() : { history: [] }))
        .then((j) => {
          const raw = Array.isArray(j?.history) ? j.history : [];
          return raw
            .map((pt: { t?: number; p?: number | string }) => ({
              t: Number(pt.t),
              p: Number(pt.p),
            }))
            .filter(
              (pt: HistoryPoint) =>
                isFinite(pt.t) && isFinite(pt.p) && pt.p >= 0 && pt.p <= 1
            );
        })
        .catch(() => [] as HistoryPoint[]);

    Promise.all([fetchOne(yesTokenId), fetchOne(noTokenId)]).then(([y, n]) => {
      if (cancelled) return;
      setYesHistory(y);
      setNoHistory(n);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, yesTokenId, noTokenId]);

  return { yesHistory, noHistory, loading };
}

// ─── Chart path builder ───────────────────────────────────────────────────────

function historyToPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number
): string {
  if (series.length < 2) return "";
  const span = Math.max(1, tMax - tMin);
  const pts = series.map((pt) => ({
    x: plotX + ((pt.t - tMin) / span) * plotW,
    y: plotY + (1 - pt.p) * plotH,
  }));
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const cx = ((a.x + b.x) / 2).toFixed(2);
    d += ` C ${cx} ${a.y.toFixed(2)}, ${cx} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

// ─── Team badge ───────────────────────────────────────────────────────────────

function TeamBadge({
  team,
  abbr,
  name,
}: {
  team?: TeamMeta;
  abbr: string;
  name: string;
}) {
  const color = team?.color || "#374151";
  const logo = team?.logo;
  const displayAbbr = team?.abbreviation || abbr;
  const displayName = team?.name || name;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={displayAbbr}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <span className="text-[10px] font-extrabold tracking-wide text-white">
            {displayAbbr}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight max-w-[64px] truncate">
        {displayName}
      </p>
    </div>
  );
}

// ─── Sports mini panel ────────────────────────────────────────────────────────

function SportsMiniPanel({
  yesOutcome,
  noOutcome,
  yesPrice: yP,
  noPrice: nP,
  yesTeam,
  noTeam,
  gameStartTime,
  volume,
  yesTokenId,
  noTokenId,
  liveScore,
}: {
  yesOutcome: string;
  noOutcome: string;
  yesPrice: number;
  noPrice: number;
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
  gameStartTime?: string;
  volume?: string;
  yesTokenId?: string;
  noTokenId?: string;
  liveScore: LiveScore | null;
}) {
  const { yesHistory, noHistory, loading } = usePriceHistory(
    yesTokenId,
    noTokenId,
    true
  );

  // Chart geometry – designed for a narrow feed card (~340px wide)
  const VB_W = 300;
  const VB_H = 130;
  const PLOT_X = 4;
  const PLOT_Y = 10;
  const RIGHT_PAD = 62; // room for end labels
  const BOTTOM_PAD = 18;
  const PLOT_W = VB_W - PLOT_X - RIGHT_PAD;
  const PLOT_H = VB_H - PLOT_Y - BOTTOM_PAD;

  const seed = (yesTokenId || yesOutcome) + "feedseed";

  const { yesSeries, noSeries, tMin, tMax, xTicks } = useMemo(() => {
    const hasHistory = yesHistory.length >= 2 && noHistory.length >= 2;

    if (hasHistory) {
      const allTs = [
        ...yesHistory.map((p) => p.t),
        ...noHistory.map((p) => p.t),
      ];
      const min = Math.min(...allTs);
      const max = Math.max(...allTs);
      const ticks = Array.from({ length: 4 }, (_, i) =>
        Math.round(min + ((max - min) * i) / 3)
      );
      return {
        yesSeries: yesHistory,
        noSeries: noHistory,
        tMin: min,
        tMax: max,
        xTicks: ticks,
      };
    }

    // Fallback: synthesised sparklines so the panel still looks populated
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60;
    const N = 20;
    const synth = (endP: number, s: string): HistoryPoint[] => {
      const startP = 0.47 + seededRand(s, 999) * 0.06;
      return Array.from({ length: N }, (_, i) => {
        const ratio = i / (N - 1);
        const base = startP + (endP - startP) * ratio;
        const noise =
          (seededRand(s, i) - 0.5) * 0.08 * (1 - ratio * 0.6) * 2;
        const p = Math.max(0.02, Math.min(0.98, base + noise));
        return { t: start + Math.round((now - start) * ratio), p };
      });
    };
    const ys = synth(yP, seed + "y");
    const ns = synth(nP, seed + "n");
    const ticks = Array.from({ length: 4 }, (_, i) =>
      Math.round(start + ((now - start) * i) / 3)
    );
    return {
      yesSeries: ys,
      noSeries: ns,
      tMin: start,
      tMax: now,
      xTicks: ticks,
    };
  }, [yesHistory, noHistory, yP, nP, seed]);

  const yesPath = historyToPath(yesSeries, tMin, tMax, PLOT_X, PLOT_Y, PLOT_W, PLOT_H);
  const noPath = historyToPath(noSeries, tMin, tMax, PLOT_X, PLOT_Y, PLOT_W, PLOT_H);

  const yesLeads = yP >= nP;
  const yesColor = yesLeads ? "#22C55E" : "#3B82F6";
  const noColor = yesLeads ? "#3B82F6" : "#22C55E";

  const yesPct = Math.round(yP * 100);
  const noPct = Math.round(nP * 100);

  const endX = PLOT_X + PLOT_W;
  const endYesY = PLOT_Y + (1 - yP) * PLOT_H;
  const endNoY = PLOT_Y + (1 - nP) * PLOT_H;

  // Position end-labels so they don't overlap
  const [upperY, upperColor, upperName, upperPct] = yesLeads
    ? [endYesY, yesColor, yesOutcome, yesPct]
    : [endNoY, noColor, noOutcome, noPct];
  const [lowerY, lowerColor, lowerName, lowerPct] = yesLeads
    ? [endNoY, noColor, noOutcome, noPct]
    : [endYesY, yesColor, yesOutcome, yesPct];

  const labelGap = Math.max(22, Math.abs(upperY - lowerY));
  const upperLabelY = Math.max(14, Math.min(upperY, PLOT_Y + PLOT_H - labelGap));
  const lowerLabelY = Math.min(
    PLOT_Y + PLOT_H - 2,
    Math.max(lowerY, upperLabelY + labelGap)
  );

  // Game time text
  const gameDate = gameStartTime ? new Date(gameStartTime) : null;
  const timeText = gameDate
    ? gameDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;
  const dateText = gameDate
    ? gameDate.toLocaleDateString([], { month: "long", day: "numeric" })
    : null;

  // Live score matching
  const isLive = liveScore?.live === true;
  const matchScore = (teamName: string, fallbackIdx: number): number | null => {
    if (!isLive || !liveScore || liveScore.teams.length < 2) return null;
    const lower = teamName.toLowerCase();
    const found = liveScore.teams.find((t) => {
      const n = (t.name ?? "").toLowerCase();
      return n && (n.includes(lower) || lower.includes(n));
    });
    return (found ?? liveScore.teams[fallbackIdx])?.score ?? null;
  };
  const yesScore = matchScore(yesOutcome, 0);
  const noScore = matchScore(noOutcome, 1);
  const hasScores = isLive && yesScore != null && noScore != null;

  const yesAbbr = (yesTeam?.abbreviation || yesOutcome.slice(0, 3)).toUpperCase();
  const noAbbr = (noTeam?.abbreviation || noOutcome.slice(0, 3)).toUpperCase();

  return (
    <div className="px-3 pt-3 pb-1 border-b border-gray-200">
      {/* Team matchup row */}
      <div className="grid grid-cols-3 items-center gap-2 mb-2">
        <TeamBadge team={yesTeam} abbr={yesAbbr} name={yesOutcome} />

        <div className="text-center">
          {hasScores ? (
            <div className="flex flex-col items-center">
              <p className="text-lg font-extrabold text-gray-900 leading-none tabular-nums">
                {yesScore} – {noScore}
              </p>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-wider">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
              {liveScore && (liveScore.period || liveScore.elapsed) && (
                <p className="text-[9px] text-gray-500 mt-0.5 tabular-nums">
                  {[liveScore.elapsed, liveScore.period].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          ) : (
            <>
              {timeText && (
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {timeText}
                </p>
              )}
              {dateText && (
                <p className="text-[10px] text-gray-500 mt-0.5">{dateText}</p>
              )}
              {!timeText && !dateText && (
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                  vs
                </p>
              )}
            </>
          )}
        </div>

        <TeamBadge team={noTeam} abbr={noAbbr} name={noOutcome} />
      </div>

      {/* Volume */}
      {volume && (
        <p className="text-[11px] font-semibold text-gray-600 mb-1">{volume}</p>
      )}

      {/* Probability chart */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ height: 130 }}
        aria-label={`${yesOutcome} vs ${noOutcome} probability history`}
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const y = PLOT_Y + (1 - v) * PLOT_H;
          return (
            <line
              key={v}
              x1={PLOT_X}
              x2={PLOT_X + PLOT_W}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={0.8}
              strokeDasharray={v === 0 || v === 1 ? "" : "2 3"}
            />
          );
        })}

        {/* Y-axis tick labels (0 / 50 / 100) */}
        {[0, 0.5, 1].map((v) => {
          const y = PLOT_Y + (1 - v) * PLOT_H;
          return (
            <text
              key={`yt-${v}`}
              x={PLOT_X + PLOT_W + 4}
              y={y + 3}
              fontSize={8}
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
            >
              {Math.round(v * 100)}%
            </text>
          );
        })}

        {/* X-axis tick labels */}
        {xTicks.map((t, i) => {
          const x =
            PLOT_X + ((t - tMin) / Math.max(1, tMax - tMin)) * PLOT_W;
          return (
            <text
              key={`xt-${i}`}
              x={x}
              y={VB_H - 4}
              fontSize={8}
              fill="#9CA3AF"
              textAnchor={
                i === 0
                  ? "start"
                  : i === xTicks.length - 1
                  ? "end"
                  : "middle"
              }
              fontFamily="system-ui, sans-serif"
            >
              {formatHour(t)}
            </text>
          );
        })}

        {/* Probability lines */}
        <path
          d={noPath}
          fill="none"
          stroke={noColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.5 : 1}
        />
        <path
          d={yesPath}
          fill="none"
          stroke={yesColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.5 : 1}
        />

        {/* Endpoint dots */}
        <circle cx={endX} cy={endNoY} r={3} fill={noColor} />
        <circle cx={endX} cy={endYesY} r={3} fill={yesColor} />

        {/* End labels: team name + percentage */}
        <text
          x={endX + 3}
          y={upperLabelY - 1}
          fontSize={9}
          fontWeight={600}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {upperName}
        </text>
        <text
          x={endX + 3}
          y={upperLabelY + 11}
          fontSize={12}
          fontWeight={800}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {upperPct}%
        </text>

        <text
          x={endX + 3}
          y={lowerLabelY - 12}
          fontSize={9}
          fontWeight={600}
          fill={lowerColor}
          fontFamily="system-ui, sans-serif"
        >
          {lowerName}
        </text>
        <text
          x={endX + 3}
          y={lowerLabelY}
          fontSize={12}
          fontWeight={800}
          fill={lowerColor}
          fontFamily="system-ui, sans-serif"
        >
          {lowerPct}%
        </text>
      </svg>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PredictionFeedCard({
  content,
  userName,
}: PredictionFeedCardProps) {
  const {
    marketTitle,
    outcome,
    side,
    cost,
    potentialWin,
    price,
    eventSlug,
    yesOutcome,
    noOutcome,
    yesPrice,
    noPrice,
    yesTeam,
    noTeam,
    gameStartTime,
    volume,
    yesTokenId,
    noTokenId,
  } = content;

  const liveScore = useLiveScore(eventSlug);

  // Show sports panel when at least yesOutcome + noOutcome + some sports signal present
  const isSports = Boolean(
    yesOutcome &&
      noOutcome &&
      (yesTeam || noTeam || gameStartTime || yesTokenId)
  );

  const odds = toAmericanOdds(price);
  const isBuy = side === "BUY";
  // Favorite (price ≥ 0.5) → negative odds → red; underdog → green
  const oddsColor = price >= 0.5 ? "text-red-500" : "text-green-600";

  return (
    <div className="mt-2 rounded-2xl border border-gray-200 overflow-hidden bg-white">
      {/* ── Market title row ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <p className="text-gray-500 text-[11px] leading-tight line-clamp-1 flex-1 pr-2">
          {marketTitle}
        </p>
        <span className="text-[10px] font-semibold tracking-[0.12em] text-gray-400 uppercase shrink-0">
          MARKET
        </span>
      </div>

      {/* ── Sports panel: team badges + probability chart ───────────────────── */}
      {isSports && (
        <SportsMiniPanel
          yesOutcome={yesOutcome!}
          noOutcome={noOutcome!}
          yesPrice={yesPrice ?? price}
          noPrice={noPrice ?? 1 - price}
          yesTeam={yesTeam}
          noTeam={noTeam}
          gameStartTime={gameStartTime}
          volume={volume}
          yesTokenId={yesTokenId}
          noTokenId={noTokenId}
          liveScore={liveScore}
        />
      )}

      {/* ── Live scoreboard (fallback for older posts without sports panel data) */}
      {!isSports && liveScore?.live && liveScore.teams.length >= 2 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
              {liveScore.teams[0]?.abbreviation ||
                (liveScore.teams[0]?.name ?? "").slice(0, 3).toUpperCase()}
            </span>
            <span className="font-bold text-2xl tabular-nums text-gray-900">
              {liveScore.teams[0]?.score ?? "—"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
            {(liveScore.elapsed || liveScore.period) && (
              <p className="text-[10px] text-gray-500 tabular-nums text-center leading-none">
                {[liveScore.elapsed, liveScore.period].filter(Boolean).join(" ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl tabular-nums text-gray-900">
              {liveScore.teams[1]?.score ?? "—"}
            </span>
            <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
              {liveScore.teams[1]?.abbreviation ||
                (liveScore.teams[1]?.name ?? "").slice(0, 3).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* ── Pick row ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-[12px] text-gray-500 leading-snug">
            {userName || "Someone"}&nbsp;
            <span className="font-bold text-gray-700">
              {isBuy ? "picked" : "sold"}
            </span>
          </p>
          <p className="font-bold text-gray-900 text-[15px] leading-snug mt-0.5 truncate">
            {outcome}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p
            className={`font-bold text-2xl leading-none tabular-nums ${oddsColor}`}
          >
            {odds}
          </p>
          <p className="text-gray-400 text-[11px] mt-1 tabular-nums">
            {Math.round(price * 100)}¢
          </p>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div className="px-3 py-2.5">
          <p className="text-gray-400 text-[11px] mb-1">Cost</p>
          <p className="font-semibold text-gray-900 text-sm">
            ${cost.toFixed(2)}
          </p>
        </div>

        {isBuy && potentialWin !== undefined ? (
          <div className="px-3 py-2.5">
            <p className="text-gray-400 text-[11px] mb-1">To win</p>
            <p className="font-semibold text-sm text-green-600">
              ${potentialWin.toFixed(2)}
            </p>
          </div>
        ) : (
          !isBuy && (
            <div className="px-3 py-2.5">
              <p className="text-gray-400 text-[11px] mb-1">Receive</p>
              <p className="font-semibold text-sm text-blue-600">
                ${cost.toFixed(2)}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
