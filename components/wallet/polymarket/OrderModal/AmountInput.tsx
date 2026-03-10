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
  minOrderAmount?: number;
  /** Limit price as 0-1 decimal — used to compute max shares in limit mode */
  limitPriceDecimal?: number;
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
  minOrderAmount = 1,
  limitPriceDecimal = 0,
}: AmountInputProps) {
  const isLimitMode = orderType === "limit";
  const maxShares =
    isLimitMode && limitPriceDecimal > 0
      ? Math.floor(balance / limitPriceDecimal)
      : 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onAmountChange(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value) && (value === "" || parseFloat(value) <= 99)) {
      onLimitPriceChange(value);
    }
  };

  // 3 quick amounts + Max button = 4 buttons total — fits comfortably in the modal
  const quickMarketAmounts = [5, 10, 20];
  const quickShareAmounts = [1, 5, 10];

  return (
    <div className="space-y-4 mb-5">
      {/* Limit Price Input */}
      {isLimitMode && (
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
              placeholder="50"
              disabled={isSubmitting}
              className="w-full bg-transparent text-2xl font-bold text-gray-900 text-left outline-none placeholder-gray-400 pr-8"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
              ¢
            </span>
          </div>
        </div>
      )}

      {/* Shares input — limit mode */}
      {isLimitMode ? (
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm text-gray-600">Shares</span>
              <p className="text-xs text-gray-500">
                Balance ${balance.toFixed(2)} · Max ~{maxShares} shares
              </p>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              disabled={isSubmitting}
              className="w-20 bg-transparent text-3xl font-bold text-gray-900 text-right outline-none placeholder-gray-400"
            />
          </div>

          {/* Slider scaled to max shares */}
          <div className="mt-3 px-0.5">
            <input
              type="range"
              min={0}
              max={maxShares > 0 ? maxShares : 100}
              step={1}
              value={Math.min(parseFloat(amount) || 0, maxShares > 0 ? maxShares : 100)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onAmountChange(val === 0 ? "" : String(val));
              }}
              disabled={isSubmitting}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-300 accent-gray-900 disabled:cursor-not-allowed"
            />
          </div>

          {/* Quick share buttons */}
          <div className="flex gap-2 mt-2">
            {quickShareAmounts.map((qty) => (
              <button
                key={qty}
                onClick={() => onQuickAmount(qty)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
              >
                +{qty}
              </button>
            ))}
            <button
              onClick={onMaxAmount}
              disabled={isSubmitting || maxShares <= 0}
              className="flex-1 py-2 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              Max
            </button>
          </div>
        </div>
      ) : (
        /* Dollar amount input — market mode */
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm text-gray-600">Amount</span>
              <p className="text-xs text-gray-500">
                Balance ${balance.toFixed(2)} · Min ${minOrderAmount.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="text-3xl font-bold text-gray-900">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                disabled={isSubmitting}
                className="min-w-0 w-full max-w-[100px] bg-transparent text-3xl font-bold text-gray-900 text-left outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Balance Slider */}
          <div className="mt-3 px-0.5">
            <input
              type="range"
              min={0}
              max={balance > 0 ? balance : 100}
              step={0.01}
              value={Math.min(parseFloat(amount) || 0, balance > 0 ? balance : 100)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onAmountChange(val === 0 ? "" : val.toFixed(2));
              }}
              disabled={isSubmitting}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-300 accent-gray-900 disabled:cursor-not-allowed"
            />
          </div>

          {/* Quick dollar buttons */}
          <div className="flex gap-2 mt-2">
            {quickMarketAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => onQuickAmount(quickAmount)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
              >
                +${quickAmount}
              </button>
            ))}
            <button
              onClick={onMaxAmount}
              disabled={isSubmitting || balance <= 0}
              className="flex-1 py-2 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              Max
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
