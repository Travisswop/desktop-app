import React from "react";

import { Card } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TokenData } from "@/types/token";
import TokenImage from "./token-image";

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenCardView({ token, onClick }: TokenCardProps) {
  return (
    <Card
      className="p-4 rounded-3xl shadow-2xl hover:shadow-3xl border-none transition-all duration-300 group cursor-pointer hover:translate-x-0.5"
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
            <h3 className="font-medium">{token.name}</h3>
            <p className="text-sm text-muted-foreground">{token.symbol}</p>
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
                  stopColor={token.marketData.color}
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor={token.marketData.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={token.marketData.color}
              fill={`url(#gradient-${token.symbol})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-semibold">
            {token.marketData?.price ? (
              `$${parseFloat(token.marketData.price).toFixed(4)}`
            ) : (
              <span className="text-gray-500">Price unavailable</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {parseFloat(token.balance).toFixed(4)} {token.symbol}
          </p>
        </div>
        <div
          className={`text-sm ${
            token.marketData?.change && parseFloat(token.marketData.change) > 0
              ? "text-green-500"
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
    </Card>
  );
}
