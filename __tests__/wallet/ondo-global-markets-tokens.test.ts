import {
  ONDO_GLOBAL_MARKETS_SOURCE,
  buildOndoGlobalMarketsStockAddressSet,
  normalizeJupiterOndoToken,
  normalizeOndoTokenListToken,
} from '@/lib/wallet/ondoGlobalMarkets';

describe('Ondo Global Markets token helpers', () => {
  it('normalizes Ondo token-list EVM tokens for the swap stock category', () => {
    const token = normalizeOndoTokenListToken({
      chainId: 1,
      address: '0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c',
      name: 'Apple (Ondo Tokenized)',
      symbol: 'AAPLon',
      decimals: 18,
      logoURI: 'https://cdn.ondo.finance/tokens/logos/aaplon_160x160.png',
      tags: ['ondo'],
    });

    expect(token).toEqual(
      expect.objectContaining({
        symbol: 'AAPLon',
        address: '0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c',
        chain: 'ETHEREUM',
        chainId: '1',
        network: 'ethereum',
        source: ONDO_GLOBAL_MARKETS_SOURCE,
        isVerified: true,
      }),
    );
    expect(token?.tags).toEqual(
      expect.arrayContaining([
        'ondo',
        ONDO_GLOBAL_MARKETS_SOURCE,
        'stock',
      ]),
    );
  });

  it('excludes BNB Chain Ondo tokens because Swop swap does not integrate BSC', () => {
    expect(
      normalizeOndoTokenListToken({
        chainId: 56,
        address: '0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4',
        name: 'Apple (Ondo Tokenized)',
        symbol: 'AAPLon',
        decimals: 18,
      }),
    ).toBeNull();
  });

  it('normalizes Jupiter Solana Ondo Token-2022 mints', () => {
    const token = normalizeJupiterOndoToken({
      id: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo',
      name: 'Apple (Ondo Tokenized)',
      symbol: 'AAPLon',
      icon: 'https://cdn.ondo.finance/tokens/logos/aaplon_160x160.png',
      decimals: 9,
      tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      usdPrice: 288.57,
      stats24h: { priceChange: 2.85 },
    });

    expect(token).toEqual(
      expect.objectContaining({
        symbol: 'AAPLon',
        address: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo',
        id: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo',
        chain: 'SOLANA',
        chainId: '1151111081099710',
        network: 'solana',
        decimals: 9,
        source: ONDO_GLOBAL_MARKETS_SOURCE,
        isVerified: true,
      }),
    );
    expect(token?.marketData).toEqual({
      price: 288.57,
      change24h: 2.85,
    });
  });

  it('does not classify unrelated Jupiter tokens as Ondo Global Markets', () => {
    expect(
      normalizeJupiterOndoToken({
        id: 'So11111111111111111111111111111111111111112',
        name: 'Wrapped SOL',
        symbol: 'SOL',
      }),
    ).toBeNull();
  });

  it('excludes USDon from the stock defaults', () => {
    expect(
      normalizeOndoTokenListToken({
        chainId: 1,
        address: '0xAcE8E719899F6E91831B18AE746C9A965c2119F1',
        name: 'Ondo U.S. Dollar Token',
        symbol: 'USDon',
        decimals: 18,
      }),
    ).toBeNull();

    expect(
      normalizeJupiterOndoToken({
        id: 'ZPFtoCe7WWqG4N3ZFRccS8T9SMBeHsd1Vmgv2i7ondo',
        name: 'Ondo US Dollar Token',
        symbol: 'USDon',
      }),
    ).toBeNull();
  });

  it('excludes Ondo yield tokens that are not Global Markets stock symbols', () => {
    expect(
      normalizeOndoTokenListToken({
        chainId: 1,
        address: '0x96f6ef951840721adbf46ac996b59e0235cb985c',
        name: 'Ondo US Dollar Yield',
        symbol: 'USDY',
        decimals: 18,
        logoURI: 'https://cdn.ondo.finance/tokens/logos/usdy_160x160.png',
      }),
    ).toBeNull();
  });

  it('builds lowercased stock address overrides from addresses and ids', () => {
    const addresses = buildOndoGlobalMarketsStockAddressSet([
      { address: '0xABCDEF' },
      { id: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo' },
    ]);

    expect(addresses.has('0xabcdef')).toBe(true);
    expect(
      addresses.has(
        '123myenrlm2llysjw3k6oyyh8up1fngj732ig638ondo',
      ),
    ).toBe(true);
  });
});
