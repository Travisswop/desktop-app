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

// ─── Sports timing helpers ───────────────────────────────────────────────────

type GameStatus = 'live' | 'imminent' | 'upcoming' | null;

interface SportsTiming {
  status: GameStatus;
  label: string;
  detail: string;
}

function getSportsTiming(gameStartTime: string | undefined): SportsTiming | null {
  if (!gameStartTime) return null;

  const startMs = new Date(gameStartTime).getTime();
  if (isNaN(startMs)) return null;

  const nowMs = Date.now();
  const diffMin = (startMs - nowMs) / 60_000;

  if (diffMin <= 0) {
    return {
      status: 'live',
      label: 'LIVE',
      detail: 'Game in progress · Market orders have a 3 s delay',
    };
  }

  if (diffMin <= 60) {
    const mins = Math.round(diffMin);
    return {
      status: 'imminent',
      label: `Starts in ~${mins} min`,
      detail: 'Limit orders cancel at game start · Market orders have a 3 s delay',
    };
  }

  return {
    status: 'upcoming',
    label: `Game: ${new Date(startMs).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`,
    detail: 'Limit orders cancel at game start · Market orders have a 3 s delay',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MarketCardProps {
  market: PolymarketMarket;
  disabled?: boolean;
  /** True when the active top-level category is "sports" */
  isSportsCategory?: boolean;
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
  isSportsCategory = false,
  onOutcomeClick,
}: MarketCardProps) {
  const volumeUSD = parseFloat(
    String(market.volume24hr || market.volume || '0'),
  );
  const liquidityUSD = parseFloat(String(market.liquidity || '0'));
  const isClosed = market.closed;
  const sportsTiming = getSportsTiming(market.gameStartTime);
  const isLive = sportsTiming?.status === 'live';

  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  const tokenIds = market.clobTokenIds
    ? JSON.parse(market.clobTokenIds)
    : [];
  const negRisk = market.negRisk || false;
  const staticPrices: number[] = market.outcomePrices
    ? JSON.parse(market.outcomePrices).map(Number)
    : [];
  const outcomePrices = tokenIds.map(
    (tokenId: string, index: number) =>
      market.realtimePrices?.[tokenId]?.bidPrice ||
      staticPrices[index] ||
      0,
  );

  return (
    <Card hover className="p-4">
      {/* Live match banner — shown only in sports context */}
      {isSportsCategory && isLive && (
        <div className="flex items-center gap-2 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-700 text-xs font-bold tracking-wide">
            LIVE MATCH
          </span>
          <span className="text-red-500 text-xs ml-auto">
            {sportsTiming.detail}
          </span>
        </div>
      )}

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
          {/* Market Title + Badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-base text-gray-900 line-clamp-2 flex-1">
              {market.question}
            </h4>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {isClosed && <Badge variant="closed">Closed</Badge>}
              {isSportsCategory && isLive && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  LIVE
                </span>
              )}
            </div>
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

          {/* Sports timing info (for non-live or non-sports markets) */}
          {sportsTiming && !(isSportsCategory && isLive) && (
            <div
              className={`mb-3 rounded-lg px-3 py-2 border ${
                sportsTiming.status === 'imminent'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  sportsTiming.status === 'imminent'
                    ? 'text-orange-700'
                    : 'text-amber-700'
                }`}
              >
                {sportsTiming.label}
              </p>
              <p
                className={`text-xs ${
                  sportsTiming.status === 'imminent'
                    ? 'text-orange-600'
                    : 'text-amber-600'
                }`}
              >
                {sportsTiming.detail}
              </p>
            </div>
          )}

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
