"use client";

import { formatPrice } from "@/lib/polymarket/formatting";
import { isValidDecimalInput } from "@/lib/polymarket/validation";

interface OrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  orderType: "market" | "limit";
  currentPrice: number;
  isSubmitting: boolean;
  tickSize: number;
  decimalPlaces: number;
  isLoadingTickSize: boolean;
}

export default function OrderForm({
  size,
  onSizeChange,
  limitPrice,
  onLimitPriceChange,
  orderType,
  currentPrice,
  isSubmitting,
  tickSize,
  decimalPlaces,
  isLoadingTickSize,
}: OrderFormProps) {
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onSizeChange(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidDecimalInput(value)) {
      onLimitPriceChange(value);
    }
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Size Input */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Size (shares)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={size}
          onChange={handleSizeChange}
          placeholder="0.00"
          disabled={isSubmitting}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Current Price Display (for market orders) */}
      {orderType === "market" && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-sm text-gray-400">Current Price</p>
          <p className="text-xl font-bold text-white">
            {currentPrice > 0 ? formatPrice(currentPrice) : "—"}
          </p>
        </div>
      )}

      {/* Limit Price Input (for limit orders) */}
      {orderType === "limit" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Limit Price ($)
            {isLoadingTickSize && (
              <span className="ml-2 text-xs text-gray-500">
                Loading tick size...
              </span>
            )}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={limitPrice}
            onChange={handleLimitPriceChange}
            placeholder={`0.${String(tickSize).split(".")[1] || "01"}`}
            disabled={isSubmitting}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tick size: ${tickSize.toFixed(decimalPlaces)} | Range: $
            {tickSize.toFixed(decimalPlaces)} - $
            {(1 - tickSize).toFixed(decimalPlaces)}
          </p>
        </div>
      )}
    </div>
  );
}
