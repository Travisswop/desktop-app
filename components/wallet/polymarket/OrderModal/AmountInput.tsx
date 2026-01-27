"use client";

import { isValidDecimalInput } from "@/lib/polymarket/validation";

interface AmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  balance: number;
  onQuickAmount: (amount: number) => void;
  onMaxAmount: () => void;
  isSubmitting: boolean;
  orderType: "market" | "limit";
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  tickSize: number;
  isLoadingTickSize: boolean;
}

export default function AmountInput({
  amount,
  onAmountChange,
  balance,
  onQuickAmount,
  onMaxAmount,
  isSubmitting,
  orderType,
  limitPrice,
  onLimitPriceChange,
  tickSize,
  isLoadingTickSize,
}: AmountInputProps) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onAmountChange(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onLimitPriceChange(value);
    }
  };

  const quickAmounts = [1, 20, 100];

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

      {/* Amount Input */}
      <div className="bg-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm text-gray-600">Amount</span>
            <p className="text-xs text-gray-500">Balance ${balance.toFixed(2)} · Min $1</p>
          </div>
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-900">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              disabled={isSubmitting}
              className="w-24 bg-transparent text-3xl font-bold text-gray-900 text-right outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mt-3">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => onQuickAmount(quickAmount)}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              +${quickAmount}
            </button>
          ))}
          <button
            onClick={onMaxAmount}
            disabled={isSubmitting || balance <= 0}
            className="py-2 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
}
