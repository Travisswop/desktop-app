import { NextRequest } from 'next/server';

import { POST as proxyHyperliquidPost } from '@/app/api/hyperliquid/[...path]/route';

describe('hyperliquid proxy route', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('retries retryable info upstream failures before succeeding', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'temporary' }), {
          status: 500,
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
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('returns a retryable degraded response after repeated info network failures', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: 'hyperliquid_info_unavailable',
      endpoint: 'info',
      failureType: 'network',
      network: 'mainnet',
      retryable: true,
    });
  });

  it('passes non-retryable upstream info errors through without retrying', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await proxyHyperliquidPost(
      new NextRequest('https://www.swopme.app/api/hyperliquid/mainnet/info', {
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      { params: Promise.resolve({ path: ['mainnet', 'info'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'bad request' });
  });
});
