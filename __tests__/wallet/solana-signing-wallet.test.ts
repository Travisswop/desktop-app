import { resolveSolanaSigningWallet } from '@/lib/wallet/solanaSigningWallet';

const connectStandardWallet = (
  wallet: { id: string; accounts?: Array<{ address: string }> },
  account: { address: string },
) => ({
  address: account.address,
  source: `standard:${wallet.id}`,
});

describe('resolveSolanaSigningWallet', () => {
  it('uses the directly connected preferred wallet when available', () => {
    expect(
      resolveSolanaSigningWallet({
        preferredAddress: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        connectedWallets: [
          { address: 'other-solana-wallet', source: 'direct:other' },
          {
            address: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
            source: 'direct:preferred',
          },
        ],
        standardWallets: [],
        makeConnectedStandardWallet: connectStandardWallet,
      })?.source,
    ).toBe('direct:preferred');
  });

  it('falls back to the embedded standard-wallet account for the preferred wallet', () => {
    expect(
      resolveSolanaSigningWallet({
        preferredAddress: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        connectedWallets: [
          { address: 'other-solana-wallet', source: 'direct:other' },
        ],
        standardWallets: [
          {
            id: 'privy-embedded',
            accounts: [
              {
                address: 'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
              },
            ],
          },
        ],
        makeConnectedStandardWallet: connectStandardWallet,
      })?.source,
    ).toBe('standard:privy-embedded');
  });

  it('does not silently use a different wallet when a preferred wallet is missing', () => {
    expect(
      resolveSolanaSigningWallet({
        preferredAddress: 'missing-wallet',
        connectedWallets: [
          { address: 'other-solana-wallet', source: 'direct:other' },
        ],
        standardWallets: [
          {
            id: 'privy-embedded',
            accounts: [{ address: 'different-standard-wallet' }],
          },
        ],
        makeConnectedStandardWallet: connectStandardWallet,
      }),
    ).toBeUndefined();
  });

  it('uses the first direct wallet when no preferred address exists', () => {
    expect(
      resolveSolanaSigningWallet({
        connectedWallets: [
          { address: 'first-solana-wallet', source: 'direct:first' },
        ],
        standardWallets: [],
        makeConnectedStandardWallet: connectStandardWallet,
      })?.source,
    ).toBe('direct:first');
  });
});
