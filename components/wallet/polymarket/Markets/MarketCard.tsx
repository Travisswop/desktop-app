'use client';

import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  isMultiOutcomeMarket,
  eventOutcomeLabel,
  eventOutcomeYesPrice,
  type PolymarketEventOutcome,
} from '@/lib/polymarket/event-outcomes';

import Card from '../shared/Card';
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

function getSportsTiming(
  gameStartTime: string | undefined,
): SportsTiming | null {
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
      detail:
        'Limit orders cancel at game start · Market orders have a 3 s delay',
    };
  }

  return {
    status: 'upcoming',
    label: `Game: ${new Date(startMs).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`,
    detail:
      'Limit orders cancel at game start · Market orders have a 3 s delay',
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
  /** Called when the user clicks the market title to open the detail modal */
  onTitleClick?: () => void;
  /** Called when the user clicks a specific outcome row of a collapsed
   *  multi-outcome event (e.g. one team of "LeBron's Next Team"). */
  onEventOutcomeClick?: (outcome: PolymarketEventOutcome) => void;
}

/** Rows shown on a collapsed multi-outcome event card before "+N more". */
const EVENT_OUTCOME_PREVIEW_ROWS = 3;

export default function MarketCard({
  market,
  disabled = false,
  isSportsCategory = false,
  onOutcomeClick,
  onTitleClick,
  onEventOutcomeClick,
}: MarketCardProps) {
  const volumeUSD = parseFloat(
    String(market.volume24hr || market.volume || '0'),
  );
  const liquidityUSD = parseFloat(String(market.liquidity || '0'));
  const isClosed = market.closed;
  const sportsTiming = getSportsTiming(market.gameStartTime);
  const hasEventStatus =
    market.eventLive ||
    market.eventEnded ||
    market.eventClosed ||
    market.eventPeriod != null ||
    market.eventElapsed != null ||
    market.eventScore != null;
  const isFinalSportsEvent = Boolean(
    isSportsCategory &&
      (market.eventEnded ||
        market.eventClosed ||
        /^(ft|final)$/i.test(String(market.eventPeriod || '').trim())),
  );
  const isLive = Boolean(
    isSportsCategory &&
      !isFinalSportsEvent &&
      (market.eventLive || (!hasEventStatus && sportsTiming?.status === 'live')),
  );

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

  const icon = market.icon || market.eventIcon;

  // ── Collapsed multi-outcome event ("Who will…?" — one market per option) ──
  if (isMultiOutcomeMarket(market)) {
    const siblings = (market.eventMarkets ?? []).filter((o) => !o.closed);
    const preview = siblings.slice(0, EVENT_OUTCOME_PREVIEW_ROWS);
    const remaining =
      Math.max(market.eventMarketCount ?? siblings.length, siblings.length) -
      preview.length;
    const eventIcon = market.eventIcon || icon;

    return (
      <Card hover className="px-4 py-3">
        <div className="flex items-start gap-3 mb-2.5">
          {eventIcon ? (
            <img
              src={eventIcon}
              alt=""
              className="w-10 h-10 rounded-lg flex-shrink-0 object-cover bg-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gray-200" />
          )}
          <button
            onClick={onTitleClick}
            disabled={!onTitleClick}
            className={`flex-1 min-w-0 text-sm font-semibold text-gray-900 line-clamp-2 leading-snug text-left ${
              onTitleClick
                ? 'hover:text-blue-600 transition-colors'
                : 'cursor-default'
            }`}
          >
            {market.eventTitle || market.question}
          </button>
        </div>

        <div className="space-y-1.5">
          {preview.map((outcome) => {
            const pct = Math.round(eventOutcomeYesPrice(outcome) * 100);
            return (
              <button
                key={outcome.id || outcome.slug || eventOutcomeLabel(outcome)}
                onClick={() => onEventOutcomeClick?.(outcome)}
                disabled={disabled || !onEventOutcomeClick}
                className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <span className="text-[13px] font-medium text-gray-700 truncate text-left">
                  {eventOutcomeLabel(outcome)}
                </span>
                <span className="text-[13px] font-bold text-gray-900 tabular-nums flex-shrink-0">
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>

        {remaining > 0 && (
          <button
            onClick={onTitleClick}
            disabled={!onTitleClick}
            className="mt-2 text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            +{remaining} more option{remaining === 1 ? '' : 's'}
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card hover className="px-4 py-3">
      {/* Live match banner — sports context only */}
      {isSportsCategory && isLive && (
        <div className="flex items-center gap-2 mb-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-red-700 text-xs font-bold tracking-wide">
            LIVE
          </span>
          <span className="text-red-500 text-xs ml-auto truncate">
            {sportsTiming?.detail ||
              'Market orders have a 3 s delay'}
          </span>
        </div>
      )}

      {/* Top row: icon + title (full width so text has room to breathe) */}
      <div className="flex items-start gap-3 mb-2">
        {/* Icon */}
        {icon ? (
          <img
            src={icon}
            alt=""
            className="w-10 h-10 rounded-lg flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gray-200" />
        )}

        {/* Title */}
        <button
          onClick={onTitleClick}
          disabled={!onTitleClick}
          className={`flex-1 min-w-0 text-sm font-semibold text-gray-900 line-clamp-2 leading-snug text-left ${
            onTitleClick
              ? 'hover:text-blue-600 transition-colors'
              : 'cursor-default'
          }`}
        >
          {market.question}
        </button>
      </div>

      {/* Bottom row: stats (left) + outcome buttons (right) */}
      <div className="flex items-center gap-3">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
          {/* <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">
              24h Volume
            </p>
            <p className="text-xs font-semibold text-green-500">
              {formatVolume(volumeUSD)}
            </p>
          </div> */}
          {/* <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">
              Liquidity
            </p>
            <p className="text-xs font-semibold text-green-500">
              {formatLiquidity(liquidityUSD)}
            </p>
          </div> */}
          {/* <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">
              Outcomes
            </p>
            <p className="text-xs font-semibold text-gray-700">
              {outcomes.length}
            </p>
          </div> */}
          {isClosed && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
              Closed
            </span>
          )}
          {isFinalSportsEvent && (
            <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
              Final{market.eventScore ? ` · ${market.eventScore}` : ''}
            </span>
          )}
          {isSportsCategory && !isLive && !isFinalSportsEvent && sportsTiming && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                sportsTiming.status === 'imminent'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {sportsTiming.label}
            </span>
          )}
        </div>

        {/* Outcome buttons */}
        <OutcomeButtons
          outcomes={outcomes}
          outcomePrices={outcomePrices}
          tokenIds={tokenIds}
          isClosed={isClosed}
          negRisk={negRisk}
          marketQuestion={market.question}
          disabled={disabled || isFinalSportsEvent}
          onOutcomeClick={onOutcomeClick}
        />
      </div>
    </Card>
  );
}
