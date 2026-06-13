import { useState, useEffect, useMemo } from 'react';
import { WalletItem } from '@/types/wallet';
import {
  PrivyLinkedAccount,
  isSolanaWalletAccount,
  isEthereumWalletAccount,
  isPrivyEmbeddedWallet,
} from '@/types/privy';

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

// Custom hook for wallet data management — returns only embedded Privy wallets
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

    // Find the embedded Privy wallet for each chain.
    // walletClientType === 'privy' is the canonical identifier for embedded wallets.
    const embeddedSolana = linkedAccounts
      .filter(isSolanaWalletAccount)
      .find(isPrivyEmbeddedWallet);

    const embeddedEvm = linkedAccounts
      .filter(isEthereumWalletAccount)
      .find(isPrivyEmbeddedWallet);

    const wallets: WalletItem[] = [];

    if (embeddedSolana) {
      wallets.push({
        address: embeddedSolana.address,
        isActive: true,
        isEVM: false,
      });
    }

    if (embeddedEvm) {
      wallets.push({
        address: embeddedEvm.address,
        isActive: true,
        isEVM: true,
      });
    }

    setWalletData(wallets);
  }, [PrivyUser, authenticated, ready]);

  return walletData;
};
