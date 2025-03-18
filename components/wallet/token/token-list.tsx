'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { TokenData } from '@/types/token';
import { AlertCircle, LayoutGrid, List, Loader2 } from 'lucide-react';
import TokenCardView from './token-card-view';
import React, { useMemo, useState } from 'react';
import PortfolioBalance from '../portfolio-balance';
import PortfolioBalanceSkeleton from '../portfolio-balance-skelton';
import { Button } from '@/components/ui/button';
import TokenListView from './token-list-view';

type ViewMode = 'card' | 'list';
interface TokenListProps {
  tokens: TokenData[];
  loading: boolean;
  error: Error | null;
  onSelectToken: (token: TokenData) => void;
}

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-sm text-red-600">{message}</p>
  </div>
);

const ViewToggle = ({
  viewMode,
  onViewChange,
}: {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}) => (
  <div className="flex bg-gray-100 rounded-md">
    <ViewToggleButton
      mode="card"
      currentMode={viewMode}
      onClick={() => onViewChange('card')}
      icon={<LayoutGrid className="h-4 w-4" />}
    />
    <ViewToggleButton
      mode="list"
      currentMode={viewMode}
      onClick={() => onViewChange('list')}
      icon={<List className="h-4 w-4" />}
    />
  </div>
);

const ViewToggleButton = ({
  mode,
  currentMode,
  onClick,
  icon,
}: {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: React.ReactNode;
}) => (
  <Button
    size="icon"
    onClick={onClick}
    className={`rounded-md w-8 h-8 hover:bg-transparent bg-transparent ${
      currentMode === mode ? 'text-black' : 'text-gray-300'
    }`}
  >
    {icon}
  </Button>
);

const LoadingSkeleton = ({ viewMode }: { viewMode: ViewMode }) => {
  const skeletonItems = Array(4).fill(0);
  const skeletonClass =
    viewMode === 'card' ? 'h-[200px]' : 'h-[100px]';
  const containerClass =
    viewMode === 'card'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
      : 'space-y-4';

  return (
    <div className={containerClass}>
      {skeletonItems.map((_, i) => (
        <div
          key={i}
          className={`${skeletonClass} bg-gray-300 animate-pulse rounded-xl`}
        />
      ))}
    </div>
  );
};

const TokenContent = ({
  tokens,
  viewMode = 'list',
  onSelectToken,
}: {
  tokens: TokenData[];
  viewMode: ViewMode;
  onSelectToken: (token: TokenData) => void;
}) => {
  if (tokens.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tokens found in your wallet
      </div>
    );
  }

  // const viewMode = "list";

  const containerClass =
    viewMode === 'card'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
      : 'space-y-4';

  const TokenComponent =
    viewMode === 'card' ? TokenCardView : TokenListView;

  return (
    <div className={containerClass}>
      {tokens.map((token) => (
        <TokenComponent
          key={`${token.chain}-${token.symbol}`}
          token={token}
          onClick={() => onSelectToken(token)}
        />
      ))}
    </div>
  );
};

const TokenList = ({
  tokens,
  loading,
  error,
  onSelectToken,
}: TokenListProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const content = useMemo(() => {
    if (loading) {
      return <LoadingSkeleton viewMode={viewMode} />;
    }
    return (
      <TokenContent
        tokens={tokens}
        viewMode={'list'}
        onSelectToken={onSelectToken}
      />
    );
  }, [loading, tokens, viewMode, onSelectToken]);

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <span className="font-bold text-xl text-gray-700">
              Tokens
            </span>
            {loading && (
              <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
            )}
          </CardTitle>
          {/* <ViewToggle viewMode={viewMode} onViewChange={setViewMode} /> */}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <ErrorAlert message="Some tokens couldn't be loaded. Please try again later." />
        )}

        {/* {tokens.length > 0 && !loading ? (
          <PortfolioBalance tokens={tokens} />
        ) : loading ? (
          <PortfolioBalanceSkeleton />
        ) : null} */}

        {content}
      </CardContent>
    </Card>
  );
};

export default TokenList;
