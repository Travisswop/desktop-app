"use client";

import { isValidDecimalInput } from "@/lib/polymarket/validation";

interface SharesInputProps {
  shares: string;
  onSharesChange: (value: string) => void;
  shareBalance: number;
  onQuickPercentage: (percentage: number) => void;
  onMaxShares: () => void;
  isSubmitting: boolean;
  orderType: "market" | "limit";
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  tickSize: number;
  isLoadingTickSize: boolean;
}

export default function SharesInput({
  shares,
  onSharesChange,
  shareBalance,
  onQuickPercentage,
  onMaxShares,
  isSubmitting,
  orderType,
  limitPrice,
  onLimitPriceChange,
  tickSize,
  isLoadingTickSize,
}: SharesInputProps) {
  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onSharesChange(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onLimitPriceChange(value);
    }
  };

  const quickPercentages = [25, 50];

  return (
    <div className="space-y-4 mb-5">
      {/* Limit Price Input (only for limit orders) */}
      {orderType === "limit" && (
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Limit Price
              {isLoadingTickSize && (
                <span className="ml-2 text-xs text-gray-400">Loading...</span>
              )}
            </span>
            <span className="text-xs text-gray-500">
              Tick: {(tickSize * 100).toFixed(0)}¢
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={limitPrice}
              onChange={handleLimitPriceChange}
              placeholder="0.00"
              disabled={isSubmitting}
              className="w-full bg-transparent text-2xl font-bold text-gray-900 text-right outline-none placeholder-gray-400"
            />
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
          </div>
        </div>
      )}

      {/* Shares Input */}
      <div className="bg-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm text-gray-600">Shares</span>
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={shares}
              onChange={handleSharesChange}
              placeholder="0"
              disabled={isSubmitting}
              className="w-28 bg-transparent text-3xl font-bold text-gray-900 text-right outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Quick Percentage Buttons */}
        <div className="flex gap-2 mt-3">
          {quickPercentages.map((percentage) => (
            <button
              key={percentage}
              onClick={() => onQuickPercentage(percentage)}
              disabled={isSubmitting || shareBalance <= 0}
              className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              {percentage}%
            </button>
          ))}
          <button
            onClick={onMaxShares}
            disabled={isSubmitting || shareBalance <= 0}
            className="flex-1 py-2 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
}
