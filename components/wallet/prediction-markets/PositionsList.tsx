'use client';

/**
 * PositionsList Component
 *
 * Displays a list of user's positions in prediction markets.
 * Includes portfolio summary and filtering options.
 */

import React from 'react';
import { Tabs, Tab, Spinner, Button, Card, CardBody } from '@nextui-org/react';
import { TrendingUp, Trophy, Inbox, RefreshCw } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { PositionCard } from './PositionCard';
import {
  useUserPositions,
  usePortfolioSummary,
  useRedeemPosition,
} from '@/lib/hooks/usePredictionMarkets';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';
import { useToast } from '@/hooks/use-toast';
import { Position } from '@/types/prediction-markets';

interface PositionsListProps {
  walletAddress?: string;
}

export const PositionsList: React.FC<PositionsListProps> = ({ walletAddress }) => {
  const { toast } = useToast();
  const { wallets: solanaWallets } = useSolanaWallets();
  const selectedWallet = solanaWallets[0];

  const { positionsView, setPositionsView, openTradeModal } =
    usePredictionMarketsStore();

  const {
    data: positions = [],
    isLoading: positionsLoading,
    error: positionsError,
    refetch: refetchPositions,
  } = useUserPositions(walletAddress, !!walletAddress);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
  } = usePortfolioSummary(walletAddress, !!walletAddress);

  const redeemMutation = useRedeemPosition();

  // Filter positions based on view
  const filteredPositions = React.useMemo(() => {
    if (!positions) return [];

    switch (positionsView) {
      case 'active':
        return positions.filter((p) => !p.isRedeemable && p.tokenBalance > 0);
      case 'redeemable':
        return positions.filter((p) => p.isRedeemable);
      case 'all':
      default:
        return positions;
    }
  }, [positions, positionsView]);

  const handleRedeem = async (position: Position) => {
    if (!walletAddress || !selectedWallet) {
      toast({
        variant: 'destructive',
        title: 'Wallet Required',
        description: 'Please connect your Solana wallet to redeem',
      });
      return;
    }

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      if (!rpcUrl) {
        throw new Error('Solana RPC URL not configured');
      }

      const connection = new Connection(rpcUrl, 'confirmed');

      await redeemMutation.mutateAsync({
        positionId: position.id,
        walletAddress,
        wallet: selectedWallet,
        connection,
      });

      toast({
        title: 'Redemption Successful',
        description: `Redeemed ${position.redeemableAmount?.toFixed(2)} USDC`,
      });
    } catch (error) {
      console.error('Redemption error:', error);
      toast({
        variant: 'destructive',
        title: 'Redemption Failed',
        description:
          error instanceof Error ? error.message : 'Failed to redeem position',
      });
    }
  };

  const handleTrade = (position: Position) => {
    if (position.market) {
      openTradeModal(position.market, position.outcomeId, 'sell');
    }
  };

  const formatValue = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isLoading = positionsLoading || portfolioLoading;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">My Positions</h2>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          onPress={() => refetchPositions()}
          isDisabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Portfolio Summary */}
      {portfolio && !portfolioLoading && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardBody className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Value</p>
                <p className="text-lg font-bold text-gray-900">
                  ${formatValue(portfolio.totalValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total P&L</p>
                <p
                  className={`text-lg font-bold ${
                    portfolio.totalUnrealizedPnL >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {portfolio.totalUnrealizedPnL >= 0 ? '+' : ''}$
                  {formatValue(Math.abs(portfolio.totalUnrealizedPnL))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Active Positions</p>
                <p className="text-lg font-bold text-gray-900">
                  {portfolio.activePositions}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Redeemable</p>
                <p className="text-lg font-bold text-green-600">
                  ${formatValue(portfolio.redeemableAmount)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs
        selectedKey={positionsView}
        onSelectionChange={(key) =>
          setPositionsView(key as 'active' | 'redeemable' | 'all')
        }
        color="success"
        variant="underlined"
      >
        <Tab
          key="active"
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Active</span>
              {portfolio && (
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {portfolio.activePositions}
                </span>
              )}
            </div>
          }
        />
        <Tab
          key="redeemable"
          title={
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>Redeemable</span>
              {portfolio && portfolio.redeemablePositions > 0 && (
                <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                  {portfolio.redeemablePositions}
                </span>
              )}
            </div>
          }
        />
        <Tab
          key="all"
          title={
            <div className="flex items-center gap-2">
              <span>All</span>
              {portfolio && (
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {portfolio.totalPositions}
                </span>
              )}
            </div>
          }
        />
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" color="success" aria-label="Loading positions" />
        </div>
      )}

      {/* Error State */}
      {positionsError && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-800 font-semibold">Failed to load positions</p>
          <p className="text-red-600 text-sm mt-1">
            {positionsError instanceof Error
              ? positionsError.message
              : 'Unknown error'}
          </p>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="mt-3"
            onPress={() => refetchPositions()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !positionsError && filteredPositions.length === 0 && (
        <div className="p-12 text-center bg-gray-50 rounded-lg">
          <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No positions found</p>
          <p className="text-gray-500 text-sm mt-1">
            {positionsView === 'active'
              ? 'You have no active positions'
              : positionsView === 'redeemable'
                ? 'You have no positions to redeem'
                : 'Start trading to see your positions here'}
          </p>
        </div>
      )}

      {/* Positions Grid */}
      {!isLoading && !positionsError && filteredPositions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onRedeem={handleRedeem}
              onTrade={handleTrade}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionsList;
