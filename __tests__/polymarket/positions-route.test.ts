import { NextRequest } from 'next/server';

import { GET as getPositions } from '@/app/api/polymarket/positions/route';

describe('polymarket positions route', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('preserves upstream failure details and status for retryable position errors', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Failed to fetch positions',
          failedAddresses: ['0xabc', '0xdef'],
        }),
        {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const response = await getPositions(
      new NextRequest(
        'https://www.swopme.app/api/polymarket/positions?user=0x123',
      ),
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to fetch positions',
      failedAddresses: ['0xabc', '0xdef'],
      retryable: true,
    });
  });

  it('passes through the partial-data header on successful upstream responses', async () => {
    fetchMock.mockResolvedValueOnce(
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
    await expect(response.json()).resolves.toEqual([]);
  });
});
