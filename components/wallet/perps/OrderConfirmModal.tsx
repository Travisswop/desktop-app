'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { MarketIcon } from './MarketIcon';

export interface OrderConfirmDetails {
  /** Long or Short. */
  side: 'long' | 'short';
  /** Coin symbol, e.g. "ETH". */
  coin: string;
  /** Order mode label shown under the title. e.g. "Market order · Cross margin". */
  modeLabel: string;
  /** Leverage value (e.g. 25). */
  leverage: number;
  /** Cross or Isolated. */
  isCross: boolean;
  /** Size in coins, formatted (e.g. "0.8540"). */
  sizeCoins: string;
  /** Size notional in USD, formatted (e.g. "1,999.04"). */
  sizeUsd: string;
  /** Entry price as USD string (e.g. "2,340.80"). */
  entryPrice: string;
  /** Optional caption under the entry price (e.g. "Mark · slip < 0.05%"). */
  entrySub?: string;
  /** Liquidation price as USD string. */
  liquidationPrice: string;
  /** Distance to liq in percent (e.g. "48.9%"). */
  liquidationDistance?: string;
  /** Estimated fees in USD (e.g. "0.71"). */
  estFees: string;
  /** Margin required (committed) in USD (e.g. "79.96"). */
  marginRequired: string;
  /** Optional limit price label override — used in limit/TP-SL modes. */
  isLimit?: boolean;
  approvalBoundaryTitle?: string;
  approvalBoundaryDetail?: string;
  approvalBoundaryTone?: 'info' | 'warning';
}

interface OrderConfirmModalProps {
  isOpen: boolean;
  details: OrderConfirmDetails | null;
  isSubmitting: boolean;
  /** Triggered when the user explicitly confirms the order. */
  onConfirm: () => Promise<void>;
  /** Triggered when the user cancels or dismisses the modal. */
  onClose: () => void;
}

/**
 * OrderConfirmModal — pre-trade summary popup. Mirrors the `P2 · Confirm order`
 * artboard from the Predictions Wireframes design bundle. Shown over a dimmed
 * dashboard once the user clicks the Buy/Long or Sell/Short button in
 * `TradingForm`. The order is only sent to Hyperliquid when the user clicks
 * "Confirm" inside this modal.
 */
