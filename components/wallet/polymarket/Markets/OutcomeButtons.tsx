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

/** Formats 0.039 → "3.9%", 0.962 → "96.2%" */
function compactPrice(price: number): string {
  if (price <= 0) return '';
  return `${(price * 100).toFixed(1)}%`;
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

  // Binary markets: full-width rows with outcome name left, colored pill right
  if (outcomes.length === 2) {
    return (
      <div className="flex flex-col gap-1 w-full">
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
                onOutcomeClick(
                  marketQuestion,
                  outcome,
                  price,
                  tokenId,
                  negRisk,
                )
              }
              disabled={isClosed || disabled || !tokenId}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all backdrop-blur-sm border ${
                isClosed || disabled
                  ? 'bg-gray-50/50 border-gray-200/40 opacity-50 cursor-not-allowed'
                  : isYes
                    ? 'bg-green-50/60 border-green-100/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-green-50/80 cursor-pointer'
                    : 'bg-red-50/60 border-red-100/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-red-50/80 cursor-pointer'
              }`}
            >
              <span className="text-sm font-medium text-gray-800">
                {outcome}
              </span>
              {price > 0 && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    isClosed || disabled
                      ? 'bg-gray-100 text-gray-400'
                      : isYes
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-500'
                  }`}
                >
                  {compactPrice(price)}
                </span>
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
              onOutcomeClick(
                marketQuestion,
                outcome,
                price,
                tokenId,
                negRisk,
              )
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
