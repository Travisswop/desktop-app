'use client';

import { useMemo } from 'react';
import { useBtcUpDownMarket } from '@/hooks/polymarket/useBtcUpDownMarket';
import Card from '../shared/Card';

// ─── Circular progress (SVG) ──────────────────────────────────────────────────

interface CircularProgressProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  value,
  size = 52,
  strokeWidth = 5,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const color = value >= 50 ? '#22c55e' : '#ef4444'; // green-500 / red-500

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

  const changeLabel = useMemo(() => {
    if (currentPrice === null || startPrice === null) return null;
    const sign = priceChange >= 0 ? '+' : '';
    return `${sign}${formatUSD(priceChange)} (${sign}${priceChangePct.toFixed(2)}%)`;
  }, [currentPrice, startPrice, priceChange, priceChangePct]);

  // Buttons need a live price AND a real Polymarket backing market to submit orders
  const buttonsDisabled = disabled || currentPrice === null || noBackingMarket;

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
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 select-none">
            <span className="text-lg leading-none">₿</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              BTC 5 Minute
            </p>
            <p className="text-xs font-medium text-gray-500">Up or Down</p>
          </div>
        </div>

        {/* Probability indicator */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative w-[52px] h-[52px]">
            <CircularProgress value={upProbability} size={52} strokeWidth={5} />
            {/* Label overlaid in the centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className={`text-[11px] font-bold leading-none ${
                  upProbability >= 50 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {upProbability}%
              </span>
              <span
                className={`text-[9px] font-semibold leading-none mt-0.5 ${
                  upProbability >= 50 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {upProbability >= 50 ? 'Up' : 'Down'}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5 leading-none">
            Probability
          </p>
        </div>
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
          <p className="text-[10px] text-gray-400 mt-0.5">
            Window open:{' '}
            <span className="tabular-nums">{formatUSD(startPrice)}</span>
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
          className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all flex flex-col items-center gap-0.5 ${
            buttonsDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 active:scale-95 cursor-pointer'
          }`}
        >
          <span className="leading-none">▲ Up</span>
          <span className="text-[10px] font-medium opacity-90 leading-none">
            {upProbability}%
          </span>
        </button>

        {/* Down */}
        <button
          onClick={() => onOutcomeClick?.('Down')}
          disabled={buttonsDisabled}
          className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all flex flex-col items-center gap-0.5 ${
            buttonsDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 active:scale-95 cursor-pointer'
          }`}
        >
          <span className="leading-none">▼ Down</span>
          <span className="text-[10px] font-medium opacity-90 leading-none">
            {downProbability}%
          </span>
        </button>
      </div>

      {/* No-backing-market notice */}
      {noBackingMarket && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2 text-center leading-snug">
          No active BTC market found. Scroll down to load more markets.
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
          <span
            className={`text-[10px] font-bold tracking-wide ${
              isConnected ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            {isConnected ? 'LIVE' : 'CONNECTING...'}
          </span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Resets in</span>
          <span className="text-[11px] font-bold text-gray-700 tabular-nums">
            {formatCountdown(countdownSeconds)}
          </span>
        </div>
      </div>
    </Card>
  );
}
