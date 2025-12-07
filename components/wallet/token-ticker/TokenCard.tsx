'use client';

import { MarketData } from '@/types/token';
import Image from 'next/image';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TokenCardProps {
  token: MarketData;
}

export default function TokenCard({ token }: TokenCardProps) {
  const isPositive = token.priceChangePercentage24h >= 0;

  return (
    <div className="min-w-[420px] bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-shrink-0 relative">
      <div className="flex items-stretch gap-6">
        {/* Left Section */}
        <div className="flex flex-col justify-between flex-1">
          {/* Token Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={token.image}
                alt={token.name}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {token.name}
              </p>
              <p className="text-sm text-gray-500">{token.symbol}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-3">
            <p className="text-3xl text-gray-900">
              $
              {token?.currentPrice?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits:
                  token?.currentPrice < 1 ? 6 : 2,
              })}
            </p>
          </div>

          {/* Change Badge */}
          <div>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold ${
                isPositive
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {isPositive ? '+ ' : ''}
              {Math.abs(token?.priceChangePercentage24h).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Right Section - Sparkline */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Arrow Indicator */}
          <div className="absolute top-0 right-0">
            {isPositive ? (
              <ChevronUp
                className="w-6 h-6 text-green-500"
                strokeWidth={3}
              />
            ) : (
              <ChevronDown
                className="w-6 h-6 text-red-500"
                strokeWidth={3}
              />
            )}
          </div>

          {/* Chart */}
          <div className="w-full h-32 mt-4">
            {token?.sparklineData &&
            token?.sparklineData.length > 0 ? (
              <svg
                width="200"
                height="128"
                className="overflow-visible"
              >
                <defs>
                  <linearGradient
                    id={`gradient-${token?.symbol}`}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style={{
                        stopColor: isPositive ? '#10b981' : '#ef4444',
                        stopOpacity: 0.3,
                      }}
                    />
                    <stop
                      offset="100%"
                      style={{
                        stopColor: isPositive ? '#10b981' : '#ef4444',
                        stopOpacity: 0,
                      }}
                    />
                  </linearGradient>
                </defs>
                <Sparklines
                  data={token?.sparklineData}
                  height={128}
                  width={200}
                >
                  <SparklinesLine
                    color={isPositive ? '#10b981' : '#ef4444'}
                    style={{
                      fill: `url(#gradient-${token?.symbol})`,
                      strokeWidth: 2.5,
                    }}
                  />
                </Sparklines>
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No chart data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
