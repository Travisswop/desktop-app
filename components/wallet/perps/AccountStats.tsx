'use client';

interface AccountStatsProps {
  accountValue: string;
  unrealizedPnl: string;
  marginUsed: string;
  withdrawable: string;
  /** Used to compute "buying power" at the trader's chosen leverage. */
  leverage?: number;
  isCross?: boolean;
}

/**
 * AccountStats — bento card showing the user's Hyperliquid account at a glance:
 * total value, unrealized PnL, margin in use, withdrawable, and buying power
 * at the current leverage. Plain text rows, mono numbers — no actions.
 */
export function AccountStats({
  accountValue,
  unrealizedPnl,
  marginUsed,
  withdrawable,
  leverage = 1,
  isCross = true,
}: AccountStatsProps) {
  const value = parseFloat(accountValue) || 0;
  const pnl = parseFloat(unrealizedPnl) || 0;
  const margin = parseFloat(marginUsed) || 0;
  const wd = parseFloat(withdrawable) || 0;
  const buyingPower = wd * leverage;
  const pnlPositive = pnl >= 0;

  return (
    <div className="bg-white border border-black/[0.06] rounded-[20px] p-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <Tag>ACCOUNT</Tag>

      <div className="mt-2">
        <div className="text-[11px] text-gray-500 font-medium">Account value</div>
        <div className="font-mono font-semibold text-[26px] tabular-nums tracking-[-0.04em] text-gray-900">
          ${formatUsd(value)}
        </div>
      </div>

      <Row
        label="Unrealized PnL"
        value={`${pnlPositive ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`}
        valueColor={pnlPositive ? 'text-emerald-600' : 'text-red-500'}
        topBorder
      />
      <Row label="Margin used" value={`$${formatUsd(margin)}`} />
      <Row label="Withdrawable" value={`$${formatUsd(wd)}`} />
      <Row
        label="Buying power"
        sub={`at ${leverage}× ${isCross ? 'cross' : 'isolated'}`}
        value={`$${formatUsd(buyingPower)}`}
      />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
      {children}
    </span>
  );
}

function Row({
  label,
  sub,
  value,
  valueColor = 'text-gray-900',
  topBorder = false,
}: {
  label: string;
  sub?: string;
  value: string;
  valueColor?: string;
  topBorder?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center mt-3 pt-2.5 ${
        topBorder ? 'border-t border-black/[0.04]' : ''
      }`}
    >
      <div>
        <div className="text-[11.5px] text-gray-500 font-medium">{label}</div>
        {sub && (
          <div className="text-[10px] text-gray-400 mt-px font-mono">
            {sub}
          </div>
        )}
      </div>
      <span
        className={`font-mono font-semibold text-[13px] tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatUsd(value: number): string {
  if (value >= 10_000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
