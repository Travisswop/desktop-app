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
    initialAmount: prefill.amount,
    initialSide: prefill.side,
    initialOrderType: prefill.orderType,
    initialLimitPrice: prefill.limitPrice,
    agentOrderPrefill: prefill,
  };
}
