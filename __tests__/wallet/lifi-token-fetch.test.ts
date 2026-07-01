import { fetchTokensFromLiFi } from '@/actions/lifiForTokenSwap';

describe('fetchTokensFromLiFi', () => {
  const originalFetch = global.fetch;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch;
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  test('returns the token list for the requested chain when LiFi responds normally', async () => {
    const tokens = [{ address: '0xabc', symbol: 'USDC' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          tokens: {
            '137': tokens,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(fetchTokensFromLiFi('137')).resolves.toEqual(tokens);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('returns an empty list and logs a bounded reason when LiFi omits the tokens map', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'shape changed' }), { status: 200 }),
    );

    await expect(fetchTokensFromLiFi('137')).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Li.Fi tokens payload missing tokens map for chain 137',
    );
  });

  test('returns an empty list and logs a bounded reason when LiFi returns a non-record tokens map', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ tokens: [] }), { status: 200 }),
    );

    await expect(fetchTokensFromLiFi('137')).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Li.Fi tokens payload has invalid tokens map for chain 137',
    );
  });

  test('returns an empty list and logs a bounded reason when LiFi returns a non-array token list for the requested chain', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          tokens: {
            '137': { address: '0xabc' },
          },
        }),
        { status: 200 },
      ),
    );

    await expect(fetchTokensFromLiFi('137')).resolves.toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Li.Fi tokens payload has invalid token list for chain 137',
    );
  });
});
