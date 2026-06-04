'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useAllMids } from './hooks/useHyperliquidWebSocket';
import {
  formatPrice,
  getLiquidationRisk,
} from '@/services/hyperliquid/types';
import type { HLPosition } from '@/services/hyperliquid/types';
import {
  PerpsActionsModal,
  type PerpsActionTab,
} from './PerpsActionsModal';

interface PerpsCardProps {
  /** Selected EVM wallet address used as the Hyperliquid master account. */
  masterAddress: string | undefined;
  /** True while silently reconnecting after a brief disconnect */
  isReconnecting?: boolean;
  /**
   * Open the full trading panel. The optional `coin` arg lets the panel land
   * on the market the user clicked (position row, market row) instead of the
   * default BTC.
   */
  onOpenTrading: (coin?: string) => void;
  /** Optional: hand off the user to the Arbitrum bridge flow. */
  onBridgeToArbitrum?: () => void;
  /** Optional: called after a deposit tx is submitted — used by the parent to
   *  start polling the Hyperliquid balance for agent-approval readiness. */
  onDepositSubmitted?: () => void;
}

const POS_GREEN = '#19a974';
const POS_GREEN_SOFT = 'rgba(25,169,116,0.10)';
const NEG_RED = '#e5484d';
const HAIR = 'rgba(0,0,0,0.06)';
const SURFACE_2 = '#fafafa';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const formatBalance = (n: number, frac = 2): string =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const formatSignedUsd = (raw: string | number): string => {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return '$0.00';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${formatBalance(Math.abs(n), 2)}`;
};

const formatTokenSize = (raw: string, dp = 4): string => {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return formatBalance(abs, 2);
  if (abs >= 1) return abs.toFixed(dp).replace(/\.?0+$/, '');
  return abs.toFixed(6).replace(/\.?0+$/, '');
};

function pickPrimaryPosition(positions: HLPosition[]): HLPosition | null {
  if (!positions.length) return null;
  // Highest absolute notional value first, then largest |unrealized PnL|.
  return [...positions].sort((a, b) => {
    const av = Math.abs(parseFloat(a.positionValue || '0'));
    const bv = Math.abs(parseFloat(b.positionValue || '0'));
    return bv - av;
  })[0];
}

function liqMetrics(
  position: HLPosition,
  livePrice: string | undefined,
) {
  if (!position.liquidationPx) return null;
  const liqPx = parseFloat(position.liquidationPx);
  const markPx = parseFloat(livePrice || position.entryPx);
  const isLong = parseFloat(position.szi) > 0;
  if (!Number.isFinite(liqPx) || !Number.isFinite(markPx) || markPx === 0)
    return null;

  const distance = isLong
    ? (markPx - liqPx) / markPx
    : (liqPx - markPx) / markPx;
  const pct = Math.max(0, Math.min(100, distance * 100));
  return { liqPx, markPx, pct, isLong };
}

/**
 * PerpsCard
 *
 * Two-card bento (1.45fr / 1fr) matching the wallet design:
 *  - Open Position: primary position with size/entry/mark/margin + liq bar
 *  - Account: account value + Unrealized PnL / Margin used / Withdrawable / Buying power
 *
 * Falls back to clean empty / loading / connect-wallet states when there's no
 * master address or no open positions.
 */
export function PerpsCard({
  masterAddress,
  isReconnecting = false,
  onOpenTrading,
  onBridgeToArbitrum,
  onDepositSubmitted,
}: PerpsCardProps) {
  const { data, isLoading } = useHyperliquidPositions(
    masterAddress ?? null,
    {
      refetchInterval: 30_000,
      staleTime: 15_000,
    },
  );
  const { mids } = useAllMids(!!masterAddress);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTab, setActionsTab] =
    useState<PerpsActionTab>('deposit');

  const positions = useMemo(
    () => data?.positions ?? [],
    [data?.positions],
  );
  const primaryPosition = useMemo(
    () => pickPrimaryPosition(positions),
    [positions],
  );
  const accountValue = parseFloat(data?.accountValue ?? '0');
  const unrealizedPnl = parseFloat(data?.unrealizedPnl ?? '0');
  const marginUsed = parseFloat(data?.marginUsed ?? '0');
  const withdrawable = parseFloat(data?.withdrawable ?? '0');

  // Use the primary position's leverage for the buying-power label, default
  // to a conservative 5× when no position is open so the line still has
  // something meaningful to say.
  const accountLeverage = primaryPosition?.leverage.value ?? 5;
  const accountLeverageType = primaryPosition?.leverage.type ?? 'cross';
  const buyingPower = accountValue * accountLeverage;

  const hasDanger = positions.some(
    (p) => getLiquidationRisk(p) === 'danger',
  );

  const openActions = (tab: PerpsActionTab) => {
    setActionsTab(tab);
    setActionsOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-3.5">
        <OpenPositionCard
          position={primaryPosition}
          livePrice={
            primaryPosition ? mids[primaryPosition.coin] : undefined
          }
          isLoading={isLoading}
          isReconnecting={isReconnecting}
          masterAddress={masterAddress}
          extraPositions={Math.max(positions.length - 1, 0)}
          hasDanger={hasDanger}
          onOpenTrading={onOpenTrading}
          onDeposit={() => openActions('deposit')}
        />
        <AccountCard
          accountValue={accountValue}
          unrealizedPnl={unrealizedPnl}
          marginUsed={marginUsed}
          withdrawable={withdrawable}
          buyingPower={buyingPower}
          accountLeverage={accountLeverage}
          accountLeverageType={accountLeverageType}
          isLoading={isLoading}
          masterAddress={masterAddress}
          onDeposit={() => openActions('deposit')}
          onWithdraw={() => openActions('withdraw')}
        />
      </div>

      <PerpsActionsModal
        isOpen={actionsOpen}
        initialTab={actionsTab}
        onClose={() => setActionsOpen(false)}
        masterAddress={masterAddress ?? null}
        onBridgeToArbitrum={onBridgeToArbitrum}
        onDepositSubmitted={onDepositSubmitted}
      />
    </>
  );
}

// ─── Open Position Card ──────────────────────────────────────────────────────

function OpenPositionCard({
  position,
  livePrice,
  isLoading,
  isReconnecting,
  masterAddress,
  extraPositions,
  hasDanger,
  onOpenTrading,
  onDeposit,
}: {
  position: HLPosition | null;
  livePrice: string | undefined;
  isLoading: boolean;
  isReconnecting: boolean;
  masterAddress: string | undefined;
  extraPositions: number;
  hasDanger: boolean;
  onOpenTrading: (coin?: string) => void;
  onDeposit: () => void;
}) {
  // ── Empty / connect / loading states ─────────────────────────────────────
  if (!masterAddress) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open position</Tag>
        <EmptyState
          icon={<Zap className="w-4 h-4" />}
          title="Set up perps trading"
          subtitle="Initialize a trading agent to open positions."
          ctaLabel="Enable Trading"
          onClick={() => onOpenTrading()}
        />
      </BentoShell>
    );
  }

  if (isLoading || isReconnecting) {
    return (
      <BentoShell padding="p-5">
        <Tag>Open position</Tag>
        <PositionSkeleton />
      </BentoShell>
    );
  }

  if (!position) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open position</Tag>
        <EmptyState
          icon={<TrendingUp className="w-4 h-4" />}
          title="No open positions"
          subtitle="Trade a market to open your first position."
          ctaLabel="Trade →"
          onClick={() => onOpenTrading()}
          secondary={
            <button
              type="button"
              onClick={onDeposit}
              className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition"
            >
              or deposit USDC
            </button>
          }
        />
      </BentoShell>
    );
  }

  // ── Populated state ──────────────────────────────────────────────────────
  const sz = parseFloat(position.szi);
  const isLong = sz > 0;
  const sizeAbs = Math.abs(sz);
  const pnlNum = parseFloat(position.unrealizedPnl || '0');
  const roeNum = parseFloat(position.returnOnEquity || '0') * 100;
  const positive = pnlNum >= 0;
  const liq = liqMetrics(position, livePrice);
  const markPx = liq?.markPx ?? parseFloat(livePrice || position.entryPx);

  return (
    <BentoShell padding="p-5">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <Tag>Open position</Tag>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[22px] font-bold tracking-[-0.6px] text-gray-900">
              {position.coin}
            </span>
            <LeveragePill
              leverage={position.leverage.value}
              isLong={isLong}
            />
            {hasDanger && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.4px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(229,72,77,0.10)',
                  color: NEG_RED,
                  fontFamily: MONO,
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                liq risk
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[22px] font-semibold tabular-nums"
            style={{
              fontFamily: MONO,
              letterSpacing: -0.4,
              color: positive ? POS_GREEN : NEG_RED,
            }}
          >
            {formatSignedUsd(pnlNum)}
          </div>
          <div
            className="text-[11.5px] text-gray-500 mt-0.5 font-medium"
            style={{ fontFamily: MONO }}
          >
            {Number.isFinite(roeNum)
              ? `${roeNum >= 0 ? '+' : ''}${roeNum.toFixed(2)}% ROE`
              : '—'}
          </div>
        </div>
      </div>

      <div
        className="my-4"
        style={{ height: 1, background: HAIR }}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            l: 'size',
            v: `${formatTokenSize(String(sizeAbs))} ${position.coin}`,
          },
          { l: 'entry', v: `$${formatPrice(position.entryPx)}` },
          {
            l: 'mark',
            v: Number.isFinite(markPx)
              ? `$${formatPrice(String(markPx))}`
              : '—',
          },
          {
            l: 'margin',
            v: `$${formatBalance(parseFloat(position.marginUsed), 2)}`,
          },
        ].map((s) => (
          <div key={s.l} className="min-w-0">
            <div
              className="text-[9.5px] font-bold uppercase tracking-[1.2px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              {s.l}
            </div>
            <div
              className="text-[13.5px] font-semibold tracking-[-0.2px] text-gray-900 mt-1 tabular-nums truncate"
              style={{ fontFamily: MONO }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Liquidation distance */}
      {liq && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] text-gray-500 font-medium">
              Liq distance
            </span>
            <span
              className="text-[12px] text-gray-900 font-medium"
              style={{ fontFamily: MONO }}
            >
              <span className="font-semibold">
                {liq.pct.toFixed(1)}%
              </span>{' '}
              away · ${formatPrice(String(liq.liqPx))}
            </span>
          </div>
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              height: 7,
              background: '#f2f2f0',
              border: `1px solid ${HAIR}`,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${liq.pct}%`,
                background:
                  'linear-gradient(90deg, #19a974 0%, #b6c52d 50%, #e87b1f 100%)',
              }}
            />
            <div
              className="absolute"
              style={{
                top: -3,
                left: `${liq.pct}%`,
                width: 3,
                height: 13,
                background: '#0a0a0c',
                borderRadius: 2,
                transform: 'translateX(-1px)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span
              className="text-[10.5px] text-gray-400"
              style={{ fontFamily: MONO }}
            >
              ${formatPrice(String(liq.liqPx))} liq
            </span>
            <span
              className="text-[10.5px] text-gray-400"
              style={{ fontFamily: MONO }}
            >
              ${formatPrice(String(liq.markPx))} mark
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <button
          type="button"
          onClick={() => onOpenTrading(position.coin)}
          className="py-3 rounded-xl border border-black/[0.06] bg-[#fafafa] text-gray-900 text-[13.5px] font-semibold hover:bg-gray-100 transition"
        >
          Add margin
        </button>
        <button
          type="button"
          onClick={() => onOpenTrading(position.coin)}
          className="py-3 rounded-xl bg-gray-900 text-white text-[13.5px] font-semibold hover:bg-gray-800 transition"
        >
          Close position
        </button>
      </div>

      {extraPositions > 0 && (
        <button
          type="button"
          onClick={() => onOpenTrading()}
          className="mt-3 w-full text-[11.5px] text-gray-500 hover:text-gray-900 transition"
        >
          +{extraPositions} more{' '}
          {extraPositions === 1 ? 'position' : 'positions'} →
        </button>
      )}
    </BentoShell>
  );
}

