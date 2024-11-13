'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { TokenData } from '@/types/token';
import { AlertCircle, Loader2 } from 'lucide-react';
import TokenCard from './token-card';
import React from 'react';
import PortfolioBalance from '../portfolio-balance';
import PortfolioBalanceSkeleton from '../portfolio-balance-skelton';

interface TokenListProps {
  tokens: TokenData[];
  loading: boolean;
  error: Error | null;
  onSelectToken: (token: TokenData) => void;
}

const TokenList = ({
  tokens,
  loading,
  error,
  onSelectToken,
}: TokenListProps) => {
  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <span>Tokens</span>
            {loading && (
              <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
            )}
          </CardTitle>

          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">
              Some tokens couldn&apos;t be loaded. Please try again
              later.
            </p>
          </div>
        )}

        {!loading && tokens.length > 0 && (
          <PortfolioBalance tokens={tokens} />
        )}

        {loading && <PortfolioBalanceSkeleton />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-[200px] bg-gray-300 animate-pulse rounded-xl"
                />
              ))
          ) : tokens.length > 0 ? (
            tokens.map((token) => (
              <TokenCard
                key={`${token.chain}-${token.address}`}
                token={token}
                onClick={() => onSelectToken(token)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tokens found in your wallet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(TokenList);
