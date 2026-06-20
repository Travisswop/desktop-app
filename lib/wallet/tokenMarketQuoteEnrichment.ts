export type TokenMarketQuote = {
  price?: number | null;
  priceChange24h?: number | null;
  volume24h?: number | null;
  marketCap?: number | null;
};

const STABLE_SYMBOLS = new Set([
  'USDC',
  'USDC.E',
  'USDT',
  'DAI',
  'PUSD',
  'USDCE',
]);

export function getTokenMarketAddress(token: any): string {
  return String(token?.address || token?.id || '').trim();
}

export function getTokenMarketKey(token: any): string {
  return getTokenMarketAddress(token).toLowerCase();
}

export function readTokenPrice(token: any): number | null {
  const raw =
    token?.priceUSD ??
    token?.usdPrice ??
    token?.marketData?.price ??
    token?.marketData?.currentPrice ??
    token?.currentPrice ??
    token?.price;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const symbol = String(token?.symbol || '').toUpperCase();
  if (STABLE_SYMBOLS.has(symbol)) return 1;
  return null;
}

export function readTokenChange24h(token: any): number | null {
  const raw =
    token?.priceChange24h ??
    token?.priceChangePercent24h ??
    token?.priceChangePercentage24h ??
    token?.change24h ??
    token?.changePercent24h ??
    token?.marketData?.priceChange24h ??
    token?.marketData?.priceChangePercent24h ??
    token?.marketData?.priceChangePercentage24h ??
    token?.marketData?.change24h ??
    token?.marketData?.change;
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return parsed;

  const symbol = String(token?.symbol || '').toUpperCase();
  if (STABLE_SYMBOLS.has(symbol)) return 0;
  return null;
}

export function applyTokenMarketQuote(
  token: any,
  quote?: TokenMarketQuote,
) {
  if (!quote) return token;

  const nextPrice =
    typeof quote.price === 'number' && Number.isFinite(quote.price)
      ? quote.price
      : undefined;
  const nextChange =
    typeof quote.priceChange24h === 'number' &&
    Number.isFinite(quote.priceChange24h)
      ? quote.priceChange24h
      : undefined;
  const nextVolume =
    typeof quote.volume24h === 'number' && Number.isFinite(quote.volume24h)
      ? quote.volume24h
      : undefined;
  const nextMarketCap =
    typeof quote.marketCap === 'number' && Number.isFinite(quote.marketCap)
      ? quote.marketCap
      : undefined;

  const priceChanged =
    nextPrice !== undefined && readTokenPrice(token) !== nextPrice;
  const changeChanged =
    nextChange !== undefined && readTokenChange24h(token) !== nextChange;
  const volumeChanged =
    nextVolume !== undefined && token?.marketData?.volume24h !== nextVolume;
  const marketCapChanged =
    nextMarketCap !== undefined &&
    token?.marketData?.marketCap !== nextMarketCap;

  if (
    !priceChanged &&
    !changeChanged &&
    !volumeChanged &&
    !marketCapChanged
  ) {
    return token;
  }

  return {
    ...token,
    priceUSD:
      nextPrice !== undefined ? String(nextPrice) : token?.priceUSD,
    usdPrice:
      nextPrice !== undefined ? String(nextPrice) : token?.usdPrice,
    price: nextPrice !== undefined ? nextPrice : token?.price,
    priceChange24h:
      nextChange !== undefined ? nextChange : token?.priceChange24h,
    marketData: {
      ...(token?.marketData || {}),
      price:
        nextPrice !== undefined
          ? String(nextPrice)
          : token?.marketData?.price,
      currentPrice:
        nextPrice !== undefined
          ? nextPrice
          : token?.marketData?.currentPrice,
      priceChange24h:
        nextChange !== undefined
          ? nextChange
          : token?.marketData?.priceChange24h,
      change:
        nextChange !== undefined
          ? String(nextChange)
          : token?.marketData?.change,
      volume24h: nextVolume ?? token?.marketData?.volume24h,
      marketCap: nextMarketCap ?? token?.marketData?.marketCap,
    },
  };
}

export function enrichTokenListWithMarketQuotes<T extends any[]>(
  list: T,
  quotes: Record<string, TokenMarketQuote>,
): T {
  let changed = false;
  const enriched = list.map((token) => {
    const nextToken = applyTokenMarketQuote(
      token,
      quotes[getTokenMarketKey(token)],
    );
    if (nextToken !== token) changed = true;
    return nextToken;
  });

  return changed ? (enriched as T) : list;
}

export function enrichTokenCategoryListsWithMarketQuotes<
  T extends Record<string, any[]>,
>(categories: T, quotes: Record<string, TokenMarketQuote>): T {
  let changed = false;
  const nextEntries = Object.entries(categories).map(([key, list]) => {
    const nextList = enrichTokenListWithMarketQuotes(list, quotes);
    if (nextList !== list) changed = true;
    return [key, nextList];
  });

  return changed ? (Object.fromEntries(nextEntries) as T) : categories;
}
