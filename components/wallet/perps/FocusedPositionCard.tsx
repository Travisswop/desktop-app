'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { HLPosition } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface FocusedPositionCardProps {
  position: HLPosition | null | undefined;
  markPrice?: string;
  isClosing?: boolean;
  onClose: (position: HLPosition) => Promise<void>;
  onAddMargin?: () => void;
  /** Called when the user wants to open a position from the empty state. */
  onOpenTrade?: () => void;
  /** Called when the card is tapped — focuses this position's coin (chart/ticket). */
  onFocus?: () => void;
}

/**
 * FocusedPositionCard — bento-style card showing a single open position with
 * PnL, key metrics, a liquidation distance bar, and quick actions. Used in
 * row 2 of the perps dashboard. When no position exists for the current
 * market we render a quiet empty state.
 */
export function FocusedPositionCard({
  position,
  markPrice,
  isClosing = false,
  onClose,
  onAddMargin,
  onOpenTrade,
  onFocus,
}: FocusedPositionCardProps) {
  const [confirmClose, setConfirmClose] = useState(false);

  if (!position) {
    return (
      <div className="bg-white border border-black/[0.06] rounded-[20px] p-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] flex flex-col">
        <Tag>OPEN POSITION</Tag>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm font-medium text-gray-500">No open position</p>
          <p className="text-xs text-gray-400 mt-1">
            Use the trade panel to open a long or short.
          </p>
          {onOpenTrade && (
            <button
              onClick={onOpenTrade}
              className="mt-4 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              Start trading
            </button>
          )}
        </div>
      </div>
    );
  }

  const size = parseFloat(position.szi);
  const isLong = size > 0;
  const absSize = Math.abs(size);
  const pnl = parseFloat(position.unrealizedPnl) || 0;
  const pnlPositive = pnl >= 0;
  const roe = parseFloat(position.returnOnEquity) || 0;

  const entry = parseFloat(position.entryPx);
  const mark = markPrice ? parseFloat(markPrice) : entry;
  const margin = parseFloat(position.marginUsed) || 0;
  const liqPx = position.liquidationPx ? parseFloat(position.liquidationPx) : null;

  const liqDistance = liqPx
    ? Math.max(0, Math.min(1, isLong ? (mark - liqPx) / mark : (liqPx - mark) / mark))
    : null;

  return (
    <div
      onClick={onFocus}
      role={onFocus ? 'button' : undefined}
      className={`bg-white border border-black/[0.06] rounded-[20px] p-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] flex flex-col ${
        onFocus ? 'cursor-pointer hover:border-black/[0.12] transition-colors' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Tag>OPEN POSITION</Tag>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[17px] font-semibold tracking-tight text-gray-900">
              {position.coin}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono tracking-wide ${
                isLong
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {isLong ? 'LONG' : 'SHORT'} · {position.leverage.value}×
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-mono font-semibold text-[22px] tabular-nums tracking-[-0.03em] ${
              pnlPositive ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {pnlPositive ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-500 font-mono tabular-nums">
            {roe >= 0 ? '+' : ''}
            {(roe * 100).toFixed(2)}% ROE
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-black/[0.04]">
        <Stat label="Size" value={`${absSize.toFixed(4)} ${position.coin}`} />
        <Stat label="Entry" value={`$${formatPrice(entry)}`} />
        <Stat label="Mark" value={`$${formatPrice(mark)}`} />
        <Stat label="Margin" value={`$${margin.toFixed(2)}`} />
      </div>

      {/* Liq distance */}
      {liqDistance !== null && liqPx !== null && (
        <div className="mt-3.5">
          <div className="flex justify-between text-[11.5px] text-gray-500 mb-1.5">
            <span>Liq distance</span>
            <span className="font-mono font-semibold tabular-nums">
              {(liqDistance * 100).toFixed(1)}% away · ${formatPrice(liqPx)}
            </span>
          </div>
          <LiqBar pct={liqDistance * 100} />
          <div className="flex justify-between mt-1 text-[9.5px] text-gray-400 font-mono tabular-nums">
            <span>${formatPrice(liqPx)} liq</span>
            <span>${formatPrice(mark)} mark</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid grid-cols-2 gap-2 mt-3.5"
      >
        <button
          onClick={onAddMargin}
          disabled={!onAddMargin}
          className="py-2.5 bg-[#f2f2f0] text-gray-800 text-[12.5px] font-semibold rounded-[11px] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add margin
        </button>
        {!confirmClose ? (
          <button
            onClick={() => setConfirmClose(true)}
            className="py-2.5 bg-gray-900 text-white text-[12.5px] font-semibold rounded-[11px] hover:bg-black transition-colors"
          >
            Close position
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 col-span-1">
            <button
              onClick={() => setConfirmClose(false)}
              className="py-2.5 bg-[#f2f2f0] text-gray-800 text-[12px] font-semibold rounded-[11px] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await onClose(position);
                setConfirmClose(false);
              }}
              disabled={isClosing}
              className="py-2.5 bg-red-500 text-white text-[12px] font-semibold rounded-[11px] hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center"
            >
              {isClosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
        {label}
      </div>
      <div className="font-mono font-semibold text-[12px] tabular-nums tracking-tight mt-0.5 text-gray-900">
        {value}
      </div>
    </div>
  );
}

function LiqBar({ pct }: { pct: number }) {
  return (
    <div className="relative">
      <div className="h-1.5 rounded-full bg-[#f2f2f0] overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #19a974 0%, #d97706 70%, #e5484d 100%)',
          }}
        />
      </div>
      <div
        className="absolute -top-0.5 w-0.5 h-2.5 bg-gray-900 rounded-sm"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
