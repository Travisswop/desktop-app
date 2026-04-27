'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useBtcUpDownMarket } from '@/hooks/polymarket/useBtcUpDownMarket';
import Card from '../shared/Card';

// ─── Circular progress (SVG) ──────────────────────────────────────────────────

interface CircularProgressProps {
  /** 0–100 */
  value: number;
  isUp: boolean;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  value,
  isUp,
  size = 52,
  strokeWidth = 5,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const color = isUp ? '#22c55e' : '#ef4444'; // green-500 / red-500

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
        }}
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMarketWindowLabel(): string {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  let month = '';
  let day = 0;
  let hour24 = 0;
  let min = 0;

  for (const p of parts) {
    if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = Number(p.value);
    else if (p.type === 'hour') hour24 = Number(p.value);
    else if (p.type === 'minute') min = Number(p.value);
  }

  const startMin = Math.floor(min / 5) * 5;
  const endMin = startMin + 5;
  const endHour24 = endMin === 60 ? (hour24 + 1) % 24 : hour24;
  const endMinActual = endMin === 60 ? 0 : endMin;

  const startPeriod = hour24 < 12 ? 'AM' : 'PM';
  const endPeriod = endHour24 < 12 ? 'AM' : 'PM';
  const startHour12 = hour24 % 12 || 12;
  const endHour12 = endHour24 % 12 || 12;

  const startStr = `${startHour12}:${String(startMin).padStart(2, '0')}`;
  const endStr = `${endHour12}:${String(endMinActual).padStart(2, '0')}`;

  if (startPeriod === endPeriod) {
    return `${month} ${day}, ${startStr}-${endStr}${endPeriod} ET`;
  }
  return `${month} ${day}, ${startStr}${startPeriod}-${endStr}${endPeriod} ET`;
}

