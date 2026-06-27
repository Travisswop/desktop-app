import { POST } from '@/app/api/auth/backend-user/route';

describe('backend user auth route', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    process.env.NEXT_PUBLIC_API_URL = 'https://app.apiswop.co/';
    global.fetch = fetchMock;
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  test('proxies email lookup to the backend API', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { _id: 'user_123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await POST(
      new Request('https://www.swopme.app/api/auth/backend-user', {
        method: 'POST',
        body: JSON.stringify({ email: 'astro+test@swop.id' }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v2/desktop/user/astro%2Btest%40swop.id',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { _id: 'user_123' },
    });
  });

  test('proxies Privy lookup and preserves not found status', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await POST(
      new Request('https://www.swopme.app/api/auth/backend-user', {
        method: 'POST',
        body: JSON.stringify({ privyId: 'did:privy:user-123' }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.apiswop.co/api/v2/desktop/user/getPrivyUser/did%3Aprivy%3Auser-123',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: 'User not found',
    });
  });
});
