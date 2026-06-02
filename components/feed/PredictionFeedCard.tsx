'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  ended?: boolean;
  closed?: boolean;
  period: string | null;
  elapsed: string | null;
  teams: LiveTeam[];
  markets?: LiveMarket[];
}

interface LiveMarket {
  id: string | null;
  conditionId: string | null;
  question: string | null;
  closed: boolean;
  active: boolean;
  outcomePrices: string | string[] | number[] | null;
  outcomes: string | string[] | null;
  clobTokenIds: string | string[] | null;
}

export interface PredictionContent {
  [key: string]: unknown;
  marketTitle: string;
  outcome: string; // the outcome the user picked
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  price: number; // decimal 0–1, price of the picked outcome
  orderId?: string;
  orderType?: string;
  marketId?: string;
  eventSlug?: string;
  // Sports panel (optional – present only for sports markets)
  yesOutcome?: string; // "yes" outcome label, e.g., "Knicks"
  noOutcome?: string; // "no" outcome label, e.g., "Hawks"
  yesTokenId?: string;
  noTokenId?: string;
  yesPrice?: number; // decimal 0–1
  noPrice?: number; // decimal 0–1
  gameStartTime?: string; // ISO date string
  volume?: string; // pre-formatted, e.g., "$528.16K Vol."
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
  status?: string;
  result?: string;
  resultStatus?: string;
  pnl?: number | string;
  realizedPnl?: number | string;
  cashPnl?: number | string;
  sellPnl?: number | string;
  profit?: number | string;
  profitAmount?: number | string;
  loss?: number | string;
  lossAmount?: number | string;
  currentPrice?: number | string;
  currentValue?: number | string;
  saleAmount?: number | string;
}

