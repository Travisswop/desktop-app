'use client';

import { Share2 } from 'lucide-react';
import type { PolymarketPosition } from '@/hooks/polymarket';

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
}: PositionCardProps) {
  const isRedeemable = position.redeemable;
  const costCents = Math.round(position.avgPrice * 100);
  const currentCents = Math.round(position.curPrice * 100);
  const toWin = position.size; // shares × $1 max payout
  const cost = position.initialValue || position.avgPrice * position.size;
  const currentValue = position.currentValue;
  const pnl = position.cashPnl;
  const isProfitable = pnl >= 0;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: position.title, url: `https://polymarket.com/event/${position.eventSlug}` });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-sm text-gray-700">
          You picked{' '}
          <span className="font-semibold text-green-600">{position.outcome}</span>
        </p>
        <button
          onClick={handleShare}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="border-t border-gray-100 mx-4" />

      {/* Stats */}
      <div className="grid grid-cols-3 px-4 pt-3 pb-1">
        <div>
          <p className="text-xs text-gray-500">Cost {costCents}¢</p>
          <p className="text-lg font-bold text-gray-900">
            ${Math.round(cost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Current {currentCents}¢</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-green-500">
              ${Math.round(currentValue)}
            </p>
            {pnl !== 0 && (
              <span className={`text-xs font-semibold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                {isProfitable ? '+' : ''}${Math.round(Math.abs(pnl))}
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">To win</p>
          <p className="text-lg font-bold text-gray-900">
            ${Math.round(toWin)}
          </p>
        </div>
      </div>

      {/* Pending / Redeeming state */}
      {isPendingVerification && (
        <p className="px-4 pb-1 text-xs text-amber-600 font-medium">Processing sale...</p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        {isRedeemable ? (
          <button
            onClick={() => onRedeem(position)}
            disabled={isRedeeming || !canRedeem}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isRedeeming ? 'Redeeming...' : 'Redeem $' + Math.round(toWin)}
          </button>
        ) : (
          <>
            <button
              onClick={() => onBuyMore(position)}
              disabled={isSubmitting || !canSell}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Buy more {currentCents}%
            </button>
            <button
              onClick={() => onSell(position)}
              disabled={isSelling || isPendingVerification || isSubmitting || !canSell}
              className="flex-1 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-semibold rounded-xl transition-colors"
            >
              {isSelling ? 'Selling...' : 'Cash out'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
