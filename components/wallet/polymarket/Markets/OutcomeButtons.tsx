'use client';

import { formatPrice } from '@/lib/polymarket/formatting';

interface OutcomeButtonsProps {
  outcomes: string[];
  outcomePrices: number[];
  isClosed: boolean;
  marketQuestion: string;
  marketId: `0x${string}`;
  poolAddress: `0x${string}` | undefined;
  disabled?: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    marketId: `0x${string}`,
    poolAddress: `0x${string}` | undefined,
  ) => void;
}

export default function OutcomeButtons({
  outcomes,
  outcomePrices,
  isClosed,
  marketQuestion,
  marketId,
  poolAddress,
  disabled = false,
  onOutcomeClick,
}: OutcomeButtonsProps) {
  if (outcomes.length === 0) {
    return <p className="text-gray-500 text-sm">No outcomes available</p>;
  }

  // Binary market — YES / NO side by side
  if (outcomes.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {outcomes.map((outcome, index) => {
          const price = outcomePrices[index] || 0;
          const isYes = outcome.toLowerCase() === 'yes';

          return (
            <button
              key={index}
              onClick={() => onOutcomeClick(marketQuestion, outcome, price, marketId, poolAddress)}
              disabled={isClosed || disabled}
              className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                isClosed || disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : isYes
                    ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              <span className="block text-xs mb-0.5">{outcome}</span>
              <span className="block font-bold">{price > 0 ? formatPrice(price) : '—'}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Multi-outcome market
  return (
    <div className="space-y-2">
      {outcomes.map((outcome, index) => {
        const price = outcomePrices[index] || 0;

        return (
          <button
            key={index}
            onClick={() => onOutcomeClick(marketQuestion, outcome, price, marketId, poolAddress)}
            disabled={isClosed || disabled}
            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-between ${
              isClosed || disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200'
            }`}
          >
            <span className="truncate">{outcome}</span>
            <span className="font-bold ml-2">{price > 0 ? formatPrice(price) : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}
