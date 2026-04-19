'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClobOrder, useTickSize } from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import type { PolymarketMarket } from '@/hooks/polymarket';
import type { ClobClient } from '@polymarket/clob-client';
import { MIN_ORDER_SIZE } from '@/constants/polymarket';

import Portal from '../shared/Portal';
import BuySellToggle, {
  type OrderVariant,
} from '../OrderModal/BuySellToggle';
import AmountInput from '../OrderModal/AmountInput';
import SharesInput from '../OrderModal/SharesInput';
import ToWinDisplay from '../OrderModal/ToWinDisplay';
import YoullReceiveDisplay from '../OrderModal/YoullReceiveDisplay';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  return (
    Math.abs(price - Math.round(price / tickSize) * tickSize) < 1e-10
  );
}

/** djb2-XOR hash — produces a deterministic pseudo-random float in [0, 1) */
function seededRand(seed: string, idx: number): number {
  let h = 5381;
  const s = seed + String(idx);
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

const CHART_W = 210;
const CHART_H = 80;
const PAD_Y = 10;

function generateSparklinePoints(
  seed: string,
  endPrice: number,
): { x: number; y: number }[] {
  const count = 12;
  const startP = 0.47 + seededRand(seed, 999) * 0.06;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const base = startP + (endPrice - startP) * t;
    const noiseScale = 0.08 * (1 - t * 0.6);
    const noise = (seededRand(seed, i) - 0.5) * noiseScale * 2;
    const p = Math.max(0.03, Math.min(0.97, base + noise));
    return { x: t * CHART_W, y: PAD_Y + (1 - p) * CHART_H };
  });
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const cx = ((p.x + c.x) / 2).toFixed(1);
    d += ` C ${cx} ${p.y.toFixed(1)}, ${cx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

function toAmericanOdds(p: number): string {
  if (!isFinite(p) || p <= 0 || p >= 1) return '—';
  if (Math.abs(p - 0.5) < 0.001) return 'EVEN';
  return p > 0.5
    ? String(Math.round(-(p / (1 - p)) * 100))
    : `+${Math.round(((1 - p) / p) * 100)}`;
}

function getAbbr(name: string): string {
  if (!name) return '?';
  if (name.length <= 4) return name.toUpperCase();
  const words = name.trim().split(/\s+/);
  if (words.length >= 2)
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  return name.slice(0, 3).toUpperCase();
}

function formatVolumeLabel(
  raw: string | number | undefined,
): string | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M Vol.`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K Vol.`;
  return `$${n.toFixed(0)} Vol.`;
}

type EventTeam = NonNullable<PolymarketMarket['eventTeams']>[number];

/** Match a team-meta entry to an outcome label like "76ers" or "Celtics". */
function matchTeamMeta(
  outcomeLabel: string,
  teams: EventTeam[] | undefined,
  fallbackIndex: number,
): EventTeam | undefined {
  if (!teams || teams.length === 0) return undefined;
  const lower = outcomeLabel.trim().toLowerCase();
  if (!lower) return teams[fallbackIndex];
  return (
    teams.find((t) => (t.name ?? '').toLowerCase() === lower) ||
    teams.find((t) => (t.name ?? '').toLowerCase().includes(lower)) ||
    teams.find((t) => lower.includes((t.name ?? '').toLowerCase())) ||
    teams.find(
      (t) => (t.abbreviation ?? '').toLowerCase() === lower,
    ) ||
    teams[fallbackIndex]
  );
}

type HistoryPoint = { t: number; p: number };

/** Fetch Polymarket CLOB prices-history for two outcome tokens in parallel. */
function usePriceHistory(
  yesTokenId: string,
  noTokenId: string,
  enabled: boolean,
): {
  yesHistory: HistoryPoint[];
  noHistory: HistoryPoint[];
  loading: boolean;
} {
  const [yesHistory, setYesHistory] = useState<HistoryPoint[]>([]);
  const [noHistory, setNoHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !yesTokenId || !noTokenId) {
      setYesHistory([]);
      setNoHistory([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const fetchOne = (id: string) =>
      fetch(
        `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(
          id,
        )}&interval=1d&fidelity=30`,
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
                isFinite(pt.t) &&
                isFinite(pt.p) &&
                pt.p >= 0 &&
                pt.p <= 1,
            );
        })
        .catch(() => [] as HistoryPoint[]);

    Promise.all([fetchOne(yesTokenId), fetchOne(noTokenId)]).then(
      ([y, n]) => {
        if (cancelled) return;
        setYesHistory(y);
        setNoHistory(n);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, yesTokenId, noTokenId]);

  return { yesHistory, noHistory, loading };
}

/** Cubic-bezier smoothed SVG path for a time-series plotted into (x, y). */
function historyToSmoothPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
): string {
  if (series.length < 2) return '';
  const span = Math.max(1, tMax - tMin);
  const toXY = (pt: HistoryPoint) => ({
    x: plotX + ((pt.t - tMin) / span) * plotW,
    y: plotY + (1 - pt.p) * plotH,
  });
  const pts = series.map(toXY);
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const cx = ((a.x + b.x) / 2).toFixed(2);
    d += ` C ${cx} ${a.y.toFixed(2)}, ${cx} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return d;
}

