'use client';

import { type Market, type BetType } from '@/types/predictionMarkets';
import { formatVolume, getBetTypeBgColor } from '@/lib/predictionMarketUtils';

interface MarketOptionProps {
  market: Market;
  onBet?: (marketId: string, type: BetType) => void;
}

export function MarketOption({ market, onBet }: MarketOptionProps) {
  const handleBet = (type: BetType) => {
    if (onBet) {
      onBet(market.id, type);
    }
  };

  // Check if market is settled/finalized
  const isSettled = market.status === 'settled' || market.status === 'finalized';
  const isDisabled = market.status === 'closed' || isSettled;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
      {/* Question */}
      <div className="text-sm font-medium text-gray-900 mb-3">
        {market.question}
      </div>

      {/* Show result if settled */}
      {isSettled && market.result && (
        <div className="mb-3 text-center">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            market.result === 'yes'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            Result: {market.result.toUpperCase()}
          </span>
        </div>
      )}

      {/* YES/NO Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* YES Button */}
        <button
          onClick={() => handleBet('YES')}
          disabled={isDisabled}
          className={`${getBetTypeBgColor('YES')} border-2 rounded-lg p-3 transition-all ${
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-105 active:scale-95'
          } ${market.result === 'yes' ? 'ring-2 ring-green-500' : ''}`}
        >
          <div className="text-xs text-gray-600 mb-1 font-medium">
            YES{market.yesSubTitle && ` • ${market.yesSubTitle}`}
          </div>
          <div className="text-xl font-bold text-green-700">
            {market.yesPercent || (market.yesPrice ? `${(market.yesPrice * 100).toFixed(1)}` : '50.0')}%
          </div>
          {market.yesPrice !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              ${market.yesPrice.toFixed(2)}
            </div>
          )}
        </button>

        {/* NO Button */}
        <button
          onClick={() => handleBet('NO')}
          disabled={isDisabled}
          className={`${getBetTypeBgColor('NO')} border-2 rounded-lg p-3 transition-all ${
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-105 active:scale-95'
          } ${market.result === 'no' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="text-xs text-gray-600 mb-1 font-medium">
            NO{market.noSubTitle && ` • ${market.noSubTitle}`}
          </div>
          <div className="text-xl font-bold text-red-700">
            {market.noPercent || (market.noPrice ? `${(market.noPrice * 100).toFixed(1)}` : '50.0')}%
          </div>
          {market.noPrice !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              ${market.noPrice.toFixed(2)}
            </div>
          )}
        </button>
      </div>

      {/* Volume Info */}
      {market.volume24h && (
        <div className="text-xs text-gray-500 text-center">
          24h Vol: {formatVolume(market.volume24h)}
        </div>
      )}
    </div>
  );
}
