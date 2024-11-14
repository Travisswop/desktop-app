import React from 'react';

import { Card } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { TokenData } from '@/types/token';

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenListView({
  token,
  onClick,
}: TokenCardProps) {
  const data = token.marketData.sparkline;

  const TokenSparkline = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart width={300} height={100} data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={token.marketData.color}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <Card
      className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-xl shadow-xl hover:shadow-3xl border-none transition-all duration-300 group cursor-pointer hover:translate-x-0.5 relative"
      onClick={onClick}
    >
      <div
        className={`absolute top-1 left-1 p-1 text-xs ${
          parseFloat(token.marketData.change) >= 0
            ? ' text-green-700'
            : ' text-red-700'
        }`}
      >
        {parseFloat(token.marketData.change) >= 0 ? '+' : ''}
        {parseFloat(token.marketData.change)}%
      </div>
      <div className="flex items-center gap-3">
        <div className="mt-2">
          <Image
            src={token.logoURI}
            alt={token.symbol}
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        <div>
          <h3 className="font-medium">{token.name}</h3>
          <p className="text-sm text-gray-500">{token.symbol}</p>
        </div>
      </div>
      <div className="h-[50px]">
        <TokenSparkline />
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold">
            ${parseFloat(token.marketData.price).toFixed(4)}
          </p>
          <p className="text-sm text-gray-600">
            {parseFloat(token.balance).toFixed(4)} {token.symbol}
          </p>
        </div>
      </div>
    </Card>
  );
}
