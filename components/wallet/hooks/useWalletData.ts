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
};

const normalizeAddress = (address?: string | null) =>
  address?.toLowerCase() ?? '';

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

// Custom hook for wallet data management.
export const useWalletData = (
  authenticated: boolean,
  ready: boolean,
  PrivyUser: any
) => {
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );

  useEffect(() => {
    if (!authenticated || !ready || !PrivyUser) return;

    const linkedAccounts = (PrivyUser.linkedAccounts ||
      []) as PrivyLinkedAccount[];
    const primaryEvmAddress = PrivyUser.wallet?.address;

    const walletSelectionOptions = tradingWalletSelectionOptions();

    const solanaWallet = selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
      undefined,
      walletSelectionOptions,
    );

    const evmWallets = orderWalletsByPreference(
      linkedAccounts.filter(isEthereumWalletAccount),
      primaryEvmAddress,
      walletSelectionOptions,
    );

    const wallets: WalletItem[] = [];

    if (solanaWallet && isWalletAccount(solanaWallet)) {
      wallets.push({
        address: solanaWallet.address,
        isActive: true,
        isEVM: false,
      });
    }

    evmWallets.forEach((evmWallet) => {
      if (!isWalletAccount(evmWallet)) return;

      wallets.push({
        address: evmWallet.address,
        isActive: true,
        isEVM: true,
      });
    });

    setWalletData(wallets);
  }, [PrivyUser, authenticated, ready]);

  return walletData;
};
