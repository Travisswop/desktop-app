'use client';

import React, { useEffect, useMemo, useState } from 'react';

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

function formatGraphPrice(price: number): string {
  if (price <= 0) return '0%';
  if (price >= 1) return '100%';
  return toAmericanOdds(price);
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

function formatCompactUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(0)}`;
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
  const color = team?.color || '#374151';
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
  pickedOutcome,
  userName,
  side,
  cost,
  potentialWin,
  entryPrice,
  tradeState,
  marketUrl,
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
  pickedOutcome: string;
  userName?: string;
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  entryPrice: number;
  tradeState: TradeStateMeta;
  marketUrl?: string;
}) {
  const { yesHistory, noHistory, loading } = usePriceHistory(
    yesTokenId,
    noTokenId,
    true,
  );

  // Chart geometry - designed for a narrow feed card (~340px wide)
  const VB_W = 300;
  const VB_H = 166;
  const PLOT_X = 2;
  const PLOT_Y = 12;
  const RIGHT_PAD = 62; // room for end labels
  const BOTTOM_PAD = 10;
  const PLOT_W = VB_W - PLOT_X - RIGHT_PAD;
  const PLOT_H = VB_H - PLOT_Y - BOTTOM_PAD;

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

  const yesPath = historyToPath(
    yesSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );
  const noPath = historyToPath(
    noSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
  );

  const yesLeads = yP >= nP;
  const yesColor = yesLeads ? '#3B82F6' : '#36584D';
  const noColor = yesLeads ? '#36584D' : '#3B82F6';

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
  const upperLabelY = Math.max(
    14,
    Math.min(upperY, PLOT_Y + PLOT_H - labelGap),
  );
  const lowerLabelY = Math.min(
    PLOT_Y + PLOT_H - 2,
    Math.max(lowerY, upperLabelY + labelGap),
  );

  // Game time text
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

  // Live score matching
  const isLive = liveScore?.live === true;
  const matchScore = (
    teamName: string,
    fallbackIdx: number,
  ): number | null => {
    if (!isLive || !liveScore || liveScore.teams.length < 2)
      return null;
    const lower = teamName.toLowerCase();
    const found = liveScore.teams.find((t) => {
      const n = (t.name ?? '').toLowerCase();
      return n && (n.includes(lower) || lower.includes(n));
    });
    return (found ?? liveScore.teams[fallbackIdx])?.score ?? null;
  };
  const yesScore = matchScore(yesOutcome, 0);
  const noScore = matchScore(noOutcome, 1);
  const hasScores = isLive && yesScore != null && noScore != null;

  const yesAbbr = (
    yesTeam?.abbreviation || yesOutcome.slice(0, 3)
  ).toUpperCase();
  const noAbbr = (
    noTeam?.abbreviation || noOutcome.slice(0, 3)
  ).toUpperCase();
  const pickedCurrentPrice =
    pickedOutcome.toLowerCase() === yesOutcome.toLowerCase()
      ? yP
      : nP;
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
  const canOpenMarket = Boolean(marketUrl);
  const filterId = `feed-shadow-${String(yesTokenId || yesOutcome)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)}`;
  const betButtonBase =
    'h-8 rounded-lg px-3 text-[11px] font-bold transition-colors flex items-center justify-center min-w-0';
  const buttonForOutcome = (
    label: string,
    price: number,
    variant: 'yes' | 'no',
  ) => {
    const odds = toAmericanOdds(price);
    const classes =
      variant === 'yes'
        ? `${betButtonBase} bg-emerald-500 text-white hover:bg-emerald-600`
        : `${betButtonBase} bg-red-500 text-white hover:bg-red-600`;
    const buttonText = `${label} ${odds}`;

    if (canOpenMarket) {
      return (
        <a
          href={marketUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={classes}
          title={`Open ${label} market`}
        >
          <span className="truncate">{buttonText}</span>
        </a>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${classes} opacity-60`}
      >
        <span className="truncate">{buttonText}</span>
      </button>
    );
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <span className="text-[12px] font-extrabold text-gray-950">
          {hasScores ? 'Live' : tradeState.label}
        </span>
        {hasScores && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>

      <div className="grid grid-cols-[64px_1fr_64px] items-center gap-2 mb-1">
        <TeamBadge team={yesTeam} abbr={yesAbbr} name={yesOutcome} />

        <div className="text-center min-w-0">
          {hasScores ? (
            <>
              <div className="flex items-center justify-center gap-4">
                <span className="text-2xl font-extrabold text-gray-950 tabular-nums">
                  {yesScore}
                </span>
                <span className="text-2xl font-extrabold text-gray-950 tabular-nums">
                  {noScore}
                </span>
              </div>
              {liveScore &&
                (liveScore.period || liveScore.elapsed) && (
                  <p className="text-[10px] font-bold text-gray-700 mt-0.5 tabular-nums">
                    {[liveScore.elapsed, liveScore.period]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )}
            </>
          ) : (
            <>
              <p className="text-[12px] font-extrabold text-gray-950 leading-tight">
                {timeText || 'Matchup'}
              </p>
              <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                {dateText || tradeState.detail}
              </p>
            </>
          )}
        </div>

        <TeamBadge team={noTeam} abbr={noAbbr} name={noOutcome} />
      </div>

      {/* Probability chart */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full -mx-1"
        style={{ height: 166 }}
        aria-label={`${yesOutcome} vs ${noOutcome} probability history`}
      >
        <defs>
          <filter
            id={filterId}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="1.1"
              floodColor="#000000"
              floodOpacity="0.12"
            />
          </filter>
        </defs>

        {/* Probability lines */}
        <path
          d={noPath}
          fill="none"
          stroke={noColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.5 : 1}
        />
        <path
          d={yesPath}
          fill="none"
          stroke={yesColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={loading ? 0.5 : 1}
        />

        {/* Endpoint dots */}
        <circle cx={endX} cy={endNoY} r={7} fill={`${noColor}33`} />
        <circle
          cx={endX}
          cy={endNoY}
          r={3.6}
          fill={noColor}
          filter={`url(#${filterId})`}
        />
        <circle cx={endX} cy={endYesY} r={7} fill={`${yesColor}33`} />
        <circle
          cx={endX}
          cy={endYesY}
          r={3.6}
          fill={yesColor}
          filter={`url(#${filterId})`}
        />

        {/* End labels: team name + percentage */}
        <text
          x={endX + 11}
          y={upperLabelY - 1}
          fontSize={9}
          fontWeight={800}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {upperName}
        </text>
        <text
          x={endX + 11}
          y={upperLabelY + 15}
          fontSize={18}
          fontWeight={800}
          fill={upperColor}
          fontFamily="system-ui, sans-serif"
        >
          {formatGraphPrice(upperPct / 100)}
        </text>

        <text
          x={endX + 11}
          y={lowerLabelY - 12}
          fontSize={9}
          fontWeight={800}
          fill={lowerColor}
          fontFamily="system-ui, sans-serif"
        >
          {lowerName}
        </text>
        <text
          x={endX + 11}
          y={lowerLabelY + 6}
          fontSize={18}
          fontWeight={800}
          fill={lowerColor}
          fontFamily="system-ui, sans-serif"
        >
          {formatGraphPrice(lowerPct / 100)}
        </text>
      </svg>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm mt-3 overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-dashed border-gray-200">
          <p className="text-[13px] font-bold text-gray-950 truncate">
            {userName || 'Someone'}{' '}
            {side === 'BUY' ? 'picked' : 'sold'}{' '}
            <span className="text-blue-600">{pickedOutcome}</span>
          </p>
          {tradeState.state !== 'open' && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClasses(
                tradeState.tone,
              )}`}
            >
              {tradeState.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] font-medium text-gray-500">
              Cost
            </p>
            <p className="text-[13px] font-extrabold text-emerald-600">
              {formatUsd(cost)}
            </p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] font-medium text-gray-500">
              Current
            </p>
            <p className="text-[13px] font-extrabold text-emerald-600">
              {formatUsd(currentValue)}
            </p>
            {selectedPnl !== undefined && (
              <p
                className={`text-[8px] font-bold ${
                  selectedPnl >= 0
                    ? 'text-emerald-500'
                    : 'text-red-500'
                }`}
              >
                {selectedPnl >= 0 ? '+' : ''}
                {formatUsd(selectedPnl)}
              </p>
            )}
          </div>
          <div className="px-3 py-2 text-center">
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
              className={`text-[13px] font-extrabold ${
                tradeState.tone === 'red'
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }`}
            >
              {tradeState.state === 'open' ||
              tradeState.state === 'live'
                ? formatCompactUsd(potentialWin)
                : formatCompactUsd(tradeState.amount)}
            </p>
          </div>
        </div>
      </div>

      {(hasScores || tradeState.state === 'live') && (
        <div className="grid grid-cols-2 gap-3 mt-5">
          {buttonForOutcome(yesOutcome, yP, 'yes')}
          {buttonForOutcome(noOutcome, nP, 'no')}
        </div>
      )}

      {volume && (
        <p className="mt-3 text-center text-[10px] font-semibold text-gray-400">
          {volume}
        </p>
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
    volume,
    yesTokenId,
    noTokenId,
  } = content;

  const liveScore = useLiveScore(eventSlug);
  const marketUrl = eventSlug
    ? `https://polymarket.com/event/${encodeURIComponent(eventSlug)}`
    : undefined;

  // Show sports panel when at least yesOutcome + noOutcome + some sports signal present
  const isSports = Boolean(
    yesOutcome &&
    noOutcome &&
    (yesTeam || noTeam || gameStartTime || yesTokenId),
  );

  const marketState = resolveMarketState(content, liveScore);
  const resolvedYesPrice = marketState.yesPrice ?? yesPrice ?? price;
  const resolvedNoPrice = marketState.noPrice ?? noPrice ?? 1 - price;
  const tradeState = resolveTradeState(
    content,
    liveScore?.live === true,
    marketState,
  );
  const odds = toAmericanOdds(price);
  const isBuy = side === 'BUY';
  // Favorite (price ≥ 0.5) → negative odds → red; underdog → green
  const oddsColor = price >= 0.5 ? 'text-red-500' : 'text-green-600';
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
  const resultVisible =
    tradeState.state === 'won' ||
    tradeState.state === 'lost' ||
    tradeState.state === 'sold-profit' ||
    tradeState.state === 'sold-loss' ||
    tradeState.state === 'sold';

  return (
    <div className="mt-2">
      {/* ── Sports panel: team badges + probability chart ───────────────────── */}
      {isSports && (
        <SportsMiniPanel
          yesOutcome={yesOutcome!}
          noOutcome={noOutcome!}
          yesPrice={resolvedYesPrice}
          noPrice={resolvedNoPrice}
          yesTeam={yesTeam}
          noTeam={noTeam}
          gameStartTime={gameStartTime}
          volume={volume}
          yesTokenId={yesTokenId}
          noTokenId={noTokenId}
          liveScore={liveScore}
          pickedOutcome={outcome}
          userName={userName}
          side={side}
          cost={cost}
          potentialWin={potentialWin}
          entryPrice={price}
          tradeState={tradeState}
          marketUrl={marketUrl}
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

      {!isSports && resultVisible && (
        <div
          className={`mx-3 mt-3 rounded-xl border px-3 py-2 ${toneClasses(
            tradeState.tone,
          )}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold truncate">
                {tradeState.label}
              </p>
              <p className="text-[11px] font-medium opacity-80">
                {tradeState.detail}
              </p>
            </div>
            <p className="text-lg font-extrabold tabular-nums">
              {formatUsd(tradeState.amount)}
            </p>
          </div>
        </div>
      )}

      {/* ── Pick row ────────────────────────────────────────────────────────── */}
      {!isSports && (
        <div className="flex items-start justify-between px-3 py-2.5 border-b border-gray-200">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[12px] text-gray-500 leading-snug">
              {userName || 'Someone'}&nbsp;
              <span className="font-bold text-gray-700">
                {isBuy ? 'picked' : 'sold'}
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
      )}

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      {!isSports && (
        <div className="grid grid-cols-3 divide-x divide-gray-200">
          <div className="px-3 py-2.5">
            <p className="text-gray-400 text-[11px] mb-1">Cost</p>
            <p className="font-semibold text-gray-900 text-sm">
              ${cost.toFixed(2)}
            </p>
          </div>

          <div className="px-3 py-2.5">
            <p className="text-gray-400 text-[11px] mb-1">Current</p>
            <p className="font-semibold text-gray-900 text-sm">
              {Math.round(currentDisplayPrice * 100)}¢
            </p>
          </div>

          <div className="px-3 py-2.5">
            <p className="text-gray-400 text-[11px] mb-1">
              {isBuy ? 'To win' : 'Receive'}
            </p>
            <p
              className={`font-semibold text-sm ${
                isBuy ? 'text-green-600' : 'text-blue-600'
              }`}
            >
              ${((isBuy ? potentialWin : cost) ?? cost).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
