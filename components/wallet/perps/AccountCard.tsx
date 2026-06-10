'use client';

import { ArrowDownToLine, Zap } from 'lucide-react';

interface AccountCardProps {
  accountValue: string;
  /** Free collateral, usable now for any market (pooled in the main account). */
  available: string;
  /** Margin currently locked backing open positions (across all DEXs). */
  inPositions?: string;
  unrealizedPnl: string;
  isInitialized: boolean;
  isReconnecting: boolean;
  onOpenDeposit: () => void;
  onEnableTrading: () => void;
}

/**
 * AccountCard — the Fresh design's right-column balance card. Carries the
 * Deposit button and the agent status pill (Active / Enable Trading /
 * Reconnecting), which used to live in the panel's top bar.
 */
export function AccountCard({
  accountValue,
  available,
  inPositions,
  unrealizedPnl,
  isInitialized,
  isReconnecting,
  onOpenDeposit,
  onEnableTrading,
}: AccountCardProps) {
  const acct = parseFloat(accountValue) || 0;
  const avail = parseFloat(available) || 0;
  const locked = parseFloat(inPositions ?? '0') || 0;
  const pnl = parseFloat(unrealizedPnl) || 0;
  const pnlUp = pnl >= 0;
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-white border border-black/[0.06] rounded-[18px] p-4 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.14em] text-gray-400 font-mono uppercase">
          Account
        </span>
        <StatusPill
          isInitialized={isInitialized}
          isReconnecting={isReconnecting}
          onEnableTrading={onEnableTrading}
        />
      </div>

      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <div className="font-mono font-semibold tabular-nums text-[26px] leading-none tracking-[-0.03em] text-gray-900">
            ${acct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1">
            Account value
          </div>
        </div>
        <button
          onClick={onOpenDeposit}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-black transition-colors"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Deposit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-black/[0.04]">
        <Metric label="Available" value={fmt(avail)} hint="usable now" />
        <Metric label="In positions" value={fmt(locked)} hint="locked margin" />
        <Metric
          label="Unrealized PnL"
          value={`${pnlUp ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`}
          valueColor={pnlUp ? 'text-emerald-600' : 'text-red-500'}
        />
      </div>
    </div>
  );
}

function StatusPill({
  isInitialized,
  isReconnecting,
  onEnableTrading,
}: {
  isInitialized: boolean;
  isReconnecting: boolean;
  onEnableTrading: () => void;
}) {
  if (isReconnecting) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-semibold">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
        Reconnecting…
      </span>
    );
  }
  if (isInitialized) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        Active
      </span>
    );
  }
  return (
    <button
      onClick={onEnableTrading}
      className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full font-semibold transition-colors"
    >
      <Zap className="w-3 h-3" />
      Enable Trading
    </button>
  );
}

function Metric({
  label,
  value,
  valueColor = 'text-gray-900',
  hint,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[9.5px] font-bold tracking-[0.12em] text-gray-400 font-mono uppercase">
        {label}
      </div>
      <div
        className={`mt-1 font-mono font-semibold text-[14px] tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[9px] text-gray-400 font-mono mt-0.5">{hint}</div>
      )}
    </div>
  );
}
