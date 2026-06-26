import { NextRequest } from 'next/server';
import { GET as getUserFeed } from '@/app/api/feed/user-connect/route';
import { GET as getCopyTradeRewards } from '@/app/api/wallet/copy-trade-rewards/route';
import {
  GET as getRewardWallet,
  POST as claimRewardWallet,
} from '@/app/api/wallet/reward-wallet/route';

describe('backend proxy routes', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    process.env.NEXT_PUBLIC_API_URL = 'https://app.apiswop.co/';
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  test('proxies reward wallet reads with the bearer token', async () => {
    const response = await getRewardWallet(
      new NextRequest('https://www.swopme.app/api/wallet/reward-wallet', {
        headers: { authorization: 'Bearer token-123' },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v5/wallet/reward-wallet',
      expect.objectContaining({ method: 'GET' }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer token-123');
  });

  test('proxies reward claims to the backend claim endpoint', async () => {
    await claimRewardWallet(
      new NextRequest('https://www.swopme.app/api/wallet/reward-wallet', {
        body: JSON.stringify({ destinationWallet: 'DwQt...1HeG' }),
        headers: { authorization: 'Bearer token-123' },
        method: 'POST',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v5/wallet/reward-wallet/claim',
      expect.objectContaining({
        body: JSON.stringify({ destinationWallet: 'DwQt...1HeG' }),
        method: 'POST',
      }),
    );
  });

  test('proxies copy-trade rewards with status and limit query params', async () => {
    await getCopyTradeRewards(
      new NextRequest(
        'https://www.swopme.app/api/wallet/copy-trade-rewards?status=claimable&limit=25',
        { headers: { authorization: 'Bearer token-123' } },
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v5/wallet/copy-trade-rewards?status=claimable&limit=25',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('proxies connected user feed requests', async () => {
    await getUserFeed(
      new NextRequest(
        'https://www.swopme.app/api/feed/user-connect?userId=user+123&page=2&limit=5',
        { headers: { authorization: 'Bearer token-123' } },
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v2/feed/user/connect/user%20123?page=2&limit=5',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('rejects feed requests without a user id', async () => {
    const response = await getUserFeed(
      new NextRequest('https://www.swopme.app/api/feed/user-connect', {
        headers: { authorization: 'Bearer token-123' },
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
