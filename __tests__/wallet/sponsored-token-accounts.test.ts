jest.mock('@solana/web3.js', () => {
  const getAccountInfo = jest.fn();
  return {
    __getAccountInfo: getAccountInfo,
    Connection: jest.fn().mockImplementation(() => ({
      getAccountInfo,
    })),
    PublicKey: jest.fn().mockImplementation((value: string) => ({
      value,
    })),
  };
});

import {
  ensureSponsoredSolanaTokenAccount,
  isNativeSolMint,
} from '@/lib/solana/sponsoredTokenAccounts';

const web3Mock = jest.requireMock('@solana/web3.js') as {
  __getAccountInfo: jest.Mock;
  Connection: jest.Mock;
  PublicKey: jest.Mock;
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
    web3Mock.__getAccountInfo.mockResolvedValue({ lamports: 1 });

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
      'confirmed',
    );
    expect(web3Mock.PublicKey).toHaveBeenCalledWith('preparedTokenAccount');
    expect(web3Mock.__getAccountInfo).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'preparedTokenAccount' }),
      'confirmed',
    );
  });
});
