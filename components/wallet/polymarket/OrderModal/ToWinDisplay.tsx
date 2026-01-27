"use client";

interface ToWinDisplayProps {
  potentialWin: number;
  avgPrice: number;
  amount: number;
}

export default function ToWinDisplay({
  potentialWin,
  avgPrice,
  amount,
}: ToWinDisplayProps) {
  if (amount <= 0 || avgPrice <= 0) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-700">To win</span>
            <span className="text-lg">💵</span>
          </div>
          <span className="text-3xl font-bold text-gray-400">$0.00</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter amount to see potential winnings
        </p>
      </div>
    );
  }

  const formatPriceCents = (price: number) => {
    const cents = Math.round(price * 100);
    return `${cents}¢`;
  };

  return (
    <div className="bg-gray-100 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-700">To win</span>
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
          ${potentialWin.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
