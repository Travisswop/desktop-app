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

  it('uses the connected signer casing when the stored Solana wallet only differs by case', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        signableWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      }),
    ).toBe('EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG');
  });

  it('falls back to the signable wallet when no selected wallet is available', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: '',
        signableWalletAddress: 'signable-solana-wallet',
      }),
    ).toBe('signable-solana-wallet');
  });

  it('preserves the connected signer casing when the stored selected address only drifted by case', () => {
    expect(
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress: 'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        signableWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      }),
    ).toBe('EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG');
  });

  it('keeps the canonical preferred signer ahead of a stale token wallet on token-driven modal entries', () => {
    expect(
      resolveSwapModalSolanaWalletAddress({
        preferredSolanaWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        payTokenWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
      }),
    ).toBe('EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG');
  });
});
