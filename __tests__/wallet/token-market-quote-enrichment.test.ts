import {
  enrichTokenCategoryListsWithMarketQuotes,
  enrichTokenListWithMarketQuotes,
  readTokenChange24h,
  readTokenPrice,
} from '@/lib/wallet/tokenMarketQuoteEnrichment';

describe('token market quote enrichment', () => {
  it('keeps the same list reference when cached quote data adds no display changes', () => {
    const token = {
      symbol: 'SOL',
      address: 'So11111111111111111111111111111111111111112',
      priceUSD: '68.96',
    };
    const list = [token];

    const enriched = enrichTokenListWithMarketQuotes(list, {
      so11111111111111111111111111111111111111112: {
        price: 68.96,
      },
    });

    expect(enriched).toBe(list);
    expect(enriched[0]).toBe(token);
    expect(readTokenPrice(enriched[0])).toBe(68.96);
    expect(readTokenChange24h(enriched[0])).toBeNull();
  });

  it('applies a missing price once and then becomes idempotent', () => {
    const token = {
      symbol: 'WET',
      address: 'wet-token-address',
    };
    const list = [token];
    const quotes = {
      'wet-token-address': {
        price: 22.93,
      },
    };

    const first = enrichTokenListWithMarketQuotes(list, quotes);
    const second = enrichTokenListWithMarketQuotes(first, quotes);

    expect(first).not.toBe(list);
    expect(first[0]).not.toBe(token);
    expect(readTokenPrice(first[0])).toBe(22.93);
    expect(readTokenChange24h(first[0])).toBeNull();
    expect(second).toBe(first);
    expect(second[0]).toBe(first[0]);
  });

  it('keeps category objects stable when no contained token changes', () => {
    const categories = {
      stock: [],
      crypto: [
        {
          symbol: 'WBTC',
          address: 'wbtc-token-address',
          marketData: {
            price: '62978',
          },
        },
      ],
      metal: [],
      stable: [],
    };

    const enriched = enrichTokenCategoryListsWithMarketQuotes(categories, {
      'wbtc-token-address': {
        price: 62978,
      },
    });

    expect(enriched).toBe(categories);
    expect(enriched.crypto).toBe(categories.crypto);
  });
});
