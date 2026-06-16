import type { HLPosition } from '@/services/hyperliquid/types';

type MarketPriceLike = {
  coin: string;
  dex?: string;
  displayCoin?: string;
  markPrice?: string;
};

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function displayCoinFor(coin: string) {
  return coin.includes(':') ? coin.split(':').pop() || coin : coin;
}

function addPriceKey(
  prices: Record<string, string>,
  key: string | undefined,
  value: string | undefined,
) {
  if (!key || !value || value === '0') return;
  prices[key] = value;
  prices[key.toUpperCase()] = value;
}

export function buildHyperliquidMarketPriceMap(
  markets: MarketPriceLike[],
): Record<string, string> {
  const prices: Record<string, string> = {};

  for (const market of markets) {
    const displayCoin =
      market.displayCoin || displayCoinFor(market.coin);

    addPriceKey(prices, market.coin, market.markPrice);
    addPriceKey(prices, displayCoin, market.markPrice);

    if (market.dex) {
      addPriceKey(
        prices,
        `${market.dex}:${displayCoin}`,
        market.markPrice,
      );
    }
  }

  return prices;
}

export function lookupHyperliquidPositionPrice(
  position: Pick<HLPosition, 'coin' | 'dex'>,
  prices?: Record<string, string>,
) {
  if (!prices) return undefined;

  const displayCoin = displayCoinFor(position.coin);
  const dexFromCoin = position.coin.includes(':')
    ? position.coin.split(':')[0]
    : '';
  const dex = position.dex || dexFromCoin;
  const candidates = [
    position.coin,
    position.coin.toUpperCase(),
    dex ? `${dex}:${displayCoin}` : '',
    dex ? `${dex}:${displayCoin}`.toUpperCase() : '',
    displayCoin,
    displayCoin.toUpperCase(),
  ];

  for (const key of candidates) {
    if (key && prices[key] !== undefined) return prices[key];
  }

  return undefined;
}

export function resolveHyperliquidPositionMarkPrice(
  position: Pick<
    HLPosition,
    'entryPx' | 'positionValue' | 'szi' | 'unrealizedPnl'
  >,
  liveOrMarketPrice?: string,
): number | null {
  const livePrice = finiteNumber(liveOrMarketPrice);
  if (livePrice !== null && livePrice > 0) return livePrice;

  const positionValue = finiteNumber(position.positionValue);
  const signedSize = finiteNumber(position.szi);
  if (
    positionValue !== null &&
    signedSize !== null &&
    Math.abs(positionValue) > 0 &&
    Math.abs(signedSize) > 0
  ) {
    return Math.abs(positionValue) / Math.abs(signedSize);
  }

  const entryPrice = finiteNumber(position.entryPx);
  const unrealizedPnl = finiteNumber(position.unrealizedPnl);
  if (
    entryPrice !== null &&
    unrealizedPnl !== null &&
    signedSize !== null &&
    signedSize !== 0
  ) {
    const derivedMarkPrice = entryPrice + unrealizedPnl / signedSize;
    if (Number.isFinite(derivedMarkPrice) && derivedMarkPrice > 0) {
      return derivedMarkPrice;
    }
  }

  return entryPrice;
}
