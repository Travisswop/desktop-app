import React from 'react';

import { Card } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { TokenData } from '@/types/token';

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenCard({
  token,
  onClick,
}: TokenCardProps) {
  return (
    <Card
      className="p-4 rounded-3xl shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Image
            src={token.logoURI}
            alt={token.symbol}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <h3 className="font-medium">{token.name}</h3>
            <p className="text-sm text-muted-foreground">
              {token.symbol}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[60px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={token.marketData.sparkline}>
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
            $
            {token.marketData.price &&
              parseFloat(token.marketData.price).toFixed(4)}
          </p>
          <p className="text-sm text-muted-foreground">
            {parseFloat(token.balance).toFixed(4)}{' '}
            {token.symbol === 'USDC' ? 'USDC' : 'BTC'}
          </p>
        </div>
        <div
          className={`text-sm ${
            parseFloat(token.marketData.change) > 0
              ? 'text-green-500'
              : 'text-red-500'
          }`}
        >
          {parseFloat(token.marketData.change) > 0 ? '+' : ''}
          {parseFloat(token.marketData.change)}%
        </div>
      </div>
    </Card>
  );
}
