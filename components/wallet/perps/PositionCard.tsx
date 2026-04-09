'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { HLPosition } from '@/services/hyperliquid/types';
import { getLiquidationRisk, formatPrice, formatPnl } from '@/services/hyperliquid/types';

interface PositionCardProps {
  position: HLPosition;
  markPrice?: string; // live mark price from WS
  onClose: (position: HLPosition) => Promise<void>;
  isClosing?: boolean;
}

/**
 * PositionCard
 *
 * Displays a single open perpetual position with:
 *  - Direction badge (LONG / SHORT) with leverage
 *  - Unrealized PnL (coloured)
 *  - Liquidation price with risk-level warning
 *  - Entry price and current mark price
 *  - Expand/collapse for additional metrics
 *  - Close position button
 */
export function PositionCard({
  position,
  markPrice,
  onClose,
  isClosing = false,
}: PositionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const size = parseFloat(position.szi);
  const isLong = size > 0;
  const absSize = Math.abs(size);
  const pnl = formatPnl(position.unrealizedPnl);
  const riskLevel = getLiquidationRisk(position);

  const liqPx = position.liquidationPx
    ? parseFloat(position.liquidationPx)
    : null;

  const currentPrice = markPrice
    ? parseFloat(markPrice)
    : liqPx
      ? liqPx * (isLong ? 1.2 : 0.8)
      : null;

  // Distance from liquidation (for the progress bar)
  const liqDistance = useLiquidationDistance(position, currentPrice);

  const riskColors: Record<typeof riskLevel, { bar: string; text: string; bg: string }> = {
    safe: {
      bar: 'bg-emerald-400',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    warning: {
      bar: 'bg-amber-400',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    danger: {
      bar: 'bg-red-500',
      text: 'text-red-600',
      bg: 'bg-red-50',
    },
  };

  const colors = riskColors[riskLevel];

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      riskLevel === 'danger'
        ? 'border-red-200 shadow-red-100 shadow-sm'
        : 'border-gray-200'
    }`}>
      {/* Main row */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: coin + direction */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isLong ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {isLong ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-gray-800 text-sm">{position.coin}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isLong
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isLong ? 'LONG' : 'SHORT'} {position.leverage.value}x
                </span>
                {riskLevel !== 'safe' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
                    riskLevel === 'danger'
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {riskLevel === 'danger' ? 'LIQ RISK' : 'CAUTION'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {absSize.toFixed(4)} {position.coin} · Entry ${formatPrice(position.entryPx)}
              </p>
            </div>
          </div>

          {/* Right: PnL + actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className={`text-sm font-bold ${
                pnl.isPositive ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {pnl.value}
              </p>
              <p className="text-xs text-gray-400">
                {parseFloat(position.returnOnEquity) >= 0 ? '+' : ''}
                {(parseFloat(position.returnOnEquity) * 100).toFixed(2)}% ROE
              </p>
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Liquidation progress bar */}
        {liqDistance !== null && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Liq. distance</span>
              <span className={colors.text}>
                {(liqDistance * 100).toFixed(1)}% away · ${formatPrice(position.liquidationPx ?? '0')}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.bar} rounded-full transition-all`}
                style={{ width: `${Math.min(100, (1 - liqDistance) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className={`px-3 pb-3 pt-0 border-t border-gray-100 ${colors.bg} space-y-2`}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2">
            <Stat label="Position Value" value={`$${parseFloat(position.positionValue ?? '0').toFixed(2)}`} />
            <Stat label="Margin Used" value={`$${parseFloat(position.marginUsed).toFixed(2)}`} />
            <Stat label="Liq. Price" value={liqPx ? `$${formatPrice(position.liquidationPx!)}` : 'N/A'} color={colors.text} />
            <Stat label="Leverage Mode" value={position.leverage.type === 'cross' ? 'Cross' : 'Isolated'} />
            <Stat
              label="Funding (since open)"
              value={`$${parseFloat(position.cumFunding?.sinceOpen ?? '0').toFixed(4)}`}
              color={parseFloat(position.cumFunding?.sinceOpen ?? '0') >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <Stat label="Max Trade Size" value={`${position.maxTradeSzs?.[0] ?? '—'} ${position.coin}`} />
          </div>

          {/* Close position */}
          {!confirmClose ? (
            <button
              onClick={() => setConfirmClose(true)}
              className="w-full mt-2 py-2 px-4 bg-white border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Close Position
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="flex-1 py-2 px-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onClose(position);
                  setConfirmClose(false);
                }}
                disabled={isClosing}
                className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isClosing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirm Close'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  color = 'text-gray-800',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  );
}

/**
 * Returns distance from current price to liquidation price as a fraction (0–1).
 * 0 = at liquidation, 1 = very far away.
 */
function useLiquidationDistance(
  position: HLPosition,
  currentPrice: number | null,
): number | null {
  if (!position.liquidationPx || !currentPrice) return null;
  const liqPx = parseFloat(position.liquidationPx);
  const isLong = parseFloat(position.szi) > 0;
  const distance = isLong
    ? (currentPrice - liqPx) / currentPrice
    : (liqPx - currentPrice) / currentPrice;
  return Math.max(0, Math.min(1, distance));
}
