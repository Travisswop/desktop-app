'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TokenData } from '@/types/token';
import { useMemo, useState } from 'react';

interface PortfolioBalanceProps {
  tokens: TokenData[];
}

export default function PortfolioBalance({
  tokens,
}: PortfolioBalanceProps) {
  const [eyeOpen, setEyeOpen] = useState(false);
  const portfolioData = useMemo(() => {
    if (!tokens.length)
      return {
        totalBalance: 0,
        percentageChange: 0,
        tokenShares: [],
      };

    // Calculate total portfolio value and 24h change
    const portfolioValue = tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) *
        parseFloat(token.marketData.price);
      return total + value;
    }, 0);

    // Calculate weighted average change
    const weightedChange = tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) *
        parseFloat(token.marketData.price);
      const weight = value / portfolioValue;
      return total + parseFloat(token.marketData.change) * weight;
    }, 0);

    // Calculate token shares
    const tokenShares = tokens
      .map((token) => {
        const value =
          parseFloat(token.balance) *
          parseFloat(token.marketData.price);
        const percentage = (value / portfolioValue) * 100;
        return {
          symbol: token.symbol,
          percentage: percentage,
          color: token.marketData.color || '#808080', // Default color if not found
        };
      })
      // Filter out tokens with less than 1% share and sort by percentage
      .filter((token) => token.percentage >= 1)
      .sort((a, b) => b.percentage - a.percentage);

    return {
      totalBalance: portfolioValue,
      percentageChange: weightedChange,
      tokenShares,
    };
  }, [tokens]);

  // Calculate the stroke dash array and offset for each segment
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center gap-6 mb-10">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {portfolioData.tokenShares.map((token) => {
            const strokeDasharray =
              (token.percentage / 100) * circumference;
            const segment = (
              <circle
                key={token.symbol}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={token.color}
                strokeWidth="24"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 100 100)"
                className="transition-all duration-500"
              />
            );
            currentOffset += strokeDasharray;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {eyeOpen ? (
            <Eye
              className="h-6 w-6 mb-1"
              onClick={() => setEyeOpen(!eyeOpen)}
            />
          ) : (
            <EyeOff
              className="h-6 w-6 mb-1"
              onClick={() => setEyeOpen(!eyeOpen)}
            />
          )}

          <div className="text-sm font-medium">My Balance</div>
          <div className="text-2xl font-bold">
            {!eyeOpen ? (
              <span className=" text-2xl">****</span>
            ) : (
              <span>
                ${' '}
                {portfolioData.totalBalance.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </span>
            )}
          </div>
          <div
            className={`text-sm font-medium ${
              portfolioData.percentageChange >= 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            {portfolioData.percentageChange >= 0 ? '+' : ''}
            {portfolioData.percentageChange.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {portfolioData.tokenShares.map((token) => (
          <Badge
            key={token.symbol}
            style={{
              backgroundColor: token.color,
              color: '#ffffff',
            }}
            className="px-3 py-1"
          >
            {token.symbol} {token.percentage.toFixed(1)}%
          </Badge>
        ))}
      </div>
    </div>
  );
}