interface PredictionFeedCardProps {
  content: PredictionContent;
  userName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return '—';
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

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '')
    return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = finiteNumber(value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatCents(price: number | undefined): string {
  if (price === undefined) return '—';
  return `${(price * 100).toFixed(1)}¢`;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function sameId(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function resolveMarketState(
  content: PredictionContent,
  liveScore: LiveScore | null,
): ResolvedMarketState {
  const markets = liveScore?.markets ?? [];
  const matched = markets.find((market) => {
    const tokenIds = parseList(market.clobTokenIds);
    return (
      sameId(market.id, content.marketId) ||
      sameId(market.conditionId, content.marketId) ||
      tokenIds.some(
        (tokenId) =>
          sameId(tokenId, content.yesTokenId) ||
          sameId(tokenId, content.noTokenId),
      )
    );
  });

  const outcomePrices = parseList(matched?.outcomePrices)
    .map(Number)
    .filter(
      (price) => Number.isFinite(price) && price >= 0 && price <= 1,
    );
  const tokenIds = parseList(matched?.clobTokenIds);
  const outcomes = parseList(matched?.outcomes);

  const yesIdx = tokenIds.findIndex((id) =>
    sameId(id, content.yesTokenId),
  );
  const noIdx = tokenIds.findIndex((id) =>
    sameId(id, content.noTokenId),
  );
  const pickedIdx = outcomes.findIndex(
    (label) => label.toLowerCase() === content.outcome.toLowerCase(),
  );

  const yesPrice =
    yesIdx >= 0
      ? outcomePrices[yesIdx]
      : (outcomePrices[0] ?? undefined);
  const noPrice =
    noIdx >= 0
      ? outcomePrices[noIdx]
      : (outcomePrices[1] ?? undefined);
  const pickedPrice =
    pickedIdx >= 0
      ? outcomePrices[pickedIdx]
      : content.outcome.toLowerCase() ===
          content.yesOutcome?.toLowerCase()
        ? yesPrice
        : content.outcome.toLowerCase() ===
            content.noOutcome?.toLowerCase()
          ? noPrice
          : undefined;
  const scoreForOutcome = (
    outcomeLabel: string | undefined,
    fallbackIdx: number,
  ): number | undefined => {
    if (!outcomeLabel || !liveScore?.teams?.length) return undefined;
    const lower = outcomeLabel.toLowerCase();
    const found = liveScore.teams.find((team) => {
      const name = (team.name ?? '').toLowerCase();
      const abbr = (team.abbreviation ?? '').toLowerCase();
      return (
        (name && (name.includes(lower) || lower.includes(name))) ||
        (abbr && lower.includes(abbr))
      );
    });
    const score = (found ?? liveScore.teams[fallbackIdx])?.score;
    return score == null ? undefined : score;
  };
  const yesScore = scoreForOutcome(content.yesOutcome, 0);
  const noScore = scoreForOutcome(content.noOutcome, 1);
  const pickedWon =
    yesScore !== undefined &&
    noScore !== undefined &&
    yesScore !== noScore
      ? content.outcome.toLowerCase() ===
        content.yesOutcome?.toLowerCase()
        ? yesScore > noScore
        : content.outcome.toLowerCase() ===
            content.noOutcome?.toLowerCase()
          ? noScore > yesScore
          : undefined
      : undefined;

  return {
    closed: Boolean(
      liveScore?.ended ||
      liveScore?.closed ||
      matched?.closed ||
      matched?.active === false,
    ),
    yesPrice,
    noPrice,
    pickedPrice,
    pickedWon,
  };
}

type FeedTradeState =
  | 'live'
  | 'won'
  | 'lost'
  | 'sold-profit'
  | 'sold-loss'
  | 'sold'
  | 'open';

interface TradeStateMeta {
  state: FeedTradeState;
  label: string;
  detail: string;
  tone: 'green' | 'red' | 'blue' | 'gray';
  amount?: number;
}

interface ResolvedMarketState {
  closed: boolean;
  yesPrice?: number;
  noPrice?: number;
  pickedPrice?: number;
  pickedWon?: boolean;
}

function resolveTradeState(
  content: PredictionContent,
  isLive: boolean,
  marketState: ResolvedMarketState,
): TradeStateMeta {
  const side = content.side;
  const statusText = String(
    content.resultStatus ?? content.result ?? content.status ?? '',
  ).toLowerCase();

  const realizedPnl = firstNumber(
    content.realizedPnl,
    content.cashPnl,
    content.pnl,
  );
  const explicitProfit = firstNumber(
    content.profit,
    content.profitAmount,
  );
  const explicitLoss = firstNumber(content.loss, content.lossAmount);
  const sellPnl = firstNumber(
    content.sellPnl,
    realizedPnl,
    explicitProfit,
    explicitLoss !== undefined ? -Math.abs(explicitLoss) : undefined,
  );
  const pnl =
    realizedPnl ??
    explicitProfit ??
    (explicitLoss !== undefined
      ? -Math.abs(explicitLoss)
      : undefined);

  if (statusText.includes('won') || statusText.includes('win')) {
    return {
      state: 'won',
      label: 'Won',
      detail: 'The pick settled in profit',
      tone: 'green',
      amount: pnl ?? content.potentialWin,
    };
  }

  if (
    statusText.includes('lost') ||
    statusText.includes('loss') ||
    statusText.includes('lose')
  ) {
    return {
      state: 'lost',
      label: 'Lost',
      detail: 'The pick settled at a loss',
      tone: 'red',
      amount: pnl ?? -Math.abs(content.cost),
    };
  }

  const sold =
    side === 'SELL' ||
    statusText.includes('sold') ||
    statusText.includes('sell') ||
    statusText.includes('closed');

  if (sold) {
    if (sellPnl !== undefined && sellPnl > 0) {
      return {
        state: 'sold-profit',
        label: 'Sold for profit',
        detail: 'Position closed above cost',
        tone: 'green',
        amount: sellPnl,
      };
    }
    if (sellPnl !== undefined && sellPnl < 0) {
      return {
        state: 'sold-loss',
        label: 'Sold for loss',
        detail: 'Position closed below cost',
        tone: 'red',
        amount: sellPnl,
      };
    }
    return {
      state: 'sold',
      label: 'Sold',
      detail: 'Position closed',
      tone: 'blue',
      amount: firstNumber(content.saleAmount, content.cost),
    };
  }

  if (isLive) {
    return {
      state: 'live',
      label: 'Live',
      detail: 'Game in progress',
      tone: 'blue',
    };
  }

  if (marketState.closed) {
    if (marketState.pickedWon === true) {
      return {
        state: 'won',
        label: 'Won',
        detail: 'The market is closed',
        tone: 'green',
        amount: pnl ?? content.potentialWin,
      };
    }
    if (marketState.pickedWon === false) {
      return {
        state: 'lost',
        label: 'Lost',
        detail: 'The market is closed',
        tone: 'red',
        amount: pnl ?? -Math.abs(content.cost),
      };
    }

    if (marketState.pickedPrice !== undefined) {
      if (marketState.pickedPrice >= 0.99) {
        return {
          state: 'won',
          label: 'Won',
          detail: 'The market is closed',
          tone: 'green',
          amount: pnl ?? content.potentialWin,
        };
      }
      if (marketState.pickedPrice <= 0.01) {
        return {
          state: 'lost',
          label: 'Lost',
          detail: 'The market is closed',
          tone: 'red',
          amount: pnl ?? -Math.abs(content.cost),
        };
      }
    }

    return {
      state: 'sold',
      label: 'Closed',
      detail: 'The market is no longer open',
      tone: 'blue',
      amount: pnl,
    };
  }

  return {
    state: 'open',
    label: 'Open pick',
    detail: 'Waiting for the market to settle',
    tone: 'gray',
  };
}

function toneClasses(tone: TradeStateMeta['tone']) {
  if (tone === 'green')
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (tone === 'red') return 'bg-red-50 text-red-700 border-red-100';
  if (tone === 'blue')
    return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-gray-50 text-gray-700 border-gray-100';
}

// ─── Live score hook ──────────────────────────────────────────────────────────

function useLiveScore(
  eventSlug: string | undefined,
): LiveScore | null {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    if (!eventSlug) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchScore = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
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
    if (!enabled || !yesTokenId || !noTokenId) return;
    let cancelled = false;
    setLoading(true);

    const fetchOne = (id: string) =>
      fetch(
        `/api/polymarket/prices-history?tokenId=${encodeURIComponent(
          id,
        )}&interval=max&fidelity=30`,
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

// ─── Chart path builder ───────────────────────────────────────────────────────

function historyToPath(
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

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function formatPercent(price: number): string {
  return `${Math.round(clampProbability(price) * 100)}%`;
}

function formatSignedUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${formatUsd(value)}`;
}

function initials(value?: string): string {
  if (!value) return 'AS';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const next = parts.length >= 2
    ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
    : value.slice(0, 2);
  return next.toUpperCase();
}

function formatClock(date: Date, includeMeridiem = true): string {
  const formatted = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return includeMeridiem ? formatted : formatted.replace(/\s?[AP]M$/i, '');
}

function formatGameCenter(gameStartTime?: string): string {
  if (!gameStartTime) return 'Market open';
  const date = new Date(gameStartTime);
  if (Number.isNaN(date.getTime())) return 'Market open';
  const day = date
    .toLocaleDateString([], { weekday: 'short' })
    .toUpperCase();
  return `${day} · ${formatClock(date)}`;
}

function inferLeagueLabel(
  marketTitle: string,
  eventSlug?: string,
): string {
  const source = `${marketTitle} ${eventSlug ?? ''}`.toLowerCase();
  const leagues = [
    'nba',
    'wnba',
    'nfl',
    'mlb',
    'nhl',
    'ncaab',
    'ncaaf',
    'epl',
    'mls',
    'ipl',
  ];
  const found = leagues.find((league) =>
    new RegExp(`(^|[^a-z])${league}([^a-z]|$)`).test(source),
  );
  return found ? found.toUpperCase() : 'SPORTS';
}

function inferMarketKind(marketTitle: string): string {
  const lower = marketTitle.toLowerCase();
  if (lower.includes('spread')) return 'SPREAD';
  if (lower.includes('total') || lower.includes('over/under'))
    return 'TOTAL';
  return 'MONEYLINE';
}

function statusPill(
  tradeState: TradeStateMeta,
  liveScore: LiveScore | null,
  gameStartTime?: string,
): {
  label: string;
  className: string;
  dotClassName?: string;
} {
  if (liveScore?.live) {
    const suffix = liveScore.period || liveScore.elapsed;
    return {
      label: suffix ? `LIVE · ${suffix}` : 'LIVE',
      className: 'bg-red-50 text-red-500 border-red-100',
      dotClassName: 'bg-red-400',
    };
  }

  if (
    liveScore?.ended ||
    liveScore?.closed ||
    tradeState.state === 'won' ||
    tradeState.state === 'lost'
  ) {
    return {
      label: 'FINAL',
      className: 'bg-gray-50 text-gray-500 border-gray-100',
    };
  }

  if (
    tradeState.state === 'sold' ||
    tradeState.state === 'sold-profit' ||
    tradeState.state === 'sold-loss'
  ) {
    return {
      label: 'SOLD',
      className: 'bg-blue-50 text-blue-600 border-blue-100',
    };
  }

  if (gameStartTime) {
    const date = new Date(gameStartTime);
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return {
        label: `TIP-OFF ${formatClock(date, false)}`,
        className: 'bg-amber-50 text-amber-600 border-amber-100',
      };
    }
  }

  return {
    label: 'OPEN',
    className: 'bg-gray-50 text-gray-500 border-gray-100',
  };
}

function splitProbabilities(yesPrice: number, noPrice: number) {
  const yes = clampProbability(yesPrice);
  const no = clampProbability(noPrice);
  const total = yes + no;
  if (total <= 0) {
    return { yes: 50, no: 50 };
  }
  return {
    yes: (yes / total) * 100,
    no: (no / total) * 100,
  };
}

function TeamMark({
  team,
  abbr,
}: {
  team?: TeamMeta;
  abbr: string;
}) {
  const color = team?.color || '#374151';
  const logo = team?.logo;
  const displayAbbr = team?.abbreviation || abbr;

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.16)]"
      style={{ backgroundColor: color }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={displayAbbr}
          className="h-7 w-7 object-contain"
        />
      ) : (
        <span className="font-mono text-[10px] font-black text-white">
          {displayAbbr}
        </span>
      )}
    </div>
  );
}

// ─── Sports mini panel ────────────────────────────────────────────────────────

function SportsMiniPanel({
  marketTitle,
  eventSlug,
  yesOutcome,
  noOutcome,
  yesPrice: yP,
  noPrice: nP,
  yesTeam,
  noTeam,
  gameStartTime,
  yesTokenId,
  noTokenId,
  liveScore,
  pickedOutcome,
  userName,
  side,
  cost,
  entryPrice,
  tradeState,
  marketUrl,
}: {
  marketTitle: string;
  eventSlug?: string;
  yesOutcome: string;
  noOutcome: string;
  yesPrice: number;
  noPrice: number;
  yesTeam?: TeamMeta;
  noTeam?: TeamMeta;
  gameStartTime?: string;
  yesTokenId?: string;
  noTokenId?: string;
  liveScore: LiveScore | null;
  pickedOutcome: string;
  userName?: string;
  side: 'BUY' | 'SELL';
  cost: number;
  entryPrice: number;
  tradeState: TradeStateMeta;
  marketUrl?: string;
}) {
  const { yesHistory, noHistory, loading } = usePriceHistory(
    yesTokenId,
    noTokenId,
    true,
  );

  // Chart geometry - tuned for the compact card in the feed.
  const VB_W = 300;
  const VB_H = 72;
  const PLOT_X = 2;
  const PLOT_Y = 8;
  const PLOT_W = VB_W - PLOT_X * 2;
  const PLOT_H = 48;
  const BASELINE_Y = PLOT_Y + PLOT_H + 6;

  const seed = (yesTokenId || yesOutcome) + 'feedseed';

  const { yesSeries, noSeries, tMin, tMax } = useMemo(() => {
    const hasHistory =
      yesHistory.length >= 2 && noHistory.length >= 2;

    if (hasHistory) {
      const allTs = [
        ...yesHistory.map((p) => p.t),
        ...noHistory.map((p) => p.t),
      ];
      const min = Math.min(...allTs);
      const max = Math.max(...allTs);
      return {
        yesSeries: yesHistory,
        noSeries: noHistory,
        tMin: min,
        tMax: max,
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
    const ys = synth(yP, seed + 'y');
    const ns = synth(nP, seed + 'n');
    return {
      yesSeries: ys,
      noSeries: ns,
      tMin: start,
      tMax: now,
    };
  }, [yesHistory, noHistory, yP, nP, seed]);

  const pickedIsYes =
    pickedOutcome.toLowerCase() === yesOutcome.toLowerCase();
  const pickedSeries = pickedIsYes ? yesSeries : noSeries;
  const chartPath = historyToPath(
    pickedSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );
  const latestPoint = pickedSeries[pickedSeries.length - 1];
  const latestPointX = latestPoint
    ? PLOT_X +
      ((latestPoint.t - tMin) / Math.max(1, tMax - tMin)) * PLOT_W
    : PLOT_X + PLOT_W;
  const latestPointY = latestPoint
    ? PLOT_Y + (1 - latestPoint.p) * PLOT_H
    : PLOT_Y + PLOT_H / 2;
  const chartAreaPath = chartPath
    ? `${chartPath} L ${latestPointX.toFixed(2)} ${BASELINE_Y} L ${PLOT_X} ${BASELINE_Y} Z`
    : '';

  const showScores = Boolean(
    liveScore &&
      (liveScore.live || liveScore.ended || liveScore.closed) &&
      liveScore.teams.length >= 2,
  );
  const matchScore = (
    teamName: string,
    teamAbbr: string,
    fallbackIdx: number,
  ): number | null => {
    if (!showScores || !liveScore) return null;
    const lower = teamName.toLowerCase();
    const abbr = teamAbbr.toLowerCase();
    const found = liveScore.teams.find((t) => {
      const n = (t.name ?? '').toLowerCase();
      const a = (t.abbreviation ?? '').toLowerCase();
      return (
        (n && (n.includes(lower) || lower.includes(n))) ||
        (a && a === abbr)
      );
    });
    return (found ?? liveScore.teams[fallbackIdx])?.score ?? null;
  };

  const yesAbbr = (
    yesTeam?.abbreviation || yesOutcome.slice(0, 3)
  ).toUpperCase();
  const noAbbr = (
    noTeam?.abbreviation || noOutcome.slice(0, 3)
  ).toUpperCase();
  const yesScore = matchScore(yesOutcome, yesAbbr, 0);
  const noScore = matchScore(noOutcome, noAbbr, 1);
  const hasScores = yesScore != null && noScore != null;
  const pickedCurrentPrice =
    pickedIsYes ? yP : nP;
  const impliedShares =
    entryPrice > 0 ? cost / entryPrice : undefined;
  const currentValue =
    impliedShares !== undefined
      ? impliedShares * pickedCurrentPrice
      : undefined;
  const currentDelta =
    currentValue !== undefined && Number.isFinite(currentValue)
      ? currentValue - cost
      : undefined;
  const selectedPnl =
    tradeState.state === 'open' || tradeState.state === 'live'
      ? currentDelta
      : tradeState.amount;
  const summaryValue =
    currentValue ??
    (selectedPnl !== undefined ? cost + selectedPnl : undefined);
  const filterId = `feed-shadow-${String(yesTokenId || yesOutcome)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)}`;
  const gradientId = `${filterId}-trend`;
  const split = splitProbabilities(yP, nP);
  const pill = statusPill(tradeState, liveScore, gameStartTime);
  const open =
    tradeState.state === 'open' || tradeState.state === 'live';
  const chartColor =
    tradeState.tone === 'red'
      ? '#E85D5D'
      : tradeState.tone === 'green'
        ? '#51AD7D'
        : pickedIsYes
          ? '#20242D'
          : '#2F7ED8';
  const pnlTone =
    selectedPnl === undefined
      ? 'text-gray-400'
      : selectedPnl >= 0
        ? 'text-[#51AD7D]'
        : 'text-[#E85D5D]';
  const positionVerb =
    side === 'SELL'
      ? 'You sold'
      : open
        ? "You're on"
        : 'You backed';
  const positionKicker = open
    ? selectedPnl === undefined
      ? 'LIVE'
      : selectedPnl >= 0
        ? 'UP'
        : 'DOWN'
    : tradeState.state === 'won' || tradeState.state === 'lost'
      ? 'RESULT'
      : tradeState.label.toUpperCase();

  const buttonForOutcome = (
    label: string,
    price: number,
    selected: boolean,
  ) => {
    const odds = toAmericanOdds(price);
    const classes = `flex h-11 min-w-0 items-center justify-between gap-3 rounded-xl border px-3 text-[13px] font-extrabold transition-colors ${
      selected
        ? 'border-[#2F7ED8] bg-[#2F7ED8] text-white shadow-[0_8px_18px_rgba(47,126,216,0.24)]'
        : 'border-gray-100 bg-white text-gray-900 hover:border-gray-200 hover:bg-gray-50'
    }`;

    if (marketUrl) {
      return (
        <a
          href={marketUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={classes}
          title={`Open ${label} market`}
        >
          <span className="truncate">{label}</span>
          <span
            className={`shrink-0 font-mono text-[12px] ${
              selected ? 'text-white' : 'text-[#2F7ED8]'
            }`}
          >
            {odds}
          </span>
        </a>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${classes} opacity-60`}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono text-[12px]">{odds}</span>
      </button>
    );
  };

  return (
    <div className="mt-2 w-full max-w-[430px] overflow-hidden rounded-[24px] border border-[#ECECEB] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[13px] font-black text-gray-950">
            {inferLeagueLabel(marketTitle, eventSlug)}
          </span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300" />
          <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {inferMarketKind(marketTitle)}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${pill.className}`}
        >
          {pill.dotClassName && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${pill.dotClassName} animate-pulse`}
            />
          )}
          {pill.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <TeamMark team={yesTeam} abbr={yesAbbr} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {yesOutcome}
            </p>
            {hasScores && (
              <p className="font-mono text-[28px] font-black leading-none text-gray-950">
                {yesScore}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 min-w-[76px] text-center">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
            {hasScores
              ? [liveScore?.period, liveScore?.elapsed]
                  .filter(Boolean)
                  .join(' · ') || 'GAME'
              : formatGameCenter(gameStartTime)}
          </p>
        </div>

        <div className="flex min-w-0 items-start justify-end gap-2 text-right">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {noOutcome}
            </p>
            {hasScores && (
              <p className="font-mono text-[28px] font-black leading-none text-gray-400">
                {noScore}
              </p>
            )}
          </div>
          <TeamMark team={noTeam} abbr={noAbbr} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#20242D]" />
          <span className="truncate text-[12px] font-extrabold text-gray-900">
            {yesOutcome}
          </span>
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          {open ? 'WIN PROB' : 'FINAL'}
        </p>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-right text-[12px] font-extrabold text-gray-900">
            {noOutcome}
          </span>
          <span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#2F7ED8]" />
        </div>
      </div>

      <div className="relative mt-2 h-[74px] overflow-hidden rounded-[20px] bg-[#20242D] shadow-inner">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#3A404B] to-[#1E222B]"
          style={{ width: `${split.yes}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-b from-[#5BA2F1] to-[#2F7ED8]"
          style={{ width: `${split.no}%` }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center px-4 text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {yesAbbr}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(yP)}
            </p>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 text-right text-white">
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-white/70">
              {noAbbr}
            </p>
            <p className="font-mono text-[26px] font-black leading-none">
              {formatPercent(nP)}
            </p>
          </div>
        </div>
        {split.yes > 6 && split.yes < 94 && (
          <div
            className="absolute top-0 h-full w-px bg-white/40"
            style={{ left: `${split.yes}%` }}
          >
            <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.20)]">
              <span className="mr-0.5 h-3 w-[2px] rounded-full bg-gray-300" />
              <span className="h-3 w-[2px] rounded-full bg-gray-300" />
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Win Prob · Timeline
          </p>
          <p className="truncate text-right font-mono text-[10px] font-black text-gray-400">
            backing {pickedOutcome}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="mt-1 block h-[72px] w-full"
          role="img"
          aria-label={`${pickedOutcome} probability timeline`}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={chartColor}
                stopOpacity="0.20"
              />
              <stop
                offset="100%"
                stopColor={chartColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <line
            x1={PLOT_X}
            x2={PLOT_X + PLOT_W}
            y1={PLOT_Y + PLOT_H / 2}
            y2={PLOT_Y + PLOT_H / 2}
            stroke="#E5E7EB"
            strokeDasharray="3 5"
            strokeWidth={1}
          />
          {chartAreaPath && (
            <path d={chartAreaPath} fill={`url(#${gradientId})`} />
          )}
          {chartPath && (
            <path
              d={chartPath}
              fill="none"
              stroke={chartColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              opacity={loading ? 0.55 : 1}
            />
          )}
          <circle
            cx={latestPointX}
            cy={latestPointY}
            r={4.5}
            fill="white"
            stroke={chartColor}
            strokeWidth={2.5}
          />
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-[#2F7ED8]">
            {initials(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {positionVerb}{' '}
              <span className="text-[#2F7ED8]">{pickedOutcome}</span>
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-gray-400">
              {formatUsd(cost)} → {formatUsd(summaryValue)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            {positionKicker}
          </p>
          <p className={`font-mono text-[22px] font-black ${pnlTone}`}>
            {formatSignedUsd(selectedPnl)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {open ? (
          <>
            {buttonForOutcome(yesOutcome, yP, pickedIsYes)}
            {buttonForOutcome(noOutcome, nP, !pickedIsYes)}
          </>
        ) : (
          <>
            {marketUrl ? (
              <a
                href={marketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-900 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                Market →
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 items-center justify-center rounded-xl border border-gray-100 bg-white px-3 text-[13px] font-extrabold text-gray-400"
              >
                Market →
              </button>
            )}
            <a
              href="/prediction"
              onClick={(e) => e.stopPropagation()}
              className="flex h-11 items-center justify-center rounded-xl bg-gray-950 px-3 text-[13px] font-extrabold text-white transition-colors hover:bg-black"
            >
              View Predictions
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function PredictionPositionPanel({
  marketTitle,
  outcome,
  yesOutcome,
  noOutcome,
  side,
  cost,
  potentialWin,
  entryPrice,
  currentPrice,
  yesPrice,
  noPrice,
  tradeState,
  marketUrl,
  userName,
}: {
  marketTitle: string;
  outcome: string;
  yesOutcome?: string;
  noOutcome?: string;
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  entryPrice: number;
  currentPrice: number;
  yesPrice?: number;
  noPrice?: number;
  tradeState: TradeStateMeta;
  marketUrl?: string;
  userName?: string;
}) {
  const shares = entryPrice > 0 ? cost / entryPrice : undefined;
  const currentValue =
    shares !== undefined ? shares * currentPrice : undefined;
  const delta =
    currentValue !== undefined && Number.isFinite(currentValue)
      ? currentValue - cost
      : undefined;
  const deltaPct =
    delta !== undefined && cost > 0
      ? (delta / cost) * 100
      : undefined;
  const open =
    tradeState.state === 'open' || tradeState.state === 'live';
  const renderOutcomeButton = (
    label: string | undefined,
    price: number | undefined,
    tone: 'green' | 'red',
  ) => {
    const className =
      tone === 'green'
        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
        : 'bg-red-500 text-white hover:bg-red-600';
    const content = `${label || 'Outcome'} ${formatCents(price)}`;

    if (!marketUrl || !open) {
      return (
        <button
          type="button"
          disabled
          className={`flex h-[34px] min-w-0 items-center justify-center rounded-lg px-3 text-[12px] font-extrabold opacity-60 shadow-sm ${className}`}
        >
          <span className="truncate">{content}</span>
        </button>
      );
    }

    return (
      <a
        href={marketUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`flex h-[34px] min-w-0 items-center justify-center rounded-lg px-3 text-[12px] font-extrabold shadow-sm transition-colors ${className}`}
      >
        <span className="truncate">{content}</span>
      </a>
    );
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute left-[-5px] top-12 h-2.5 w-2.5 rounded-full border border-gray-200 bg-gray-50" />
        <div className="pointer-events-none absolute right-[-5px] top-12 h-2.5 w-2.5 rounded-full border border-gray-200 bg-gray-50" />

        <div className="px-3 py-1">
          <p className="line-clamp-2 text-[13px] font-extrabold leading-snug text-gray-950">
            {marketTitle}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-extrabold text-gray-950">
              {userName || 'Someone'}{' '}
              {side === 'BUY' ? 'picked' : 'sold'}{' '}
              <span className="text-blue-600">{outcome}</span>
            </p>
          </div>
          {tradeState.state !== 'open' &&
            tradeState.state !== 'live' && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClasses(
                  tradeState.tone,
                )}`}
              >
                {tradeState.label}
              </span>
            )}
        </div>

        <div className="border-t border-dashed border-gray-200" />

        <div className="grid grid-cols-3">
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-500">
              Cost
            </p>
            <p className="mt-1 text-[13px] font-extrabold text-emerald-600">
              {formatUsd(cost)}
            </p>
          </div>
          <div className="border-x border-gray-100 px-3 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-500">
              Current
            </p>
            <p className="mt-1 text-[13px] font-extrabold text-emerald-600">
              {formatUsd(currentValue)}
            </p>
            {delta !== undefined && (
              <p
                className={`mt-0.5 text-[11px] font-bold ${
                  delta >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {delta >= 0 ? '+' : ''}
                {formatUsd(delta)}
                {deltaPct !== undefined &&
                  ` (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`}
              </p>
            )}
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-500">
              {tradeState.state === 'sold' ||
              tradeState.state === 'sold-profit' ||
              tradeState.state === 'sold-loss'
                ? 'Sold'
                : tradeState.state === 'won' ||
                    tradeState.state === 'lost'
                  ? 'Result'
                  : 'To win'}
            </p>
            <p
              className={`mt-1 text-[13px] font-extrabold ${
                tradeState.tone === 'red'
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }`}
            >
              {open
                ? formatUsd(potentialWin)
                : formatUsd(tradeState.amount)}
            </p>
          </div>
        </div>
      </div>

      {(yesOutcome || noOutcome) && (
        <div className="mt-5 grid grid-cols-2 gap-3 px-1">
          {renderOutcomeButton(yesOutcome, yesPrice, 'green')}
          {renderOutcomeButton(noOutcome, noPrice, 'red')}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PredictionFeedCard({
  content,
  userName,
}: PredictionFeedCardProps) {
  const {
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
    yesTokenId,
    noTokenId,
  } = content;

  const liveScore = useLiveScore(eventSlug);
  const marketUrl = eventSlug
    ? `https://polymarket.com/event/${encodeURIComponent(eventSlug)}`
    : undefined;

  // Show sports panel when at least yesOutcome + noOutcome + some sports signal present
  const isYesNoBinary =
    yesOutcome?.toLowerCase() === 'yes' &&
    noOutcome?.toLowerCase() === 'no';
  const isSports = Boolean(
    yesOutcome &&
    noOutcome &&
    !isYesNoBinary &&
    (yesTeam || noTeam || liveScore?.teams?.length),
  );

  const marketState = resolveMarketState(content, liveScore);
  const resolvedYesPrice = marketState.yesPrice ?? yesPrice ?? price;
  const resolvedNoPrice = marketState.noPrice ?? noPrice ?? 1 - price;
  const tradeState = resolveTradeState(
    content,
    liveScore?.live === true,
    marketState,
  );
  const currentPrice = firstNumber(
    marketState.pickedPrice,
    content.currentPrice,
  );
  const currentDisplayPrice =
    currentPrice !== undefined &&
    currentPrice >= 0 &&
    currentPrice <= 1
      ? currentPrice
      : price;

  return (
    <div className="mt-2">
      {/* ── Sports panel: team badges + probability chart ───────────────────── */}
      {isSports && (
        <SportsMiniPanel
          marketTitle={content.marketTitle}
          eventSlug={eventSlug}
          yesOutcome={yesOutcome!}
          noOutcome={noOutcome!}
          yesPrice={resolvedYesPrice}
          noPrice={resolvedNoPrice}
          yesTeam={yesTeam}
          noTeam={noTeam}
          gameStartTime={gameStartTime}
          yesTokenId={yesTokenId}
          noTokenId={noTokenId}
          liveScore={liveScore}
          pickedOutcome={outcome}
          userName={userName}
          side={side}
          cost={cost}
          entryPrice={price}
          tradeState={tradeState}
          marketUrl={marketUrl}
        />
      )}

      {!isSports && (
        <PredictionPositionPanel
          marketTitle={content.marketTitle}
          outcome={outcome}
          yesOutcome={yesOutcome}
          noOutcome={noOutcome}
          side={side}
          cost={cost}
          potentialWin={potentialWin}
          entryPrice={price}
          currentPrice={currentDisplayPrice}
          yesPrice={resolvedYesPrice}
          noPrice={resolvedNoPrice}
          tradeState={tradeState}
          marketUrl={marketUrl}
          userName={userName}
        />
      )}

      {/* ── Live scoreboard (fallback for older posts without sports panel data) */}
      {!isSports &&
        liveScore?.live &&
        liveScore.teams.length >= 2 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                {liveScore.teams[0]?.abbreviation ||
                  (liveScore.teams[0]?.name ?? '')
                    .slice(0, 3)
                    .toUpperCase()}
              </span>
              <span className="font-bold text-2xl tabular-nums text-gray-900">
                {liveScore.teams[0]?.score ?? '—'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
              {(liveScore.elapsed || liveScore.period) && (
                <p className="text-[10px] text-gray-500 tabular-nums text-center leading-none">
                  {[liveScore.elapsed, liveScore.period]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl tabular-nums text-gray-900">
                {liveScore.teams[1]?.score ?? '—'}
              </span>
              <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                {liveScore.teams[1]?.abbreviation ||
                  (liveScore.teams[1]?.name ?? '')
                    .slice(0, 3)
                    .toUpperCase()}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
