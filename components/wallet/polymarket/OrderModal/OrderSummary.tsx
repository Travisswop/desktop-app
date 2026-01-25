"use client";

import { formatCurrency } from "@/lib/polymarket/formatting";

interface OrderSummaryProps {
  size: number;
  price: number;
}

export default function OrderSummary({ size, price }: OrderSummaryProps) {
  const estimatedCost = size * price;

  if (size <= 0 || price <= 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">Estimated Cost</span>
        <span className="text-white font-bold">
          {formatCurrency(estimatedCost)}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm mt-1">
        <span className="text-gray-400">Potential Payout</span>
        <span className="text-green-400 font-bold">
          {formatCurrency(size)}
        </span>
      </div>
    </div>
  );
}