// ─── Account Card ────────────────────────────────────────────────────────────

function AccountCard({
  accountValue,
  unrealizedPnl,
  marginUsed,
  withdrawable,
  buyingPower,
  accountLeverage,
  accountLeverageType,
  isLoading,
  masterAddress,
  onDeposit,
  onWithdraw,
}: {
  accountValue: number;
  unrealizedPnl: number;
  marginUsed: number;
  withdrawable: number;
  buyingPower: number;
  accountLeverage: number;
  accountLeverageType: 'cross' | 'isolated';
  isLoading: boolean;
  masterAddress: string | undefined;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const noWallet = !masterAddress;
  const showSkeleton = !noWallet && isLoading;

  return (
    <BentoShell padding="p-5">
      <div className="flex items-start justify-between gap-2">
        <Tag>Account</Tag>
        {!noWallet && (
          <button
            type="button"
            onClick={onDeposit}
            aria-label="Deposit or withdraw"
            title="Deposit or withdraw"
            className="w-7 h-7 rounded-lg border border-black/[0.06] bg-[#fafafa] flex items-center justify-center text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-[13px] text-gray-500 font-medium mt-2">
        Account value
      </div>
      {showSkeleton ? (
        <div className="h-8 w-32 mt-1 bg-gray-100 rounded animate-pulse" />
      ) : (
        <div
          className="text-[32px] font-semibold tabular-nums leading-none mt-1 text-gray-900"
          style={{ letterSpacing: -1.2 }}
        >
          ${formatBalance(accountValue, 2)}
        </div>
      )}

      <div
        className="mt-4 mb-1"
        style={{ height: 1, background: HAIR }}
      />

      {[
        {
          k: 'Unrealized PnL',
          v: formatSignedUsd(unrealizedPnl),
          color: unrealizedPnl >= 0 ? POS_GREEN : NEG_RED,
        },
        {
          k: 'Margin used',
          v: `$${formatBalance(marginUsed, 2)}`,
          color: '#0a0a0c',
        },
        {
          k: 'Withdrawable',
          v: `$${formatBalance(withdrawable, 2)}`,
          color: '#0a0a0c',
        },
      ].map((row) => (
        <div
          key={row.k}
          className="flex items-center justify-between py-3"
          style={{ borderBottom: `1px solid ${HAIR}` }}
        >
          <span className="text-[13px] text-gray-500 font-medium">
            {row.k}
          </span>
          <span
            className="text-[14px] font-semibold tabular-nums"
            style={{
              fontFamily: MONO,
              color: row.color,
              letterSpacing: -0.2,
            }}
          >
            {showSkeleton ? '—' : row.v}
          </span>
        </div>
      ))}

      <div className="flex items-start justify-between pt-3.5">
        <div>
          <div className="text-[13px] text-gray-500 font-medium">
            Buying power
          </div>
          <div className="text-[11px] text-gray-400 font-medium mt-0.5">
            at {accountLeverage}× {accountLeverageType}
          </div>
        </div>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{
            fontFamily: MONO,
            letterSpacing: -0.2,
            color: '#0a0a0c',
          }}
        >
          {showSkeleton
            ? '—'
            : `$${formatBalance(Math.round(buyingPower), 0)}`}
        </span>
      </div>

      {noWallet && (
        <button
          type="button"
          onClick={onDeposit}
          className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition"
        >
          Deposit USDC
        </button>
      )}
      {!noWallet && withdrawable > 0 && (
        <button
          type="button"
          onClick={onWithdraw}
          className="mt-4 w-full py-2.5 rounded-xl border border-black/[0.06] bg-[#fafafa] text-gray-900 text-[13px] font-semibold hover:bg-gray-100 transition"
        >
          Withdraw
        </button>
      )}
    </BentoShell>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function BentoShell({
  children,
  className = '',
  padding = '',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`bg-white rounded-[22px] border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500"
      style={{ fontFamily: MONO }}
    >
      {children}
    </span>
  );
}

function LeveragePill({
  leverage,
  isLong,
}: {
  leverage: number;
  isLong: boolean;
}) {
  const color = isLong ? POS_GREEN : NEG_RED;
  const bg = isLong ? POS_GREEN_SOFT : 'rgba(229,72,77,0.10)';
  const border = isLong
    ? 'rgba(25,169,116,0.18)'
    : 'rgba(229,72,77,0.18)';
  return (
    <span
      className="text-[11px] font-bold tabular-nums tracking-[0.4px] px-2.5 py-1 rounded-full inline-flex items-center"
      style={{
        fontFamily: MONO,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {isLong ? 'LONG' : 'SHORT'} · {leverage}×
    </span>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onClick,
  secondary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClick: () => void;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-700"
        style={{ background: SURFACE_2, border: `1px solid ${HAIR}` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[13.5px] font-semibold text-gray-900">
          {title}
        </div>
        <div className="text-[11.5px] text-gray-500 mt-0.5">
          {subtitle}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition"
        >
          {ctaLabel}
          <ArrowRight className="w-3 h-3" />
        </button>
        {secondary}
      </div>
    </div>
  );
}

function PositionSkeleton() {
  return (
    <div className="mt-3">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-6 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
        </div>
      </div>
      <div
        className="my-3"
        style={{ height: 1, background: HAIR }}
      />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-12 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse mt-5" />
    </div>
  );
}

// Export needed to keep the component reference stable through HMR.
export default PerpsCard;
