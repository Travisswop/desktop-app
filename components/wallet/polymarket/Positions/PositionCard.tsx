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

  // Show the event title for binary Yes/No outcomes.
  // For O/U and spread outcomes, enrich the label with the threshold or spread line.
  const isBinaryOutcome =
    position.outcome === 'Yes' || position.outcome === 'No';
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
        {/* Header: "[N] shares · [title/outcome]" */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <p className="text-sm text-gray-700 leading-snug flex-1 pr-2">
            <span className="font-bold text-gray-900">{position.size} shares</span>{' '}
            <button
              onClick={onTitleClick}
              disabled={!onTitleClick}
              className="font-bold text-[#3B82F6] line-clamp-2 text-left hover:underline disabled:no-underline disabled:cursor-default transition-all"
            >
              {displayPick}
            </button>
          </p>
          <button
            onClick={() => setShareOpen(true)}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            title="Share"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-gray-700"
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

        {/* Stats grid: 3 cols × 2 rows */}
        <div className="grid grid-cols-3 gap-x-0 gap-y-3 px-4 pt-3 pb-4">
          {/* AVG */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">AVG</p>
            <p className="text-base font-bold text-gray-900">{avgCents}¢</p>
          </div>

          {/* NOW */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">NOW</p>
            <p className="text-base font-bold text-gray-900">{nowCents}¢</p>
          </div>

          {/* TRADED */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">TRADED</p>
            <p className="text-base font-bold text-gray-900">${traded.toFixed(2)}</p>
          </div>

          {/* TO WIN */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">TO WIN</p>
            <p className="text-base font-bold text-gray-900">${toWin.toFixed(2)}</p>
          </div>

          {/* VALUE */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">VALUE</p>
            <p className="text-base font-bold text-gray-900">${value.toFixed(2)}</p>
          </div>

          {/* P&L */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">P&amp;L</p>
            <p className={`text-base font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {isProfitable ? '+' : ''}{pnl.toFixed(2)}
            </p>
            <p className={`text-xs font-medium ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {isProfitable ? '+' : ''}{pnlPct.toFixed(1)}%
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