export function OrderConfirmModal({
  isOpen,
  details,
  isSubmitting,
  onConfirm,
  onClose,
}: OrderConfirmModalProps) {
  const [risksAcknowledged, setRisksAcknowledged] = useState(true);

  // Re-arm the risk acknowledgement each time the modal closes — prevents a
  // user who once dismissed the warning from skipping it on the next trade.
  useEffect(() => {
    if (!isOpen) setRisksAcknowledged(true);
  }, [isOpen]);

  // Close on Escape (only when not submitting — avoids interrupting the API call)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !details) return null;

  const isLong = details.side === 'long';
  const directionLabel = isLong ? 'Long' : 'Short';
  const directionTone = isLong
    ? { bg: 'bg-emerald-500/10', text: 'text-emerald-600' }
    : { bg: 'bg-red-500/10', text: 'text-red-500' };
  const ctaTone = isLong
    ? {
        bg: 'bg-emerald-500 hover:bg-emerald-600',
        shadow: '0 6px 18px -6px rgba(25,169,116,0.5)',
      }
    : {
        bg: 'bg-red-500 hover:bg-red-600',
        shadow: '0 6px 18px -6px rgba(229,72,77,0.5)',
      };

  const rows: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Size', value: `${details.sizeCoins} ${details.coin}`, sub: `$${details.sizeUsd}` },
    {
      label: details.isLimit ? 'Limit price' : 'Entry price',
      value: `$${details.entryPrice}`,
      sub: details.entrySub,
    },
    {
      label: 'Leverage',
      value: `${details.leverage}× ${details.isCross ? 'cross' : 'isolated'}`,
    },
    {
      label: 'Liquidation',
      value: `$${details.liquidationPrice}`,
      sub: details.liquidationDistance ? `${details.liquidationDistance} away` : undefined,
    },
    { label: 'Est. fees', value: `$${details.estFees}` },
    { label: 'Margin used', value: `$${details.marginRequired}` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirm-title"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close confirm order modal"
        disabled={isSubmitting}
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] cursor-default disabled:cursor-not-allowed"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[520px] bg-white rounded-3xl border border-black/[0.06] overflow-hidden"
        style={{
          boxShadow:
            '0 40px 80px -20px rgba(0,0,0,0.4), 0 12px 24px -8px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <Tag>Confirm order</Tag>
            <span className="text-[11px] text-gray-500 font-mono">HYPERLIQUID</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-lg bg-[#fafafa] border border-black/[0.06] inline-flex items-center justify-center text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-5 pb-2">
          <div
            id="order-confirm-title"
            className="flex items-center gap-2.5"
          >
            <MarketIcon coin={details.coin} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-semibold tracking-tight text-gray-900">
                {directionLabel} {details.coin}-PERP
              </div>
              <div className="text-[11.5px] text-gray-500 mt-px">
                {details.modeLabel}
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono tracking-wider ${directionTone.bg} ${directionTone.text}`}
            >
              {directionLabel.toUpperCase()} · {details.leverage}×
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-6 pt-2 pb-1">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex justify-between items-center py-3.5 ${
                i === rows.length - 1 ? '' : 'border-b border-black/[0.04]'
              }`}
            >
              <div className="text-[13px] text-gray-500 font-medium">
                {row.label}
              </div>
              <div className="text-right">
                <div className="text-[14px] font-mono font-semibold tabular-nums tracking-tight text-gray-900">
                  {row.value}
                </div>
                {row.sub && (
                  <div className="text-[10.5px] text-gray-400 font-mono mt-px tabular-nums">
                    {row.sub}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {details.approvalBoundaryTitle && details.approvalBoundaryDetail && (
          <div
            className={`mx-6 mt-3 rounded-xl border px-3.5 py-3 ${
              details.approvalBoundaryTone === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-blue-100 bg-blue-50 text-blue-800'
            }`}
          >
            <div className="text-[11.5px] font-semibold">
              {details.approvalBoundaryTitle}
            </div>
            <div className="mt-1 text-[11px] leading-snug opacity-90">
              {details.approvalBoundaryDetail}
            </div>
          </div>
        )}

        {/* Risk acknowledgement */}
        <label className="mx-6 mt-2 flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-black/[0.04] bg-[#fff8ed] cursor-pointer">
          <span
            onClick={(e) => e.stopPropagation()}
            className={`mt-px w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors ${
              risksAcknowledged
                ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-300 text-transparent'
            }`}
            onMouseDown={(e) => e.preventDefault()}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={risksAcknowledged}
              onChange={(e) => setRisksAcknowledged(e.target.checked)}
            />
            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
              <path
                d="M3 8l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[11.5px] leading-snug text-gray-500">
            High leverage. Liquidation can occur with a{' '}
            {details.leverage > 0
              ? `~${(100 / details.leverage).toFixed(1)}%`
              : '—'}{' '}
            adverse move. Funding settles every 8 hours.
          </span>
        </label>

        {/* Total */}
        <div className="px-6 pt-4 flex items-baseline justify-between">
          <span className="text-[12.5px] text-gray-500 font-medium">
            You&apos;re committing
          </span>
          <span className="text-[22px] font-mono font-semibold tabular-nums tracking-tight text-gray-900">
            ${details.marginRequired}
          </span>
        </div>

        {/* Actions */}
        <div className="px-6 pt-4 pb-5 grid grid-cols-[1fr_1.4fr] gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-3.5 rounded-xl bg-[#fafafa] border border-black/[0.06] text-[14px] font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!risksAcknowledged || isSubmitting}
            className={`py-3.5 rounded-xl text-[14px] font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${ctaTone.bg}`}
            style={{
              boxShadow:
                isSubmitting || !risksAcknowledged ? undefined : ctaTone.shadow,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Placing…
              </>
            ) : (
              `Confirm ${directionLabel.toLowerCase()} · ${details.sizeCoins} ${details.coin}`
            )}
          </button>
        </div>
      </div>
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
