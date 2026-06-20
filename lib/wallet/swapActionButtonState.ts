export function shouldDisableSwapActionButton({
  isSwapDone,
  isSwapping,
  isConnectingSigningWallet,
  balanceIsValid,
  hasGasBalanceError,
  hasSolanaWalletMismatch,
  isSwapButtonLoading,
  hasPayToken,
  hasReceiveToken,
  hasPayAmount,
  hasReceiveAmount,
  privyReady,
}: {
  isSwapDone: boolean;
  isSwapping: boolean;
  isConnectingSigningWallet: boolean;
  balanceIsValid: boolean;
  hasGasBalanceError: boolean;
  hasSolanaWalletMismatch: boolean;
  isSwapButtonLoading: boolean;
  hasPayToken: boolean;
  hasReceiveToken: boolean;
  hasPayAmount: boolean;
  hasReceiveAmount: boolean;
  privyReady: boolean;
}) {
  if (isSwapDone) return false;
  if (isSwapping || isConnectingSigningWallet) return true;

  if (hasSolanaWalletMismatch) {
    return !privyReady;
  }

  return (
    !balanceIsValid ||
    hasGasBalanceError ||
    isSwapButtonLoading ||
    !hasPayToken ||
    !hasReceiveToken ||
    !hasPayAmount ||
    !hasReceiveAmount
  );
}
