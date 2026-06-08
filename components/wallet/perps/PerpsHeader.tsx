'use client';

import { ArrowLeft, ChevronDown, Menu } from 'lucide-react';
import type { HLMarket } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface PerpsHeaderProps {
  market: HLMarket | null;
  markPrice: string;
  isCross: boolean;
  intervalHours?: number;
  onBack: () => void;
  onOpenMarketSearch: () => void;
}

/**
 * PerpsHeader — the Fresh trading view's top strip. Combines the back control,
 * market identity (avatar · name · margin · max-lev), the large mono price with
 * 24h delta, and the inline Mark / 24h / Funding / OI / Volume stats.
 */
export function PerpsHeader({
  market,
  markPrice,
  isCross,
  intervalHours = 8,
  onBack,
  onOpenMarketSearch,
}: PerpsHeaderProps) {
  const displayCoin =
    market?.displayCoin ?? market?.coin.split(':').pop() ?? market?.coin ?? '—';
  const mark =
    parseFloat(markPrice) || parseFloat(market?.markPrice ?? '0') || 0;
  const change = market?.change24h ?? 0;
  const changeUp = change >= 0;

  const fundingNum = parseFloat(market?.fundingRate ?? '0') || 0;
  const fundingPct = (fundingNum * 100).toFixed(4);
  const fundingApr = (fundingNum * (24 / intervalHours) * 365 * 100).toFixed(2);
  const fundingUp = fundingNum >= 0;

  const oiUsd = parseFloat(market?.openInterest ?? '0') * mark;
  const volNum = parseFloat(market?.dayVolume ?? '0') || 0;

  return (
    <div className="bg-white border border-black/[0.06] rounded-[18px] px-4 py-3 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-center justify-between gap-5 flex-wrap">
        {/* Left: back + identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to wallet"
            className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-black/[0.06] text-[12.5px] font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <button
            onClick={onOpenMarketSearch}
            aria-label="Search markets"
            className="w-9 h-9 rounded-full border border-black/[0.06] flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenMarketSearch}
            className="flex items-center gap-3 group"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[15px]"
              style={{ background: coinBg(displayCoin) }}
            >
              {displayCoin.charAt(0)}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                  {displayCoin}-PERP
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-gray-500 group-hover:text-gray-700">
                  Switch
                  <ChevronDown className="w-3 h-3" />
                </span>
              </div>
              <div className="text-[10.5px] font-semibold text-gray-500 font-mono tracking-wide">
                {(market?.dexName || 'Hyperliquid')} · {isCross ? 'Cross' : 'Isolated'} ·{' '}
                {market?.maxLeverage ?? 0}× max
              </div>
            </div>
          </button>
        </div>

        {/* Center: price */}
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono font-semibold tabular-nums text-[30px] leading-none tracking-[-0.04em] text-gray-900">
            ${formatLargePrice(mark)}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-mono font-semibold text-[13px] px-2 py-0.5 rounded-full ${
              changeUp
                ? 'text-emerald-600 bg-emerald-500/10'
                : 'text-red-500 bg-red-500/10'
            }`}
          >
            <span className="text-[10px]">{changeUp ? '▲' : '▼'}</span>
            {changeUp ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-6 flex-wrap">
          <Stat label="Mark" value={`$${formatLargePrice(mark)}`} />
          <Stat
            label="24h"
            value={`${changeUp ? '+' : ''}${change.toFixed(2)}%`}
            valueColor={changeUp ? 'text-emerald-600' : 'text-red-500'}
          />
          <Stat
            label={`Funding / ${intervalHours}h`}
            value={`${fundingUp ? '+' : ''}${fundingPct}%`}
            valueColor={fundingUp ? 'text-emerald-600' : 'text-red-500'}
            sub={`${fundingUp ? '+' : ''}${fundingApr}% APR`}
          />
          <Stat label="Open Int." value={formatNotional(oiUsd)} />
          <Stat label="24h Vol" value={formatNotional(volNum)} />
        </div>
      </div>
    </div>
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
      <div className="text-[9.5px] font-bold tracking-[0.14em] text-gray-400 font-mono uppercase">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono font-semibold text-[13px] tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[9.5px] text-gray-400 tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}

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
    BRENTOIL: '#1f8a70',
    SPCX: '#334155',
    DOGE: '#C2A633',
    AVAX: '#E84142',
    ARB: '#28A0F0',
    OP: '#FF0420',
  };
  return map[coin] ?? '#0a0a0c';
}
