'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { useSolanaWallets } from '@privy-io/react-auth';
import logger from '../../utils/logger';

interface SolanaWalletContextType {
  solanaWallets: any[] | undefined;
  createWallet: () => Promise<any>;
}

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  solanaWallets: undefined,
  createWallet: async () => {},
});

export const SolanaWalletProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets, createWallet } = useSolanaWallets();
  const [storedWallets, setStoredWallets] = useState<
    any[] | undefined
  >(wallets);

  useEffect(() => {
    if (wallets) {
      setStoredWallets(wallets);
      logger.log('Solana wallets updated:', wallets);
    }
  }, [wallets]);

  const contextValue = useMemo(
    () => ({
      solanaWallets: storedWallets,
      createWallet,
    }),
    [storedWallets, createWallet]
  );

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

export const useSolanaWalletContext = () => {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error(
      'useSolanaWalletContext must be used within a SolanaWalletProvider'
    );
  }
  return context;
};
