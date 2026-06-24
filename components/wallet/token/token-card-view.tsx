import React from "react";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TokenData } from "@/types/token";
import TokenImage from "./token-image";
import { BentoCard } from "@/components/ui/bento";

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenCardView({ token, onClick }: TokenCardProps) {
  const chartColor = token.marketData?.color || "#111827";

  return (
    <BentoCard
      padding="p-4"
      className="hover:border-black/[0.15] transition-all duration-300 group cursor-pointer hover:translate-x-0.5"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TokenImage
            token={token}
            width={120}
            height={120}
            className="rounded-full w-5 h-5"
          />
          <div>
            <h3 className="text-[13px] font-medium text-gray-900">{token.name}</h3>
            <p className="text-[12px] text-gray-500">{token.symbol}</p>
          </div>
        </div>
      </div>

      <div className="h-[60px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={token.sparklineData}>
            <defs>
              <linearGradient
                id={`gradient-${token.symbol}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={chartColor}
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor={chartColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              fill={`url(#gradient-${token.symbol})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900 font-mono">
            {token.marketData?.price ? (
              `$${parseFloat(token.marketData.price).toFixed(4)}`
            ) : (
              <span className="text-gray-500">Price unavailable</span>
            )}
          </p>
          <p className="text-[13px] text-gray-500 font-mono">
            {parseFloat(token.balance).toFixed(4)} {token.symbol}
          </p>
        </div>
        <div
          className={`text-[13px] font-mono ${
            token.marketData?.change && parseFloat(token.marketData.change) > 0
              ? "text-emerald-600"
              : "text-red-500"
          }`}
        >
          {token.marketData?.change ? (
            <>
              {parseFloat(token.marketData.change) > 0 ? "+" : ""}
              {parseFloat(token.marketData.change)}%
            </>
          ) : (
            <span className="text-gray-500">No data</span>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
