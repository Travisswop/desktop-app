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
