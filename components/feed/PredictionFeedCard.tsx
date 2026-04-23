"use client";

import React from "react";

interface PredictionContent {
  marketTitle: string;
  outcome: string;
  side: "BUY" | "SELL";
  cost: number;
  potentialWin?: number;
  price: number; // decimal 0–1
  orderId?: string;
  orderType?: string;
  marketId?: string;
}

interface PredictionFeedCardProps {
  content: PredictionContent;
  userName?: string;
}

function toAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return "—";
  if (price >= 0.5) {
    return `-${Math.round(price / (1 - price) * 100)}`;
  }
  return `+${Math.round((1 - price) / price * 100)}`;
}

export default function PredictionFeedCard({
  content,
  userName,
}: PredictionFeedCardProps) {
  const {
    marketTitle,
    outcome,
    side,
    cost,
    potentialWin,
    price,
    orderType,
  } = content;

  const odds = toAmericanOdds(price);
  const displayName = userName || "Someone";

  const isBuy = side === "BUY";
  const oddsColor = price >= 0.5 ? "text-red-500" : "text-green-500";

  return (
    <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
      {/* Market title bar */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <p className="text-gray-700 font-medium line-clamp-1 flex-1 pr-2 text-xs">
          {marketTitle}
        </p>
        {orderType && (
          <span className="text-xs text-gray-400 uppercase font-medium shrink-0">
            {orderType}
          </span>
        )}
      </div>

      {/* Outcome + odds */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">
            {displayName}{" "}
            <span className="font-semibold text-gray-800">
              {isBuy ? "picked" : "sold"}
            </span>
          </p>
          <p className="font-bold text-gray-900 text-base">{outcome}</p>
        </div>
        <div className="text-right">
          <p className={`font-bold text-lg ${oddsColor}`}>{odds}</p>
          <p className="text-gray-400 text-xs">{Math.round(price * 100)}¢</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-3 py-2">
          <p className="text-gray-400 text-xs mb-0.5">Cost</p>
          <p className="font-semibold text-gray-800">
            ${cost.toFixed(2)}
          </p>
        </div>
        {isBuy && potentialWin !== undefined && (
          <div className="px-3 py-2">
            <p className="text-gray-400 text-xs mb-0.5">To win</p>
            <p className="font-semibold text-green-600">
              ${potentialWin.toFixed(2)}
            </p>
          </div>
        )}
        {!isBuy && (
          <div className="px-3 py-2">
            <p className="text-gray-400 text-xs mb-0.5">Receive</p>
            <p className="font-semibold text-blue-600">
              ${cost.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
