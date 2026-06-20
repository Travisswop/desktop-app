import { resolveSwapBalanceSolanaWalletAddress } from '@/lib/wallet/swapWalletSelection';

describe('swap wallet selection', () => {
  it('uses the selected wallet for swap balance display when it differs from the signable wallet', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: 'stored-solana-wallet',
        signableWalletAddress: 'empty-embedded-wallet',
      }),
    ).toBe('stored-solana-wallet');
  });

  it('falls back to the signable wallet when no selected wallet is available', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: '',
        signableWalletAddress: 'signable-solana-wallet',
      }),
    ).toBe('signable-solana-wallet');
  });
});
