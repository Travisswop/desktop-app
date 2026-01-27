"use client";

interface YoullReceiveDisplayProps {
  amountToReceive: number;
  avgPrice: number;
  shares: number;
  hasInsufficientBalance: boolean;
}

export default function YoullReceiveDisplay({
  amountToReceive,
  avgPrice,
  shares,
  hasInsufficientBalance,
}: YoullReceiveDisplayProps) {
  const formatPriceCents = (price: number) => {
    const cents = Math.round(price * 100);
    return `${cents}¢`;
  };

  if (shares <= 0 || avgPrice <= 0) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-700">You&apos;ll receive</span>
            <span className="text-lg">💵</span>
          </div>
          <span className="text-3xl font-bold text-gray-400">$0.00</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter shares to see amount
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-700">You&apos;ll receive</span>
            <span className="text-lg">💵</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            Avg. Price {formatPriceCents(avgPrice)}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </p>
        </div>
        <span className="text-3xl font-bold text-green-500">
          ${amountToReceive.toFixed(2)}
        </span>
      </div>

      {/* Insufficient Balance Warning */}
      {hasInsufficientBalance && (
        <div className="flex items-center gap-2 mt-3 text-amber-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">Insufficient balance</span>
        </div>
      )}
    </div>
  );
}
