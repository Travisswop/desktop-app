'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { PolymarketPosition } from '@/hooks/polymarket';
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

  const isRedeemable = position.redeemable && position.curPrice > 0;

  // Show the event title for binary Yes/No outcomes; show outcome name for others (e.g. team abbreviations)
  const isBinaryOutcome =
    position.outcome === 'Yes' || position.outcome === 'No';
  const displayPick = isBinaryOutcome ? position.title : position.outcome;

  const costCents = Math.round(position.avgPrice * 100);
  const currentCents = Math.round(position.curPrice * 100);
  const toWin = position.size * position.curPrice;
  const cost = position.initialValue || position.avgPrice * position.size;
  const currentValue = position.currentValue;
  const pnl = position.cashPnl;
  const isProfitable = pnl >= 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header: "You picked [title/outcome]" */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <p className="text-sm text-gray-700 leading-snug flex-1 pr-2">
            You picked{' '}
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 px-4 pt-3 pb-4">
          {/* Cost */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Cost {costCents}$</p>
            <p className="text-xl font-bold text-gray-900">
              ${Math.round(cost)}
            </p>
          </div>

          {/* Current */}
          <div>
            <p className="text-xs text-gray-400 mb-1">
              Current {currentCents}$
            </p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <p className="text-xl font-bold text-green-500">
                ${Math.round(currentValue)}
              </p>
              {pnl !== 0 && (
                <span
                  className={`text-xs font-semibold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}
                >
                  {isProfitable ? '+' : '-'}$
                  {Math.round(Math.abs(pnl))}
                </span>
              )}
            </div>
          </div>

          {/* To win */}
          <div>
            <p className="text-xs text-gray-400 mb-1">To win</p>
            <p className="text-xl font-bold text-gray-900">
              ${Math.round(toWin)}
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
              Buy more {currentCents}%
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
