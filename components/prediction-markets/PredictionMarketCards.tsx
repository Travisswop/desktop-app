'use client';

import { type PredictionMarketsResponse, type BetType } from '@/types/predictionMarkets';
import { EventCard } from './EventCard';

interface PredictionMarketCardsProps {
  data: PredictionMarketsResponse;
  onBet?: (marketId: string, type: BetType) => void;
}

export function PredictionMarketCards({ data, onBet }: PredictionMarketCardsProps) {
  if (!data.cards || data.cards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No prediction markets available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
        <span className="font-medium text-blue-900">
          {data.showing} {data.showing === 1 ? 'market' : 'markets'}
        </span>
        {data.total > data.showing && (
          <span className="text-gray-600"> of {data.total} total</span>
        )}
        {data.query && (
          <span className="text-gray-600"> for "{data.query}"</span>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.cards.map((card) => (
          <EventCard
            key={card.id}
            event={card}
            onBet={onBet}
          />
        ))}
      </div>
    </div>
  );
}