function formatHour(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Sports probability panel ──────────────────────────────────────────────────

type SportsProbabilityPanelProps = {
  yesTokenId: string;
  noTokenId: string;
  yesPrice: number;
  noPrice: number;
  yesTeam: EventTeam | undefined;
  noTeam: EventTeam | undefined;
  yesName: string;
  noName: string;
  yesAbbr: string;
  noAbbr: string;
  gameStartTime?: string;
  volumeLabel: string | null;
  seed: string;
  enabled: boolean;
  isLive: boolean;
};

function SportsProbabilityPanel({
  yesTokenId,
  noTokenId,
  yesPrice,
  noPrice,
  yesTeam,
  noTeam,
  yesName,
  noName,
  yesAbbr,
  noAbbr,
  gameStartTime,
  volumeLabel,
  seed,
  enabled,
  isLive,
}: SportsProbabilityPanelProps) {
  const { yesHistory, noHistory, loading } = usePriceHistory(
    yesTokenId,
    noTokenId,
    enabled,
  );

  // ── Chart geometry (designed for the 360px-ish modal column) ──────────────
  const VB_W = 360;
  const VB_H = 180;
  const PLOT_X = 8;
  const PLOT_Y = 14;
  const RIGHT_PAD = 74; // room for end labels + Y-axis ticks
  const BOTTOM_PAD = 22; // room for X-axis ticks
  const PLOT_W = VB_W - PLOT_X - RIGHT_PAD;
  const PLOT_H = VB_H - PLOT_Y - BOTTOM_PAD;

  // ── Build series: prefer real history, fall back to seeded sparkline ──────
  const { yesSeries, noSeries, tMin, tMax, xTicks } = useMemo(() => {
    const hasHistory =
      yesHistory.length >= 2 && noHistory.length >= 2;

    if (hasHistory) {
      const allTs = [
        ...yesHistory.map((p) => p.t),
        ...noHistory.map((p) => p.t),
      ];
      const min = Math.min(...allTs);
      const max = Math.max(...allTs);
      // 5 evenly spaced ticks
      const ticks = Array.from({ length: 5 }, (_, i) =>
        Math.round(min + ((max - min) * i) / 4),
      );
      return {
        yesSeries: yesHistory,
        noSeries: noHistory,
        tMin: min,
        tMax: max,
        xTicks: ticks,
      };
    }

    // Fallback: synthesize a plausible curve so the panel still looks alive
    // while prices-history loads (or when the endpoint has no data).
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60;
    const N = 24;
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
    const ys = synth(yesPrice, seed + 'y');
    const ns = synth(noPrice, seed + 'n');
    const ticks = Array.from({ length: 5 }, (_, i) =>
      Math.round(start + ((now - start) * i) / 4),
    );
    return {
      yesSeries: ys,
      noSeries: ns,
      tMin: start,
      tMax: now,
      xTicks: ticks,
    };
  }, [yesHistory, noHistory, yesPrice, noPrice, seed]);

  const yesPath = historyToSmoothPath(
    yesSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );
  const noPath = historyToSmoothPath(
    noSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );

  // Color scheme: leader green, trailer blue (matches the Polymarket reference)
  const yesLeads = yesPrice >= noPrice;
  const yesColor = yesLeads ? '#22C55E' : '#3B82F6';
  const noColor = yesLeads ? '#3B82F6' : '#22C55E';

  const yesPctInt = Math.round(yesPrice * 100);
  const noPctInt = Math.round(noPrice * 100);

  // Endpoints for the dots + end-labels
  const endY = (p: number) => PLOT_Y + (1 - p) * PLOT_H;
  const yesEndY = endY(yesPrice);
  const noEndY = endY(noPrice);
  const endX = PLOT_X + PLOT_W;

  // Keep the two end-labels from overlapping when probabilities are close.
  // Always anchor the higher-prob label above and the lower one below.
  const [upperY, upperColor, upperName, upperPct] = yesLeads
    ? [yesEndY, yesColor, yesName, yesPctInt]
    : [noEndY, noColor, noName, noPctInt];
  const [lowerY, lowerColor, lowerName, lowerPct] = yesLeads
    ? [noEndY, noColor, noName, noPctInt]
    : [yesEndY, yesColor, yesName, yesPctInt];
  const labelGap = Math.max(26, Math.abs(upperY - lowerY));
  const upperLabelY = Math.max(
    18,
    Math.min(upperY, PLOT_Y + PLOT_H - labelGap),
  );
  const lowerLabelY = Math.min(
    PLOT_Y + PLOT_H - 4,
    Math.max(lowerY, upperLabelY + labelGap),
  );

  // Teams-row helpers
  const gameDate = gameStartTime ? new Date(gameStartTime) : null;
  const timeText = gameDate
    ? gameDate.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;
  const dateText = gameDate
    ? gameDate.toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
      })
    : null;

  const yesScoreRaw = yesTeam?.score;
  const noScoreRaw = noTeam?.score;
  const yesScoreNum =
    yesScoreRaw != null && yesScoreRaw !== '' ? Number(yesScoreRaw) : NaN;
  const noScoreNum =
    noScoreRaw != null && noScoreRaw !== '' ? Number(noScoreRaw) : NaN;
  const hasScores = isFinite(yesScoreNum) && isFinite(noScoreNum);
  const showLiveScore = isLive && hasScores;

  return (
    <div className="bg-white  text-gray-900 p-4 mb-4">
      {/* ── Team matchup row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 items-center gap-2 mb-4">
        <TeamBadgeBlock
          team={yesTeam}
          abbr={yesAbbr}
          name={yesName}
          align="start"
        />
        <div className="text-center">
          {showLiveScore ? (
            <div className="flex flex-col items-center">
              <p className="text-xl font-extrabold text-gray-900 leading-none tabular-nums">
                {yesScoreNum} - {noScoreNum}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            </div>
          ) : (
            <>
              {timeText && (
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {timeText}
                </p>
              )}
              {dateText && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {dateText}
                </p>
              )}
              {!timeText && !dateText && (
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  vs
                </p>
              )}
            </>
          )}
        </div>
        <TeamBadgeBlock
          team={noTeam}
          abbr={noAbbr}
          name={noName}
          align="end"
        />
      </div>

      {/* ── Volume line ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-gray-900">
          {volumeLabel ?? ''}
        </p>
      </div>

      {/* ── Probability chart ───────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ height: 180 }}
        role="img"
        aria-label={`${yesName} vs ${noName} probability history`}
      >
        {/* Horizontal gridlines at 0 / 25 / 50 / 75 / 100 */}
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
              strokeWidth={1}
              strokeDasharray={v === 0 || v === 1 ? '' : '2 3'}
            />
          );
        })}

        {/* Y-axis tick labels (on the right, inside the right pad) */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const y = PLOT_Y + (1 - v) * PLOT_H;
          return (
            <text
              key={`yt-${v}`}
              x={PLOT_X + PLOT_W + 6}
              y={y + 3}
              fontSize={9}
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
              y={VB_H - 6}
              fontSize={9}
              fill="#9CA3AF"
              textAnchor={
                i === 0
                  ? 'start'
                  : i === xTicks.length - 1
                    ? 'end'
                    : 'middle'
              }
              fontFamily="system-ui, sans-serif"
            >
              {formatHour(t)}
            </text>
          );
        })}

        {/* Lines */}
        <path
          d={noPath}
          fill="none"
          stroke={noColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.6 : 1}
        />
        <path
          d={yesPath}
          fill="none"
          stroke={yesColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.6 : 1}
        />

        {/* Endpoint dots */}
        <circle cx={endX} cy={noEndY} r={3.5} fill={noColor} />
        <circle cx={endX} cy={yesEndY} r={3.5} fill={yesColor} />

        {/* End labels (team name + percentage) */}
        <text
          x={endX + 4}
          y={upperLabelY - 2}
          fontSize={10}
          fontWeight={600}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {upperName}
        </text>
        <text
          x={endX + 4}
          y={upperLabelY + 12}
          fontSize={14}
          fontWeight={800}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {upperPct}%
        </text>

        <text
          x={endX + 4}
          y={lowerLabelY - 14}
          fontSize={10}
          fontWeight={600}
          fill={lowerColor}
          fontFamily="system-ui, sans-serif"
        >
          {lowerName}
        </text>
        <text
          x={endX + 4}
          y={lowerLabelY}
          fontSize={14}
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

