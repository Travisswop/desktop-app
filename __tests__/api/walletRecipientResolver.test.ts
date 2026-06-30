import { resolveWalletRecipientViaBackend } from '@/lib/api/walletRecipientResolver';
import { apiFetch } from '@/lib/api/apiFetch';

jest.mock('@/lib/api/apiFetch', () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('resolveWalletRecipientViaBackend', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('maps backend recipient resolution into ReceiverData', async () => {
    mockedApiFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            address: 'Fw1ETanDZafof7xEULsnq9UY6o71Tpds89tNwPkWLb1v',
            ensName: 'bonfida.sol',
            source: 'sns',
          },
        }),
        { status: 200 },
      ),
    );

    const resolved = await resolveWalletRecipientViaBackend({
      recipientValue: 'bonfida.sol',
      chain: 'SOLANA',
      accessToken: 'token',
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v5/wallet/resolve-recipient',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          recipient: 'bonfida.sol',
          chain: 'SOLANA',
        }),
      }),
    );
    expect(resolved).toEqual({
      address: 'Fw1ETanDZafof7xEULsnq9UY6o71Tpds89tNwPkWLb1v',
      ensName: 'bonfida.sol',
      isEns: true,
      avatar: undefined,
    });
  });

  it('returns null for unresolved recipients', async () => {
    mockedApiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 404 }),
    );

    await expect(
      resolveWalletRecipientViaBackend({
        recipientValue: 'missing.sol',
        chain: 'SOLANA',
        accessToken: 'token',
      }),
    ).resolves.toBeNull();
  });

  it('does not call the backend without an access token', async () => {
    await expect(
      resolveWalletRecipientViaBackend({
        recipientValue: 'bonfida.sol',
        chain: 'SOLANA',
        accessToken: null,
      }),
    ).resolves.toBeNull();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
