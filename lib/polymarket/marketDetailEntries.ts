import type { PolymarketMarket } from '@/hooks/polymarket';
import type { PolymarketAgentOrderPrefill } from '@/lib/chat/agentActionHandoff';
import type { SportsGameDetailContext } from '@/lib/polymarket/sports-detail-context';
import type { SportsGameGroup } from '@/lib/polymarket/sports-grouping';
import type { SportsOutcomeSelection } from '@/lib/polymarket/sports-selection';
import type { MarketDetailEntry } from '@/zustandStore/marketDetailStore';

type MarketShares = {
  yesShares?: number;
  noShares?: number;
};

function formatInputAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value.toFixed(6).replace(/\.?0+$/, '');
}

function resolveApprovedPredictionInitialAmount(
  prefill: PolymarketAgentOrderPrefill,
) {
  if (!prefill.amount) return undefined;
  if (prefill.side === 'SELL') {
    return prefill.amountUnit === 'usd' ? undefined : prefill.amount;
  }
  if (prefill.amountUnit !== 'shares') {
    return prefill.amount;
  }
  if (prefill.orderType !== 'limit') {
    return undefined;
  }

  const shares = Number(prefill.amount);
  const limitPriceCents = Number(prefill.limitPrice);
  if (!Number.isFinite(shares) || !Number.isFinite(limitPriceCents)) {
    return undefined;
  }

  return formatInputAmount(shares * (limitPriceCents / 100));
}

export function buildRecoveredMarketDetailEntry(
  market: PolymarketMarket,
  shares: MarketShares,
): MarketDetailEntry {
  return {
    market,
    ...shares,
  };
}

export function buildRecoveredSportsMarketDetailEntry(
  snapshot: MarketDetailEntry,
  context: SportsGameDetailContext,
  shares: MarketShares,
): MarketDetailEntry {
  return {
    ...snapshot,
    market: context.market,
    game: context.game,
    ...context.selection,
    ...shares,
    agentOrderPrefill: undefined,
  };
}

export function buildSiblingSportsMarketDetailEntry(
  game: SportsGameGroup,
  market: PolymarketMarket,
  selection: SportsOutcomeSelection,
  shares: MarketShares,
): MarketDetailEntry {
  return {
    market,
    game,
    ...selection,
    ...shares,
  };
}

export function buildApprovedMarketDetailEntry(
  market: PolymarketMarket,
  prefill: PolymarketAgentOrderPrefill,
): MarketDetailEntry {
  return {
    market,
    initialOutcome: prefill.outcome,
    initialAmount: resolveApprovedPredictionInitialAmount(prefill),
    initialSide: prefill.side,
    initialOrderType: prefill.orderType,
    initialLimitPrice: prefill.limitPrice,
    agentOrderPrefill: prefill,
  };
}
