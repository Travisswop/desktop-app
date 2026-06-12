'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Instagram,
  Share2,
  Terminal,
  Twitter,
  X,
} from 'lucide-react';

export type PredictionShareStatus =
  | 'open'
  | 'pending'
  | 'closed'
  | 'redeemable'
  | 'redeemed'
  | 'sold';

export type PredictionSharePosition = {
  title: string;
  outcome: string;
  icon?: string | null;
  slug?: string | null;
  eventSlug?: string | null;
  oppositeOutcome?: string | null;
  size?: number | null;
  avgPrice?: number | null;
  curPrice?: number | null;
  initialValue?: number | null;
  currentValue?: number | null;
  cashPnl?: number | null;
  percentPnl?: number | null;
  totalBought?: number | null;
  realizedPnl?: number | null;
  percentRealizedPnl?: number | null;
  redeemable?: boolean;
  marketClosed?: boolean;
  marketResolutionPending?: boolean;
};

interface PositionShareModalProps {
  position: PredictionSharePosition;
  isOpen: boolean;
  onClose: () => void;
  statusOverride?: PredictionShareStatus;
  redeemedAmount?: number | null;
}

type LiveScoreTeam = {
  name?: string | null;
  abbreviation?: string | null;
  score?: number | string | null;
};

type LiveScoreState = {
  live: boolean;
  ended: boolean;
  closed: boolean;
  period: string | null;
  elapsed: string | null;
  startTime: string | null;
  teams: LiveScoreTeam[];
};

const EMPTY_SCORE: LiveScoreState = {
  live: false,
  ended: false,
  closed: false,
  period: null,
  elapsed: null,
  startTime: null,
  teams: [],
};

