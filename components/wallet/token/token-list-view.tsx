import React from 'react';

import { Card } from '@/components/ui/card';
import { TokenData } from '@/types/token';
import TokenImage from './token-image';

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenListView({
  token,
  onClick,
}: TokenCardProps) {
  // const data = token.sparklineData;

  // const TokenSparkline = () => {
  //   if (!data || data.length === 0) {
  //     return <div className="text-gray-500">No data available</div>;
  //   }
  //   return (
  //     <ResponsiveContainer width="100%" height="100%">
  //       <AreaChart data={data}>
  //         <defs>
  //           <linearGradient
  //             id={`gradient-${token.symbol}`}
  //             x1="0"
  //             y1="0"
  //             x2="0"
  //             y2="1"
  //           >
  //             <stop
  //               offset="0%"
  //               stopColor={token.marketData.color}
  //               stopOpacity={0.2}
  //             />
  //             <stop
  //               offset="100%"
  //               stopColor={token.marketData.color}
  //               stopOpacity={0}
  //             />
  //           </linearGradient>
  //         </defs>
  //         <Area
  //           type="basis"
  //           dataKey="value"
  //           stroke={token.marketData.color}
  //           strokeWidth={2}
  //           fill={`url(#gradient-${token.symbol})`}
  //           dot={false}
  //           isAnimationActive={false}
  //         />
  //       </AreaChart>
  //     </ResponsiveContainer>
  //   );
  // };

  return (
    <Card
      className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-xl shadow-xl hover:shadow-3xl border-none transition-all duration-300 group cursor-pointer hover:translate-x-0.5 relative gap-4"
      onClick={onClick}
    >
      <div
        className={`absolute top-1 left-1 p-1 text-xs ${
          parseFloat(token.marketData.change) >= 0
            ? ' text-green-700'
            : ' text-red-700'
        }`}
      >
        {token.marketData.change ? (
          <>
            {parseFloat(token.marketData.change) >= 0 ? '+' : ''}
            {parseFloat(token.marketData.change)}%
          </>
        ) : (
          <div className="text-gray-500">No data available</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="mt-2">
          <TokenImage token={token} />
        </div>
        <div>
          <h3 className="font-medium">{token.name}</h3>
          <p className="text-sm text-gray-500">{token.symbol}</p>
        </div>
      </div>
      {/* <div className="h-[60px] w-full">
        <TokenSparkline />
      </div> */}
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
