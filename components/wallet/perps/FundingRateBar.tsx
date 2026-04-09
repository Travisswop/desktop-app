'use client';

import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface FundingRateBarProps {
  coin: string;
  fundingRate: string; // raw rate string, e.g. "0.0001" = 0.01%
  markPrice: string;
  openInterest?: string;
  /** Funding interval in hours (default 8) */
  intervalHours?: number;
}

/**
 * FundingRateBar
 *
 * Displays the current funding rate for a perpetual contract.
 * Green = positive funding (longs pay shorts)
 * Red = negative funding (shorts pay longs)
 *
 * Shown at the top of the trading panel, below the market selector.
 */
export function FundingRateBar({
  coin,
  fundingRate,
  markPrice,
  openInterest,
  intervalHours = 8,
}: FundingRateBarProps) {
  const rate = parseFloat(fundingRate);
  const ratePercent = (rate * 100).toFixed(4);
  const annualizedRate = (rate * (24 / intervalHours) * 365 * 100).toFixed(2);
  const isPositive = rate >= 0;

  const markNum = parseFloat(markPrice);
  const formattedMark = markNum >= 1000
    ? markNum.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : markNum.toFixed(4);

  const oiNum = openInterest ? parseFloat(openInterest) : null;
  const formattedOI = oiNum
    ? oiNum >= 1_000_000_000
      ? `$${(oiNum / 1_000_000_000).toFixed(2)}B`
      : oiNum >= 1_000_000
        ? `$${(oiNum / 1_000_000).toFixed(2)}M`
        : `$${(oiNum / 1_000).toFixed(1)}K`
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs gap-4 flex-wrap">
      {/* Mark Price */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 font-medium">Mark</span>
        <span className="font-semibold text-gray-800">${formattedMark}</span>
      </div>

      {/* Funding Rate */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 font-medium">Funding / {intervalHours}h</span>
        <span
          className={`font-semibold flex items-center gap-0.5 ${
            isPositive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? '+' : ''}{ratePercent}%
        </span>
        <span className="text-gray-400">
          ({isPositive ? '+' : ''}{annualizedRate}% APR)
        </span>
      </div>

      {/* Open Interest */}
      {formattedOI && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-medium">OI</span>
          <span className="font-medium text-gray-700">{formattedOI}</span>
        </div>
      )}

      {/* Funding direction hint */}
      <div className="flex items-center gap-1 text-gray-400 ml-auto">
        <Info className="w-3 h-3" />
        <span>
          {isPositive
            ? 'Longs pay shorts'
            : 'Shorts pay longs'}
        </span>
      </div>
    </div>
  );
}
