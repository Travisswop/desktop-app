"use client";

import type { PolymarketPosition } from "@/hooks/polymarket";
import Card from "../shared/Card";
import Badge from "../shared/Badge";
import { formatCurrency, formatPercentage } from "@/lib/polymarket/formatting";

interface PositionCardProps {
  position: PolymarketPosition;
  onRedeem: (position: PolymarketPosition) => void;
  onSell: (position: PolymarketPosition) => void;
  isSelling: boolean;
  isRedeeming: boolean;
  isPendingVerification: boolean;
  isSubmitting: boolean;
  canSell: boolean;
  canRedeem: boolean;
}

export default function PositionCard({
  position,
  onRedeem,
  onSell,
  isSelling,
  isRedeeming,
  isPendingVerification,
  isSubmitting,
  canSell,
  canRedeem,
}: PositionCardProps) {
  const isProfitable = position.cashPnl >= 0;
  const isRedeemable = position.redeemable;

  return (
    <Card hover className="p-4">
      <div className="flex items-start gap-3">
        {/* Position Icon */}
        {position.icon && (
          <img
            src={position.icon}
            alt=""
            className="w-12 h-12 rounded flex-shrink-0 object-cover"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title and Outcome */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-white line-clamp-1">
                {position.title}
              </h4>
              <p className="text-sm text-blue-400">{position.outcome}</p>
            </div>
            {isRedeemable && <Badge variant="success">Redeemable</Badge>}
            {isPendingVerification && (
              <Badge variant="warning">Processing...</Badge>
            )}
          </div>

          {/* Position Stats */}
          <div className="grid grid-cols-4 gap-2 text-sm mb-3">
            <div>
              <p className="text-gray-400 text-xs">Size</p>
              <p className="text-white font-medium">
                {position.size.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Avg Price</p>
              <p className="text-white font-medium">
                {Math.round(position.avgPrice * 100)}¢
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Current</p>
              <p className="text-white font-medium">
                {Math.round(position.curPrice * 100)}¢
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Value</p>
              <p className="text-white font-medium">
                {formatCurrency(position.currentValue)}
              </p>
            </div>
          </div>

          {/* PnL */}
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-gray-400 text-xs">P&L</p>
              <p
                className={`font-bold ${isProfitable ? "text-green-400" : "text-red-400"}`}
              >
                {isProfitable ? "+" : ""}
                {formatCurrency(position.cashPnl)} (
                {formatPercentage(position.percentPnl)})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isRedeemable ? (
              <button
                onClick={() => onRedeem(position)}
                disabled={isRedeeming || !canRedeem}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isRedeeming ? "Redeeming..." : "Redeem"}
              </button>
            ) : (
              <button
                onClick={() => onSell(position)}
                disabled={
                  isSelling || isPendingVerification || isSubmitting || !canSell
                }
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSelling
                  ? "Selling..."
                  : isPendingVerification
                    ? "Processing..."
                    : "Sell"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
