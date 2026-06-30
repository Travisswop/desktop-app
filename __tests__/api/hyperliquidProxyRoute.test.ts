import { NextRequest } from 'next/server';
import { POST as proxyHyperliquidPost } from '@/app/api/hyperliquid/[...path]/route';

describe('hyperliquid proxy route', () => {
  const fetchMock = jest.fn();
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test('rejects requests without an endpoint', async () => {
    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet', {
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet'] }) },
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('retries transient info failures once and preserves retry headers', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'upstream unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-hyperliquid-proxy-attempts')).toBe('2');
    expect(response.headers.get('x-hyperliquid-proxy-retried')).toBe('true');
    expect(response.headers.get('x-hyperliquid-proxy-retryable')).toBe('true');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  test('does not retry non-info endpoints on upstream failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'exchange unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await proxyHyperliquidPost(
      new NextRequest(
        'https://www.swopme.app/api/hyperliquid/mainnet/exchange',
        {
          body: JSON.stringify({ type: 'order' }),
          method: 'POST',
        },
      ),
      { params: Promise.resolve({ path: ['mainnet', 'exchange'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(503);
    expect(response.headers.get('x-hyperliquid-proxy-attempts')).toBe('1');
    expect(response.headers.get('x-hyperliquid-proxy-retried')).toBe('false');
    expect(response.headers.get('x-hyperliquid-proxy-retryable')).toBe(
      'false',
    );
  });

  test('returns a bounded retryable 502 contract when info fetches keep throwing', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'userFills', user: '0xabc' }),
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(502);
    expect(response.headers.get('x-hyperliquid-proxy-attempts')).toBe('2');
    expect(response.headers.get('x-hyperliquid-proxy-retried')).toBe('true');
    expect(response.headers.get('x-hyperliquid-proxy-error')).toBe('timeout');
    await expect(response.json()).resolves.toEqual({
      error: 'Hyperliquid upstream request failed',
      reason: 'timeout',
      retryable: true,
      source: 'hyperliquid_proxy',
    });
  });

  test('classifies dns failures separately from generic fetch failures', async () => {
    const dnsError = new TypeError('fetch failed') as TypeError & {
      cause?: { code: string; message: string };
    };
    dnsError.cause = {
      code: 'ENOTFOUND',
      message: 'getaddrinfo ENOTFOUND api.hyperliquid.xyz',
    };

    fetchMock.mockRejectedValueOnce(dnsError).mockRejectedValueOnce(dnsError);

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'userFills', user: '0xabc' }),
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(502);
    expect(response.headers.get('x-hyperliquid-proxy-error')).toBe(
      'dns_unavailable',
    );
    expect(response.headers.get('x-hyperliquid-proxy-error-detail')).toBe(
      'ENOTFOUND',
    );
    await expect(response.json()).resolves.toEqual({
      error: 'Hyperliquid upstream request failed',
      reason: 'dns_unavailable',
      retryable: true,
      source: 'hyperliquid_proxy',
    });
  });

  test('classifies nested dns failures from fetch cause chains', async () => {
    const nestedDnsError = new TypeError('fetch failed') as TypeError & {
      cause?: {
        message: string;
        cause: { code: string; message: string };
      };
    };
    nestedDnsError.cause = {
      message: 'socket connection failed',
      cause: {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.hyperliquid.xyz',
      },
    };

    fetchMock
      .mockRejectedValueOnce(nestedDnsError)
      .mockRejectedValueOnce(nestedDnsError);

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'userFills', user: '0xabc' }),
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(502);
    expect(response.headers.get('x-hyperliquid-proxy-error')).toBe(
      'dns_unavailable',
    );
    expect(response.headers.get('x-hyperliquid-proxy-error-detail')).toBe(
      'ENOTFOUND',
    );
    await expect(response.json()).resolves.toEqual({
      error: 'Hyperliquid upstream request failed',
      reason: 'dns_unavailable',
      retryable: true,
      source: 'hyperliquid_proxy',
    });
  });

  test('stops retrying and classifies downstream aborts explicitly', async () => {
    const controller = new AbortController();
    controller.abort();

    fetchMock.mockImplementationOnce(async (_input, init) => {
      expect(init?.signal?.aborted).toBe(true);
      throw new DOMException('The operation was aborted.', 'AbortError');
    });

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'userFills', user: '0xabc' }),
        method: 'POST',
        signal: controller.signal,
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(499);
    expect(response.headers.get('x-hyperliquid-proxy-error')).toBe(
      'client_abort',
    );
    await expect(response.json()).resolves.toEqual({
      error: 'Hyperliquid upstream request failed',
      reason: 'client_abort',
      retryable: false,
      source: 'hyperliquid_proxy',
    });
  });
});
