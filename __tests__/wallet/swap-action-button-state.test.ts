import {
  resolveSwapActionButtonMode,
  shouldBlockSolanaSwapExecution,
  shouldDisableSwapActionButton,
} from '@/lib/wallet/swapActionButtonState';
import { resolveSwapBalanceSolanaWalletAddress } from '@/lib/wallet/swapWalletSelection';

const baseInput = {
  isSwapDone: false,
  isSwapping: false,
  isConnectingSigningWallet: false,
  balanceIsValid: true,
  hasGasBalanceError: false,
  hasSolanaWalletMismatch: false,
  isSwapButtonLoading: false,
  hasPayToken: true,
  hasReceiveToken: true,
  hasPayAmount: true,
  hasReceiveAmount: true,
  privyReady: true,
};

describe('swap action button state', () => {
  it('keeps normal swap disabled until an amount is entered', () => {
    expect(
      shouldDisableSwapActionButton({
        ...baseInput,
        hasPayAmount: false,
        hasReceiveAmount: false,
      }),
    ).toBe(true);
  });

  it('lets the user connect the signing wallet when the selected Solana balance wallet is missing', () => {
    expect(
      shouldDisableSwapActionButton({
        ...baseInput,
        hasSolanaWalletMismatch: true,
        hasPayAmount: false,
        hasReceiveAmount: false,
      }),
    ).toBe(false);
  });

  it('does not open wallet connect before Privy is ready', () => {
    expect(
      shouldDisableSwapActionButton({
        ...baseInput,
        hasSolanaWalletMismatch: true,
        privyReady: false,
      }),
    ).toBe(true);
  });

  it('keeps the CTA in connect-wallet mode for a Solana signer mismatch', () => {
    expect(
      resolveSwapActionButtonMode({
        isSwapDone: false,
        hasSolanaWalletMismatch: true,
      }),
    ).toBe('connect_wallet');
  });

  it('blocks Jupiter submit when the selected Solana balance wallet is not signable', () => {
    expect(
      shouldBlockSolanaSwapExecution({
        isJupiterRoute: true,
        selectedSolanaSigningWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        hasSelectedSolanaWallet: false,
        solanaReady: true,
        solanaStandardWalletsReady: true,
      }),
    ).toBe(true);
  });

  it('blocks Jupiter submit when a case-drifted balance wallet no longer matches the connected signer', () => {
    const selectedSolanaSigningWalletAddress =
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        signableWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      });

    expect(selectedSolanaSigningWalletAddress).toBe(
      'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
    );
    expect(
      shouldBlockSolanaSwapExecution({
        isJupiterRoute: true,
        selectedSolanaSigningWalletAddress,
        hasSelectedSolanaWallet: false,
        solanaReady: true,
        solanaStandardWalletsReady: true,
      }),
    ).toBe(true);
  });

  it('does not block non-Jupiter submit paths when the Solana signer is unavailable', () => {
    expect(
      shouldBlockSolanaSwapExecution({
        isJupiterRoute: false,
        selectedSolanaSigningWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        hasSelectedSolanaWallet: false,
        solanaReady: true,
        solanaStandardWalletsReady: true,
      }),
    ).toBe(false);
  });
});