function formatUSD(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BtcUpDownCardProps {
  disabled?: boolean;
  /**
   * True when crypto markets have fully loaded but no BTC binary market with
   * CLOB token IDs was found. Buttons will stay disabled and show a tooltip.
   */
  noBackingMarket?: boolean;
  onOutcomeClick?: (outcome: 'Up' | 'Down') => void;
}

export default function BtcUpDownCard({
  disabled = false,
  noBackingMarket = false,
  onOutcomeClick,
}: BtcUpDownCardProps) {
  const {
    currentPrice,
    startPrice,
    countdownSeconds,
    upProbability,
    priceChange,
    priceChangePct,
    isConnected,
  } = useBtcUpDownMarket();

  const downProbability = 100 - upProbability;
  const isUp = priceChange >= 0;

  // Recomputes whenever the countdown ticks so the window label stays current
  const windowLabel = useMemo(
    () => getMarketWindowLabel(),
    [countdownSeconds],
  );

  const changeLabel = useMemo(() => {
    if (currentPrice === null || startPrice === null) return null;
    const sign = priceChange >= 0 ? '+' : '';
    return `${sign}${formatUSD(priceChange)} (${sign}${priceChangePct.toFixed(2)}%)`;
  }, [currentPrice, startPrice, priceChange, priceChangePct]);

  // Buttons need a live price AND a real Polymarket backing market to submit orders
  const buttonsDisabled =
    disabled || currentPrice === null || noBackingMarket;

  return (
    <Card
      hover
      className="px-4 py-3 ring-1 ring-blue-100 relative overflow-hidden"
    >
      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 via-blue-400 to-red-400 rounded-t-xl" />

      {/* ── Row 1: title + circular probability ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 select-none overflow-hidden">
            <Image
              src="/assets/crypto-icons/BTC.png"
              alt="Bitcoin"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              BTC Up or Down 5m
            </p>
            {isConnected && (
              <p className="font-normal text-xs text-gray-500 ">
                {windowLabel}
              </p>
            )}
          </div>
        </div>

        {/* Probability indicator */}
        {(() => {
          const upDominant = upProbability >= downProbability;
          const displayPct = upDominant
            ? upProbability
            : downProbability;
          return (
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="relative w-[52px] h-[52px]">
                <CircularProgress
                  value={displayPct}
                  isUp={upDominant}
                  size={52}
                  strokeWidth={5}
                />
                {/* Label overlaid in the centre */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span
                    className={`text-[11px] font-bold leading-none ${
                      upDominant ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {displayPct}%
                  </span>
                  <span
                    className={`text-[9px] font-semibold leading-none mt-0.5 ${
                      upDominant ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {upDominant ? 'Up' : 'Down'}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mt-0.5 leading-none">
                Probability
              </p>
            </div>
          );
        })()}
      </div>

      {/* ── Row 2: BTC price ── */}
      <div className="mb-3">
        {currentPrice !== null ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-bold text-gray-900 tabular-nums">
              {formatUSD(currentPrice)}
            </span>
            {changeLabel && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isUp ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {changeLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        )}
        {startPrice !== null ? (
          <p className="font-normal text-xs text-gray-400 mt-0.5">
            Price to Beat:{' '}
            <span className="tabular-nums">
              {formatUSD(startPrice)}
            </span>
          </p>
        ) : (
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-1" />
        )}
      </div>

      {/* ── Row 3: Up / Down buttons ── */}
      <div className="flex gap-2 mb-3">
        {/* Up */}
        <button
          onClick={() => onOutcomeClick?.('Up')}
          disabled={buttonsDisabled}
          className={`relative flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex flex-col items-center gap-1 overflow-hidden ${
            buttonsDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'cursor-pointer active:scale-95 border border-green-400/40 text-green-700 hover:border-green-400/70'
          }`}
          style={
            buttonsDisabled
              ? undefined
              : {
                  background:
                    'linear-gradient(135deg, rgba(134,239,172,0.35) 0%, rgba(74,222,128,0.18) 50%, rgba(255,255,255,0.25) 100%)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(34,197,94,0.18)',
                }
          }
        >
          {/* Gloss sheen */}
          {!buttonsDisabled && (
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 to-transparent" />
          )}
          <div className="flex items-center gap-1">
            <span className="relative leading-none text-base">▲</span>
            <span className="relative leading-none font-bold">
              Up
            </span>
          </div>
          <span className="font-semibold text-xs opacity-75 leading-none">
            {upProbability}%
          </span>
        </button>

        {/* Down */}
        <button
          onClick={() => onOutcomeClick?.('Down')}
          disabled={buttonsDisabled}
          className={`relative flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex flex-col items-center gap-1 overflow-hidden ${
            buttonsDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'cursor-pointer active:scale-95 border border-red-400/40 text-red-700 hover:border-red-400/70'
          }`}
          style={
            buttonsDisabled
              ? undefined
              : {
                  background:
                    'linear-gradient(135deg, rgba(252,165,165,0.35) 0%, rgba(248,113,113,0.18) 50%, rgba(255,255,255,0.25) 100%)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(239,68,68,0.18)',
                }
          }
        >
          {/* Gloss sheen */}
          {!buttonsDisabled && (
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 to-transparent" />
          )}
          <div className="flex items-center gap-1">
            <span className="relative leading-none text-base">▼</span>
            <span className="relative leading-none font-bold">
              Down
            </span>
          </div>
          <span className="font-semibold text-xs opacity-75 leading-none">
            {downProbability}%
          </span>
        </button>
      </div>

      {/* No-backing-market notice */}
      {noBackingMarket && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2 text-center leading-snug">
          No active BTC market found. Scroll down to load more
          markets.
        </p>
      )}

      {/* ── Row 4: Live indicator + countdown ── */}
      <div className="flex items-center justify-between">
        {/* Live badge */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-red-400' : 'bg-gray-300'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isConnected ? 'bg-red-500' : 'bg-gray-400'
              }`}
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span
              className={`text-[10px] font-bold tracking-wide ${
                isConnected ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              {isConnected ? 'LIVE' : 'CONNECTING...'}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1">
          <span className="font-normal text-xs text-gray-400">
            Resets in
          </span>
          <span className="font-bold text-base text-gray-700 tabular-nums">
            {formatCountdown(countdownSeconds)}
          </span>
        </div>
      </div>
    </Card>
  );
}
