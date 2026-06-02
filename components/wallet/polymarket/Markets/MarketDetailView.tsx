'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useClobOrder,
  useTickSize,
  type OrderSubmissionStage,
} from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/lib/UserContext';
import { postFeed } from '@/actions/postFeed';
import type { PolymarketMarket } from '@/hooks/polymarket';
import { useTrading } from '@/providers/polymarket';
import {
  completeAgentActionFromHandoff,
  type AgentActionCompletion,
} from '@/lib/chat/agentActionHandoff';
import {
  CTF_CONTRACT_ADDRESS,
  MIN_ORDER_SIZE,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import { getSafePolymarketMaxBuyAmount } from '@/lib/polymarket/validation';

import { InfoIcon, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';

// Order ticket variants on the detail page — A3 (Market) and A3L (Limit) only.
// FAK / GTD are intentionally dropped here per the new wireframes; the
// generic OrderModal still supports them for non-detail flows.
type OrderVariant = 'market' | 'limit';

// Design tokens lifted from the Predictions wireframe primitives so the
// order ticket matches the wire-a3 / wire-a3l screens 1:1.
const D = {
  ink: '#0a0a0c',
  muted: '#6e6e76',
  muted2: '#a1a1a8',
  hair: 'rgba(0,0,0,0.06)',
  hair2: 'rgba(0,0,0,0.04)',
  surface2: '#fafafa',
  posGreen: '#19a974',
  posGreenSoft: 'rgba(25,169,116,0.10)',
  warnBg: 'rgba(217,119,6,0.08)',
  warnBorder: 'rgba(217,119,6,0.18)',
  warnText: '#9a5c08',
  warnIcon: '#d97706',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

const ERC1155_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

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

function getOrderStageButtonLabel(stage: OrderSubmissionStage): string {
  switch (stage) {
    case 'preparing':
      return 'Preparing order...';
    case 'signing':
      return 'Sign in wallet...';
    case 'submitting':
      return 'Submitting order...';
    default:
      return 'Placing order...';
  }
}

function getOrderStageHint(stage: OrderSubmissionStage): string {
  switch (stage) {
    case 'preparing':
      return 'Building the order for signature.';
    case 'signing':
      return 'Approve the wallet signature window to place this order.';
    case 'submitting':
      return 'Sending your signed order to Polymarket.';
    default:
      return 'Placing order.';
  }
}

// ── Order feedback helpers ───────────────────────────────────────────────────
//
// Errors bubble up here from three layers: the CLOB SDK (already mapped to
// human strings in useClobOrder), the backend /orders/prepare and /submit
// proxies, and the wallet/signing layer. This mapper catches whatever those
// layers leak through (network failures, wallet rejections, typed-data
// validation, raw codes, etc.) and turns them into a `{ title, detail }`
// pair the toast can render directly. Anything we don't recognise falls back
// to a generic "Order failed" rather than dumping a stack/JSON to the user.

interface FriendlyOrderError {
  title: string;
  detail: string;
}

function getFriendlyOrderError(
  raw: string | null | undefined,
): FriendlyOrderError {
  const trimmed = (raw ?? '').trim();
  const msg = trimmed.toLowerCase();

  if (!msg) {
    return {
      title: 'Order failed',
      detail: "Something went wrong placing your order. Please try again.",
    };
  }

  // Wallet popup cancelled by the user
  if (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('rejected the request') ||
    msg.includes('action_rejected')
  ) {
    return {
      title: 'Signature cancelled',
      detail: "You declined to sign the order. Try again when you're ready.",
    };
  }

  // Trading session
  if (
    msg.includes('session needs to be refreshed') ||
    msg.includes('session expired') ||
    msg.includes('session_expired')
  ) {
    return {
      title: 'Trading session expired',
      detail: 'Refresh your trading session and try again.',
    };
  }
  if (
    msg.includes('trading session not ready') ||
    msg.includes('initialize trading')
  ) {
    return {
      title: 'Wallet not ready',
      detail: 'Initialize your trading session, then try again.',
    };
  }

  // Balance / shares / approval
  if (
    (msg.includes('insufficient') || msg.includes('not enough')) &&
    (msg.includes('share') || msg.includes('outcome'))
  ) {
    return {
      title: 'Not enough shares',
      detail: "You don't hold enough shares to sell that amount.",
    };
  }
  if (
    (msg.includes('insufficient') || msg.includes('not enough')) &&
    msg.includes('allowance')
  ) {
    return {
      title: 'USDC approval or balance issue',
      detail:
        'Refresh trading approvals or try a slightly smaller amount to leave room for fees.',
    };
  }
  if (
    (msg.includes('insufficient') || msg.includes('not enough')) &&
    (msg.includes('usdc') ||
      msg.includes('balance') ||
      msg.includes('funds'))
  ) {
    return {
      title: 'Not enough USDC',
      detail:
        'Try a slightly smaller amount or add USDC to cover the order and fees.',
    };
  }
  if (msg.includes('allowance') || msg.includes('approval')) {
    return {
      title: 'Approval needed',
      detail: 'Approve USDC for trading, then place the order again.',
    };
  }

  // Order book / matching
  if (
    msg.includes('not be fully filled') ||
    msg.includes('fok_order_not_filled') ||
    msg.includes('not enough liquidity')
  ) {
    return {
      title: "Couldn't fill instantly",
      detail:
        'Not enough liquidity at this price. Try a smaller size or use a limit order.',
    };
  }
  if (msg.includes('cross the spread') || msg.includes('post-only')) {
    return {
      title: 'Limit price too aggressive',
      detail:
        "A post-only order can't cross the spread. Adjust your price and try again.",
    };
  }
  if (
    msg.includes('tick size') ||
    msg.includes('min_tick') ||
    msg.includes('multiple of tick')
  ) {
    return {
      title: 'Invalid price',
      detail: "Adjust your limit price to match this market's tick size.",
    };
  }
  if (
    msg.includes('min_size') ||
    msg.includes('minimum order') ||
    msg.includes('order is below') ||
    msg.includes('minimum shares')
  ) {
    return {
      title: 'Order too small',
      detail: "Increase the size to meet this market's minimum.",
    };
  }
  if (msg.includes('duplicate')) {
    return {
      title: 'Duplicate order',
      detail:
        'An identical order is already open. Cancel it first or change the parameters.',
    };
  }
  if (msg.includes('expiration') && msg.includes('past')) {
    return {
      title: 'Order already expired',
      detail: 'Choose a future expiration time.',
    };
  }
  if (
    msg.includes('not yet accepting') ||
    msg.includes('market_not_ready') ||
    msg.includes('market not ready')
  ) {
    return {
      title: 'Market not open yet',
      detail: "This market isn't accepting orders yet. Check back soon.",
    };
  }

  // Network / server
  if (
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('timeout') ||
    msg.includes('econnref')
  ) {
    return {
      title: 'Network error',
      detail: 'Check your connection and try again.',
    };
  }
  if (
    msg.includes('failed to prepare') ||
    msg.includes('failed to submit') ||
    msg.includes('server error') ||
    msg.includes('execution_error')
  ) {
    return {
      title: "Couldn't reach the order book",
      detail:
        "The exchange didn't accept the order. Wait a moment and try again.",
    };
  }
  if (msg.includes('signing data is incomplete')) {
    return {
      title: 'Market data out of sync',
      detail: 'Refresh this market and try placing the order again.',
    };
  }
  if (msg.includes('no orderid')) {
    return {
      title: "Order didn't go through",
      detail: 'The exchange returned an unexpected response. Try again.',
    };
  }

  // Use the raw text if it already reads like a short user-facing sentence;
  // otherwise hide it behind the generic fallback so users don't see codes.
  const looksTechnical =
    /0x[a-f0-9]/i.test(trimmed) ||
    trimmed.includes('{') ||
    trimmed.startsWith('Error:') ||
    trimmed.length > 160;
  if (!looksTechnical) {
    return { title: 'Order failed', detail: trimmed };
  }
  return {
    title: 'Order failed',
    detail: "Something went wrong placing your order. Please try again.",
  };
}

interface OrderSuccessInfo {
  side: 'BUY' | 'SELL';
  outcomeLabel: string;
  outcomeAbbr: string;
  shares: number;
  priceCents: number;
  usd: number;
  isLimit: boolean;
}

function formatUsd(n: number): string {
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '$—';
}

/**
 * Polymarket-style success card. Shown in-flow above the order ticket once
 * a fill comes back; auto-closes shortly after via the existing onClose
 * timer in MarketDetailView.
 */
function OrderSuccessNotification({
  info,
  onDismiss,
}: {
  info: OrderSuccessInfo;
  onDismiss: () => void;
}) {
  const verb =
    info.isLimit
      ? info.side === 'BUY'
        ? 'Limit buy placed'
        : 'Limit sell placed'
      : info.side === 'BUY'
        ? 'Order filled'
        : 'Sell filled';
  const action = info.side === 'BUY' ? 'Bought' : 'Sold';
  const detail = `${action} ${info.shares.toFixed(2)} ${info.outcomeAbbr} @ ${info.priceCents}¢ · ${formatUsd(info.usd)}`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#fff',
        border: `1px solid rgba(25,169,116,0.30)`,
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(25,169,116,0.18)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: D.posGreenSoft,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={18} color={D.posGreen} strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: D.ink,
            letterSpacing: -0.1,
          }}
        >
          {verb}
        </div>
        <div
          style={{
            fontSize: 12,
            color: D.muted,
            marginTop: 2,
            fontFamily: D.mono,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {detail}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: D.muted2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Polymarket-style info card. Used for actionable status messages that
 * aren't errors — e.g. the trading session needs to be initialized before
 * the user can place orders on this market. Amber tone so it reads as
 * important but not destructive.
 */
function OrderInfoNotification({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#fff',
        border: `1px solid ${D.warnBorder}`,
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(217,119,6,0.16)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: D.warnBg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <InfoIcon size={18} color={D.warnIcon} strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: D.ink,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: D.muted,
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

/**
 * Polymarket-style error card. Renders a friendly title + detail mapped from
 * whatever raw error string the order pipeline surfaced.
 */
function OrderErrorNotification({
  raw,
  onDismiss,
}: {
  raw: string | null | undefined;
  onDismiss: () => void;
}) {
  const { title, detail } = getFriendlyOrderError(raw);
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: '#fff',
        border: `1px solid rgba(229,72,77,0.28)`,
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(229,72,77,0.16)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(229,72,77,0.10)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <AlertCircle size={18} color="#e5484d" strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: D.ink,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: D.muted,
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {detail}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: D.muted2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
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

/** Cubic-bezier smoothed SVG path for a time-series plotted into (x, y). */
function historyToSmoothPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  pMin: number = 0,
  pMax: number = 1,
): string {
  if (series.length < 2) return '';
  const span = Math.max(1, tMax - tMin);
  const pSpan = Math.max(0.0001, pMax - pMin);
  const toXY = (pt: HistoryPoint) => ({
    x: plotX + ((pt.t - tMin) / span) * plotW,
    y: plotY + (1 - (pt.p - pMin) / pSpan) * plotH,
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

// ── Live score fetch (Gamma events proxy) ────────────────────────────────────

type LiveScoreTeam = {
  name: string | null;
  abbreviation: string | null;
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

const EMPTY_LIVE: LiveScoreState = {
  live: false,
  ended: false,
  closed: false,
  period: null,
  elapsed: null,
  startTime: null,
  teams: [],
};

/**
 * Polls our /api/polymarket/event-live proxy (Gamma /events) for live-game
 * fields (score, period, elapsed) that our /markets proxy does not forward.
 * Polls every 15s while enabled AND the game is in progress; otherwise runs
 * a single fetch.
 */
function useLiveEventScore(
  eventSlug: string | undefined,
  enabled: boolean,
): LiveScoreState {
  const [state, setState] = useState<LiveScoreState>(EMPTY_LIVE);

  useEffect(() => {
    if (!enabled || !eventSlug) {
      setState(EMPTY_LIVE);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/event-live?slug=${encodeURIComponent(eventSlug)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as LiveScoreState;
        if (cancelled) return;
        setState({
          live: Boolean(json.live),
          ended: Boolean(json.ended),
          closed: Boolean(json.closed),
          period: json.period ?? null,
          elapsed: json.elapsed ?? null,
          startTime: json.startTime ?? null,
          teams: Array.isArray(json.teams) ? json.teams : [],
        });
        // Only keep polling while the game is live.
        if (!cancelled && json.live) {
          timer = setTimeout(fetchOnce, 15_000);
        }
      } catch {
        // Ignore — we gracefully hide the live score UI when data is missing.
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventSlug, enabled]);

  return state;
}

/** Match a live-score team entry to the "yes" / "no" outcome label. */
function pickTeamScore(
  outcomeLabel: string,
  outcomeAbbr: string,
  teams: LiveScoreTeam[],
  fallbackIndex: number,
): number | null {
  if (!teams.length) return null;
  const label = outcomeLabel.trim().toLowerCase();
  const abbr = outcomeAbbr.trim().toLowerCase();
  const byName = teams.find(
    (t) => (t.name ?? '').toLowerCase() === label,
  );
  if (byName?.score != null) return byName.score;
  const byContains = teams.find((t) => {
    const n = (t.name ?? '').toLowerCase();
    return n && (n.includes(label) || label.includes(n));
  });
  if (byContains?.score != null) return byContains.score;
  const byAbbr = teams.find(
    (t) => (t.abbreviation ?? '').toLowerCase() === abbr,
  );
  if (byAbbr?.score != null) return byAbbr.score;
  return teams[fallbackIndex]?.score ?? null;
}

function parseScorePair(raw: unknown): [number | null, number | null] {
  if (typeof raw !== 'string') return [null, null];
  const match = raw.match(/(\d+)\D+(\d+)/);
  if (!match) return [null, null];
  const first = Number(match[1]);
  const second = Number(match[2]);
  return [
    Number.isFinite(first) ? first : null,
    Number.isFinite(second) ? second : null,
  ];
}

function toLiveScoreNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getMarketLiveEventSlug(market: PolymarketMarket): string | undefined {
  const explicit =
    market.eventSlug ||
    market.event?.slug ||
    market.events?.find?.((event: { slug?: string }) => event?.slug)?.slug;
  if (explicit) return String(explicit);

  if (!market.slug || !market.gameStartTime || !market.eventTeams?.length) {
    return undefined;
  }

  return String(market.slug)
    .replace(/-(moneyline|spread|total|totals|o-u|over-under).*$/i, '')
    .replace(/-(home|away|yes|no)-?[a-z0-9.]*$/i, '');
}

function extractEmbeddedLiveState(market: PolymarketMarket): LiveScoreState {
  const event = Array.isArray(market.events) ? market.events[0] : market.event;
  const [score0, score1] = parseScorePair(
    event?.score ?? market.score ?? market.eventScore,
  );
  const rawTeams = Array.isArray(event?.teams)
    ? event.teams
    : Array.isArray(market.eventTeams)
      ? market.eventTeams
      : [];

  return {
    live: Boolean(market.eventLive || event?.live),
    ended: Boolean(event?.ended || event?.closed || market.closed),
    closed: Boolean(event?.closed || event?.ended || market.closed),
    period: market.eventPeriod ?? event?.period ?? null,
    elapsed: market.eventElapsed ?? event?.elapsed ?? null,
    startTime:
      market.eventStartDate ||
      event?.startDate ||
      event?.startTime ||
      market.gameStartTime ||
      null,
    teams: rawTeams.map((team: LiveScoreTeam & { logo?: string; color?: string }, index: number) => ({
      name: team?.name ?? null,
      abbreviation: team?.abbreviation ?? null,
      score:
        team?.score != null
          ? toLiveScoreNumber(team.score)
          : index === 0
            ? score0
            : index === 1
              ? score1
              : null,
    })),
  };
}

function mergeLiveStates(
  fetched: LiveScoreState,
  embedded: LiveScoreState,
): LiveScoreState {
  const fetchedHasScores = fetched.teams.some((team) => team.score != null);
  const embeddedHasScores = embedded.teams.some((team) => team.score != null);
  const teams =
    fetched.teams.length && (fetchedHasScores || !embeddedHasScores)
      ? fetched.teams
      : embedded.teams;

  return {
    live: fetched.live || embedded.live,
    ended: Boolean(fetched.ended || embedded.ended),
    closed: Boolean(fetched.closed || embedded.closed),
    period: fetched.period ?? embedded.period,
    elapsed: fetched.elapsed ?? embedded.elapsed,
    startTime: fetched.startTime ?? embedded.startTime,
    teams,
  };
}

function formatHistoryTimestamp(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function nearestHistoryPoint(series: HistoryPoint[], target: number) {
  if (!series.length) return null;
  return series.reduce((best, point) =>
    Math.abs(point.t - target) < Math.abs(best.t - target) ? point : best,
  );
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
  eventSlug?: string;
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
  eventSlug,
}: SportsProbabilityPanelProps) {
  const liveEvent = useLiveEventScore(eventSlug, enabled && isLive);
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

  const yesScoreNum = pickTeamScore(
    yesName,
    yesAbbr,
    liveEvent.teams,
    0,
  );
  const noScoreNum = pickTeamScore(
    noName,
    noAbbr,
    liveEvent.teams,
    1,
  );
  const hasScores = yesScoreNum != null && noScoreNum != null;
  const liveNow = isLive && (liveEvent.live || hasScores);
  const showLiveScore = liveNow && hasScores;
  const clockText =
    [liveEvent.period, liveEvent.elapsed]
      .filter(Boolean)
      .join(' • ') || null;

  return (
    <div className="bg-white  text-gray-900 p-4 mb-4">
      {/* ── Team matchup row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 items-center gap-2">
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
              {clockText && (
                <p className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                  {clockText}
                </p>
              )}
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
      {/* <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-gray-900">
          {volumeLabel ?? ''}
        </p>
      </div> */}

      {/* ── Probability chart ───────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ height: 180 }}
        role="img"
        aria-label={`${yesName} vs ${noName} probability history`}
      >
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

// ── About section ─────────────────────────────────────────────────────────────

function formatEndDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(
      url.startsWith('http') ? url : `https://${url}`,
    );
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // if it's already a plain domain or short string, return as-is
    return (
      url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || null
    );
  }
}

function AboutSection({
  market,
  showFull,
  onToggle,
}: {
  market: PolymarketMarket;
  showFull: boolean;
  onToggle: () => void;
}) {
  const description: string | undefined = market.description;
  const endDate = formatEndDate(market.endDate ?? market.endDateIso);
  const resolutionSource: string | undefined =
    market.resolutionSource ?? market.resolution_source;
  const domainLabel = extractDomain(resolutionSource);
  const category: string | undefined =
    market.category ??
    (Array.isArray(market.tags) && market.tags.length > 0
      ? (market.tags[0]?.label ?? market.tags[0]?.slug)
      : undefined);

  const hasAny = description || endDate || domainLabel || category;
  if (!hasAny) return null;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <InfoIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
        <span className="text-sm font-bold text-gray-900">About</span>
      </div>

      {/* Description */}
      {description && (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
          <p
            className={`text-xs text-gray-600 leading-relaxed ${
              showFull ? '' : 'line-clamp-3'
            }`}
          >
            {description}
          </p>
          <button
            onClick={onToggle}
            className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            {showFull ? 'Show Less' : 'Show Rules'}
            <svg
              className={`w-3 h-3 transition-transform ${showFull ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Metadata rows */}
      {(endDate || domainLabel || category) && (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {endDate && (
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs text-gray-500">
                  End Date
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-800">
                {endDate}
              </span>
            </div>
          )}
          {domainLabel && (
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                <span className="text-xs text-gray-500">
                  Res. Source
                </span>
              </div>
              <a
                href={
                  resolutionSource?.startsWith('http')
                    ? resolutionSource
                    : `https://${resolutionSource}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                {domainLabel}
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
          {category && (
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="text-xs text-gray-500">
                  Category
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-800 capitalize">
                {category}
              </span>
            </div>
          )}
        </div>
      )}
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
        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 "
        style={{ backgroundColor: !logo ? color : undefined }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={displayAbbr}
            className="w-10 h-10 object-contain rounded-lg"
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

// ── Order ticket (A3 / A3L wireframes) ───────────────────────────────────────

type OrderTicketProps = {
  side: 'BUY' | 'SELL';
  setSide: (s: 'BUY' | 'SELL') => void;
  orderType: OrderVariant;
  setOrderType: (t: OrderVariant) => void;
  selectedOutcome: 'yes' | 'no';
  setSelectedOutcome: (o: 'yes' | 'no') => void;
  yesOutcomeName: string;
  noOutcomeName: string;
  yesAbbr: string;
  noAbbr: string;
  yesPrice: number;
  noPrice: number;
  outcomeLabels?: [string, string];
  activePrice: number;
  activeAsk: number | undefined;
  activeMid: number | undefined;
  inputValue: string;
  onInputChange: (v: string) => void;
  limitPrice: string;
  onLimitPriceChange: (v: string) => void;
  tickSize: number;
  isLoadingTickSize: boolean;
  balance: number;
  activeShareBalance: number;
  isShareBalanceLoading: boolean;
  shares: number;
  effectivePrice: number;
  totalCost: number;
  amountToReceive: number;
  hasInsufficientBalance: boolean;
  isSubmitting: boolean;
  orderStage: OrderSubmissionStage;
  clobClient: unknown;
  onPlaceOrder: () => void;
  onAddFunds?: () => void;
  minLimitShares: number;
};

function ChipBtn({
  children,
  active = false,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28,
        padding: '0 10px',
        background: active ? D.ink : '#fff',
        color: active ? '#fff' : D.ink,
        border: `1px solid ${active ? D.ink : D.hair}`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 550,
        letterSpacing: -0.1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: D.mono,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: D.muted,
      }}
    >
      {children}
    </span>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: D.mono,
        fontSize: 11,
        color: D.muted,
      }}
    >
      {children}
    </span>
  );
}

function OrderTicket(p: OrderTicketProps) {
  const yesLabel = p.outcomeLabels?.[0] ?? p.yesOutcomeName;
  const noLabel = p.outcomeLabels?.[1] ?? p.noOutcomeName;
  const yesCents = Math.round(p.yesPrice * 100);
  const noCents = Math.round(p.noPrice * 100);

  const isLimit = p.orderType === 'limit';
  const inputNum = parseFloat(p.inputValue) || 0;
  const limitDollars =
    p.limitPrice && Number.isFinite(parseFloat(p.limitPrice))
      ? parseFloat(p.limitPrice) / 100
      : 0;

  const setLimitFromDollars = (dollars: number) => {
    if (!Number.isFinite(dollars) || dollars <= 0) {
      p.onLimitPriceChange('');
      return;
    }
    const clamped = Math.min(0.99, Math.max(0.01, dollars));
    p.onLimitPriceChange(String(Math.round(clamped * 100)));
  };

  const stepLimit = (dir: 1 | -1) => {
    const step = p.tickSize > 0 ? p.tickSize : 0.01;
    const current =
      limitDollars > 0 ? limitDollars : p.activePrice || 0.5;
    const next = Math.round((current + dir * step) * 100) / 100;
    setLimitFromDollars(next);
  };

  const onLimitInputChange = (raw: string) => {
    const dollars = parseFloat(raw);
    if (!Number.isFinite(dollars)) {
      p.onLimitPriceChange('');
      return;
    }
    p.onLimitPriceChange(String(Math.round(dollars * 100)));
  };

  const fmtMoney = (n: number) =>
    Number.isFinite(n) ? `$${n.toFixed(2)}` : '$—';

  const ask = p.activeAsk ?? p.activePrice;
  const bid = Math.max(
    p.tickSize,
    ask - (p.tickSize > 0 ? p.tickSize * 2 : 0.02),
  );
  const mid = p.activeMid ?? Math.max(p.tickSize, ask - p.tickSize);

  const limitChips = [
    { label: 'Best bid', value: bid },
    { label: '−5¢', value: ask - 0.05 },
    { label: '−10¢', value: ask - 0.1 },
    { label: 'Mid', value: mid },
  ].filter((c) => c.value > 0 && c.value < 1);

  const profit = p.shares - p.totalCost;
  const returnPct =
    p.totalCost > 0 ? (profit / p.totalCost) * 100 : 0;

  const outcomeWord =
    p.selectedOutcome === 'yes' ? p.yesOutcomeName : p.noOutcomeName;
  const outcomeShort = (
    p.selectedOutcome === 'yes' ? p.yesAbbr : p.noAbbr
  ).toUpperCase();

  const headerTitle = isLimit
    ? p.side === 'BUY'
      ? 'Limit buy'
      : 'Limit sell'
    : p.side === 'BUY'
      ? 'Buy shares'
      : 'Sell shares';

  const placeLabel = !p.clobClient
    ? 'Connect wallet'
    : p.side === 'SELL' && p.isShareBalanceLoading
      ? 'Checking holdings...'
    : p.isSubmitting
      ? getOrderStageButtonLabel(p.orderStage)
      : isLimit
        ? `Place limit · ${p.shares.toFixed(2)} ${outcomeShort} @ ${fmtMoney(p.effectivePrice)}`
        : p.side === 'BUY'
          ? `Buy ${p.shares.toFixed(2)} ${outcomeShort} · ${fmtMoney(inputNum)}`
          : `Sell ${inputNum.toFixed(2)} ${outcomeShort} · ${fmtMoney(p.amountToReceive)}`;

  const askDelta =
    isLimit && limitDollars > 0
      ? Math.round((ask - limitDollars) * 100)
      : 0;

  const onPickQuickAmount = (val: number) => {
    if (p.side === 'BUY') {
      p.onInputChange(val.toFixed(2));
      return;
    }
    // SELL — quick chips are percentages of holdings
    p.onInputChange(((p.activeShareBalance * val) / 100).toFixed(2));
  };

  const onMaxAmount = () => {
    if (p.side === 'BUY') {
      const safe = getSafePolymarketMaxBuyAmount(p.balance);
      p.onInputChange(safe.toFixed(2));
      return;
    }
    if (p.activeShareBalance > 0) {
      p.onInputChange(p.activeShareBalance.toFixed(2));
    }
  };

  const buyQuickChips: {
    lbl: string;
    val: number;
    cmpVal: number;
  }[] = [
    { lbl: '$10', val: 10, cmpVal: 10 },
    { lbl: '$25', val: 25, cmpVal: 25 },
    { lbl: '$50', val: 50, cmpVal: 50 },
    { lbl: '$100', val: 100, cmpVal: 100 },
  ];
  const sellQuickChips: {
    lbl: string;
    val: number;
    cmpVal: number;
  }[] = [
    { lbl: '25%', val: 25, cmpVal: 25 },
    { lbl: '50%', val: 50, cmpVal: 50 },
    { lbl: '75%', val: 75, cmpVal: 75 },
  ];
  const quickChips =
    p.side === 'BUY' ? buyQuickChips : sellQuickChips;
  const needsBuyFunds = p.side === 'BUY' && p.hasInsufficientBalance;

  const placeDisabled =
    p.isSubmitting ||
    (p.side === 'SELL' && p.isShareBalanceLoading) ||
    inputNum <= 0 ||
    !p.clobClient ||
    (p.hasInsufficientBalance && (!needsBuyFunds || !p.onAddFunds)) ||
    (isLimit && limitDollars <= 0);
  const ctaLabel = needsBuyFunds ? 'Add funds' : placeLabel;
  const handlePrimaryClick = () => {
    if (needsBuyFunds && p.onAddFunds) {
      p.onAddFunds();
      return;
    }
    p.onPlaceOrder();
  };

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${D.hair}`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        marginTop: 4,
      }}
    >
      {/* Header — Order tag, title, Market/Limit chips */}
      <div
        style={{
          padding: '20px 22px 14px',
          borderBottom: `1px solid ${D.hair}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: D.mono,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: D.muted,
              textTransform: 'uppercase',
            }}
          >
            Order
          </span>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.6,
              marginTop: 6,
              color: D.ink,
            }}
          >
            {headerTitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ChipBtn
            active={!isLimit}
            onClick={() => p.setOrderType('market')}
          >
            Market
          </ChipBtn>
          <ChipBtn
            active={isLimit}
            onClick={() => p.setOrderType('limit')}
          >
            Limit
          </ChipBtn>
        </div>
      </div>

      {/* BUY/SELL segmented (preserved functionality) */}
      <div style={{ padding: '14px 22px 0' }}>
        <div
          style={{
            display: 'flex',
            background: D.surface2,
            borderRadius: 10,
            padding: 3,
            gap: 2,
            border: `1px solid ${D.hair}`,
          }}
        >
          {(['BUY', 'SELL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => p.setSide(s)}
              style={{
                flex: 1,
                border: 'none',
                background: p.side === s ? '#fff' : 'transparent',
                color: p.side === s ? D.ink : D.muted,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 0',
                borderRadius: 7,
                cursor: 'pointer',
                boxShadow:
                  p.side === s
                    ? '0 1px 2px rgba(10,10,12,0.06)'
                    : 'none',
              }}
            >
              {s === 'BUY' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>
      </div>

      {/* YES/NO outcome buttons */}
      <div style={{ padding: '14px 22px 0' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {(['yes', 'no'] as const).map((o) => {
            const active = p.selectedOutcome === o;
            const label = o === 'yes' ? yesLabel : noLabel;
            const cents = o === 'yes' ? yesCents : noCents;
            return (
              <button
                key={o}
                type="button"
                onClick={() => p.setSelectedOutcome(o)}
                style={{
                  padding: active ? '13px 15px' : '14px 16px',
                  borderRadius: 12,
                  border: active
                    ? `2px solid ${D.posGreen}`
                    : `1px solid ${D.hair}`,
                  background: active ? D.posGreenSoft : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontFamily: D.mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: active ? D.posGreen : D.muted,
                  }}
                >
                  {o === 'yes' ? 'Yes' : 'No'} · {label}
                </div>
                <div
                  style={{
                    fontFamily: D.mono,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: -0.4,
                    color: active ? D.posGreen : D.ink,
                    marginTop: 4,
                  }}
                >
                  {cents}¢
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection summary (Market only) */}
      {!isLimit && (
        <div style={{ padding: '14px 22px 0' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${D.hair}`,
              background: D.surface2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: D.posGreen,
                }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                {p.side === 'BUY' ? 'Buy' : 'Sell'} {outcomeWord} at
                market
              </span>
            </div>
            <FieldHint>
              ≈ {Math.round(p.activePrice * 100)}% implied
            </FieldHint>
          </div>
        </div>
      )}

      {/* Limit price (Limit only) */}
      {isLimit && (
        <div style={{ padding: '18px 22px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <FieldLabel>Limit price</FieldLabel>
            <FieldHint>
              Best ask · {fmtMoney(ask)}
              {p.isLoadingTickSize ? ' · …' : ''}
            </FieldHint>
          </div>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: `1px solid ${D.hair}`,
              background: D.surface2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => stepLimit(-1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${D.hair}`,
                background: '#fff',
                cursor: 'pointer',
                fontFamily: D.mono,
                fontSize: 16,
                fontWeight: 600,
                color: D.ink,
              }}
            >
              −
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: D.mono,
                  fontSize: 30,
                  fontWeight: 600,
                  color: D.muted2,
                }}
              >
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={
                  limitDollars > 0 ? limitDollars.toFixed(2) : ''
                }
                onChange={(e) => onLimitInputChange(e.target.value)}
                placeholder="0.00"
                step={p.tickSize || 0.01}
                min={p.tickSize || 0.01}
                max={1 - (p.tickSize || 0.01)}
                style={{
                  fontFamily: D.mono,
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: -0.8,
                  color: D.ink,
                  marginLeft: 4,
                  width: 96,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                }}
              />
              <span
                style={{
                  fontFamily: D.mono,
                  fontSize: 13,
                  color: D.muted,
                  marginLeft: 6,
                }}
              >
                / share
              </span>
            </div>
            <button
              type="button"
              onClick={() => stepLimit(1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${D.hair}`,
                background: '#fff',
                cursor: 'pointer',
                fontFamily: D.mono,
                fontSize: 16,
                fontWeight: 600,
                color: D.ink,
              }}
            >
              +
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            {limitChips.map((c) => (
              <ChipBtn
                key={c.label}
                active={Math.abs(limitDollars - c.value) < 0.005}
                onClick={() => setLimitFromDollars(c.value)}
              >
                {c.label} · {fmtMoney(c.value)}
              </ChipBtn>
            ))}
          </div>
          {askDelta > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: D.warnBg,
                border: `1px solid ${D.warnBorder}`,
                fontSize: 11,
                color: D.warnText,
                fontFamily: D.mono,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Clock size={12} style={{ color: D.warnIcon }} />
              {askDelta}¢ below ask — fills only if price drops
            </div>
          )}
        </div>
      )}

      {/* Amount */}
      <div style={{ padding: '18px 22px 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <FieldLabel>Amount</FieldLabel>
          <FieldHint>
            {p.side === 'BUY'
              ? `Balance · ${p.balance.toFixed(2)} USDC`
              : `Holdings · ${p.activeShareBalance.toFixed(2)} shares`}
          </FieldHint>
        </div>
        <div
          style={{
            padding: '20px 18px',
            borderRadius: 14,
            border: `1px solid ${D.hair}`,
            background: D.surface2,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              minWidth: 0,
              flex: 1,
            }}
          >
            {p.side === 'BUY' && (
              <span
                style={{
                  fontFamily: D.mono,
                  fontSize: 36,
                  fontWeight: 600,
                  color: D.muted2,
                }}
              >
                $
              </span>
            )}
            <input
              type="number"
              inputMode="decimal"
              value={p.inputValue}
              onChange={(e) => p.onInputChange(e.target.value)}
              placeholder="0.00"
              disabled={p.isSubmitting}
              style={{
                fontFamily: D.mono,
                fontSize: 36,
                fontWeight: 600,
                letterSpacing: -1,
                color: D.ink,
                marginLeft: p.side === 'BUY' ? 4 : 0,
                width: '100%',
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <FieldLabel>
              {p.side === 'BUY' ? 'Shares' : 'You receive'}
            </FieldLabel>
            <div
              style={{
                fontFamily: D.mono,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: -0.4,
                color: D.ink,
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {p.side === 'BUY'
                ? p.shares.toFixed(2)
                : fmtMoney(p.amountToReceive)}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          {quickChips.map((c) => (
            <ChipBtn
              key={c.lbl}
              active={
                p.side === 'BUY'
                  ? Math.abs(inputNum - c.cmpVal) < 0.005
                  : false
              }
              onClick={() => onPickQuickAmount(c.val)}
            >
              {c.lbl}
            </ChipBtn>
          ))}
          <ChipBtn onClick={onMaxAmount}>Max</ChipBtn>
        </div>
      </div>

      {/* Order summary */}
      <div
        style={{
          margin: '18px 22px 16px',
          padding: '14px 16px',
          borderRadius: 12,
          background: D.surface2,
          border: `1px solid ${D.hair}`,
        }}
      >
        {(
          [
            [
              isLimit ? 'Limit price' : 'Avg price',
              `${fmtMoney(p.effectivePrice)} / share`,
            ],
            ['Shares', `${p.shares.toFixed(2)} ${outcomeShort}`],
            [
              isLimit && p.side === 'BUY'
                ? 'Cost (max)'
                : p.side === 'SELL'
                  ? 'You receive'
                  : 'Cost',
              fmtMoney(
                p.side === 'SELL' ? p.amountToReceive : p.totalCost,
              ),
            ],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '5px 0',
            }}
          >
            <span style={{ fontSize: 12, color: D.muted }}>{k}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: D.ink,
                fontFamily: D.mono,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {v}
            </span>
          </div>
        ))}
        {p.side === 'BUY' && p.shares > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0 0',
              marginTop: 6,
              borderTop: `1px solid ${D.hair}`,
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: D.ink,
                }}
              >
                {isLimit
                  ? `Payout if filled & ${outcomeWord} wins`
                  : `Payout if ${outcomeWord} wins`}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: D.muted,
                  marginTop: 2,
                  fontFamily: D.mono,
                }}
              >
                {p.shares.toFixed(2)} shares × $1.00
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: D.posGreen,
                  fontFamily: D.mono,
                  letterSpacing: -0.3,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmtMoney(p.shares)}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: D.posGreen,
                  fontFamily: D.mono,
                  fontWeight: 600,
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                +{fmtMoney(profit)} · +{returnPct.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm */}
      <div style={{ padding: '0 22px 22px' }}>
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={placeDisabled}
          style={{
            width: '100%',
            padding: '16px 0',
            border: 'none',
            background: D.ink,
            color: '#fff',
            borderRadius: 14,
            cursor: placeDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: -0.1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: placeDisabled ? 0.55 : 1,
          }}
        >
          {p.isSubmitting && (
            <svg
              className="animate-spin"
              width={18}
              height={18}
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="4"
                fill="none"
              />
              <path
                fill="currentColor"
                fillOpacity="0.85"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {ctaLabel}
        </button>
        {needsBuyFunds && (
          <div
            style={{
              fontSize: 11,
              color: D.warnText,
              textAlign: 'center',
              marginTop: 8,
              fontFamily: D.mono,
            }}
          >
            Add funds first · balance {fmtMoney(p.balance)} · required{' '}
            {fmtMoney(p.totalCost)}
          </div>
        )}
        {p.isSubmitting && p.orderStage !== 'idle' && (
          <div
            style={{
              fontSize: 11,
              color: p.orderStage === 'signing' ? D.warnText : D.muted,
              textAlign: 'center',
              marginTop: 8,
              fontFamily: D.mono,
            }}
          >
            {getOrderStageHint(p.orderStage)}
          </div>
        )}
        <div
          style={{
            fontSize: 10.5,
            color: D.muted,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          {isLimit
            ? `Order rests on the book. Fills only at ${fmtMoney(p.effectivePrice)} or better. Cancel anytime before fill.`
            : `Each ${outcomeWord} share pays $1.00 if it wins, $0.00 otherwise. Prices may move before fill.`}
        </div>
        {isLimit &&
          p.side === 'BUY' &&
          p.shares > 0 &&
          p.shares < p.minLimitShares && (
            <div
              style={{
                fontSize: 11,
                color: D.warnText,
                textAlign: 'center',
                marginTop: 6,
                fontFamily: D.mono,
              }}
            >
              Min {p.minLimitShares} shares · raise amount or lower
              price
            </div>
          )}
      </div>
    </div>
  );
}

// ── Live scoreboard (A3 / A3L "context strip") ──────────────────────────────

type LiveScoreboardCardProps = {
  question: string;
  category: string;
  isLive: boolean;
  liveEvent: LiveScoreState;
  yesTeam: EventTeam | undefined;
  noTeam: EventTeam | undefined;
  yesName: string;
  noName: string;
  yesAbbr: string;
  noAbbr: string;
  yesTokenId: string;
  noTokenId: string;
  yesPrice: number;
  noPrice: number;
  seed: string;
  enabled: boolean;
  gameStartTime?: string;
  onBack: () => void;
};

function LiveScoreboardCard({
  question,
  category,
  isLive,
  liveEvent,
  yesTeam,
  noTeam,
  yesName,
  noName,
  yesAbbr,
  noAbbr,
  yesTokenId,
  noTokenId,
  yesPrice,
  noPrice,
  seed,
  enabled,
  gameStartTime,
  onBack,
}: LiveScoreboardCardProps) {
  // Probability history chart — same data + visual treatment as the legacy
  // SportsProbabilityPanel, restored per the user's request to keep the
  // graph alongside the wireframe scoreboard.
  const {
    yesHistory,
    noHistory,
    loading: chartLoading,
  } = usePriceHistory(yesTokenId, noTokenId, enabled);

  const VB_W = 720;
  const VB_H = 220;
  const PLOT_X = 12;
  const PLOT_Y = 14;
  const RIGHT_PAD = 96; // room for end labels + Y-axis ticks
  const BOTTOM_PAD = 26; // room for X-axis date ticks
  const PLOT_W = VB_W - PLOT_X - RIGHT_PAD;
  const PLOT_H = VB_H - PLOT_Y - BOTTOM_PAD;

  const { yesSeries, noSeries, tMin, tMax } = useMemo(() => {
    const hasHistory =
      yesHistory.length >= 2 && noHistory.length >= 2;
    if (hasHistory) {
      const allTs = [
        ...yesHistory.map((p) => p.t),
        ...noHistory.map((p) => p.t),
      ];
      return {
        yesSeries: yesHistory,
        noSeries: noHistory,
        tMin: Math.min(...allTs),
        tMax: Math.max(...allTs),
      };
    }
    // Fallback: synthesize a curve while real history loads.
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
    return {
      yesSeries: synth(yesPrice, seed + 'y'),
      noSeries: synth(noPrice, seed + 'n'),
      tMin: start,
      tMax: now,
    };
  }, [yesHistory, noHistory, yesPrice, noPrice, seed]);

  // Auto-zoom Y-range to data so a 40-60% oscillation isn't squashed against
  // the middle of a 0-100% chart. Snap to 5% increments and pad ±5%.
  const { pMin, pMax, yTicks } = useMemo(() => {
    const allP = [
      ...yesSeries.map((p) => p.p),
      ...noSeries.map((p) => p.p),
      yesPrice,
      noPrice,
    ];
    const lo = Math.min(...allP);
    const hi = Math.max(...allP);
    const padded = (v: number, dir: 1 | -1) => {
      const snap = 0.05;
      return dir === 1
        ? Math.min(1, Math.ceil((v + 0.05) / snap) * snap)
        : Math.max(0, Math.floor((v - 0.05) / snap) * snap);
    };
    let lower = padded(lo, -1);
    let upper = padded(hi, 1);
    // Guarantee a minimum visible band
    if (upper - lower < 0.2) {
      const mid = (upper + lower) / 2;
      lower = Math.max(0, mid - 0.15);
      upper = Math.min(1, mid + 0.15);
    }
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(
      (r) => lower + (upper - lower) * r,
    );
    return { pMin: lower, pMax: upper, yTicks: ticks };
  }, [yesSeries, noSeries, yesPrice, noPrice]);

  // X-axis date ticks (5 evenly spaced)
  const xTicks = useMemo(() => {
    const span = Math.max(1, tMax - tMin);
    return Array.from({ length: 5 }, (_, i) => tMin + (span * i) / 4);
  }, [tMin, tMax]);

  const yesPath = historyToSmoothPath(
    yesSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
    pMin,
    pMax,
  );
  const noPath = historyToSmoothPath(
    noSeries,
    tMin,
    tMax,
    PLOT_X,
    PLOT_Y,
    PLOT_W,
    PLOT_H,
    pMin,
    pMax,
  );
  const [activeTime, setActiveTime] = useState<number | null>(null);

  const yesLeads = yesPrice >= noPrice;
  const yesColor = yesLeads ? D.posGreen : '#3B82F6';
  const noColor = yesLeads ? '#3B82F6' : D.posGreen;
  const yesDisplayName = yesTeam?.name || yesName;
  const noDisplayName = noTeam?.name || noName;
  const yesPctInt = Math.round(yesPrice * 100);
  const noPctInt = Math.round(noPrice * 100);

  const pSpan = Math.max(0.0001, pMax - pMin);
  const endY = (p: number) =>
    PLOT_Y + (1 - (p - pMin) / pSpan) * PLOT_H;
  const yesEndY = endY(yesPrice);
  const noEndY = endY(noPrice);
  const endX = PLOT_X + PLOT_W;
  const activeYesPoint = activeTime
    ? nearestHistoryPoint(yesSeries, activeTime)
    : null;
  const activeNoPoint = activeTime
    ? nearestHistoryPoint(noSeries, activeTime)
    : null;
  const activePointTime =
    activeYesPoint?.t ?? activeNoPoint?.t ?? activeTime ?? null;
  const activeX =
    activePointTime != null
      ? PLOT_X +
        ((activePointTime - tMin) / Math.max(1, tMax - tMin)) * PLOT_W
      : null;
  const activeYesPrice = activeYesPoint?.p ?? yesPrice;
  const activeNoPrice = activeNoPoint?.p ?? noPrice;
  const activeYesY = endY(activeYesPrice);
  const activeNoY = endY(activeNoPrice);
  const tooltipX =
    activeX == null
      ? 0
      : Math.max(PLOT_X + 4, Math.min(activeX + 10, endX - 136));
  const tooltipY = Math.max(PLOT_Y + 4, Math.min(activeYesY - 42, PLOT_Y + PLOT_H - 54));
  const activeTimeLabel = activePointTime
    ? formatHistoryTimestamp(activePointTime)
    : '';

  const setActiveFromClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)),
    );
    const target = tMin + (tMax - tMin) * ratio;
    const series = yesSeries.length >= noSeries.length ? yesSeries : noSeries;
    setActiveTime(nearestHistoryPoint(series, target)?.t ?? target);
  };

  const moveActiveBy = (delta: number) => {
    const series = yesSeries.length >= noSeries.length ? yesSeries : noSeries;
    if (!series.length) return;
    const current =
      activeTime == null
        ? series.length - 1
        : series.reduce(
            (bestIndex, point, index) =>
              Math.abs(point.t - activeTime) <
              Math.abs(series[bestIndex].t - activeTime)
                ? index
                : bestIndex,
            0,
          );
    const next = Math.max(0, Math.min(series.length - 1, current + delta));
    setActiveTime(series[next].t);
  };

  const [upperY, upperColor, upperName, upperPct] = yesLeads
    ? [yesEndY, yesColor, yesDisplayName, yesPctInt]
    : [noEndY, noColor, noDisplayName, noPctInt];
  const [lowerY, lowerColor, lowerName, lowerPct] = yesLeads
    ? [noEndY, noColor, noDisplayName, noPctInt]
    : [yesEndY, yesColor, yesDisplayName, yesPctInt];
  const labelGap = Math.max(44, Math.abs(upperY - lowerY));
  const upperLabelY = Math.max(
    20,
    Math.min(upperY, PLOT_Y + PLOT_H - labelGap),
  );
  const lowerLabelY = Math.min(
    PLOT_Y + PLOT_H - 4,
    Math.max(lowerY, upperLabelY + labelGap),
  );
  const yesScore = pickTeamScore(
    yesDisplayName,
    yesTeam?.abbreviation || yesAbbr,
    liveEvent.teams,
    0,
  );
  const noScore = pickTeamScore(
    noDisplayName,
    noTeam?.abbreviation || noAbbr,
    liveEvent.teams,
    1,
  );
  const hasScore = yesScore != null && noScore != null;
  const liveNow =
    liveEvent.live || Boolean(isLive && !liveEvent.ended && !liveEvent.closed);
  const period =
    [liveEvent.period, liveEvent.elapsed].filter(Boolean).join(' ') ||
    (liveNow ? 'Live' : null);
  const statusText = liveNow
    ? `LIVE${period ? ` · ${period}` : ''}`
    : liveEvent.ended || liveEvent.closed || hasScore
      ? 'FINAL'
      : null;

  const gameDate = gameStartTime ? new Date(gameStartTime) : null;
  const dateText = gameDate
    ? gameDate.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const renderTeam = (
    side: 'home' | 'away',
    team: EventTeam | undefined,
    abbr: string,
    name: string,
    score: number | null,
  ) => {
    const dim =
      hasScore && score != null && yesScore != null && noScore != null
        ? side === 'away'
          ? yesScore < noScore
          : noScore < yesScore
        : false;
    const color = team?.color || '#374151';
    const logo = team?.logo;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexDirection: side === 'away' ? 'row' : 'row-reverse',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: !logo ? color : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={team?.abbreviation || abbr}
              width={36}
              height={36}
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 0.4,
              }}
            >
              {(team?.abbreviation || abbr).slice(0, 4)}
            </span>
          )}
        </div>
        <div
          style={{
            textAlign: side === 'away' ? 'left' : 'right',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: -0.1,
              color: D.ink,
            }}
          >
            {team?.name || name}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: D.muted,
              fontFamily: D.mono,
              marginTop: 1,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {side === 'away' ? 'Away' : 'Home'}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: D.mono,
            letterSpacing: -0.8,
            color: dim ? D.muted : D.ink,
            fontVariantNumeric: 'tabular-nums',
            marginLeft: side === 'away' ? 'auto' : undefined,
            marginRight: side === 'home' ? 'auto' : undefined,
          }}
        >
          {score != null ? score : '—'}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${D.hair}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
      }}
    >
      {/* Top row: back button + category + question + LIVE indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderBottom: `1px solid ${D.hair2}`,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: `1px solid ${D.hair}`,
            background: D.surface2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke={D.ink}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          {category && (
            <div
              style={{
                fontFamily: D.mono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: D.muted,
              }}
            >
              {category}
            </div>
          )}
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: -0.15,
              marginTop: 2,
              color: D.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {question}
          </div>
        </div>
        {statusText ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10.5,
              fontWeight: 700,
              color: liveNow ? '#ff5a5f' : D.muted,
              fontFamily: D.mono,
              letterSpacing: 0.6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: liveNow ? '#ff5a5f' : D.muted2,
                boxShadow: liveNow
                  ? '0 0 0 3px rgba(255,90,95,0.18)'
                  : 'none',
              }}
            />
            {statusText}
          </span>
        ) : dateText ? (
          <span
            style={{
              fontSize: 10.5,
              color: D.muted,
              fontFamily: D.mono,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {dateText}
          </span>
        ) : null}
      </div>

      {/* Team rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '14px 18px',
          gap: 16,
          maxWidth: VB_W,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {renderTeam('away', yesTeam, yesAbbr, yesName, yesScore)}
        <div
          style={{
            fontSize: 10.5,
            color: D.muted2,
            fontFamily: D.mono,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          vs
        </div>
        {renderTeam('home', noTeam, noAbbr, noName, noScore)}
      </div>

      {/* Probability history chart */}
      <div
        style={{
          padding: '6px 14px 14px',
          borderTop: `1px solid ${D.hair2}`,
        }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            maxWidth: VB_W,
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            cursor: 'crosshair',
            outline: 'none',
          }}
          role="img"
          tabIndex={0}
          aria-label={`${yesDisplayName} vs ${noDisplayName} interactive probability history`}
          onPointerMove={(event) =>
            setActiveFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            )
          }
          onPointerDown={(event) =>
            setActiveFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            )
          }
          onPointerLeave={() => setActiveTime(null)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              moveActiveBy(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              moveActiveBy(1);
            }
          }}
        >
          {/* Horizontal gridlines + Y-axis tick labels (right side) */}
          {/* {yTicks.map((tickP, i) => {
            const y = endY(tickP);
            return (
              <g key={`y-${i}`}>
                <line
                  x1={PLOT_X}
                  x2={endX}
                  y1={y}
                  y2={y}
                  stroke={D.hair}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <text
                  x={endX + 6}
                  y={y + 3.5}
                  fontSize={10}
                  fontWeight={500}
                  fill={D.muted}
                  fontFamily={D.mono}
                >
                  {Math.round(tickP * 100)}%
                </text>
              </g>
            );
          })} */}

          {/* X-axis date tick labels */}
          {/* {xTicks.map((ts, i) => {
            const x =
              PLOT_X +
              ((ts - tMin) / Math.max(1, tMax - tMin)) * PLOT_W;
            const label = new Date(ts * 1000).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            return (
              <text
                key={`x-${i}`}
                x={x}
                y={VB_H - 6}
                fontSize={10}
                fontWeight={500}
                fill={D.muted}
                fontFamily={D.mono}
                textAnchor={
                  i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'
                }
              >
                {label}
              </text>
            );
          })} */}

          {/* Series lines */}
          <rect
            x={PLOT_X}
            y={PLOT_Y}
            width={PLOT_W}
            height={PLOT_H}
            fill="transparent"
            pointerEvents="all"
          />
          <path
            d={noPath}
            fill="none"
            stroke={noColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={chartLoading ? 0.6 : 1}
          />
          <path
            d={yesPath}
            fill="none"
            stroke={yesColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={chartLoading ? 0.6 : 1}
          />

          {activeX != null && (
            <g pointerEvents="none">
              <line
                x1={activeX}
                x2={activeX}
                y1={PLOT_Y}
                y2={PLOT_Y + PLOT_H}
                stroke={D.muted2}
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.7}
              />
              <circle
                cx={activeX}
                cy={activeYesY}
                r={4}
                fill={yesColor}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <circle
                cx={activeX}
                cy={activeNoY}
                r={4}
                fill={noColor}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <rect
                x={tooltipX}
                y={tooltipY}
                width={132}
                height={48}
                rx={8}
                fill="#fff"
                stroke={D.hair}
              />
              <text
                x={tooltipX + 8}
                y={tooltipY + 14}
                fontSize={8.5}
                fontWeight={700}
                fill={D.muted}
                fontFamily={D.mono}
              >
                {activeTimeLabel}
              </text>
              <text
                x={tooltipX + 8}
                y={tooltipY + 30}
                fontSize={10}
                fontWeight={700}
                fill={yesColor}
                fontFamily={D.mono}
              >
                {yesDisplayName.slice(0, 14)}{' '}
                {Math.round(activeYesPrice * 100)}%
              </text>
              <text
                x={tooltipX + 8}
                y={tooltipY + 43}
                fontSize={10}
                fontWeight={700}
                fill={noColor}
                fontFamily={D.mono}
              >
                {noDisplayName.slice(0, 14)}{' '}
                {Math.round(activeNoPrice * 100)}%
              </text>
            </g>
          )}

          {/* Endpoint dots */}
          <circle cx={endX} cy={noEndY} r={3.5} fill={noColor} />
          <circle cx={endX} cy={yesEndY} r={3.5} fill={yesColor} />

          {/* End-labels: team name + percent, positioned to avoid overlap */}
          <text
            x={endX + 6}
            y={upperLabelY - 2}
            fontSize={11}
            fontWeight={600}
            fill={upperColor}
            fontFamily="system-ui, sans-serif"
          >
            {upperName}
          </text>
          <text
            x={endX + 6}
            y={upperLabelY + 14}
            fontSize={15}
            fontWeight={800}
            fill={upperColor}
            fontFamily="system-ui, sans-serif"
          >
            {upperPct}%
          </text>

          <text
            x={endX + 6}
            y={lowerLabelY - 16}
            fontSize={11}
            fontWeight={600}
            fill={lowerColor}
            fontFamily="system-ui, sans-serif"
          >
            {lowerName}
          </text>
          <text
            x={endX + 6}
            y={lowerLabelY}
            fontSize={15}
            fontWeight={800}
            fill={lowerColor}
            fontFamily="system-ui, sans-serif"
          >
            {lowerPct}%
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── Order book preview (A3 / A3L bottom card) ───────────────────────────────

type OrderBookCardProps = {
  side: 'BUY' | 'SELL';
  selectedOutcome: 'yes' | 'no';
  bid: number | undefined;
  ask: number | undefined;
  spread: number | undefined;
  tickSize: number;
  seed: string;
  /** When set (limit BUY), the user's resting order is highlighted. */
  userLimit?: { price: number; shares: number } | null;
};

function seedRand(seed: string, idx: number): number {
  let h = 5381;
  const s = seed + ':' + idx;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

function OrderBookCard({
  side,
  selectedOutcome,
  bid,
  ask,
  spread,
  tickSize,
  seed,
  userLimit,
}: OrderBookCardProps) {
  const step = tickSize > 0 ? tickSize : 0.01;
  const safeAsk =
    ask != null && ask > 0 && ask < 1 ? ask : 0.5 + step;
  const safeBid =
    bid != null && bid > 0 && bid < 1
      ? bid
      : Math.max(step, safeAsk - step * 2);
  const safeSpread =
    spread != null && spread > 0
      ? spread
      : Math.max(step, safeAsk - safeBid);

  const fmtPrice = (n: number) => `$${n.toFixed(2)}`;
  const fmtShares = (n: number) =>
    n >= 1000
      ? `${(n / 1000).toFixed(2)}K`
      : Math.round(n).toLocaleString();
  const fmtMoney = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(2)}K`
      : `$${Math.round(n).toLocaleString()}`;

  const askLevels = Array.from({ length: 3 }, (_, i) => {
    const price = Math.min(0.99, safeAsk + i * step);
    const shares = 800 + Math.floor(seedRand(seed + 'a', i) * 3000);
    const total = shares * price;
    const filled = 0.85 - i * 0.22;
    return { price, shares, total, filled: Math.max(0.2, filled) };
  });

  const bidLevels = Array.from({ length: 3 }, (_, i) => {
    const price = Math.max(step, safeBid - i * step);
    const shares = 1200 + Math.floor(seedRand(seed + 'b', i) * 3500);
    const total = shares * price;
    const filled = 0.55 + i * 0.2;
    return { price, shares, total, filled: Math.min(0.95, filled) };
  });

  // For limit BUY orders below the current best bid, highlight the user's row.
  const userBidIdx =
    userLimit && userLimit.price > 0 && userLimit.price < safeAsk
      ? bidLevels.findIndex(
          (l) => Math.abs(l.price - userLimit.price) < step / 2,
        )
      : -1;

  const sectionCaption = userLimit
    ? `Your limit sits at ${fmtPrice(userLimit.price)}`
    : `Live ${selectedOutcome === 'yes' ? 'YES' : 'NO'} depth — ${side === 'BUY' ? 'buy side' : 'sell side'}`;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: 4,
          marginBottom: 2,
          padding: '0 4px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.6,
              color: D.ink,
            }}
          >
            Order book
          </div>
          <div
            style={{
              fontSize: 13,
              color: D.muted,
              marginTop: 2,
              letterSpacing: -0.1,
            }}
          >
            {sectionCaption}
          </div>
        </div>
        <span
          style={{
            fontFamily: D.mono,
            fontSize: 9.5,
            color: D.muted2,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Indicative
        </span>
      </div>
      <div
        style={{
          background: '#fff',
          border: `1px solid ${D.hair}`,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow:
            '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        }}
      >
        {/* Column header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding: '10px 18px',
            borderBottom: `1px solid ${D.hair}`,
            fontSize: 9.5,
            color: D.muted,
            fontFamily: D.mono,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          <span>Price</span>
          <span style={{ textAlign: 'right' }}>Shares</span>
          <span style={{ textAlign: 'right' }}>Total</span>
        </div>

        {/* Asks */}
        {askLevels.map((r, i) => (
          <div
            key={`ask-${i}`}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '10px 18px',
              borderTop: `1px solid ${D.hair}`,
              fontSize: 12,
              fontFamily: D.mono,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: `${r.filled * 100}%`,
                background: 'rgba(255,90,95,0.08)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                color: '#ff5a5f',
                fontWeight: 600,
                position: 'relative',
              }}
            >
              {fmtPrice(r.price)}
            </span>
            <span
              style={{ textAlign: 'right', position: 'relative' }}
            >
              {fmtShares(r.shares)}
            </span>
            <span
              style={{
                textAlign: 'right',
                color: D.muted,
                position: 'relative',
              }}
            >
              {fmtMoney(r.total)}
            </span>
          </div>
        ))}

        {/* Spread row */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: `1px solid ${D.hair}`,
            background: D.surface2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: D.muted,
              fontFamily: D.mono,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            SPREAD
          </span>
          <span
            style={{
              fontSize: 12,
              fontFamily: D.mono,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${safeSpread.toFixed(2)}
            {safeAsk > 0 ? (
              <span style={{ color: D.muted, marginLeft: 6 }}>
                ({((safeSpread / safeAsk) * 100).toFixed(1)}%)
              </span>
            ) : null}
          </span>
        </div>

        {/* Bids */}
        {bidLevels.map((r, i) => {
          const mine = i === userBidIdx;
          return (
            <div
              key={`bid-${i}`}
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '10px 18px',
                borderTop: `1px solid ${D.hair}`,
                fontSize: 12,
                fontFamily: D.mono,
                fontVariantNumeric: 'tabular-nums',
                background: mine
                  ? 'rgba(25,169,116,0.06)'
                  : 'transparent',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: `${r.filled * 100}%`,
                  background: 'rgba(25,169,116,0.08)',
                  pointerEvents: 'none',
                }}
              />
              <span
                style={{
                  color: D.posGreen,
                  fontWeight: 600,
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {fmtPrice(r.price)}
                {mine && (
                  <span
                    style={{
                      fontSize: 8.5,
                      color: D.posGreen,
                      background: '#fff',
                      border: `1px solid ${D.posGreen}`,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                    }}
                  >
                    YOU
                  </span>
                )}
              </span>
              <span
                style={{ textAlign: 'right', position: 'relative' }}
              >
                {fmtShares(r.shares)}
                {mine && userLimit
                  ? ` + ${userLimit.shares.toFixed(0)} you`
                  : ''}
              </span>
              <span
                style={{
                  textAlign: 'right',
                  color: D.muted,
                  position: 'relative',
                }}
              >
                {fmtMoney(r.total)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type MarketDetailViewProps = {
  /** Back-navigation handler. The page route hands `router.back()`. */
  onClose: () => void;
  market: PolymarketMarket;
  balance?: number;
  yesShares?: number;
  noShares?: number;
  initialOutcome?: 'yes' | 'no';
  initialAmount?: string;
  initialSide?: 'BUY' | 'SELL';
  initialOrderType?: OrderVariant;
  initialLimitPrice?: string;
  agentProposalId?: string;
  onAgentActionComplete?: (completion: AgentActionCompletion) => void;
  onAddFunds?: () => void;
  /** Optional display-name overrides for the two outcome buttons.
   *  Used for spread markets so the buttons show "+1.5"/"-1.5" instead of
   *  the raw market outcome names ("Yes"/"No" or team names). */
  outcomeLabels?: [string, string];
};

export default function MarketDetailView({
  onClose,
  market,
  balance = 0,
  yesShares = 0,
  noShares = 0,
  initialOutcome,
  initialAmount,
  initialSide,
  initialOrderType,
  initialLimitPrice,
  agentProposalId,
  onAgentActionComplete,
  onAddFunds,
  outcomeLabels,
}: MarketDetailViewProps) {
  const { clobClient, portfolioAddresses } = useTrading();
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

  const yesAsk = market.realtimePrices?.[yesTokenId]?.askPrice;
  const noAsk = market.realtimePrices?.[noTokenId]?.askPrice;
  const yesMid = market.realtimePrices?.[yesTokenId]?.midPrice;
  const noMid = market.realtimePrices?.[noTokenId]?.midPrice;

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

  // Live game score (sports only) — drives the A3 / A3L "context strip".
  // Fetch whenever we have a sports event slug; some Gamma events expose final
  // scores even when `live` is false, so don't gate this only on start time.
  const liveEventSlug = useMemo(
    () => getMarketLiveEventSlug(market),
    [market],
  );
  const fetchedLiveEvent = useLiveEventScore(
    liveEventSlug,
    isSports && Boolean(liveEventSlug),
  );
  const embeddedLiveEvent = useMemo(
    () => extractEmbeddedLiveState(market),
    [market],
  );
  const liveEvent = useMemo(
    () => mergeLiveStates(fetchedLiveEvent, embeddedLiveEvent),
    [fetchedLiveEvent, embeddedLiveEvent],
  );

  // Category label for the context-strip header (e.g. "NBA · Regular season").
  const categoryLabel = useMemo(() => {
    const cat = market.category as string | undefined;
    const tags = Array.isArray(market.tags) ? market.tags : [];
    const tagLabel =
      tags.find((t: { label?: string }) => t?.label)?.label ?? '';
    if (
      cat &&
      tagLabel &&
      cat.toLowerCase() !== tagLabel.toLowerCase()
    ) {
      return `${cat} · ${tagLabel}`;
    }
    return cat || tagLabel || (isSports ? 'Sports' : '');
  }, [market.category, market.tags, isSports]);

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
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcome, setSelectedOutcome] = useState<
    'yes' | 'no'
  >('yes');
  const [limitPrice, setLimitPrice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<OrderSuccessInfo | null>(
    null,
  );
  const [showFullDescription, setShowFullDescription] =
    useState(false);

  const { eoaAddress, publicClient } = usePolymarketWallet();
  const { getAccessToken } = usePrivy();
  const { user, accessToken }: any = useUser();
  const agentCompletionPendingRef = useRef(false);

  const activeTokenId =
    selectedOutcome === 'yes' ? yesTokenId : noTokenId;
  const activePrice = selectedOutcome === 'yes' ? yesPrice : noPrice;
  const apiShareBalance =
    selectedOutcome === 'yes' ? yesShares : noShares;
  const [onchainShareBalance, setOnchainShareBalance] = useState<
    number | null
  >(null);
  const [isShareBalanceLoading, setIsShareBalanceLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    setOnchainShareBalance(null);
    setIsShareBalanceLoading(Boolean(activeTokenId && publicClient && portfolioAddresses.length > 0));
    async function loadOnchainShareBalance() {
      if (!activeTokenId || !publicClient || portfolioAddresses.length === 0) {
        setOnchainShareBalance(null);
        setIsShareBalanceLoading(false);
        return;
      }

      try {
        setIsShareBalanceLoading(true);
        const balances = await Promise.all(
          portfolioAddresses.map(async (address) => {
            const raw = await publicClient.readContract({
              address: CTF_CONTRACT_ADDRESS,
              abi: ERC1155_BALANCE_OF_ABI,
              functionName: 'balanceOf',
              args: [
                address as `0x${string}`,
                BigInt(activeTokenId),
              ],
            });
            return Number(raw) / 10 ** USDC_E_DECIMALS;
          }),
        );
        if (!cancelled) {
          // One CLOB order can only use one maker wallet, so expose the
          // largest per-wallet balance as the sellable amount.
          setOnchainShareBalance(Math.max(0, ...balances));
          setIsShareBalanceLoading(false);
        }
      } catch (error) {
        console.warn(
          '[MarketDetailView] Failed to read on-chain share balance',
          { activeTokenId, portfolioAddresses, error },
        );
        if (!cancelled) {
          setOnchainShareBalance(0);
          setIsShareBalanceLoading(false);
        }
      }
    }

    loadOnchainShareBalance();
    return () => {
      cancelled = true;
    };
  }, [activeTokenId, portfolioAddresses, publicClient]);

  const activeShareBalance =
    side === 'SELL'
      ? (onchainShareBalance ?? 0)
      : (onchainShareBalance ?? apiShareBalance);

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    activeTokenId || null,
  );
  const {
    submitOrder,
    resetOrder,
    isSubmitting,
    orderStage,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  // Pre-fill from any deep-link / hand-off props on first mount and whenever
  // the page is navigated to with new initial outcome/amount.
  useEffect(() => {
    setInputValue(initialAmount ?? '');
    setOrderType(initialOrderType ?? 'market');
    setSide(initialSide ?? 'BUY');
    setSelectedOutcome(initialOutcome ?? 'yes');
    setLimitPrice(initialLimitPrice ?? '');
    setLocalError(null);
    setShowSuccess(false);
    setSuccessInfo(null);
    setShowFullDescription(false);
  }, [initialOutcome, initialAmount, initialSide, initialOrderType, initialLimitPrice]);

  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  // After a successful order, show the success banner briefly then go back.
  useEffect(() => {
    if (!orderId) return;
    if (agentCompletionPendingRef.current) return;
    setShowSuccess(true);
    const t = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(t);
  }, [orderId, onClose]);

  // Esc still navigates back — feels natural on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const inputNum = parseFloat(inputValue) || 0;
  // limitPrice is entered by the user in cents (1–99); convert to decimal (0–1) for the API
  const limitPriceNum = (parseFloat(limitPrice) || 0) / 100;
  const isMarketVariant = orderType === 'market';
  const isLimitVariant = orderType === 'limit';
  const effectivePrice = isLimitVariant ? limitPriceNum : activePrice;

  // Per the new wireframe (A3 / A3L), BUY always takes a dollar amount and
  // the share count is derived. SELL still takes a share count.
  const shares =
    side === 'BUY'
      ? effectivePrice > 0
        ? inputNum / effectivePrice
        : 0
      : inputNum;

  const totalCost =
    side === 'BUY' ? inputNum : inputNum * effectivePrice;

  const EPSILON = 0.01 + 1e-6; // allow up to 1 cent wiggle room to avoid float/rounding disable

  const amountToReceive =
    side === 'SELL' ? inputNum * effectivePrice : 0;
  const hasInsufficientBalance =
    side === 'BUY'
      ? totalCost - balance > EPSILON
      : inputNum - activeShareBalance > EPSILON;

  const LIMIT_MIN_SHARES = market.orderMinSize ?? MIN_ORDER_SIZE;

  const handlePlaceOrder = async () => {
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
    if (side === 'BUY') {
      if (isLimitVariant) {
        if (shares < LIMIT_MIN_SHARES) {
          const minCost = LIMIT_MIN_SHARES * limitPriceNum;
          setLocalError(
            `Minimum order is ${LIMIT_MIN_SHARES} shares (~$${minCost.toFixed(2)})`,
          );
          return;
        }
      } else if (inputNum < 1) {
        setLocalError('Minimum order amount is $1.00');
        return;
      }
    } else if (inputNum < 1) {
      setLocalError('Minimum shares to sell: 1');
      return;
    } else if (isShareBalanceLoading) {
      setLocalError('Checking your on-chain holdings. Try again in a moment.');
      return;
    } else if (inputNum - activeShareBalance > EPSILON) {
      setLocalError(
        `You only have ${activeShareBalance.toFixed(6)} shares available to sell for this outcome.`,
      );
      return;
    }
    try {
      // Market BUY: pass dollar amount (CLOB converts internally)
      // Limit BUY:  pass share count derived from $ input
      // Any SELL:   pass share count
      const orderSize =
        isMarketVariant && side === 'BUY' ? inputNum : shares;
      const result = await submitOrder({
        tokenId: activeTokenId,
        conditionId: market.conditionId || market.id,
        size: orderSize,
        price: isLimitVariant ? limitPriceNum : undefined,
        side,
        negRisk,
        isMarketOrder: isMarketVariant,
        fillType: 'FOK',
        expiration: undefined,
      });

      // ── Capture summary for the success notification ──────────────────────
      if (result?.success) {
        const outcomeName =
          selectedOutcome === 'yes' ? yesOutcomeName : noOutcomeName;
        const cost =
          side === 'SELL'
            ? amountToReceive
            : isLimitVariant
              ? totalCost
              : inputNum;
        setSuccessInfo({
          side,
          outcomeLabel: outcomeName,
          outcomeAbbr: (selectedOutcome === 'yes'
            ? yesAbbr
            : noAbbr
          ).toUpperCase(),
          shares,
          priceCents: Math.round(effectivePrice * 100),
          usd: cost,
          isLimit: isLimitVariant,
        });

        if (agentProposalId) {
          try {
            const completion = await completeAgentActionFromHandoff(
              {
                proposalId: agentProposalId,
                status: 'executed',
                provider: 'polymarket',
                title: market.question,
                subtitle: `${outcomeName} · ${side.toLowerCase()} ${
                  orderType
                }`,
                subject: outcomeName,
                side,
                stake: cost,
                toWin:
                  side === 'BUY'
                    ? Math.max(0, shares - cost)
                    : amountToReceive,
                payout: side === 'BUY' ? shares : amountToReceive,
                orderId: result.orderId,
                explorerLabel: result.orderId ? 'View order' : undefined,
                executionResult: {
                  orderId: result.orderId,
                  marketId: market.conditionId || market.id,
                  marketTitle: market.question,
                  outcome: outcomeName,
                  side,
                  shares,
                  price: effectivePrice,
                  orderType,
                },
              },
              accessToken,
            );
            if (completion) {
              agentCompletionPendingRef.current = true;
              window.setTimeout(() => {
                onAgentActionComplete?.(completion);
              }, 900);
            }
          } catch (completionError) {
            console.error(
              'Failed to report prediction agent completion:',
              completionError,
            );
          }
        }
      }

      // ── POST PREDICTION TO FEED (fire-and-forget) ──────────────────────────
      if (result?.success && user?.primaryMicrosite && user?._id) {
        const outcomeName =
          selectedOutcome === 'yes' ? yesOutcomeName : noOutcomeName;
        const cost =
          side === 'SELL'
            ? amountToReceive
            : isLimitVariant
              ? totalCost
              : inputNum;
        const win = side === 'BUY' ? shares : 0;

        getAccessToken()
          .then((token) => {
            if (!token) return;
            return postFeed(
              {
                postType: 'prediction',
                smartsiteId: user.primaryMicrosite,
                userId: user._id,
                content: {
                  marketId: market.conditionId || market.id,
                  marketTitle: market.question,
                  outcome: outcomeName,
                  side,
                  cost,
                  potentialWin: win,
                  price: effectivePrice,
                  orderId: result.orderId,
                  orderType,
                  eventSlug: market.eventSlug,
                  // Sports panel data
                  yesOutcome: yesOutcomeName,
                  noOutcome: noOutcomeName,
                  yesTokenId,
                  noTokenId,
                  yesPrice,
                  noPrice,
                  gameStartTime: market.gameStartTime,
                  volume: volumeLabel ?? undefined,
                  yesTeam: yesTeamMeta
                    ? {
                        name: yesTeamMeta.name,
                        abbreviation: yesTeamMeta.abbreviation,
                        color: yesTeamMeta.color,
                        logo: yesTeamMeta.logo,
                      }
                    : undefined,
                  noTeam: noTeamMeta
                    ? {
                        name: noTeamMeta.name,
                        abbreviation: noTeamMeta.abbreviation,
                        color: noTeamMeta.color,
                        logo: noTeamMeta.logo,
                      }
                    : undefined,
                },
              },
              token,
            );
          })
          .catch((err) =>
            console.error('Failed to post prediction to feed:', err),
          );
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Unable to place order. Please try again.',
      );
    }
  };

  // The (pages) layout wraps every page in a white <main> with p-6 padding.
  // The wireframe wants a full-bleed cream canvas — `-m-6` cancels the parent
  // padding so the cream fills edge-to-edge under the global Swop header.
  const activeBid =
    selectedOutcome === 'yes'
      ? market.realtimePrices?.[yesTokenId]?.bidPrice
      : market.realtimePrices?.[noTokenId]?.bidPrice;
  const activeSpread =
    selectedOutcome === 'yes'
      ? market.realtimePrices?.[yesTokenId]?.spread
      : market.realtimePrices?.[noTokenId]?.spread;
  const userLimitForBook =
    isLimitVariant &&
    side === 'BUY' &&
    limitPriceNum > 0 &&
    shares > 0
      ? { price: limitPriceNum, shares }
      : null;

  return (
    <div
      className="-m-6 min-h-[calc(100vh-6rem)]"
      style={{
        background: '#ecebe6',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif',
      }}
    >
      <div
        className="max-w-[1100px] mx-auto px-5 py-5"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* ── Context strip — live scoreboard (sports) or thin nav (other) ─── */}
        {isSports ? (
          <LiveScoreboardCard
            question={market.question || market.eventTitle || ''}
            category={categoryLabel}
            isLive={isLive}
            liveEvent={liveEvent}
            yesTeam={yesTeamMeta}
            noTeam={noTeamMeta}
            yesName={yesOutcomeName}
            noName={noOutcomeName}
            yesAbbr={yesAbbr}
            noAbbr={noAbbr}
            yesTokenId={yesTokenId}
            noTokenId={noTokenId}
            yesPrice={yesPrice}
            noPrice={noPrice}
            seed={seed}
            enabled={true}
            gameStartTime={market.gameStartTime}
            onBack={onClose}
          />
        ) : (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${D.hair}`,
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow:
                '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                border: `1px solid ${D.hair}`,
                background: D.surface2,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  stroke={D.ink}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              {categoryLabel && (
                <div
                  style={{
                    fontFamily: D.mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: D.muted,
                  }}
                >
                  {categoryLabel}
                </div>
              )}
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  letterSpacing: -0.15,
                  marginTop: 2,
                  color: D.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {market.question || market.eventTitle}
              </div>
            </div>
            {volumeLabel && (
              <span
                style={{
                  fontSize: 10.5,
                  color: D.muted,
                  fontFamily: D.mono,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {volumeLabel}
              </span>
            )}
          </div>
        )}

        {/* ── Success / Error / Info feedback ──────────────────────────────── */}
        {showSuccess && successInfo && (
          <OrderSuccessNotification
            info={successInfo}
            onDismiss={() => {
              setShowSuccess(false);
              setSuccessInfo(null);
            }}
          />
        )}
        {(localError || orderError) && (
          <OrderErrorNotification
            raw={localError || orderError?.message}
            onDismiss={() => {
              setLocalError(null);
              resetOrder();
            }}
          />
        )}
        {!clobClient && !localError && !orderError && (
          <OrderInfoNotification
            title="Trading session not started"
            detail="Initialize your Polymarket trading session from the Predictions panel to start placing orders on this market."
          />
        )}

        {/* ── Order ticket (A3 / A3L) ──────────────────────────────────────── */}
        <OrderTicket
          side={side}
          setSide={(s) => {
            setSide(s);
            setLocalError(null);
          }}
          orderType={orderType}
          setOrderType={(t) => {
            if (t === orderType) return;
            setOrderType(t);
            setInputValue('');
            setLimitPrice('');
            setLocalError(null);
          }}
          selectedOutcome={selectedOutcome}
          setSelectedOutcome={(o) => {
            setSelectedOutcome(o);
            setInputValue('');
            setLocalError(null);
          }}
          yesOutcomeName={yesOutcomeName}
          noOutcomeName={noOutcomeName}
          yesAbbr={yesAbbr}
          noAbbr={noAbbr}
          yesPrice={yesPrice}
          noPrice={noPrice}
          outcomeLabels={outcomeLabels}
          activePrice={activePrice}
          activeAsk={selectedOutcome === 'yes' ? yesAsk : noAsk}
          activeMid={selectedOutcome === 'yes' ? yesMid : noMid}
          inputValue={inputValue}
          onInputChange={(v) => {
            setInputValue(v);
            setLocalError(null);
          }}
          limitPrice={limitPrice}
          onLimitPriceChange={(v) => {
            setLimitPrice(v);
            setLocalError(null);
          }}
          tickSize={tickSize}
          isLoadingTickSize={isLoadingTickSize}
          balance={balance}
          activeShareBalance={activeShareBalance}
          isShareBalanceLoading={isShareBalanceLoading}
          shares={shares}
          effectivePrice={effectivePrice}
          totalCost={totalCost}
          amountToReceive={amountToReceive}
          hasInsufficientBalance={hasInsufficientBalance}
          isSubmitting={isSubmitting}
          orderStage={orderStage}
          clobClient={clobClient}
          onPlaceOrder={handlePlaceOrder}
          onAddFunds={onAddFunds}
          minLimitShares={LIMIT_MIN_SHARES}
        />

        {/* ── Order book preview ──────────────────────────────────────────── */}
        {/* <OrderBookCard
          side={side}
          selectedOutcome={selectedOutcome}
          bid={activeBid}
          ask={selectedOutcome === 'yes' ? yesAsk : noAsk}
          spread={activeSpread}
          tickSize={tickSize}
          seed={seed + ':' + selectedOutcome}
          userLimit={userLimitForBook}
        /> */}

        {/* ── About section ──────────────────────────────────────────────── */}
        <AboutSection
          market={market}
          showFull={showFullDescription}
          onToggle={() => setShowFullDescription((v) => !v)}
        />
      </div>
    </div>
  );
}
