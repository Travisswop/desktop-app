import { NextRequest } from 'next/server';

import { GET as getPositions } from '@/app/api/polymarket/positions/route';

describe('polymarket positions route', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('returns 400 when the user query param is missing', async () => {
    const response = await getPositions(
      new NextRequest('https://www.swopme.app/api/polymarket/positions'),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'User address is required',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves retryable upstream failure details for positions reads', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Failed to fetch positions',
          code: 'UPSTREAM_RATE_LIMIT',
          dependency: 'polymarket-data',
          failedAddresses: ['0xabc', '0xdef'],
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '2',
          },
        },
      ),
    );

    const response = await getPositions(
      new NextRequest(
        'https://www.swopme.app/api/polymarket/positions?user=0x123',
      ),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('2');
    expect(response.headers.get('cache-control')).toBe(
      'no-store, max-age=0',
    );
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to fetch positions',
      code: 'UPSTREAM_RATE_LIMIT',
      dependency: 'polymarket-data',
      failedAddresses: ['0xabc', '0xdef'],
      retryable: true,
    });
  });

  it('passes through partial-data metadata on successful upstream responses', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-polymarket-partial-data': 'true',
          },
        }),
      );

    const response = await getPositions(
      new NextRequest(
        'https://www.swopme.app/api/polymarket/positions?user=0x123',
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-polymarket-partial-data')).toBe('true');
    expect(response.headers.get('cache-control')).toBe(
      'no-store, max-age=0',
    );
    await expect(response.json()).resolves.toEqual([]);
  });
});
