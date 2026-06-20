import { shouldDisableSwapActionButton } from '@/lib/wallet/swapActionButtonState';

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
});
