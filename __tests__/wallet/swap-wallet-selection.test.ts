import {
  resolveSwapBalanceSolanaWalletAddress,
  resolveSwapModalSolanaWalletAddress,
} from '@/lib/wallet/swapWalletSelection';

describe('swap wallet selection', () => {
  it('uses the selected wallet for swap balance display when it differs from the signable wallet', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: 'stored-solana-wallet',
        signableWalletAddress: 'empty-embedded-wallet',
      }),
    ).toBe('stored-solana-wallet');
  });

  it('keeps the selected balance wallet when the signer only differs by case', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        signableWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      }),
    ).toBe('EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG');
  });

  it('falls back to the signable wallet when no selected wallet is available', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: '',
        signableWalletAddress: 'signable-solana-wallet',
      }),
    ).toBe('signable-solana-wallet');
  });

  it('keeps the stale selected wallet on token-driven modal entries so mismatch handling can block signing', () => {
    expect(
      resolveSwapModalSolanaWalletAddress({
        preferredSolanaWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        payTokenWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      }),
    ).toBe('EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG');
  });
});
