'use client';

import { CheckCircle2, X } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import type { PolymarketOrderResultLike } from '@/lib/polymarket/orderExecution';

export interface OrderSuccessInfo {
  side: 'BUY' | 'SELL';
  outcomeLabel: string;
  outcomeAbbr: string;
  shares: number;
  priceCents: number;
  usd: number;
  isLimit: boolean;
}

type BuildOrderSuccessInfoArgs = {
  result?: PolymarketOrderResultLike | null;
  side: 'BUY' | 'SELL';
  outcomeLabel: string;
  outcomeAbbr?: string;
  shares: number;
  price: number;
  usd: number;
  isLimit: boolean;
};

const ORDER_SUCCESS_THEME = {
  ink: '#0a0a0c',
  muted: '#6e6e76',
  muted2: '#a1a1a8',
  posGreen: '#19a974',
  posGreenSoft: 'rgba(25,169,116,0.10)',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

function positiveNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function getOutcomeAbbr(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (trimmed.length <= 4) return trimmed.toUpperCase();

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  return trimmed.slice(0, 4).toUpperCase();
}

export function formatOrderUsd(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : '$--';
}

export function formatOrderShares(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '--';
}

export function buildOrderSuccessInfo({
  result,
  side,
  outcomeLabel,
  outcomeAbbr,
  shares,
  price,
  usd,
  isLimit,
}: BuildOrderSuccessInfoArgs): OrderSuccessInfo {
  const executedShares = positiveNumber(result?.execution?.shares);
  const executedPrice = positiveNumber(result?.execution?.price);
  const executedUsd = positiveNumber(
    side === 'SELL'
      ? result?.execution?.proceeds
      : result?.execution?.cost,
  );

  return {
    side,
    outcomeLabel,
    outcomeAbbr: outcomeAbbr || getOutcomeAbbr(outcomeLabel),
    shares: executedShares ?? shares,
    priceCents: Math.round((executedPrice ?? price) * 100),
    usd: executedUsd ?? usd,
    isLimit,
  };
}

export function getOrderSuccessCopy(info: OrderSuccessInfo) {
  const title =
    info.isLimit
      ? info.side === 'BUY'
        ? 'Limit buy placed'
        : 'Limit sell placed'
      : info.side === 'BUY'
        ? 'Order filled'
        : 'Sell filled';
  const action = info.side === 'BUY' ? 'Bought' : 'Sold';
  const detail = `${action} ${formatOrderShares(info.shares)} ${info.outcomeAbbr} @ ${info.priceCents}¢ · ${formatOrderUsd(info.usd)}`;

  return { title, detail };
}

export function showOrderSuccessToast(info: OrderSuccessInfo) {
  const { title, detail } = getOrderSuccessCopy(info);

  sonnerToast.success(title, {
    description: detail,
    duration: 4500,
  });
}

/**
 * Polymarket-style success card. It mirrors the global popup copy so the
 * in-ticket confirmation and toast always agree on shares and price.
 */
export default function OrderSuccessNotification({
  info,
  onDismiss,
  className,
}: {
  info: OrderSuccessInfo;
  onDismiss: () => void;
  className?: string;
}) {
  const { title, detail } = getOrderSuccessCopy(info);
  const theme = ORDER_SUCCESS_THEME;

  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      style={{
        background: '#fff',
        border: '1px solid rgba(25,169,116,0.30)',
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
          background: theme.posGreenSoft,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={18} color={theme.posGreen} strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: theme.ink,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.muted,
            marginTop: 2,
            fontFamily: theme.mono,
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
          color: theme.muted2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
