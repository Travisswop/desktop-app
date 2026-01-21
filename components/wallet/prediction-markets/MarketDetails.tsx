'use client';

/**
 * MarketDetails Component
 *
 * Full market view with trading interface, chart, and details.
 */

import React from 'react';
import { Card, CardBody, Chip, Spinner } from '@nextui-org/react';
import { TrendingUp, Users, Clock } from 'lucide-react';
import { TradePanel } from './TradePanel';
import { useMarketDetails } from '@/lib/hooks/usePredictionMarkets';
import { MarketStatus } from '@/types/prediction-markets';

interface MarketDetailsProps {
  marketId: string;
  solanaWalletAddress?: string;
}

export const MarketDetails: React.FC<MarketDetailsProps> = ({
  marketId,
  solanaWalletAddress,
}) => {
  const {
    data: market,
    isLoading,
    error,
  } = useMarketDetails(marketId, !!marketId);

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

  const formatDate = (dateInput?: string | number | null) => {
    if (dateInput === undefined || dateInput === null || dateInput === '') return 'N/A';
    const date =
      typeof dateInput === 'number'
        ? // Support both seconds and ms epochs
          new Date(dateInput < 10_000_000_000 ? dateInput * 1000 : dateInput)
        : new Date(dateInput);

    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parsePrice = (v: unknown) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };

  const mid = (bid?: number, ask?: number) => {
    if (bid !== undefined && ask !== undefined) return (bid + ask) / 2;
    return bid ?? ask;
  };

  const yesBid = parsePrice((market as any)?.yesBid);
  const yesAsk = parsePrice((market as any)?.yesAsk);
  const noBid = parsePrice((market as any)?.noBid);
  const noAsk = parsePrice((market as any)?.noAsk);

  const yesMid = mid(yesBid, yesAsk);
  const noMid = mid(noBid, noAsk);

  const getStatusColor = (status: MarketStatus | string) => {
    const statusLower = typeof status === 'string' ? status.toLowerCase() : status;
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" color="success" aria-label="Loading market details" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-800 font-semibold">Failed to load market</p>
        <p className="text-red-600 text-sm mt-1">
          {error instanceof Error ? error.message : 'Market not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-2 flex-wrap">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1 min-w-0">
            {market.title}
          </h2>
          <Chip size="sm" color={getStatusColor(market.status)} variant="flat" className="shrink-0">
            {market.status}
          </Chip>
        </div>
        <p className="text-gray-600 text-sm md:text-base">{market.description}</p>
        {market.category && (
          <p className="text-sm text-gray-500 mt-2">
            Category: {market.category}
          </p>
        )}
      </div>

      {/* Market Image */}
      {market.imageUrl && (
        <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={market.imageUrl}
            alt={market.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Volume</span>
            </div>
            <p className="text-lg font-bold">{formatVolume(market.totalVolume)}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">{market.openInterest !== undefined ? 'Open Interest' : 'Liquidity'}</span>
            </div>
            <p className="text-lg font-bold">{formatVolume(market.openInterest ?? market.liquidity)}</p>
          </CardBody>
        </Card>

        {market.tradeCount !== undefined && (
          <Card>
            <CardBody className="p-4">
              <p className="text-xs text-gray-600 mb-1">Trades</p>
              <p className="text-lg font-bold">{market.tradeCount}</p>
            </CardBody>
          </Card>
        )}

        {market.endDate && (
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">End Date</span>
              </div>
              <p className="text-sm font-bold">{formatDate(market.endDate)}</p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Main Content - Stacked layout for modal view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outcomes */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-lg font-semibold mb-3">Outcomes</h3>
            <div className="space-y-3">
              {market.outcomes.map((outcome) => {
                const outcomeName = outcome?.name ?? '';
                const nameLower = outcomeName.toLowerCase();
                const isYes = nameLower === 'yes';
                const isNo = nameLower === 'no';

                // Prefer the new top-level quotes for binary markets; fall back to legacy per-outcome fields.
                const legacyPrice = parsePrice((outcome as any).price);
                const legacyProbability = parsePrice((outcome as any).probability);
                const quotePrice = isYes ? yesMid : isNo ? noMid : undefined;

                const probability = legacyProbability ?? quotePrice ?? legacyPrice ?? 0;
                const displayPrice = quotePrice ?? legacyPrice ?? 0;

                return (
                  <div
                    key={(outcome as any).id ?? outcomeName}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800">
                        {outcomeName}
                      </p>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${isYes ? 'text-green-600' : 'text-red-500'}`}>
                          {(probability * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          ${displayPrice.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    {(outcome as any).volume !== undefined && (
                      <p className="text-xs text-gray-600 mt-1">
                        Vol: {formatVolume((outcome as any).volume)}
                      </p>
                    )}
                    {(isYes || isNo) && (yesBid !== undefined || yesAsk !== undefined || noBid !== undefined || noAsk !== undefined) && (
                      <p className="text-xs text-gray-600 mt-1">
                        Bid/Ask:{' '}
                        {isYes
                          ? `${(yesBid ?? 0).toFixed(4)} / ${(yesAsk ?? 0).toFixed(4)}`
                          : `${(noBid ?? 0).toFixed(4)} / ${(noAsk ?? 0).toFixed(4)}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Trade Panel */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-lg font-semibold mb-4">Trade</h3>
            {(market.status === MarketStatus.ACTIVE || market.status === 'active' || market.status === 'open') ? (
              <TradePanel
                market={market}
                solanaWalletAddress={solanaWalletAddress}
              />
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {(market.status === MarketStatus.SETTLED || market.status === 'settled' || market.status === 'finalized' || market.status === 'determined')
                    ? 'This market has been settled'
                    : 'This market is closed for trading'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default MarketDetails;
