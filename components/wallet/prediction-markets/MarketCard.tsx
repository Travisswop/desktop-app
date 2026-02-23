'use client';

/**
 * MarketCard Component
 *
 * Displays an individual prediction market in a card format.
 * Shows market title, outcomes, probabilities, and volume.
 */

import React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  Chip,
  Progress,
} from '@nextui-org/react';
import { TrendingUp, Users, Clock } from 'lucide-react';
import { Market, MarketStatus } from '@/types/prediction-markets';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';

interface MarketCardProps {
  market: Market;
  onClick?: (market: Market) => void;
}

export const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onClick,
}) => {
  console.log('market', market);
  const openTradeModal = usePredictionMarketsStore(
    (state) => state.openTradeModal,
  );

  const handleClick = () => {
    if (onClick) {
      onClick(market);
    }
  };

  const getStatusColor = (status: MarketStatus | string) => {
    const statusLower =
      typeof status === 'string' ? status.toLowerCase() : status;
    switch (statusLower) {
      case MarketStatus.ACTIVE:
      case 'active':
      case 'open':
        return 'success';
      case MarketStatus.SETTLED:
      case 'settled':
      case 'finalized':
      case 'determined':
        return 'default';
      case MarketStatus.CLOSED:
      case 'closed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatVolume = (volume: number | undefined | null) => {
    if (volume === undefined || volume === null) {
      return '$0';
    }
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return 'Soon';
    }
  };

  // Get top 2 outcomes for binary markets or top 3 for categorical
  const displayOutcomes = market.outcomes.slice(
    0,
    market.marketType === 'binary' ? 2 : 3,
  );

  return (
    <Card
      isPressable
      onPress={handleClick}
      className="w-full hover:shadow-lg transition-shadow duration-200"
    >
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            <h3 className="text-base font-semibold line-clamp-2 text-gray-800">
              {market.title}
            </h3>
            {market.category && (
              <p className="text-xs text-gray-500 mt-1">
                {market.category}
              </p>
            )}
          </div>
          <Chip
            size="sm"
            color={getStatusColor(market.status)}
            variant="flat"
          >
            {market.status}
          </Chip>
        </div>

        {/* Market Image (if available) */}
        {market.imageUrl && (
          <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={market.imageUrl}
              alt={market.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Outcomes */}
        <div className="space-y-2 mb-3">
          {displayOutcomes.map((outcome) => {
            // Use price as probability if probability is not available
            const probability =
              outcome.probability ?? outcome.price ?? 0;
            const isYes = outcome.name?.toLowerCase() === 'yes';
            return (
              <div key={outcome.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700 truncate flex-1">
                    {outcome.name}
                  </span>
                  <span
                    className={`font-bold ml-2 ${isYes ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {(probability * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  size="sm"
                  value={probability * 100}
                  color={isYes ? 'success' : 'danger'}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{formatVolume(market.totalVolume)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>
              {formatVolume(market.openInterest ?? market.liquidity)}
            </span>
          </div>
          {market.endDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(market.endDate)}</span>
            </div>
          )}
        </div>
      </CardBody>

      {(market.status === MarketStatus.ACTIVE ||
        market.status === 'active' ||
        market.status === 'open') && (
        <CardFooter className="pt-0 pb-3 px-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (displayOutcomes.length > 0) {
                openTradeModal(market, displayOutcomes[0].id, 'buy');
              }
            }}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
          >
            Trade
          </button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MarketCard;
