export type RedeemWalletType = 'safe' | 'deposit';

export type RedeemWalletPosition = {
  proxyWallet?: string | null;
};

export type RedeemWalletSession = {
  safeAddress?: string | null;
  depositWalletAddress?: string | null;
  walletType?: RedeemWalletType | null;
};

export type RedeemWalletResolution = {
  positionWallet: string;
  walletType: RedeemWalletType;
  depositWalletAddress?: string;
};

export function resolveRedeemWallet(
  position: RedeemWalletPosition,
  session: RedeemWalletSession,
): RedeemWalletResolution | null {
  const positionWallet =
    position.proxyWallet ||
    session.safeAddress ||
    session.depositWalletAddress ||
    null;

  if (!positionWallet) return null;

  const isDepositWallet =
    session.walletType === 'deposit' &&
    Boolean(session.depositWalletAddress) &&
    positionWallet.toLowerCase() ===
      session.depositWalletAddress!.toLowerCase();

  return {
    positionWallet,
    walletType: isDepositWallet ? 'deposit' : 'safe',
    depositWalletAddress: isDepositWallet
      ? session.depositWalletAddress!
      : undefined,
  };
}

export function isSilentRedeemUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Silent redeem signing') ||
    message.includes('signing is not ready') ||
    message.includes('signing failed')
  );
}
