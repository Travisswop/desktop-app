describe('fetchTokenLivePrice', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('fails soft for concurrent native-price readers when the shared request errors', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValue(responsePromise);

    const { fetchTokenLivePrice } = await import('@/lib/utils/marketPriceClient');

    const outputToken = {
      symbol: 'SOL',
      chain: 'solana',
      price: '155.25',
    };

    const firstPricePromise = fetchTokenLivePrice({
      outputToken,
      apiUrl: 'https://app.apiswop.co',
      authToken: 'token-123',
    });

    const secondPricePromise = fetchTokenLivePrice({
      outputToken,
      apiUrl: 'https://app.apiswop.co',
      authToken: 'token-123',
    });

    resolveResponse?.(new Response('{}', { status: 500 }));

    await expect(firstPricePromise).resolves.toBe(155.25);
    await expect(secondPricePromise).resolves.toBe(155.25);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
