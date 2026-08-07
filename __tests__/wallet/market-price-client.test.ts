jest.mock('@/lib/api/apiFetch', () => ({
  apiFetch: jest.fn(),
}));

import {
  fetchTokenLivePrice,
  fetchTokenLivePriceSnapshot,
  resetMarketPriceCacheForTests,
} from '@/lib/utils/marketPriceClient';
import { apiFetch } from '@/lib/api/apiFetch';

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('market price client', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    resetMarketPriceCacheForTests();
  });

  it('preserves degraded provider metadata from market price responses', async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          prices: {
            '0xabc': {
              price: 2.5,
            },
          },
          degraded: true,
          providerFailures: [
            {
              provider: 'jupiter',
              code: 'dns_failure',
              reason: 'Provider DNS lookup failed',
              retryable: true,
            },
          ],
        },
      }),
    } as Response);

    const outputToken = {
      address: '0xAbC',
      chain: 'ethereum',
      symbol: 'TEST',
      price: '1.5',
    };

    const snapshot = await fetchTokenLivePriceSnapshot({
      outputToken,
      apiUrl: 'https://example.test',
      authToken: 'token',
    });

    expect(snapshot).toEqual({
      price: 2.5,
      degraded: true,
      providerFailures: [
        {
          provider: 'jupiter',
          code: 'dns_failure',
          reason: 'Provider DNS lookup failed',
          retryable: true,
        },
      ],
    });

    await expect(
      fetchTokenLivePrice({
        outputToken,
        apiUrl: 'https://example.test',
        authToken: 'token',
      }),
    ).resolves.toBe(2.5);
  });

  it('uses the fallback price when degraded responses have no live quote', async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          prices: {},
          degraded: true,
          providerFailures: [
            {
              provider: 'alchemy',
              code: 'timeout',
            },
          ],
        },
      }),
    } as Response);

    const snapshot = await fetchTokenLivePriceSnapshot({
      outputToken: {
        address: '0xdef',
        chain: 'ethereum',
        symbol: 'USDC',
      },
      apiUrl: 'https://example.test',
    });

    expect(snapshot.price).toBe(1);
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.providerFailures).toEqual([
      {
        provider: 'alchemy',
        code: 'timeout',
        reason: undefined,
        retryable: undefined,
      },
    ]);
  });
});
