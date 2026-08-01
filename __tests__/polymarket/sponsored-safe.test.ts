import { submitSponsoredSafeExecTransaction } from '@/lib/polymarket/sponsored-safe';

const HASH = `0x${'ab'.repeat(32)}` as `0x${string}`;
const OWNER = '0xf3F6A4d1C0a3eF76951a96De4c20365b55EE0f32' as const;
const SAFE = '0x7B4549F1FB48f8411a4B7306f9e834d801e35B4e' as const;
const EXEC_CALLDATA = '0x1234' as const;

describe('Privy-sponsored Safe execution', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('submits the owner EOA transaction on Polygon with Privy sponsorship', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hash: HASH }),
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(
      submitSponsoredSafeExecTransaction({
        appAccessToken: 'swop-token',
        privyAccessToken: 'privy-token',
        walletId: 'wallet-id',
        ownerAddress: OWNER,
        safeAddress: SAFE,
        execCalldata: EXEC_CALLDATA,
        apiBase: 'https://apps.apiswop.co/',
      }),
    ).resolves.toBe(HASH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://apps.apiswop.co/api/v5/wallet/sponsored-transaction-evm',
    );
    expect(init.headers.Authorization).toBe('Bearer swop-token');
    expect(JSON.parse(init.body)).toEqual({
      walletId: 'wallet-id',
      chainId: 137,
      transaction: {
        from: OWNER,
        to: SAFE,
        data: EXEC_CALLDATA,
        value: '0x0',
      },
      privyAccessToken: 'privy-token',
    });
  });

  it('surfaces the sponsor response instead of hiding a funding failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        details: 'Sponsorship policy rejected the transaction',
      }),
    }) as typeof fetch;

    await expect(
      submitSponsoredSafeExecTransaction({
        appAccessToken: 'swop-token',
        privyAccessToken: 'privy-token',
        walletId: 'wallet-id',
        ownerAddress: OWNER,
        safeAddress: SAFE,
        execCalldata: EXEC_CALLDATA,
        apiBase: 'https://apps.apiswop.co',
      }),
    ).rejects.toThrow('Sponsorship policy rejected the transaction');
  });

  it('rejects a success response that has no usable transaction hash', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as typeof fetch;

    await expect(
      submitSponsoredSafeExecTransaction({
        appAccessToken: 'swop-token',
        privyAccessToken: 'privy-token',
        walletId: 'wallet-id',
        ownerAddress: OWNER,
        safeAddress: SAFE,
        execCalldata: EXEC_CALLDATA,
        apiBase: 'https://apps.apiswop.co',
      }),
    ).rejects.toThrow('valid Polygon transaction hash');
  });
});
