'use client';

import { useState } from 'react';
import {
  type EventCard as EventCardType,
  type BetType,
} from '@/types/predictionMarkets';
import { MarketOption } from './MarketOption';
import {
  formatVolume,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from '@/lib/predictionMarketUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EventCardProps {
  event: EventCardType;
  onBet?: (marketId: string, type: BetType) => void;
}

export function EventCard({ event, onBet }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayMarkets = isExpanded
    ? event.markets
    : event.markets?.slice(0, 2);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-200">
      {/* Event Image */}
      {event.imageUrl && (
        <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Card Content */}
      <div className="p-4">
        {/* Category & Status Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {event.category && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium border border-blue-200">
              {event.category}
            </span>
          )}
          {event.status && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium border ${getStatusColor(
                event.status
              )}`}
            >
              {getStatusLabel(event.status)}
            </span>
          )}
          {event.competitionScope && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full border border-gray-200">
              {event.competitionScope}
            </span>
          )}
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-bold text-lg mb-1 text-gray-900">
          {event.title}
        </h3>
        {event.subtitle && (
          <p className="text-sm text-gray-600 mb-3">
            {event.subtitle}
          </p>
        )}
        {/* Event ID */}
        {event.id && (
          <div className="text-xs text-gray-400 mb-3 font-mono">
            Event ID: {event.id}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Volume & Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Volume 24h
            </div>
            <div className="font-semibold text-sm text-gray-900">
              {formatVolume(event.volume24h)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Liquidity
            </div>
            <div className="font-semibold text-sm text-gray-900">
              {formatVolume(event.liquidity)}
            </div>
          </div>
          {event.openInterest && (
            <div className="col-span-2">
              <div className="text-xs text-gray-500 mb-1">
                Open Interest
              </div>
              <div className="font-semibold text-sm text-gray-900">
                {formatVolume(event.openInterest)}
              </div>
            </div>
          )}
        </div>

        {/* Markets */}
        {displayMarkets && displayMarkets.length > 0 && (
          <div className="space-y-3 mb-3">
            {displayMarkets.map((market) => (
              <div key={market.id}>
                <div className="text-xs text-gray-400 mb-1 font-mono">
                  Market ID: {market.id}
                </div>
                <MarketOption market={market} onBet={onBet} />
              </div>
            ))}
          </div>
        )}

        {/* Show More/Less Button */}
        {event.marketsCount > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />+
                {event.marketsCount - 2} more market
                {event.marketsCount - 2 > 1 ? 's' : ''}
              </>
            )}
          </button>
        )}

        {/* End Date */}
        {event.endDate && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Ends: {formatDate(event.endDate)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
