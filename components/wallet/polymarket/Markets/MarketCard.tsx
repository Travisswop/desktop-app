'use client';

import type { PolymarketMarket } from '@/hooks/polymarket';

import Card from '../shared/Card';
import Badge from '../shared/Badge';
import StatDisplay from '../shared/StatDisplay';
import OutcomeButtons from './OutcomeButtons';

import {
  formatVolume,
  formatLiquidity,
} from '@/lib/polymarket/formatting';

interface MarketCardProps {
  market: PolymarketMarket;
  disabled?: boolean;
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
  ) => void;
}

export default function MarketCard({
  market,
  disabled = false,
  onOutcomeClick,
}: MarketCardProps) {
  console.log('market', market);
  const volumeUSD = parseFloat(
    String(market.volume24hr || market.volume || '0'),
  );
  const liquidityUSD = parseFloat(String(market.liquidity || '0'));
  const isClosed = market.closed;

  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  const tokenIds = market.clobTokenIds
    ? JSON.parse(market.clobTokenIds)
    : [];
  const negRisk = market.negRisk || false;
  const outcomePrices = tokenIds.map((tokenId: string) => {
    return market.realtimePrices?.[tokenId]?.bidPrice || 0;
  });

  return (
    <Card hover className="p-4">
      <div className="flex items-start gap-3">
        {/* Market Icon */}
        {(market.icon || market.eventIcon) && (
          <img
            src={market.icon || market.eventIcon}
            alt=""
            className="w-12 h-12 rounded-lg flex-shrink-0 object-cover border border-gray-100"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Market Title and Closed Badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-base text-gray-900 line-clamp-2 flex-1">
              {market.question}
            </h4>
            {isClosed && <Badge variant="closed">Closed</Badge>}
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <StatDisplay
              label="24h Volume"
              value={formatVolume(volumeUSD)}
              highlight
              highlightColor="green"
            />
            <StatDisplay
              label="Liquidity"
              value={formatLiquidity(liquidityUSD)}
            />
            <StatDisplay
              label="Outcomes"
              value={outcomes.length.toString()}
            />
          </div>

          {/* Outcome Buttons */}
          <OutcomeButtons
            outcomes={outcomes}
            outcomePrices={outcomePrices}
            tokenIds={tokenIds}
            isClosed={isClosed}
            negRisk={negRisk}
            marketQuestion={market.question}
            disabled={disabled}
            onOutcomeClick={onOutcomeClick}
          />
        </div>
      </div>
    </Card>
  );
}
