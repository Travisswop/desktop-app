"use client";

import type { PolymarketOrder } from "@/hooks/polymarket";
import Card from "../shared/Card";
import Badge from "../shared/Badge";

interface OrderCardProps {
  order: PolymarketOrder;
  onCancel: (orderId: string) => void;
  isCancelling: boolean;
}

export default function OrderCard({
  order,
  onCancel,
  isCancelling,
}: OrderCardProps) {
  const isBuy = order.side === "BUY";
  const price = parseFloat(order.price);
  const size = parseFloat(order.original_size);
  const matched = parseFloat(order.size_matched);
  const remaining = size - matched;
  const fillPercent = size > 0 ? (matched / size) * 100 : 0;

  return (
    <Card hover className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isBuy ? "success" : "error"}>
              {isBuy ? "BUY" : "SELL"}
            </Badge>
            <span className="text-sm text-gray-400">{order.outcome}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <p className="text-gray-400 text-xs">Price</p>
              <p className="text-white font-medium">
                {Math.round(price * 100)}¢
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Size</p>
              <p className="text-white font-medium">{size.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Remaining</p>
              <p className="text-white font-medium">{remaining.toFixed(2)}</p>
            </div>
          </div>

          {/* Fill Progress */}
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{fillPercent.toFixed(1)}% filled</p>
        </div>

        <button
          onClick={() => onCancel(order.id)}
          disabled={isCancelling}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-700 text-red-400 disabled:text-gray-500 text-sm font-medium rounded transition-colors"
        >
          {isCancelling ? "..." : "Cancel"}
        </button>
      </div>
    </Card>
  );
}
