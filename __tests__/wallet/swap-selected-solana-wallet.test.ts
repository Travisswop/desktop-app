import { resolveSwapSelectedSolanaWallet } from '@/lib/wallet/swapSelectedSolanaWallet';

describe('resolveSwapSelectedSolanaWallet', () => {
  it('returns a connected standard wallet when the preferred address matches an exposed account', () => {
    const wallet = resolveSwapSelectedSolanaWallet({
      preferredAddress: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      connectedWallets: [],
      standardWallets: [
        {
          name: 'Privy',
          accounts: [
            {
              address: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
            },
          ],
        },
      ],
    });

    expect(wallet?.address).toBe(
      'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
    );
  });

  it('does not fabricate a Privy signer for a preferred address that Privy did not expose', () => {
    const wallet = resolveSwapSelectedSolanaWallet({
      preferredAddress: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      connectedWallets: [],
      standardWallets: [
        {
          name: 'Privy',
          accounts: [],
        },
      ],
    });

    expect(wallet).toBeUndefined();
  });

  it('requires an exact case-sensitive Solana address match', () => {
    const wallet = resolveSwapSelectedSolanaWallet({
      preferredAddress: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      connectedWallets: [],
      standardWallets: [
        {
          name: 'Privy',
          accounts: [
            {
              address: 'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
            },
          ],
        },
      ],
    });

    expect(wallet).toBeUndefined();
  });
});
