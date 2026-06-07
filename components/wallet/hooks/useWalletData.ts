import { useState, useEffect, useMemo } from 'react';
import { WalletItem } from '@/types/wallet';
import {
  PrivyLinkedAccount,
  isSolanaWalletAccount,
  isEthereumWalletAccount,
  isWalletAccount,
} from '@/types/privy';

type AddressLike = {
  address?: string | null;
  walletClientType?: string | null;
  connectorType?: string | null;
};

type WalletSelectionOptions = {
  preferEmbedded?: boolean;
  embeddedOnly?: boolean;
  preferredAddresses?: Array<string | null | undefined>;
};

type StoredWalletAddresses = {
  ethereumWallet?: string | null;
  ethAddress?: string | null;
  solanaWallet?: string | null;
  solanaAddress?: string | null;
};

const normalizeAddress = (address?: string | null) =>
  address?.toLowerCase() ?? '';

const addressesMatch = (
  left?: string | null,
  right?: string | null,
) =>
  Boolean(left && right) &&
  normalizeAddress(left) === normalizeAddress(right);

const getPreferredAddressMatch = <T extends AddressLike>(
  wallets: T[],
  preferredAddresses?: Array<string | null | undefined>,
) => {
  const normalizedPreferredAddresses = (preferredAddresses ?? [])
    .map(normalizeAddress)
    .filter(Boolean);

  for (const preferredAddress of normalizedPreferredAddresses) {
    const wallet = wallets.find(
      (item) => normalizeAddress(item.address) === preferredAddress,
    );
    if (wallet) return wallet;
  }

  return undefined;
};

const getStoredEvmAddress = (
  storedWallets?: StoredWalletAddresses | null,
) =>
  storedWallets?.ethereumWallet || storedWallets?.ethAddress || '';

const getStoredSolanaAddress = (
  storedWallets?: StoredWalletAddresses | null,
) =>
  storedWallets?.solanaWallet || storedWallets?.solanaAddress || '';

const isEmbeddedAddressLike = (wallet: AddressLike) =>
  wallet.walletClientType === 'privy' ||
  wallet.walletClientType === 'privy-v2' ||
  wallet.connectorType === 'embedded';

export const shouldPreferEmbeddedWallets = () =>
  process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS !== 'true';

export const tradingWalletSelectionOptions = (): WalletSelectionOptions => {
  const useEmbeddedWallet = shouldPreferEmbeddedWallets();
  return useEmbeddedWallet
    ? { preferEmbedded: true, embeddedOnly: true }
    : {};
};

export function selectPreferredWallet<T extends AddressLike>(
  wallets: T[] | undefined | null,
  primaryAddress?: string | null,
  options: WalletSelectionOptions = {},
): T | undefined {
  const available = (wallets ?? []).filter((wallet) => !!wallet.address);
  if (!available.length) return undefined;

  const normalizedPrimary = normalizeAddress(primaryAddress);
  const preferredAddressWallet = getPreferredAddressMatch(
    available,
    options.preferredAddresses,
  );
  if (preferredAddressWallet) return preferredAddressWallet;

  const primary = normalizedPrimary
    ? available.find(
        (wallet) => normalizeAddress(wallet.address) === normalizedPrimary,
      )
    : undefined;
  const embeddedWallets = available.filter(isEmbeddedAddressLike);
  const primaryEmbedded =
    primary && isEmbeddedAddressLike(primary) ? primary : undefined;

  if (options.embeddedOnly) return primaryEmbedded ?? embeddedWallets[0];
  if (options.preferEmbedded && embeddedWallets.length) {
    return primaryEmbedded ?? embeddedWallets[0];
  }
  if (primary) return primary;

  return (
    available.find((wallet) => !isEmbeddedAddressLike(wallet)) ??
    embeddedWallets[0] ??
    available[0]
  );
}

