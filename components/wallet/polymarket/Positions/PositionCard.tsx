'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { PolymarketPosition } from '@/hooks/polymarket';
import { getOutcomeDisplayLabel } from '@/lib/polymarket/formatting';
import PositionShareModal from './PositionShareModal';

interface PositionCardProps {
  position: PolymarketPosition;
  onRedeem: (position: PolymarketPosition) => void;
  onSell: (position: PolymarketPosition) => void;
  onBuyMore: (position: PolymarketPosition) => void;
  isSelling: boolean;
  isRedeeming: boolean;
  isPendingVerification: boolean;
  isSubmitting: boolean;
  canSell: boolean;
  canRedeem: boolean;
  /** Called when the user taps the market title to open the detail modal */
  onTitleClick?: () => void;
}

export default function PositionCard({
  position,
  onRedeem,
  onSell,
  onBuyMore,
  isSelling,
  isRedeeming,
  isPendingVerification,
  isSubmitting,
  canSell,
  canRedeem,
  onTitleClick,
}: PositionCardProps) {
  const [shareOpen, setShareOpen] = useState(false);

  // A position is redeemable whenever the API marks it as such.
  // The curPrice feed may return 0 after market resolution even for winning
  // positions, so we must not gate on curPrice > 0 here.
  const isRedeemable = position.redeemable;

  // BTC 5-min positions have outcome 'Up' or 'Down' (set by enrichBtcPosition).
  // Regular markets use 'Yes' / 'No'.
  const isBtcUpDown = position.outcome === 'Up' || position.outcome === 'Down';
  const isBinaryOutcome =
    position.outcome === 'Yes' || position.outcome === 'No' || isBtcUpDown;
  const displayPick = isBinaryOutcome
    ? position.title
    : getOutcomeDisplayLabel(position.outcome, position.title, position.outcomeIndex);

  const avgCents = (position.avgPrice * 100).toFixed(1);
  const nowCents = (position.curPrice * 100).toFixed(1);
  const traded = position.initialValue || position.size * position.avgPrice;
  const toWin = position.size; // shares × $1.00 = max payout
  const value = position.currentValue; // shares × curPrice
  const pnl = position.cashPnl;
  const pnlPct = position.percentPnl;
  const isProfitable = pnl >= 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header: icon · title · outcome badge · share */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 gap-3">
          {/* Bitcoin icon — only shown for BTC Up/Down positions */}
          {isBtcUpDown && (
            <div className="w-10 h-10 rounded-xl bg-[#F7931A] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.638 14.904c-1.602 6.425-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
                <path fill="#F7931A" d="M17.006 10.25c.238-1.594-.975-2.45-2.635-3.02l.538-2.16-1.315-.327-.524 2.103c-.346-.086-.7-.167-1.054-.248l.528-2.117-1.314-.328-.54 2.16c-.286-.065-.567-.13-.84-.198l.002-.007-1.814-.453-.35 1.404s.975.223.954.237c.532.133.628.485.612.764l-.614 2.463c.037.01.084.023.136.044l-.138-.034-.86 3.447c-.065.161-.23.403-.6.311.013.02-.954-.238-.954-.238l-.652 1.504 1.712.427c.318.08.63.163.937.242l-.545 2.187 1.313.327.54-2.162c.36.098.71.188 1.052.274l-.537 2.151 1.315.327.545-2.183c2.244.425 3.93.254 4.639-1.776.573-1.635-.028-2.578-1.21-3.192.86-.198 1.508-.764 1.682-1.932zm-3.01 4.22c-.407 1.635-3.16.751-4.052.53l.723-2.896c.893.223 3.754.663 3.33 2.366zm.408-4.24c-.372 1.487-2.663.731-3.408.546l.655-2.626c.745.186 3.143.533 2.753 2.08z"/>
              </svg>
            </div>
          )}

          {/* Title + outcome badge */}
          <div className="flex-1 min-w-0">
            <button
              onClick={onTitleClick}
              disabled={!onTitleClick}
              className="font-semibold text-sm text-gray-900 line-clamp-2 text-left hover:underline disabled:no-underline disabled:cursor-default transition-all leading-snug"
            >
              {displayPick}
            </button>
            {/* Outcome badge row */}
            <div className="flex items-center gap-2 mt-1">
              {isBtcUpDown ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  position.outcome === 'Up'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {position.outcome === 'Up' ? '↑' : '↓'} {position.outcome} {nowCents}¢
                </span>
              ) : null}
              <span className="text-xs text-gray-400">{position.size} shares</span>
            </div>
          </div>

          <button
            onClick={() => setShareOpen(true)}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            title="Share"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200 mx-4" />

        {/* Stats grid: 4 cols */}
        <div className="grid grid-cols-4 gap-x-2 px-4 pt-3 pb-4">
          {/* AVG → NOW */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">AVG→NOW</p>
            <p className="text-xs font-bold text-gray-900 whitespace-nowrap">{avgCents}¢ → {nowCents}¢</p>
          </div>

          {/* TRADED */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">TRADED</p>
            <p className="text-sm font-bold text-gray-900">${traded.toFixed(2)}</p>
          </div>

          {/* TO WIN */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">TO WIN</p>
            <p className="text-sm font-bold text-gray-900">${toWin.toFixed(2)}</p>
          </div>

          {/* VALUE + P&L */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">VALUE</p>
            <p className="text-sm font-bold text-gray-900">${value.toFixed(2)}</p>
            <p className={`text-xs font-medium mt-0.5 ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {isProfitable ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({Math.abs(pnlPct).toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Processing indicator */}
        {isPendingVerification && (
          <p className="px-4 pb-2 text-xs text-amber-600 font-medium">
            Processing sale...
          </p>
        )}

        {/* Action buttons */}
        {isRedeemable ? (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => onRedeem(position)}
              disabled={isRedeeming || !canRedeem}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {isRedeeming ? 'Redeeming...' : `Redeem $${Math.round(toWin)}`}
            </button>
          </div>
        ) : !position.redeemable ? (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => onBuyMore(position)}
              disabled={isSubmitting || !canSell}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Buy more {nowCents}¢
            </button>
            <button
              onClick={() => onSell(position)}
              disabled={
                isSelling ||
                isPendingVerification ||
                isSubmitting ||
                !canSell
              }
              className="flex-1 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-semibold rounded-xl transition-colors"
            >
              {isSelling ? 'Selling...' : 'Cash out'}
            </button>
          </div>
        ) : null}
      </div>

      <PositionShareModal
        position={position}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}
