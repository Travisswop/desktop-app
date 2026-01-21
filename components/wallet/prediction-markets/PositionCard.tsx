'use client';

/**
 * PositionCard Component
 *
 * Displays a user's position in a prediction market.
 * Shows PnL, current value, and redemption options.
 */

import React from 'react';
import { Card, CardBody, CardFooter, Chip, Button, Progress } from '@nextui-org/react';
import { TrendingUp, TrendingDown, Trophy, Clock } from 'lucide-react';
import { Position } from '@/types/prediction-markets';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';

interface PositionCardProps {
  position: Position;
  onRedeem?: (position: Position) => void;
  onTrade?: (position: Position) => void;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  onRedeem,
  onTrade,
}) => {
  const openPositionDetails = usePredictionMarketsStore(
    (state) => state.openPositionDetails
  );

  const isProfitable = position.unrealizedPnL >= 0;

  const formatValue = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const handleRedeemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRedeem) {
      onRedeem(position);
    }
  };

  const handleTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTrade) {
      onTrade(position);
    }
  };

  return (
    <Card
      isPressable
      onPress={() => openPositionDetails(position)}
      className="w-full hover:shadow-lg transition-shadow duration-200"
    >
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            <h3 className="text-sm font-semibold line-clamp-2 text-gray-800">
              {position.market?.title || 'Market'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Chip size="sm" variant="flat" color="primary">
                {position.outcomeName}
              </Chip>
              {position.isRedeemable && (
                <Chip size="sm" variant="flat" color="success" startContent={<Trophy className="w-3 h-3" />}>
                  Won
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* Position Details */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shares</span>
            <span className="font-semibold">
              {position.tokenBalance.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg. Price</span>
            <span className="font-medium">
              ${position.averagePrice.toFixed(4)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Price</span>
            <span className="font-medium">
              ${position.currentPrice.toFixed(4)}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Value</span>
              <span className="font-bold">${formatValue(position.currentValue)}</span>
            </div>

            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Cost Basis</span>
              <span className="font-medium text-gray-700">
                ${formatValue(position.costBasis)}
              </span>
            </div>
          </div>

          {/* PnL Display */}
          <div className="bg-gray-50 rounded-lg p-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Unrealized P&L
              </span>
              <div className="flex items-center gap-2">
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <div className="text-right">
                  <div
                    className={`font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${formatValue(Math.abs(position.unrealizedPnL))}
                  </div>
                  <div
                    className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatPercent(position.unrealizedPnLPercent)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Redeemable Amount */}
          {position.isRedeemable && position.redeemableAmount && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">
                  Redeemable
                </span>
                <span className="font-bold text-green-700">
                  ${formatValue(position.redeemableAmount)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardBody>

      {/* Action Buttons */}
      <CardFooter className="pt-0 pb-3 px-4 gap-2">
        {position.isRedeemable ? (
          <Button
            color="success"
            size="sm"
            className="flex-1"
            onPress={handleRedeemClick}
            startContent={<Trophy className="w-4 h-4" />}
          >
            Redeem
          </Button>
        ) : (
          <Button
            variant="bordered"
            size="sm"
            className="flex-1"
            onPress={handleTradeClick}
          >
            Trade
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PositionCard;
