import { WalletService } from '@/services/wallet-service';

describe('WalletService', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    process.env.NEXT_PUBLIC_API_URL = 'https://app.apiswop.co';
    global.fetch = fetchMock;
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  test('retries authenticated token reads through the same-origin route after a browser network failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { tokens: [], totalValue: '0', tokenCount: 0 },
        }),
        status: 200,
      } as Response);

    const result = await WalletService.getWalletTokens(
      [{ address: '0xabc', chain: 'ethereum' }],
      'token-123',
    );

    expect(result).toEqual({ tokens: [], totalValue: '0', tokenCount: 0 });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://app.apiswop.co/api/v5/wallet/tokens',
      expect.objectContaining({
        credentials: undefined,
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/wallet/tokens',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  test('does not retry backend HTTP errors through the same-origin route', async () => {
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 401,
    }) as Response);

    await expect(
      WalletService.getWalletTokens(
        [{ address: '0xabc', chain: 'ethereum' }],
        'token-123',
      ),
    ).rejects.toThrow('Failed to fetch wallet tokens: 401');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