function TeamBadgeBlock({
  team,
  abbr,
  name,
  align,
}: {
  team: EventTeam | undefined;
  abbr: string;
  name: string;
  align: 'start' | 'end';
}) {
  const color = team?.color || '#374151';
  const logo = team?.logo;
  const displayAbbr = team?.abbreviation || abbr;
  const displayName = team?.name || name;
  return (
    <div
      className={`flex flex-col items-center ${
        align === 'start' ? 'sm:items-start' : 'sm:items-end'
      }`}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={displayAbbr}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-xs font-extrabold tracking-wide text-white">
            {displayAbbr}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-700 mt-1.5 text-center truncate max-w-[110px]">
        {displayName}
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type MarketDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  market: PolymarketMarket;
  clobClient: ClobClient | null;
  balance?: number;
  yesShares?: number;
  noShares?: number;
  initialOutcome?: 'yes' | 'no';
  initialAmount?: string;
};

export default function MarketDetailModal({
  isOpen,
  onClose,
  market,
  clobClient,
  balance = 0,
  yesShares = 0,
  noShares = 0,
  initialOutcome,
  initialAmount,
}: MarketDetailModalProps) {
  // ── Derived market data ───────────────────────────────────────────────────
  const outcomes = useMemo(
    () =>
      market.outcomes
        ? (JSON.parse(market.outcomes) as string[])
        : ['Yes', 'No'],
    [market.outcomes],
  );
  const tokenIds = useMemo(
    () =>
      market.clobTokenIds
        ? (JSON.parse(market.clobTokenIds) as string[])
        : [],
    [market.clobTokenIds],
  );
  const staticPrices = useMemo(
    () =>
      market.outcomePrices
        ? (JSON.parse(market.outcomePrices) as string[]).map(Number)
        : [0.5, 0.5],
    [market.outcomePrices],
  );

  const yesTokenId = tokenIds[0] || '';
  const noTokenId = tokenIds[1] || '';

  const yesPrice =
    market.realtimePrices?.[yesTokenId]?.bidPrice ??
    staticPrices[0] ??
    0.5;
  const noPrice =
    market.realtimePrices?.[noTokenId]?.bidPrice ??
    staticPrices[1] ??
    0.5;

  const yesOutcomeName = outcomes[0] || 'Yes';
  const noOutcomeName = outcomes[1] || 'No';
  const yesAbbr = getAbbr(yesOutcomeName);
  const noAbbr = getAbbr(noOutcomeName);

  const negRisk = market.negRisk || false;
  const seed = market.slug || market.id || 'market';

  const isLive = market.gameStartTime
    ? new Date(market.gameStartTime).getTime() < Date.now()
    : false;

  // Sports detection: we treat a market as a sports matchup when Polymarket
  // attached per-team metadata (the same signal SportsGameCard uses for logos
  // and colors) or when we have a gameStartTime + two distinct team-like
  // outcome labels. Non-sports markets keep the original compact sparkline.
  const isSports = useMemo(() => {
    if (market.eventTeams && market.eventTeams.length >= 2)
      return true;
    if (!market.gameStartTime) return false;
    const [a, b] = outcomes;
    if (!a || !b) return false;
    const looksBinary =
      /^(yes|no)$/i.test(a) && /^(yes|no)$/i.test(b);
    return !looksBinary;
  }, [market.eventTeams, market.gameStartTime, outcomes]);

  const yesTeamMeta = useMemo(
    () => matchTeamMeta(yesOutcomeName, market.eventTeams, 0),
    [yesOutcomeName, market.eventTeams],
  );
  const noTeamMeta = useMemo(
    () => matchTeamMeta(noOutcomeName, market.eventTeams, 1),
    [noOutcomeName, market.eventTeams],
  );

  const volumeLabel = useMemo(
    () => formatVolumeLabel(market.volume24hr ?? market.volume),
    [market.volume24hr, market.volume],
  );

  // ── Chart paths ───────────────────────────────────────────────────────────
  const yesPoints = useMemo(
    () => generateSparklinePoints(seed + 'y', yesPrice),
    [seed, yesPrice],
  );
  const noPoints = useMemo(
    () => generateSparklinePoints(seed + 'n', noPrice),
    [seed, noPrice],
  );
  const yesPath = useMemo(() => pointsToPath(yesPoints), [yesPoints]);
  const noPath = useMemo(() => pointsToPath(noPoints), [noPoints]);

  // Label Y positions: higher-probability outcome label goes to top
  const yesIsHigher = yesPrice >= noPrice;
  const yesLabelY = yesIsHigher ? 18 : 72;
  const noLabelY = yesIsHigher ? 72 : 18;

  // ── Order state ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [orderType, setOrderType] = useState<OrderVariant>('market');
  const [gtdHours, setGtdHours] = useState(24);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcome, setSelectedOutcome] = useState<
    'yes' | 'no'
  >('yes');
  const [limitPrice, setLimitPrice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { eoaAddress } = usePolymarketWallet();

  const activeTokenId =
    selectedOutcome === 'yes' ? yesTokenId : noTokenId;
  const activePrice = selectedOutcome === 'yes' ? yesPrice : noPrice;
  const activeShareBalance =
    selectedOutcome === 'yes' ? yesShares : noShares;

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? activeTokenId : null,
  );
  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  // Reset state whenever the modal opens; pre-fill from position if provided
  useEffect(() => {
    if (isOpen) {
      setInputValue(initialAmount ?? '');
      setOrderType('market');
      setSide('BUY');
      setSelectedOutcome(initialOutcome ?? 'yes');
      setLimitPrice('');
      setLocalError(null);
      setShowSuccess(false);
    }
  }, [isOpen, initialOutcome, initialAmount]);

  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  useEffect(() => {
    if (orderId && isOpen) {
      setShowSuccess(true);
      const t = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [orderId, isOpen, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const inputNum = parseFloat(inputValue) || 0;
  // limitPrice is entered by the user in cents (1–99); convert to decimal (0–1) for the API
  const limitPriceNum = (parseFloat(limitPrice) || 0) / 100;
  const isMarketVariant =
    orderType === 'market' || orderType === 'fak';
  const isLimitVariant = orderType === 'limit' || orderType === 'gtd';
  const effectivePrice = isLimitVariant ? limitPriceNum : activePrice;

  // Limit BUY: inputNum is shares (shares-first input like Polymarket)
  // Market BUY: inputNum is dollars — divide by price to get shares
  // SELL (any):  inputNum is shares
  const shares =
    side === 'BUY'
      ? isLimitVariant
        ? inputNum
        : effectivePrice > 0
          ? inputNum / effectivePrice
          : 0
      : inputNum;

  // Limit BUY: cost = shares × price  |  Market / SELL: cost = inputNum
  const totalCost =
    side === 'BUY' && isLimitVariant
      ? shares * limitPriceNum
      : inputNum;

  const EPSILON = 0.01 + 1e-6; // allow up to 1 cent wiggle room to avoid float/rounding disable

  const potentialWin = side === 'BUY' ? shares : 0;
  const amountToReceive =
    side === 'SELL' ? inputNum * effectivePrice : 0;
  const hasInsufficientBalance =
    side === 'BUY'
      ? totalCost - balance > EPSILON
      : inputNum - activeShareBalance > EPSILON;

  const LIMIT_MIN_SHARES = market.orderMinSize ?? MIN_ORDER_SIZE;

  const handlePlaceOrder = async () => {
    if (side === 'BUY') {
      if (isLimitVariant) {
        if (inputNum < LIMIT_MIN_SHARES) {
          setLocalError(
            `Minimum order is ${LIMIT_MIN_SHARES} shares`,
          );
          return;
        }
      } else if (inputNum < 1) {
        setLocalError('Minimum order amount is $1.00');
        return;
      }
    }
    if (side === 'SELL' && inputNum < 1) {
      setLocalError('Minimum shares to sell: 1');
      return;
    }
    if (isLimitVariant) {
      if (!limitPrice || limitPriceNum <= 0) {
        setLocalError('Limit price is required');
        return;
      }
      if (limitPriceNum < tickSize || limitPriceNum > 1 - tickSize) {
        setLocalError(
          `Price must be between ${(tickSize * 100).toFixed(0)}¢ and ${((1 - tickSize) * 100).toFixed(0)}¢`,
        );
        return;
      }
      if (!isValidTickPrice(limitPriceNum, tickSize)) {
        setLocalError(
          `Price must be a multiple of tick size (${(tickSize * 100).toFixed(0)}¢)`,
        );
        return;
      }
    }
    try {
      // Market BUY: pass dollar amount (CLOB converts internally)
      // Limit BUY:  pass share count directly
      // Any SELL:   pass share count
      const orderSize =
        isMarketVariant && side === 'BUY' ? inputNum : shares;
      const gtdExpiration =
        orderType === 'gtd'
          ? Math.floor(Date.now() / 1000) + 60 + gtdHours * 3600
          : undefined;
      await submitOrder({
        tokenId: activeTokenId,
        size: orderSize,
        price: isLimitVariant ? limitPriceNum : undefined,
        side,
        negRisk,
        isMarketOrder: isMarketVariant,
        fillType: orderType === 'fak' ? 'FAK' : 'FOK',
        expiration: gtdExpiration,
      });
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[400px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <span className="text-xs text-gray-400 text-center max-w-[200px] truncate">
              {market.eventTitle || market.question}
            </span>

            {/* spacer to center title */}
            <div className="w-9" />
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 px-4 pb-6">
            {isSports ? (
              <SportsProbabilityPanel
                yesTokenId={yesTokenId}
                noTokenId={noTokenId}
                yesPrice={yesPrice}
                noPrice={noPrice}
                yesTeam={yesTeamMeta}
                noTeam={noTeamMeta}
                yesName={yesOutcomeName}
                noName={noOutcomeName}
                yesAbbr={yesAbbr}
                noAbbr={noAbbr}
                gameStartTime={market.gameStartTime}
                volumeLabel={volumeLabel}
                seed={seed}
                enabled={isOpen}
                isLive={isLive}
              />
            ) : (
              <></>
            )}

            {/* ── Divider ── */}
            <div className="border-t border-gray-100 mb-3" />

            {/* ── Success / Error feedback ── */}
            {showSuccess && (
              <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-green-600 font-medium text-sm text-center">
                  Order placed successfully!
                </p>
              </div>
            )}
            {(localError || orderError) && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-500 text-sm text-center">
                  {localError || orderError?.message}
                </p>
              </div>
            )}

            {/* ── Buy / Sell toggle + order type ── */}
            <BuySellToggle
              side={side}
              onSideChange={(s) => {
                setSide(s);
                setLocalError(null);
              }}
              orderType={orderType}
              onOrderTypeChange={(t) => {
                const wasMarket =
                  orderType === 'market' || orderType === 'fak';
                setOrderType(t);
                setLocalError(null);

                const nowMarket = t === 'market' || t === 'fak';
                const nowLimit = t === 'limit' || t === 'gtd';
                if (
                  (wasMarket && nowLimit) ||
                  (!wasMarket && nowMarket)
                ) {
                  setInputValue('');
                  setLimitPrice('');
                }
              }}
            />

            {/* GTD expiration selector */}
            {orderType === 'gtd' && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-500 flex-shrink-0">
                  Expires in
                </span>
                <select
                  value={gtdHours}
                  onChange={(e) =>
                    setGtdHours(Number(e.target.value))
                  }
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            )}

            {/* ── Outcome selector (team / Yes-No buttons) ── */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => {
                  setSelectedOutcome('yes');
                  setInputValue('');
                  setLocalError(null);
                }}
                className={`flex-1 py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedOutcome === 'yes'
                    ? side === 'SELL'
                      ? 'bg-green-500 border-2 border-green-500 text-white'
                      : 'bg-green-50 border-2 border-green-500 text-green-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300'
                }`}
              >
                {yesOutcomeName}{' '}
                <span className="font-normal opacity-70">
                  .
                  {String(Math.round(yesPrice * 100)).padStart(
                    2,
                    '0',
                  )}
                </span>
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome('no');
                  setInputValue('');
                  setLocalError(null);
                }}
                className={`flex-1 py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedOutcome === 'no'
                    ? side === 'SELL'
                      ? 'bg-red-500 border-2 border-red-500 text-white'
                      : 'bg-red-50 border-2 border-red-500 text-red-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300'
                }`}
              >
                {noOutcomeName}{' '}
                <span className="font-normal opacity-70">
                  .
                  {String(Math.round(noPrice * 100)).padStart(2, '0')}
                </span>
              </button>
            </div>

            {/* ── Amount input (Buy mode) ── */}
            {side === 'BUY' && (
              <AmountInput
                amount={inputValue}
                onAmountChange={(v) => {
                  setInputValue(v);
                  setLocalError(null);
                }}
                balance={balance}
                onQuickAmount={(a) => {
                  setInputValue(String(a));
                  setLocalError(null);
                }}
                onMaxAmount={() => {
                  if (isLimitVariant && limitPriceNum > 0) {
                    // Max shares = how many whole shares the balance can buy
                    const maxShares = Math.floor(
                      balance / limitPriceNum,
                    );
                    setInputValue(String(maxShares));
                  } else if (balance > 0) {
                    const safeMax = Math.max(
                      0,
                      Math.floor((balance - 0.000001) * 100) / 100,
                    );
                    setInputValue(safeMax.toFixed(2));
                  }
                  setLocalError(null);
                }}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => {
                  setLimitPrice(v);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                limitPriceDecimal={
                  isLimitVariant ? limitPriceNum : undefined
                }
                minOrderAmount={isLimitVariant ? LIMIT_MIN_SHARES : 1}
              />
            )}

            {/* ── Shares input (Sell mode) ── */}
            {side === 'SELL' && (
              <SharesInput
                shares={inputValue}
                onSharesChange={(v) => {
                  setInputValue(v);
                  setLocalError(null);
                }}
                shareBalance={activeShareBalance}
                onQuickPercentage={(pct) => {
                  setInputValue(
                    ((activeShareBalance * pct) / 100).toFixed(2),
                  );
                  setLocalError(null);
                }}
                onMaxShares={() => {
                  if (activeShareBalance > 0) {
                    setInputValue(activeShareBalance.toFixed(2));
                    setLocalError(null);
                  }
                }}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => {
                  setLimitPrice(v);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                minShares={market.orderMinSize || 5}
              />
            )}

            {/* ── To Win (Buy) ── */}
            {side === 'BUY' && (
              <ToWinDisplay
                potentialWin={potentialWin}
                avgPrice={effectivePrice}
                amount={isLimitVariant ? totalCost : inputNum}
                totalCost={isLimitVariant ? totalCost : undefined}
              />
            )}

            {/* ── You'll Receive (Sell) ── */}
            {side === 'SELL' && (
              <YoullReceiveDisplay
                amountToReceive={amountToReceive}
                avgPrice={effectivePrice}
                shares={inputNum}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            )}

            {/* ── Place Order button ── */}
            <button
              onClick={handlePlaceOrder}
              disabled={
                isSubmitting ||
                inputNum <= 0 ||
                !clobClient ||
                hasInsufficientBalance
              }
              className={`w-full py-4 font-bold rounded-xl transition-all text-base ${
                side === 'BUY'
                  ? 'bg-green-400 hover:bg-green-500 disabled:bg-green-300'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
              } disabled:cursor-not-allowed text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Placing Order...
                </span>
              ) : !clobClient ? (
                'Connect Wallet'
              ) : (
                'Place Order'
              )}
            </button>

            {!clobClient && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Initialize trading session to place orders
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
