/**
 * Multi-outcome event helpers.
 *
 * The polymarket-backend desktop feed collapses a multi-outcome Gamma event
 * (e.g. "NBA: LeBron James Next Team" — one binary Yes/No market per team)
 * into a single representative market carrying every sibling outcome in
 * `eventMarkets` (sorted by yes-price descending, capped server-side).
 * These helpers turn a sibling entry back into a tradeable PolymarketMarket
 * and centralize the "is this a grouped event?" check.
 */

import type { PolymarketMarket } from '@/hooks/polymarket';

export type PolymarketEventOutcome = {
  id?: string;
  question?: string;
  groupItemTitle?: string | null;
  slug?: string;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  conditionId?: string;
  negRisk?: boolean;
  orderMinSize?: number;
  orderPriceMinTickSize?: number;
  spread?: string;
  liquidity?: string | number;
  volume24hr?: string | number;
  icon?: string | null;
  image?: string | null;
  endDate?: string | null;
  gameStartTime?: string | null;
  active?: boolean;
  closed?: boolean;
};

export function isMultiOutcomeMarket(
  market: Pick<PolymarketMarket, 'eventMarkets'> | null | undefined,
): boolean {
  return (market?.eventMarkets?.length ?? 0) >= 2;
}

/** Yes-price (0..1) of a sibling outcome; 0 when unparsable. */
export function eventOutcomeYesPrice(
  outcome: Pick<PolymarketEventOutcome, 'outcomePrices'>,
): number {
  try {
    const price = parseFloat(JSON.parse(outcome.outcomePrices || '[]')[0]);
    return Number.isFinite(price) ? price : 0;
  } catch {
    return 0;
  }
}

/** Short display label for a sibling outcome row. */
export function eventOutcomeLabel(outcome: PolymarketEventOutcome): string {
  return (
    String(outcome.groupItemTitle || '').trim() ||
    String(outcome.question || '').trim()
  );
}

/**
 * Build a tradeable market object from a sibling outcome, inheriting the
 * parent's event context. The sibling list is preserved so the detail view
 * opened from a converted market can still render every outcome.
 */
export function eventOutcomeToMarket(
  outcome: PolymarketEventOutcome,
  parent: PolymarketMarket,
): PolymarketMarket {
  // Parent realtimePrices key on the representative market's CLOB tokens —
  // never valid for a sibling, so drop them and let price display fall back
  // to the sibling's own outcomePrices.
  const parentRest: PolymarketMarket = { ...parent };
  delete parentRest.realtimePrices;
  return {
    ...parentRest,
    id: outcome.id ?? parent.id,
    question: outcome.question ?? parent.question,
    groupItemTitle: outcome.groupItemTitle ?? undefined,
    slug: outcome.slug ?? parent.slug,
    outcomes: outcome.outcomes ?? parent.outcomes,
    outcomePrices: outcome.outcomePrices ?? parent.outcomePrices,
    clobTokenIds: outcome.clobTokenIds ?? parent.clobTokenIds,
    conditionId: outcome.conditionId ?? parent.conditionId,
    negRisk: outcome.negRisk ?? parent.negRisk,
    orderMinSize: outcome.orderMinSize ?? parent.orderMinSize,
    orderPriceMinTickSize:
      outcome.orderPriceMinTickSize ?? parent.orderPriceMinTickSize,
    spread: outcome.spread ?? parent.spread,
    liquidity: outcome.liquidity ?? parent.liquidity,
    volume24hr: outcome.volume24hr ?? parent.volume24hr,
    icon: outcome.icon || parent.icon,
    image: outcome.image || parent.image,
    endDate: outcome.endDate || parent.endDate,
    gameStartTime: outcome.gameStartTime || parent.gameStartTime,
    active: outcome.active ?? parent.active,
    closed: outcome.closed ?? parent.closed,
  };
}