const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const SWOP_URL = 'https://swopme.co';
const SWOP_WHITE_LOGO_SRC = '/images/swop-white-logo.png';

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatMoney(value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';
  const amount = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${amount}`;
}

function formatPercent(value: number, signed = true): string {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function formatCents(value: number | null): string {
  if (value == null || value <= 0 || value >= 1) return '--';
  return `${(value * 100).toFixed(1)}c`;
}

/** Convert a decimal price (0-1) to American odds string e.g. "+459" or "-178". */
function toAmericanOdds(price: number | null): string {
  if (price == null || price <= 0 || price >= 1) return 'N/A';
  if (price >= 0.5) {
    return `-${Math.round((price / (1 - price)) * 100)}`;
  }
  return `+${Math.round(((1 - price) / price) * 100)}`;
}

function resolveStatus(
  position: PredictionSharePosition,
  override?: PredictionShareStatus,
): PredictionShareStatus {
  if (override) return override;
  if (position.redeemable) return 'redeemable';
  if (position.marketResolutionPending) return 'pending';
  if (position.marketClosed) return 'closed';
  return 'open';
}

function statusCopy(status: PredictionShareStatus) {
  switch (status) {
    case 'redeemed':
      return {
        label: 'REDEEMED',
        kicker: 'payout confirmed',
        cls: 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200',
      };
    case 'redeemable':
      return {
        label: 'REDEEMABLE',
        kicker: 'settled market',
        cls: 'border-lime-300/35 bg-lime-400/15 text-lime-200',
      };
    case 'sold':
      return {
        label: 'CLOSED',
        kicker: 'cashed out',
        cls: 'border-zinc-300/25 bg-zinc-200/10 text-zinc-100',
      };
    case 'closed':
      return {
        label: 'CLOSED',
        kicker: 'market settled',
        cls: 'border-zinc-300/25 bg-zinc-200/10 text-zinc-100',
      };
    case 'pending':
      return {
        label: 'PENDING',
        kicker: 'awaiting settlement',
        cls: 'border-amber-300/35 bg-amber-400/15 text-amber-200',
      };
    case 'open':
    default:
      return {
        label: 'OPENED',
        kicker: 'live prediction',
        cls: 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200',
      };
  }
}

function usePredictionLiveScore(
  eventSlug: string | null | undefined,
  enabled: boolean,
): LiveScoreState {
  const [state, setState] = useState<LiveScoreState>(EMPTY_SCORE);

  useEffect(() => {
    if (!enabled || !eventSlug) {
      setState(EMPTY_SCORE);
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
        const json = await res.json();
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

        if (!cancelled && json.live) {
          timer = setTimeout(fetchOnce, 15_000);
        }
      } catch {
        if (!cancelled) setState(EMPTY_SCORE);
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, eventSlug]);

  return state;
}

function normalizeScoreTeam(team: LiveScoreTeam) {
  const score = optionalNumber(team.score);
  const name = (team.name || team.abbreviation || '').trim();
  const rawShortName = (team.abbreviation || team.name || '').trim();
  const shortName = team.abbreviation || rawShortName.length <= 4
    ? rawShortName.toUpperCase()
    : rawShortName;
  if (!name || score == null) return null;
  return {
    name,
    shortName,
    score,
  };
}

function buildScoreSummary(
  liveScore: LiveScoreState,
  status: PredictionShareStatus,
) {
  const teams = liveScore.teams
    .map(normalizeScoreTeam)
    .filter(Boolean)
    .slice(0, 2) as Array<{
    name: string;
    shortName: string;
    score: number;
  }>;

  if (teams.length < 2) return null;

  const finalLike =
    liveScore.ended ||
    liveScore.closed ||
    status === 'closed' ||
    status === 'redeemable' ||
    status === 'redeemed' ||
    status === 'sold';
  const clock = liveScore.live
    ? ['LIVE', liveScore.period, liveScore.elapsed].filter(Boolean).join(' ')
    : finalLike
      ? 'FINAL'
      : [liveScore.period, liveScore.elapsed].filter(Boolean).join(' ') ||
        'SCORE';

  return { teams, clock };
}

function displayTitle(position: PredictionSharePosition) {
  return position.title?.trim() || 'Prediction market';
}

function displayOutcome(position: PredictionSharePosition) {
  return position.outcome?.trim() || 'Pick';
}

function computeShareDetails(
  position: PredictionSharePosition,
  status: PredictionShareStatus,
  redeemedAmount?: number | null,
) {
  const size = finiteNumber(position.size);
  const totalBought = finiteNumber(position.totalBought, size);
  const avgPrice = optionalNumber(position.avgPrice);
  const curPrice = optionalNumber(position.curPrice);
  const cost =
    optionalNumber(position.initialValue) ??
    (avgPrice != null ? avgPrice * Math.max(totalBought || size, size) : 0);
  const currentValue =
    redeemedAmount ??
    optionalNumber(position.currentValue) ??
    (curPrice != null ? curPrice * size : 0);
  const fallbackPnl =
    status === 'redeemed' || status === 'redeemable'
      ? currentValue - cost + finiteNumber(position.realizedPnl)
      : currentValue - cost;
  const pnl =
    optionalNumber(position.cashPnl) ??
    optionalNumber(position.realizedPnl) ??
    fallbackPnl;
  const percent =
    optionalNumber(position.percentPnl) ??
    (cost > 0 ? (pnl / cost) * 100 : 0);

  const valueLabel =
    status === 'redeemed'
      ? 'Paid'
      : status === 'redeemable'
        ? 'Payout'
        : status === 'sold' || status === 'closed'
          ? 'Realized'
          : 'Value';
  const value =
    status === 'redeemed' || status === 'redeemable'
      ? currentValue
      : status === 'sold'
        ? Math.max(0, cost + pnl)
        : currentValue;

  return {
    title: displayTitle(position),
    outcome: displayOutcome(position),
    cost,
    value,
    valueLabel,
    pnl,
    percent,
    shares: Math.max(totalBought || size, size),
    avgOdds: toAmericanOdds(avgPrice),
    curOdds: toAmericanOdds(curPrice),
    avgCents: formatCents(avgPrice),
    curCents: formatCents(curPrice),
    profitable: pnl >= 0,
  };
}

async function waitForImages(el: HTMLElement) {
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      }

      if (typeof img.decode === 'function') {
        await img.decode().catch(() => undefined);
      }
    }),
  );
}

async function captureTicket(el: HTMLElement): Promise<Blob> {
  await waitForImages(el);

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    backgroundColor: '#020403',
    scale: 3,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to capture ticket'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shareFileName(position: PredictionSharePosition, status: string) {
  const base = (position.slug || position.title || 'prediction')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52);
  return `swopme-${status}-${base || 'prediction'}.png`;
}

export default function PositionShareModal({
  position,
  isOpen,
  onClose,
  statusOverride,
  redeemedAmount,
}: PositionShareModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const status = resolveStatus(position, statusOverride);
  const liveScore = usePredictionLiveScore(position.eventSlug, isOpen);
  const scoreSummary = useMemo(
    () => buildScoreSummary(liveScore, status),
    [liveScore, status],
  );
  const details = useMemo(
    () => computeShareDetails(position, status, redeemedAmount),
    [position, redeemedAmount, status],
  );
  const statusMeta = statusCopy(status);

  if (!isOpen) return null;

  const getBlob = async (): Promise<Blob | null> => {
    if (!ticketRef.current) return null;
    setIsCapturing(true);
    try {
      return await captureTicket(ticketRef.current);
    } finally {
      setIsCapturing(false);
    }
  };

  const shareText = `I picked ${details.outcome} on "${details.title}" - ${statusMeta.label} ${formatMoney(
    details.pnl,
    true,
  )} (${formatPercent(details.percent)}) via Swopme.co`;

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    downloadBlob(blob, shareFileName(position, status));
  };

  const handleNativeShare = async () => {
    try {
      const blob = await getBlob();
      if (!blob) return;
      const file = new File([blob], shareFileName(position, status), {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Swopme prediction',
          text: shareText,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'Swopme prediction',
          text: shareText,
          url: SWOP_URL,
        });
      } else {
        downloadBlob(blob, shareFileName(position, status));
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.error('Failed to share prediction:', err);
      }
    }
  };

  const handleShareX = async () => {
    const blob = await getBlob();
    if (blob) downloadBlob(blob, shareFileName(position, status));
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleShareInstagram = async () => {
    const blob = await getBlob();
    if (!blob) return;
    downloadBlob(blob, shareFileName(position, status));
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[386px] overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[#050706] shadow-[0_28px_90px_rgba(0,0,0,0.78),0_0_70px_rgba(30,255,150,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-emerald-300/10 px-4 py-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.08]"
            aria-label="Close share preview"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200"
            style={{ fontFamily: MONO }}
          >
            <Terminal className="h-4 w-4" />
            Share prediction
          </div>
          <div className="h-9 w-9" />
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
          <div
            ref={ticketRef}
            data-testid="prediction-share-ticket"
            className="relative overflow-hidden rounded-[26px] border border-emerald-300/20 bg-[#020403] p-5 text-white shadow-[inset_0_0_40px_rgba(54,255,154,0.08)]"
            style={{
              fontFamily: MONO,
              minHeight: scoreSummary ? 580 : 500,
            }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(39,255,146,0.22),transparent_34%),radial-gradient(circle_at_8%_92%,rgba(121,255,214,0.12),transparent_34%)]" />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(64,255,150,0.04)_0px,rgba(64,255,150,0.04)_1px,transparent_1px,transparent_22px),repeating-linear-gradient(90deg,rgba(64,255,150,0.026)_0px,rgba(64,255,150,0.026)_1px,transparent_1px,transparent_34px)]" />
              <div className="absolute left-8 top-[-30px] h-40 w-px bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent shadow-[0_0_24px_rgba(52,255,157,0.55)]" />
              <div className="absolute right-10 top-4 h-52 w-px bg-gradient-to-b from-transparent via-emerald-300/35 to-transparent shadow-[0_0_22px_rgba(52,255,157,0.45)]" />
            </div>

            <div className="relative z-10 flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <img
                    src={SWOP_WHITE_LOGO_SRC}
                    alt="Swop"
                    className="block h-[34px] w-auto max-w-[190px] object-contain"
                  />
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    prediction terminal
                  </div>
                </div>
                <div
                  className={`inline-flex min-h-8 min-w-[76px] items-center justify-center rounded-full border px-3 text-center text-[10px] font-black uppercase leading-none ${statusMeta.cls}`}
                >
                  {statusMeta.label}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-300/16 bg-black/42 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-300/15 bg-emerald-300/10 text-sm font-black text-emerald-200">
                    <span>{details.outcome.slice(0, 1).toUpperCase()}</span>
                    {position.icon && (
                      <img
                        src={position.icon}
                        alt=""
                        crossOrigin="anonymous"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        className="absolute inset-0 h-full w-full bg-zinc-900 object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      {statusMeta.kicker}
                    </div>
                    <div className="mt-1 line-clamp-3 text-[17px] font-black leading-tight text-zinc-50">
                      {details.title}
                    </div>
                    <div className="mt-3 inline-flex max-w-full items-center rounded-lg border border-emerald-300/24 bg-emerald-300/10 px-2.5 py-1 text-[12px] font-black text-emerald-100">
                      <span className="truncate">Pick: {details.outcome}</span>
                    </div>
                  </div>
                </div>
              </div>

              {scoreSummary && (
                <div className="rounded-2xl border border-emerald-300/20 bg-[#06100b]/88 p-4 shadow-[inset_0_0_24px_rgba(52,255,157,0.08)]">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    <span>Sports score</span>
                    <span>{scoreSummary.clock}</span>
                  </div>
                  <div className="space-y-2">
                    {scoreSummary.teams.map((team, index) => (
                      <div
                        key={`${team.name}-${index}`}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-[14px] font-black text-zinc-100">
                          {team.shortName || team.name}
                        </span>
                        <span className="text-[24px] font-black leading-none text-emerald-200">
                          {team.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-300/16 bg-white/[0.045] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    P/L
                  </div>
                  <div
                    className={`mt-2 text-[22px] font-black leading-none ${
                      details.profitable ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {formatMoney(details.pnl, true)}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    {formatPercent(details.percent)}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-300/16 bg-white/[0.045] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    {details.valueLabel}
                  </div>
                  <div className="mt-2 text-[22px] font-black leading-none text-zinc-50">
                    {formatMoney(details.value)}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    cost {formatMoney(details.cost)}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-300/16 bg-white/[0.045] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Odds
                  </div>
                  <div className="mt-2 text-[15px] font-black text-zinc-50">
                    {details.avgOdds}
                    <span className="px-1.5 text-zinc-600">-&gt;</span>
                    {details.curOdds}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    {details.avgCents} -&gt; {details.curCents}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-300/16 bg-white/[0.045] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Shares
                  </div>
                  <div className="mt-2 text-[15px] font-black text-zinc-50">
                    {details.shares.toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-zinc-400">
                    self-custody
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-emerald-300/12 pt-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  shared from swop
                </div>
                <img
                  src={SWOP_WHITE_LOGO_SRC}
                  alt="Swop"
                  className="block h-4 w-auto max-w-[72px] object-contain opacity-90"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 border-t border-emerald-300/10 p-4">
          <button
            onClick={handleShareInstagram}
            disabled={isCapturing}
            className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 transition-colors hover:bg-white/[0.09] disabled:opacity-50"
            title="Download for Instagram"
          >
            <Instagram className="h-5 w-5" />
          </button>
          <button
            onClick={handleShareX}
            disabled={isCapturing}
            className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 transition-colors hover:bg-white/[0.09] disabled:opacity-50"
            title="Share on X"
          >
            <Twitter className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isCapturing}
            className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 transition-colors hover:bg-white/[0.09] disabled:opacity-50"
            title="Download image"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={handleNativeShare}
            disabled={isCapturing}
            className="flex h-12 items-center justify-center rounded-2xl bg-emerald-300 text-black transition-colors hover:bg-emerald-200 disabled:opacity-50"
            title="Share"
          >
            {isCapturing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
