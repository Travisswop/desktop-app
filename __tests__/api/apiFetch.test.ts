import { apiFetch } from '@/lib/api/apiFetch';

describe('apiFetch', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalWindow = global.window;

  beforeEach(() => {
    global.fetch = jest.fn(async () => new Response('{}')) as typeof fetch;
    process.env.NEXT_PUBLIC_API_URL = 'https://app.apiswop.co';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: originalWindow,
    });
    jest.clearAllMocks();
  });

  function getFetchHeaders() {
    const fetchMock = global.fetch as jest.Mock;
    const [, options] = fetchMock.mock.calls[0];
    return new Headers(options?.headers);
  }

  test('does not add the ngrok bypass header to production API requests', async () => {
    await apiFetch('https://app.apiswop.co/api/v2/desktop/user/test');

    expect(getFetchHeaders().has('ngrok-skip-browser-warning')).toBe(false);
  });

  test('adds the ngrok bypass header only for ngrok tunnel requests', async () => {
    await apiFetch('https://marlin-finer-bluegill.ngrok-free.app/health');

    expect(getFetchHeaders().get('ngrok-skip-browser-warning')).toBe('true');
  });

  test('preserves caller-provided headers', async () => {
    await apiFetch('https://app.apiswop.co/api/v2/desktop/user/test', {
      headers: { Authorization: 'Bearer token' },
    });

    expect(getFetchHeaders().get('Authorization')).toBe('Bearer token');
  });

  test('retries Swop backend API requests through the same-origin proxy after native network failures', async () => {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { location: { hostname: 'www.swopme.app' } },
    });
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const response = await apiFetch(
      'https://app.apiswop.co/api/v5/wallet/getBalance/user-123?period=7d',
      { headers: { Authorization: 'Bearer token-123' } },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/api/backend/api/v5/wallet/getBalance/user-123?period=7d',
    );
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(
      new Headers(fetchMock.mock.calls[1][1].headers).get('Authorization'),
    ).toBe('Bearer token-123');
  });

  test('does not retry HTTP errors or non-Swop network failures through the proxy', async () => {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { location: { hostname: 'www.swopme.app' } },
    });
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const httpResponse = await apiFetch(
      'https://app.apiswop.co/api/v5/wallet/getBalance/user-123',
    );

    expect(httpResponse.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiFetch('https://example.com/api/test')).rejects.toThrow(
      'Failed to fetch',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
