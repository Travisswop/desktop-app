'use client';

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

/** Formats 0.55 → ".55", 1.0 → "1.0" */
function compactPrice(price: number): string {
  if (price <= 0) return '';
  return price.toFixed(2).replace(/^0/, '');
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
    return <p className="text-gray-400 text-xs">No outcomes</p>;
  }

  // Binary markets: two stacked solid buttons on the right
  if (outcomes.length === 2) {
    return (
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {outcomes.map((outcome, index) => {
          const price = outcomePrices[index] || 0;
          const tokenId = tokenIds[index];
          const isYes =
            outcome.toLowerCase() === 'yes' ||
            (outcomes.length === 2 && index === 0);

          return (
            <button
              key={tokenId || index}
              onClick={() =>
                onOutcomeClick(marketQuestion, outcome, price, tokenId, negRisk)
              }
              disabled={isClosed || disabled || !tokenId}
              className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold whitespace-nowrap transition-all ${
                isClosed || disabled
                  ? 'bg-gray-300 cursor-not-allowed opacity-60'
                  : isYes
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {outcome}
              {price > 0 && (
                <span className="ml-1 opacity-90">({compactPrice(price)})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Multi-outcome markets: solid dark buttons in a column
  return (
    <div className="flex flex-col gap-1.5 flex-shrink-0 w-28">
      {outcomes.slice(0, 4).map((outcome, index) => {
        const price = outcomePrices[index] || 0;
        const tokenId = tokenIds[index];

        return (
          <button
            key={tokenId || index}
            onClick={() =>
              onOutcomeClick(marketQuestion, outcome, price, tokenId, negRisk)
            }
            disabled={isClosed || disabled || !tokenId}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1 ${
              isClosed || disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <span className="truncate">{outcome}</span>
            {price > 0 && (
              <span className="opacity-80 flex-shrink-0">
                {compactPrice(price)}
              </span>
            )}
          </button>
        );
      })}
      {outcomes.length > 4 && (
        <p className="text-xs text-gray-400 text-center">
          +{outcomes.length - 4} more
        </p>
      )}
    </div>
  );
}
