jest.mock('@solana/web3.js', () => {
  const makePublicKey = (value: string) => ({
    value,
    equals(other: { value?: string }) {
      return value === other?.value;
    },
    toString() {
      return value;
    },
  });

  return {
    Connection: jest.fn().mockImplementation(() => ({})),
    PublicKey: jest.fn().mockImplementation(makePublicKey),
  };
});

jest.mock('@solana/spl-token', () => {
  const getAccount = jest.fn();
  return {
    __getAccount: getAccount,
    getAccount,
    TOKEN_PROGRAM_ID: {
      value: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    },
  };
});

import {
  ensureSponsoredSolanaTokenAccount,
  isNativeSolMint,
  isSolanaInvalidAccountDataError,
  retrySolanaInvalidAccountData,
} from '@/lib/solana/sponsoredTokenAccounts';

const web3Mock = jest.requireMock('@solana/web3.js') as {
  Connection: jest.Mock;
  PublicKey: jest.Mock;
};
const splTokenMock = jest.requireMock('@solana/spl-token') as {
  __getAccount: jest.Mock;
};

describe('sponsored token accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://rpc.example';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  });

  it('skips native SOL mints', async () => {
    await expect(
      ensureSponsoredSolanaTokenAccount({
        ownerAddress: 'owner',
        mint: 'So11111111111111111111111111111111111111112',
      }),
    ).resolves.toEqual({
      success: true,
      skipped: true,
      created: false,
    });

    expect(isNativeSolMint('So11111111111111111111111111111111111111112')).toBe(
      true,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('waits for the prepared token account to be readable', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        tokenAccount: 'preparedTokenAccount',
        tokenProgramId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        created: true,
      }),
    });
    splTokenMock.__getAccount.mockResolvedValue({
      mint: {
        value: 'tokenMint',
        equals(other: { value?: string }) {
          return this.value === other?.value;
        },
      },
      owner: {
        value: 'recipientWallet',
        equals(other: { value?: string }) {
          return this.value === other?.value;
        },
      },
    });

    const result = await ensureSponsoredSolanaTokenAccount({
      ownerAddress: 'recipientWallet',
      mint: 'tokenMint',
      accessToken: 'access-token',
      label: 'recipient SWOP',
    });

    expect(result.created).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v5/wallet/ensure-user-token-account',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
    expect(web3Mock.Connection).toHaveBeenCalledWith(
      'https://rpc.example',
      'finalized',
    );
    expect(web3Mock.PublicKey).toHaveBeenCalledWith('preparedTokenAccount');
    expect(splTokenMock.__getAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ value: 'preparedTokenAccount' }),
      'finalized',
      expect.objectContaining({
        value: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      }),
    );
  });

  it('identifies and retries Solana invalid account data races', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(
        new Error(
          'Transaction simulation failed: InvalidAccountData: invalid account data for instruction',
        ),
      )
      .mockResolvedValueOnce('signature');

    await expect(
      retrySolanaInvalidAccountData(run, { retryDelayMs: 0 }),
    ).resolves.toBe('signature');

    expect(run).toHaveBeenCalledTimes(2);
    expect(
      isSolanaInvalidAccountDataError(
        new Error('Program TokenkegQfe failed: invalid account data for instruction'),
      ),
    ).toBe(true);
  });

  it('returns a short sync error when the Solana invalid account data race persists', async () => {
    const run = jest
      .fn()
      .mockRejectedValue(
        new Error(
          'Transaction simulation failed: InvalidAccountData: invalid account data for instruction',
        ),
      );

    await expect(
      retrySolanaInvalidAccountData(run, {
        label: 'Recipient SWOP token account',
        retryDelayMs: 0,
      }),
    ).rejects.toThrow(
      'Recipient SWOP token account is still syncing with Solana. Please try again in a moment.',
    );
    expect(run).toHaveBeenCalledTimes(2);
  });
});
