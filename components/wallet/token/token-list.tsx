'use client';

import Cookies from 'js-cookie';
import React, { useMemo, useState } from 'react';
import { TokenData } from '@/types/token';
import { AlertCircle } from 'lucide-react';
import TokenImage from './token-image';
import { useBalanceVisibilityStore } from '@/zustandStore/useBalanceVisibilityStore';

interface TokenListProps {
  tokens: TokenData[];
  loading: boolean;
  error: Error | null;
  onSelectToken: (token: TokenData) => void;
}

const POS_GREEN = '#19a974';
const NEG_RED = '#e5484d';
const INITIAL_VISIBLE = 6;

const HEADER_GRID =
  'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_42px] gap-3 items-center';

const CHAIN_LABELS: Record<string, string> = {
  ETHEREUM: 'Ethereum',
  SOLANA: 'Solana',
  BASE: 'Base',
  POLYGON: 'Polygon',
  ARBITRUM: 'Arbitrum',
};

const formatUsd = (n: number, frac = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const formatPrice = (price: string | number | null | undefined) => {
  if (price == null || price === '') return '—';
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1) return `$${formatUsd(n, 2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
};

const formatBalance = (balance: string, symbol: string) => {
  const n = parseFloat(balance || '0');
  if (!Number.isFinite(n) || n === 0) return `0 ${symbol}`;
  if (n >= 1000) return `${formatUsd(n, 2)} ${symbol}`;
  if (n >= 1) return `${n.toFixed(4)} ${symbol}`;
  return `${n.toFixed(6)} ${symbol}`;
};

const tokenValue = (t: TokenData): number => {
  if (typeof t.value === 'number' && Number.isFinite(t.value))
    return t.value;
  const price = t.marketData?.price;
  if (!price) return 0;
  const n = parseFloat(t.balance) * parseFloat(price.toString());
  return Number.isFinite(n) ? n : 0;
};

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="m-4 p-3 bg-red-50 rounded-xl flex items-center gap-2 border border-red-100">
    <AlertCircle className="w-4 h-4 text-red-500" />
    <p className="text-[12px] text-red-600">{message}</p>
  </div>
);

function MiniSparkline({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const color = positive ? POS_GREEN : NEG_RED;
  const w = 56;
  const h = 22;

  // Fallback line when no series is available — shape signals direction.
  if (!values || values.length < 2) {
    const fallback = positive
      ? `M0,${h - 4} C${w * 0.3},${h - 6} ${w * 0.6},${h * 0.5} ${w},2`
      : `M0,2 C${w * 0.3},${h * 0.4} ${w * 0.6},${h - 6} ${w},${
          h - 2
        }`;
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: w, height: h, display: 'block' }}
        aria-hidden
      >
        <path
          d={fallback}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);

  const pathPoints = values
    .map(
      (v, i) =>
        `${i * stepX},${h - ((v - min) / range) * (h - 2) - 1}`,
    )
    .join(' L');

  const stroke = `M${pathPoints}`;
  const fill = `${stroke} L${w},${h} L0,${h} Z`;
  // Stable but unique-enough id per row.
  const gradId = `tspark-${positive ? 'g' : 'r'}-${values.length}-${Math.round(
    values[0] * 1000,
  )}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: w, height: h, display: 'block' }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} />
      <path
        d={stroke}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TokenRow({
  token,
  onClick,
  isFirst,
}: {
  token: TokenData;
  onClick: () => void;
  isFirst: boolean;
}) {
  const { showBalance } = useBalanceVisibilityStore();
  const change = parseFloat(
    token.marketData?.priceChangePercentage24h || '0',
  );
  const positive = change >= 0;
  const value = tokenValue(token);
  const sparkValues = token.marketData?.sparkline ?? [];
  const chainLabel =
    CHAIN_LABELS[token.chain?.toUpperCase() ?? ''] || token.chain;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${HEADER_GRID} w-full text-left px-5 py-3.5 transition hover:bg-black/[0.015] ${
        isFirst ? '' : 'border-t border-black/[0.05]'
      }`}
    >
      {/* Asset */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <TokenImage token={token} width={36} height={36} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 truncate">
            {token.name}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-mono tabular-nums truncate">
            {showBalance
              ? formatBalance(token.balance, token.symbol)
              : '••••'}{' '}
            · {chainLabel}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-right text-[13px] font-semibold font-mono tabular-nums tracking-[-0.01em] text-gray-900">
        {formatPrice(token.marketData?.price)}
      </div>

      {/* 24h with sparkline */}
      <div className="flex items-center justify-end gap-2">
        <MiniSparkline values={sparkValues} positive={positive} />
        <span
          className="text-[12px] font-semibold font-mono tabular-nums min-w-[52px] text-right"
          style={{ color: positive ? POS_GREEN : NEG_RED }}
        >
          {Number.isFinite(change)
            ? `${positive ? '+' : ''}${change.toFixed(2)}%`
            : '—'}
        </span>
      </div>

      {/* Holdings */}
      <div className="text-right text-[14px] font-semibold font-mono tabular-nums tracking-[-0.01em] text-gray-900">
        {showBalance
          ? value > 0
            ? `$${formatUsd(value, 2)}`
            : '—'
          : '••••'}
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full border border-black/[0.06] bg-[#fafafa] text-gray-700"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

const LoadingSkeleton = () => (
  <div className="px-5 py-4 space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="h-12 bg-gray-100 animate-pulse rounded-md"
      />
    ))}
  </div>
);

const TokenList = ({
  tokens,
  loading,
  error,
  onSelectToken,
}: TokenListProps) => {
  const [showAll, setShowAll] = useState(false);

  const visibleTokens = useMemo(() => {
    const cookie = Cookies.get('selected_tokens');
    let hidden: string[] = [];
    try {
      hidden = cookie ? JSON.parse(cookie) : [];
    } catch {
      hidden = [];
    }
    return tokens
      .filter((t) => !hidden.includes(t.address || ''))
      .sort((a, b) => tokenValue(b) - tokenValue(a));
  }, [tokens]);

  const shown = showAll
    ? visibleTokens
    : visibleTokens.slice(0, INITIAL_VISIBLE);

  const overflow = visibleTokens.slice(INITIAL_VISIBLE);
  const remainingValue = useMemo(
    () => overflow.reduce((sum, t) => sum + tokenValue(t), 0),
    [overflow],
  );

  if (loading) {
    return (
      <div>
        {error && (
          <ErrorAlert message="Some tokens couldn't be loaded." />
        )}
        <LoadingSkeleton />
      </div>
    );
  }

  if (visibleTokens.length === 0) {
    return (
      <div>
        {error && (
          <ErrorAlert message="Some tokens couldn't be loaded." />
        )}
        <div className="px-5 py-10 text-center text-[13px] text-gray-500">
          No tokens found in your wallet
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <ErrorAlert message="Some tokens couldn't be loaded." />
      )}

      {/* Header row */}
      <div
        className={`${HEADER_GRID} px-5 py-3 border-b border-black/[0.05] text-[9.5px] font-bold uppercase tracking-[1.2px] font-mono text-gray-500`}
      >
        <span>Asset</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span className="text-right">Holdings</span>
        <span />
      </div>

      {shown.map((token, i) => (
        <TokenRow
          key={`${token.chain}-${token.symbol}-${
            token.address || i
          }`}
          token={token}
          onClick={() => onSelectToken(token)}
          isFirst={i === 0}
        />
      ))}

      {overflow.length > 0 && !showAll && (
        <div className="px-5 py-3 border-t border-black/[0.05] flex items-center justify-between gap-3">
          <span className="text-[12px] text-gray-500">
            {overflow.length} more{' '}
            {overflow.length === 1 ? 'token' : 'tokens'}
            {remainingValue > 0
              ? ` — $${formatUsd(remainingValue, 2)} combined`
              : ''}
          </span>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
          >
            Show all
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      )}

      {showAll && visibleTokens.length > INITIAL_VISIBLE && (
        <div className="px-5 py-3 border-t border-black/[0.05] flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenList;
