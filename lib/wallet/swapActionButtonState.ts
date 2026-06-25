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

export function resolveSwapActionButtonMode({
  isSwapDone,
  hasSolanaWalletMismatch,
}: {
  isSwapDone: boolean;
  hasSolanaWalletMismatch: boolean;
}) {
  if (hasSolanaWalletMismatch) return 'connect_wallet';
  if (isSwapDone) return 'reset';
  return 'execute';
}

export function shouldBlockSolanaSwapExecution({
  isJupiterRoute,
  selectedSolanaSigningWalletAddress,
  hasSelectedSolanaWallet,
  solanaReady,
  solanaStandardWalletsReady,
}: {
  isJupiterRoute: boolean;
  selectedSolanaSigningWalletAddress?: string | null;
  hasSelectedSolanaWallet: boolean;
  solanaReady: boolean;
  solanaStandardWalletsReady: boolean;
}) {
  if (!isJupiterRoute) return false;

  return Boolean(
    selectedSolanaSigningWalletAddress &&
      solanaReady &&
      solanaStandardWalletsReady &&
      !hasSelectedSolanaWallet,
  );
}
