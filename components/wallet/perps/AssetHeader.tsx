'use client';

import { ChevronDown } from 'lucide-react';
import type { HLMarket } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface AssetHeaderProps {
  market: HLMarket | null;
  markPrice: string;
  intervalHours?: number;
  onSelectMarketClick?: () => void;
}

/**
 * AssetHeader — full-width asset detail card shown at the top of the perps
 * dashboard. Mirrors the bento design: avatar + name + max-leverage chip,
 * large mono price + delta, and a row of mark / funding / OI / 24h vol
 * stats with a radial funding gauge.
 */
export function AssetHeader({
  market,
  markPrice,
  intervalHours = 8,
  onSelectMarketClick,
}: AssetHeaderProps) {
  if (!market) return <AssetHeaderSkeleton />;

  const mark = parseFloat(markPrice) || parseFloat(market.markPrice) || 0;
  const change = market.change24h;

  const fundingNum = parseFloat(market.fundingRate) || 0;
  const fundingPct = (fundingNum * 100).toFixed(4);
  const fundingApr = (fundingNum * (24 / intervalHours) * 365 * 100).toFixed(2);
  const fundingPositive = fundingNum >= 0;

  const oiUsd = parseFloat(market.openInterest) * mark;
  const volNum = parseFloat(market.dayVolume) || 0;

  return (
    <div className="bg-white border border-black/[0.06] rounded-[22px] px-6 py-5 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_20px_48px_-20px_rgba(10,10,12,0.18)]">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Left: avatar + symbol + price */}
        <div className="flex items-center gap-4">
          <CoinBadge coin={market.coin} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-semibold tracking-tight text-gray-900">
                {market.coin}-PERP
              </span>
              <button
                onClick={onSelectMarketClick}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Switch market"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-gray-700 bg-[#f6f6f3] border border-black/[0.06] rounded-full px-2.5 py-0.5">
                {market.maxLeverage}× max
              </span>
              <Tag>HYPERLIQUID</Tag>
            </div>
            <div className="flex items-baseline gap-3 mt-1.5">
              <span
                className="font-mono font-semibold tabular-nums text-[38px] leading-none tracking-[-0.04em] text-gray-900"
              >
                ${formatLargePrice(mark)}
              </span>
              <Delta value={change} big />
            </div>
          </div>
        </div>

        {/* Right: stats + funding clock */}
        <div className="flex items-center gap-7 flex-wrap">
          <Stat label="Mark" value={`$${formatLargePrice(mark)}`} />
          <Stat
            label={`Funding / ${intervalHours}h`}
            value={`${fundingPositive ? '+' : ''}${fundingPct}%`}
            valueColor={fundingPositive ? 'text-emerald-600' : 'text-red-500'}
            sub={`${fundingPositive ? '+' : ''}${fundingApr}% APR`}
          />
          <Stat label="Open Int." value={formatNotional(oiUsd)} />
          <Stat label="24h Vol" value={formatNotional(volNum)} />
          <FundingClock value={fundingNum} size={56} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  valueColor = 'text-gray-900',
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
        {label}
      </div>
      <div className={`mt-1 font-mono font-semibold text-[15px] tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-gray-500 tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}

function Delta({ value, big = false }: { value: number; big?: boolean }) {
  const isUp = value >= 0;
  const color = isUp ? 'text-emerald-600' : 'text-red-500';
  const bg = isUp ? 'bg-emerald-500/10' : 'bg-red-500/10';
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold rounded-full ${big ? 'px-2.5 py-1 text-[13px]' : 'px-2 py-0.5 text-[11px]'} ${color} ${bg}`}
    >
      <span className={big ? 'text-[10px]' : 'text-[9px]'}>
        {isUp ? '▲' : '▼'}
      </span>
      {isUp ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}

function FundingClock({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.abs(value) / 0.001, 1);
  const stroke = value >= 0 ? '#19a974' : '#e5484d';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        fontSize="10"
        fontWeight={600}
        fontFamily='ui-monospace, "JetBrains Mono", Menlo, monospace'
        fill="#0a0a0c"
        dominantBaseline="middle"
      >
        {(value * 100).toFixed(3)}%
      </text>
    </svg>
  );
}

function CoinBadge({ coin }: { coin: string }) {
  return (
    <div
      className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-[22px]"
      style={{ background: coinBg(coin) }}
    >
      {coin.charAt(0)}
    </div>
  );
}

function AssetHeaderSkeleton() {
  return (
    <div className="bg-white border border-black/[0.06] rounded-[22px] px-6 py-5 h-[120px] animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-100" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-gray-100 rounded" />
          <div className="h-9 w-56 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLargePrice(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return formatPrice(value);
}

function formatNotional(value: number): string {
  if (!value) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function coinBg(coin: string): string {
  const map: Record<string, string> = {
    BTC: '#F7931A',
    ETH: '#0a0a0c',
    SOL: '#14F195',
    HYPE: '#10B981',
    DOGE: '#C2A633',
    AVAX: '#E84142',
    ARB: '#28A0F0',
    OP: '#FF0420',
  };
  return map[coin] ?? '#0a0a0c';
}
