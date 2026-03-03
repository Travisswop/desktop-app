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
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : isYes
                    ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
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
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200'
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
