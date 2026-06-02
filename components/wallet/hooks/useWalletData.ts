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

const normalizeAddress = (address?: string | null) =>
  address?.toLowerCase() ?? '';

const isEmbeddedAddressLike = (wallet: AddressLike) =>
  wallet.walletClientType === 'privy' ||
  wallet.connectorType === 'embedded';

export function selectPreferredWallet<T extends AddressLike>(
  wallets: T[] | undefined | null,
  primaryAddress?: string | null,
): T | undefined {
  const available = (wallets ?? []).filter((wallet) => !!wallet.address);
  if (!available.length) return undefined;

  const normalizedPrimary = normalizeAddress(primaryAddress);
  if (normalizedPrimary) {
    const primary = available.find(
      (wallet) => normalizeAddress(wallet.address) === normalizedPrimary,
    );
    if (primary) return primary;
  }

  return (
    available.find((wallet) => !isEmbeddedAddressLike(wallet)) ??
    available.find(isEmbeddedAddressLike) ??
    available[0]
  );
}

// Custom hook for wallet addresses
export const useWalletAddresses = (
  walletData: WalletItem[] | null
) => {
  return useMemo(() => {
    if (!walletData)
      return { solWalletAddress: '', evmWalletAddress: '' };

    const solWallet = walletData.find((w) => !w.isEVM);
    const evmWallet = walletData.find((w) => w.isEVM);

    return {
      solWalletAddress: solWallet?.address || '',
      evmWalletAddress: evmWallet?.address || '',
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

    const solanaWallet = selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
    );

    const evmWallet = selectPreferredWallet(
      linkedAccounts.filter(isEthereumWalletAccount),
      primaryEvmAddress,
    );

    const wallets: WalletItem[] = [];

    if (solanaWallet && isWalletAccount(solanaWallet)) {
      wallets.push({
        address: solanaWallet.address,
        isActive: true,
        isEVM: false,
      });
    }

    if (evmWallet && isWalletAccount(evmWallet)) {
      wallets.push({
        address: evmWallet.address,
        isActive: true,
        isEVM: true,
      });
    }

    setWalletData(wallets);
  }, [PrivyUser, authenticated, ready]);

  return walletData;
};
