import { selectPreferredWallet } from '@/components/wallet/hooks/useWalletData';

type WalletLike = {
  address?: string | null;
  walletClientType?: string | null;
  connectorType?: string | null;
};

type WalletSelectionOptions = {
  preferEmbedded?: boolean;
  embeddedOnly?: boolean;
  preferredAddresses?: Array<string | null | undefined>;
};

type SelectHyperliquidMasterWalletArgs<T extends WalletLike> = {
  wallets?: T[] | null;
  preferredAddresses?: string[];
  options?: WalletSelectionOptions;
  hasSavedAgentKey?: (address: string) => boolean;
};

const normalizeAddress = (address?: string | null) =>
  address?.trim().toLowerCase() ?? '';

const getPreferredAddressMatch = <T extends WalletLike>(
  wallets: T[] | undefined | null,
  preferredAddresses: string[],
) => {
  const available = wallets ?? [];
  for (const preferredAddress of preferredAddresses) {
    const normalizedPreferredAddress = normalizeAddress(preferredAddress);
    if (!normalizedPreferredAddress) continue;
    const wallet = available.find(
      (item) => normalizeAddress(item.address) === normalizedPreferredAddress,
    );
    if (wallet) return wallet;
  }
  return undefined;
};

export function selectHyperliquidMasterWallet<T extends WalletLike>({
  wallets,
  preferredAddresses = [],
  options = {},
  hasSavedAgentKey = () => false,
}: SelectHyperliquidMasterWalletArgs<T>) {
  const mergedOptions = {
    ...options,
    preferredAddresses,
  };
  const primaryAddress = preferredAddresses.find((address) =>
    Boolean(address?.trim()),
  );
  const connectedPreferredWallet = getPreferredAddressMatch(
    wallets,
    preferredAddresses,
  );
  if (connectedPreferredWallet?.address) {
    return connectedPreferredWallet;
  }

  const primaryPreferredWallet = primaryAddress
    ? selectPreferredWallet(wallets, primaryAddress, {
        ...options,
        preferredAddresses: [primaryAddress],
      })
    : undefined;
  if (
    primaryPreferredWallet?.address &&
    normalizeAddress(primaryPreferredWallet.address) ===
      normalizeAddress(primaryAddress)
  ) {
    return primaryPreferredWallet;
  }

  const walletsWithSavedAgent = (wallets ?? []).filter((wallet) =>
    wallet.address ? hasSavedAgentKey(wallet.address) : false,
  );
  const savedAgentWallet = selectPreferredWallet(
    walletsWithSavedAgent,
    primaryAddress,
    mergedOptions,
  );

  return (
    savedAgentWallet ??
    selectPreferredWallet(wallets, primaryAddress, mergedOptions)
  );
}
