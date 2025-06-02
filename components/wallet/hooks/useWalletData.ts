import { useState, useEffect, useMemo } from 'react';
import { WalletItem } from '@/types/wallet';
import { isWalletAccount } from '../utils/typeGuards';

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

// Custom hook for wallet data management
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

    const linkWallet = PrivyUser.linkedAccounts
      .filter(isWalletAccount)
      .filter(
        (item: any) =>
          item.chainType === 'ethereum' || item.chainType === 'solana'
      )
      .map((item: any) => ({
        address: item.address,
        isActive:
          item.walletClientType === 'privy' ||
          item.connectorType === 'embedded',
        isEVM: item.chainType === 'ethereum',
        walletClientType: item.walletClientType,
      }));

    setWalletData(linkWallet as WalletItem[]);
  }, [PrivyUser, authenticated, ready]);

  return walletData;
};