function orderWalletsByPreference<T extends AddressLike>(
  wallets: T[] | undefined | null,
  primaryAddress?: string | null,
  options: WalletSelectionOptions = {},
): T[] {
  const available = (wallets ?? []).filter((wallet) => !!wallet.address);
  const preferred = selectPreferredWallet(
    available,
    primaryAddress,
    options,
  );
  const ordered = preferred ? [preferred] : [];
  const seen = new Set(
    ordered.map((wallet) => normalizeAddress(wallet.address)),
  );

  available.forEach((wallet) => {
    const normalizedAddress = normalizeAddress(wallet.address);
    if (seen.has(normalizedAddress)) return;

    ordered.push(wallet);
    seen.add(normalizedAddress);
  });

  return ordered;
}

// Custom hook for wallet addresses
export const useWalletAddresses = (
  walletData: WalletItem[] | null
) => {
  return useMemo(() => {
    if (!walletData)
      return {
        solWalletAddress: '',
        evmWalletAddress: '',
        evmWalletAddresses: [],
      };

    const solWallet = walletData.find((w) => !w.isEVM);
    const evmWallets = walletData.filter((w) => w.isEVM && w.address);
    const evmWallet = evmWallets[0];
    const evmWalletAddresses = Array.from(
      new Set(evmWallets.map((wallet) => wallet.address).filter(Boolean))
    );

    return {
      solWalletAddress: solWallet?.address || '',
      evmWalletAddress: evmWallet?.address || '',
      evmWalletAddresses,
    };
  }, [walletData]);
};

export const getPortfolioEvmWalletInput = (
  evmWalletAddress?: string,
  evmWalletAddresses: string[] = [],
) =>
  evmWalletAddresses.length ? evmWalletAddresses : evmWalletAddress || '';

// Custom hook for wallet data management.
export const useWalletData = (
  authenticated: boolean,
  ready: boolean,
  PrivyUser: any,
  storedWallets?: StoredWalletAddresses | null,
) => {
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );

  useEffect(() => {
    if (!authenticated || !ready || !PrivyUser) return;

    const linkedAccounts = (PrivyUser.linkedAccounts ||
      []) as PrivyLinkedAccount[];
    const storedEvmAddress = getStoredEvmAddress(storedWallets);
    const storedSolanaAddress = getStoredSolanaAddress(storedWallets);
    const primaryEvmAddress =
      storedEvmAddress || PrivyUser.wallet?.address;

    const walletSelectionOptions = tradingWalletSelectionOptions();

    const solanaAccounts = linkedAccounts.filter(isSolanaWalletAccount);
    const evmAccounts = linkedAccounts.filter(isEthereumWalletAccount);

    const solanaWallet = selectPreferredWallet(
      solanaAccounts,
      undefined,
      {
        ...walletSelectionOptions,
        preferredAddresses: [storedSolanaAddress],
      },
    );

    const evmWallets = orderWalletsByPreference(
      evmAccounts,
      primaryEvmAddress,
      {
        ...walletSelectionOptions,
        preferredAddresses: [storedEvmAddress, primaryEvmAddress],
      },
    );

    const wallets: WalletItem[] = [];
    const seenWallets = new Set<string>();

    const addWallet = (
      address: string | null | undefined,
      isEVM: boolean,
      isActive: boolean,
    ) => {
      if (!address) return;
      const normalizedAddress = normalizeAddress(address);
      if (!normalizedAddress || seenWallets.has(normalizedAddress)) return;

      wallets.push({
        address,
        isActive,
        isEVM,
      });
      seenWallets.add(normalizedAddress);
    };

    if (storedSolanaAddress) {
      addWallet(
        storedSolanaAddress,
        false,
        solanaAccounts.some((wallet) =>
          addressesMatch(wallet.address, storedSolanaAddress),
        ),
      );
    }

    if (solanaWallet && isWalletAccount(solanaWallet)) {
      addWallet(solanaWallet.address, false, true);
    }

    if (storedEvmAddress) {
      addWallet(
        storedEvmAddress,
        true,
        evmAccounts.some((wallet) =>
          addressesMatch(wallet.address, storedEvmAddress),
        ),
      );
    }

    evmWallets.forEach((evmWallet) => {
      if (!isWalletAccount(evmWallet)) return;

      addWallet(evmWallet.address, true, true);
    });

    setWalletData(wallets);
  }, [PrivyUser, authenticated, ready, storedWallets]);

  return walletData;
};
