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

export type StoredWalletAddresses = {
  privyId?: string | null;
  ethereumWallet?: string | null;
  ethAddress?: string | null;
  solanaWallet?: string | null;
  solanaAddress?: string | null;
};

const normalizeAddress = (address?: string | null) =>
  address?.toLowerCase() ?? '';

export const getStoredEvmWalletAddress = (
  storedWallets?: StoredWalletAddresses | null,
) => storedWallets?.ethereumWallet || storedWallets?.ethAddress || '';

export const getStoredSolanaWalletAddress = (
  storedWallets?: StoredWalletAddresses | null,
) => storedWallets?.solanaWallet || storedWallets?.solanaAddress || '';

export const privyUserMatchesStoredWalletUser = (
  privyUserId?: string | null,
  storedWallets?: StoredWalletAddresses | null,
) =>
  !storedWallets?.privyId ||
  !privyUserId ||
  storedWallets.privyId === privyUserId;

export const shouldUseStoredWalletAddresses = (
  privyUserId?: string | null,
  storedWallets?: StoredWalletAddresses | null,
  activeEvmAddress?: string | null,
  activeSolanaAddress?: string | null,
) => {
  const storedEvmAddress = getStoredEvmWalletAddress(storedWallets);
  const storedSolanaAddress = getStoredSolanaWalletAddress(storedWallets);
  if (!storedEvmAddress && !storedSolanaAddress) return false;

  if (!privyUserMatchesStoredWalletUser(privyUserId, storedWallets)) {
    return true;
  }

  return Boolean(
    (storedEvmAddress &&
      activeEvmAddress &&
      !walletAddressEquals(storedEvmAddress, activeEvmAddress)) ||
      (storedSolanaAddress &&
        activeSolanaAddress &&
        !walletAddressEquals(storedSolanaAddress, activeSolanaAddress)),
  );
};

export const walletAddressEquals = (
  a?: string | null,
  b?: string | null,
) => normalizeAddress(a) === normalizeAddress(b);

const addressesMatch = (
  left?: string | null,
  right?: string | null,
) => walletAddressEquals(left, right);

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
) => getStoredEvmWalletAddress(storedWallets);

const getStoredSolanaAddress = (
  storedWallets?: StoredWalletAddresses | null,
) => getStoredSolanaWalletAddress(storedWallets);

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

  const embeddedWallets = available.filter(isEmbeddedAddressLike);
  const selectableWallets = options.embeddedOnly
    ? embeddedWallets
    : available;
  if (!selectableWallets.length) return undefined;

  const normalizedPrimary = normalizeAddress(primaryAddress);
  const preferredAddressWallet = getPreferredAddressMatch(
    selectableWallets,
    options.preferredAddresses,
  );
  if (preferredAddressWallet) return preferredAddressWallet;

  const primary = normalizedPrimary
    ? selectableWallets.find(
        (wallet) => normalizeAddress(wallet.address) === normalizedPrimary,
      )
    : undefined;
  const primaryEmbedded =
    primary && isEmbeddedAddressLike(primary) ? primary : undefined;

  if (options.embeddedOnly) return primary ?? embeddedWallets[0];
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

const addUniqueWallet = (
  wallets: WalletItem[],
  seenWallets: Set<string>,
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

export const getStoredWalletData = (
  storedWallets?: StoredWalletAddresses | null,
): WalletItem[] => {
  const wallets: WalletItem[] = [];
  const seenWallets = new Set<string>();

  addUniqueWallet(
    wallets,
    seenWallets,
    getStoredSolanaAddress(storedWallets),
    false,
    false,
  );
  addUniqueWallet(
    wallets,
    seenWallets,
    getStoredEvmAddress(storedWallets),
    true,
    false,
  );

  return wallets;
};

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
) => {
  const orderedAddresses: string[] = [];
  const seenAddresses = new Set<string>();

  [evmWalletAddress, ...evmWalletAddresses].forEach((address) => {
    const normalizedAddress = normalizeAddress(address);
    if (!address || !normalizedAddress || seenAddresses.has(normalizedAddress)) {
      return;
    }

    orderedAddresses.push(address);
    seenAddresses.add(normalizedAddress);
  });

  if (orderedAddresses.length > 1) return orderedAddresses;
  return orderedAddresses[0] || '';
};

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
    const storedEvmAddress = getStoredEvmAddress(storedWallets);
    const storedSolanaAddress = getStoredSolanaAddress(storedWallets);
    const storedWalletData = getStoredWalletData(storedWallets);

    if (!authenticated || !ready || !PrivyUser) {
      setWalletData(storedWalletData.length ? storedWalletData : null);
      return;
    }

    const linkedAccounts = (PrivyUser.linkedAccounts ||
      []) as PrivyLinkedAccount[];
    const primaryEvmAddress =
      storedEvmAddress || PrivyUser.wallet?.address;
    const hasStoredWallets = Boolean(storedEvmAddress || storedSolanaAddress);

    const walletSelectionOptions = tradingWalletSelectionOptions();

    const solanaWallet = selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
      undefined,
      {
        ...walletSelectionOptions,
        preferredAddresses: [storedSolanaAddress],
      },
    );

    const evmWallets = orderWalletsByPreference(
      linkedAccounts.filter(isEthereumWalletAccount),
      primaryEvmAddress,
      {
        ...walletSelectionOptions,
        preferredAddresses: [storedEvmAddress, primaryEvmAddress],
      },
    );

    if (
      shouldUseStoredWalletAddresses(
        PrivyUser?.id,
        storedWallets,
        evmWallets[0]?.address,
        solanaWallet?.address,
      )
    ) {
      setWalletData(
        storedWalletData.map((wallet) => ({ ...wallet, isActive: true })),
      );
      return;
    }

    const wallets: WalletItem[] = [];
    const seenWallets = new Set<string>();

    if (storedSolanaAddress) {
      addUniqueWallet(
        wallets,
        seenWallets,
        storedSolanaAddress,
        false,
        linkedAccounts
          .filter(isSolanaWalletAccount)
          .some((wallet) =>
            addressesMatch(wallet.address, storedSolanaAddress),
          ),
      );
    }

    if (solanaWallet && isWalletAccount(solanaWallet)) {
      addUniqueWallet(
        wallets,
        seenWallets,
        solanaWallet.address,
        false,
        true,
      );
    }

    if (storedEvmAddress) {
      addUniqueWallet(
        wallets,
        seenWallets,
        storedEvmAddress,
        true,
        linkedAccounts
          .filter(isEthereumWalletAccount)
          .some((wallet) =>
            addressesMatch(wallet.address, storedEvmAddress),
          ),
      );
    }

    evmWallets.forEach((evmWallet) => {
      if (!isWalletAccount(evmWallet)) return;
      addUniqueWallet(
        wallets,
        seenWallets,
        evmWallet.address,
        true,
        true,
      );
    });

    if (wallets.length === 0 && hasStoredWallets) {
      if (storedSolanaAddress) {
        wallets.push({
          address: storedSolanaAddress,
          isActive: true,
          isEVM: false,
        });
      }
      if (storedEvmAddress) {
        wallets.push({
          address: storedEvmAddress,
          isActive: true,
          isEVM: true,
        });
      }
    }

    setWalletData(wallets);
  }, [PrivyUser, authenticated, ready, storedWallets]);

  return walletData;
};
