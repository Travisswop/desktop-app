import type { HLMarket } from '@/services/hyperliquid/types';
import { perpsCoinMatches } from '@/lib/chat/ticketFormat';

export type HyperliquidPositionIdentity = {
  coin: string;
  dex?: string | null;
  assetIndex?: number | null;
};

export function getHyperliquidPositionDex(
  position?: { dex?: string | null } | null
) {
  return String(position?.dex || '').trim();
}

export function getHyperliquidMarketDex(market?: HLMarket | null) {
  return String(market?.dex || '').trim();
}

export function normalizeHyperliquidDex(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function hyperliquidMarketMatchesPosition(
  market: HLMarket | undefined,
  position: Pick<HyperliquidPositionIdentity, 'coin' | 'dex'>
) {
  if (!market) return false;
  return (
    normalizeHyperliquidDex(getHyperliquidMarketDex(market)) ===
      normalizeHyperliquidDex(getHyperliquidPositionDex(position)) &&
    perpsCoinMatches(market.coin, position.coin)
  );
}

export function hyperliquidMarketForPosition(
  markets: HLMarket[],
  position: HyperliquidPositionIdentity
) {
  const positionDex = normalizeHyperliquidDex(position.dex);

  if (
    typeof position.assetIndex === 'number' &&
    Number.isFinite(position.assetIndex)
  ) {
    const indexedMarket = markets.find(
      (market) => market.index === position.assetIndex
    );
    if (indexedMarket) return indexedMarket;
  }

  const dexMatchedMarket = markets.find((market) =>
    hyperliquidMarketMatchesPosition(market, position)
  );
  if (dexMatchedMarket) return dexMatchedMarket;
  if (positionDex) return undefined;

  return markets.find((market) => perpsCoinMatches(market.coin, position.coin));
}
