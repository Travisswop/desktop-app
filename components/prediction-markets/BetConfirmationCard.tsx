'use client';

import { type BetConfirmationResponse } from '@/types/predictionMarkets';
import { getBetTypeColor, formatDate } from '@/lib/predictionMarketUtils';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface BetConfirmationCardProps {
  data: BetConfirmationResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BetConfirmationCard({
  data,
  onConfirm,
  onCancel,
  isLoading = false,
}: BetConfirmationCardProps) {
  const { market, bet, outcomes, riskWarning } = data;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🎲</span>
          Confirm Your Bet
        </h3>
      </div>

      {/* Market Question */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 mb-1 font-medium">Market</div>
        <div className="font-medium text-gray-900">{market.question}</div>
        {market.endDate && (
          <div className="text-xs text-gray-500 mt-2">
            Ends: {formatDate(market.endDate)}
          </div>
        )}
      </div>

      {/* Bet Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Position</span>
          <div className="text-right">
            <span className={`font-bold text-lg ${getBetTypeColor(bet.type)}`}>
              {bet.type}
            </span>
            {/* Show subtitle if available */}
            {bet.type === 'YES' && market.yesSubTitle && (
              <div className="text-xs text-gray-500 mt-1">{market.yesSubTitle}</div>
            )}
            {bet.type === 'NO' && market.noSubTitle && (
              <div className="text-xs text-gray-500 mt-1">{market.noSubTitle}</div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="font-bold text-gray-900">
            {bet.amount} {bet.currency}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Price</span>
          <span className="font-semibold text-gray-900">
            ${bet.currentPrice?.toFixed(4) || 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Est. Shares</span>
          <span className="font-bold text-gray-900">
            {bet.estimatedTokensFormatted} {bet.type}
          </span>
        </div>
      </div>

      {/* Potential Outcomes */}
      {outcomes && (
        <div className="border-t border-gray-200 pt-4 mb-4 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-2">
            POTENTIAL OUTCOMES
          </div>

          <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">If you win</span>
            </div>
            <span className="text-green-600 font-bold">
              +${outcomes.maxWin}
            </span>
          </div>

          <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-700">If you lose</span>
            </div>
            <span className="text-red-600 font-bold">
              -{outcomes.maxLoss} {bet.currency}
            </span>
          </div>
        </div>
      )}

      {/* Risk Warning */}
      {riskWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">{riskWarning}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Bet'
          )}
        </button>
      </div>
    </div>
  );
}
