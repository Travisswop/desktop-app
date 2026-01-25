'use client';

import { formatPrice } from '@/lib/polymarket/formatting';

interface OutcomeButtonsProps {
  outcomes: string[];
  outcomePrices: number[];
  tokenIds: string[];
  isClosed: boolean;
  negRisk: boolean;
  marketQuestion: string;
  disabled?: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
  ) => void;
}

export default function OutcomeButtons({
  outcomes,
  outcomePrices,
  tokenIds,
  isClosed,
  negRisk,
  marketQuestion,
  disabled = false,
  onOutcomeClick,
}: OutcomeButtonsProps) {
  if (outcomes.length === 0) {
    return (
      <p className="text-gray-500 text-sm">No outcomes available</p>
    );
  }

  // For binary markets, show Yes/No side by side
  if (outcomes.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {outcomes.map((outcome, index) => {
          const price = outcomePrices[index] || 0;
          const tokenId = tokenIds[index];
          const isYes = outcome.toLowerCase() === 'yes';

          return (
            <button
              key={tokenId || index}
              onClick={() =>
                onOutcomeClick(
                  marketQuestion,
                  outcome,
                  price,
                  tokenId,
                  negRisk,
                )
              }
              disabled={isClosed || disabled || !tokenId}
              className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                isClosed || disabled
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : isYes
                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              }`}
            >
              <span className="block text-xs mb-0.5">{outcome}</span>
              <span className="block font-bold">
                {price > 0 ? formatPrice(price) : '—'}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // For multi-outcome markets, show in a column
  return (
    <div className="space-y-2">
      {outcomes.map((outcome, index) => {
        const price = outcomePrices[index] || 0;
        const tokenId = tokenIds[index];

        return (
          <button
            key={tokenId || index}
            onClick={() =>
              onOutcomeClick(
                marketQuestion,
                outcome,
                price,
                tokenId,
                negRisk,
              )
            }
            disabled={isClosed || disabled || !tokenId}
            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-between ${
              isClosed || disabled
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
            }`}
          >
            <span className="truncate">{outcome}</span>
            <span className="font-bold ml-2">
              {price > 0 ? formatPrice(price) : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
