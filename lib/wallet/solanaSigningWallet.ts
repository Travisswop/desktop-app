export type SolanaAddressLike = {
  address?: string | null;
};

export type SolanaStandardWalletLike<
  TAccount extends SolanaAddressLike = SolanaAddressLike,
> = {
  accounts?: readonly TAccount[];
};

export const normalizeSolanaSigningWalletAddress = (
  address?: string | null,
) => address?.trim() ?? '';

export function resolveSolanaSigningWallet<
  TConnected extends SolanaAddressLike,
  TStandardWallet extends SolanaStandardWalletLike<TAccount>,
  TAccount extends SolanaAddressLike,
  TFallback extends SolanaAddressLike,
>({
  connectedWallets,
  standardWallets = [],
  preferredAddress,
  makeConnectedStandardWallet,
}: {
  connectedWallets: readonly TConnected[];
  standardWallets?: readonly TStandardWallet[];
  preferredAddress?: string | null;
  makeConnectedStandardWallet?: (
    wallet: TStandardWallet,
    account: TAccount,
  ) => TFallback;
}): TConnected | TFallback | undefined {
  const normalizedPreferred =
    normalizeSolanaSigningWalletAddress(preferredAddress);

  const findConnected = (address?: string | null) => {
    const normalizedAddress =
      normalizeSolanaSigningWalletAddress(address);
    return connectedWallets.find(
      (wallet) =>
        normalizeSolanaSigningWalletAddress(wallet.address) ===
        normalizedAddress,
    );
  };

  const firstConnected = () =>
    connectedWallets.find((wallet) => Boolean(wallet.address));

  const findStandardAccount = (address?: string | null) => {
    const normalizedAddress =
      normalizeSolanaSigningWalletAddress(address);
    if (!normalizedAddress || !makeConnectedStandardWallet) {
      return undefined;
    }

    for (const wallet of standardWallets) {
      const account = wallet.accounts?.find(
        (candidate) =>
          normalizeSolanaSigningWalletAddress(candidate.address) ===
          normalizedAddress,
      );
      if (account) {
        return makeConnectedStandardWallet(wallet, account);
      }
    }

    return undefined;
  };

  const firstStandardAccount = () => {
    if (!makeConnectedStandardWallet) return undefined;
    for (const wallet of standardWallets) {
      const account = wallet.accounts?.find((candidate) =>
        Boolean(candidate.address),
      );
      if (account) {
        return makeConnectedStandardWallet(wallet, account);
      }
    }
    return undefined;
  };

  if (normalizedPreferred) {
    return (
      findConnected(preferredAddress) ??
      findStandardAccount(preferredAddress)
    );
  }

  return firstConnected() ?? firstStandardAccount();
}
