'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { useSolanaWallets } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';

interface SolanaWalletContextType {
  solanaWallets: any[] | undefined;
  createWallet: () => Promise<any>;
  isLoading: boolean;
  error: Error | null;
}

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  solanaWallets: undefined,
  createWallet: async () => {},
  isLoading: false,
  error: null,
});

export const SolanaWalletProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallets, createWallet } = useSolanaWallets();
  const walletsRef = useRef<any[] | undefined>(undefined);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (wallets) {
      walletsRef.current = wallets;
      console.log('Solana wallets updated:', wallets);
    }
  }, [wallets]);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/onboard') {
      walletsRef.current = undefined;
    }
  }, [pathname]);

  const contextValue = useMemo(
    () => ({
      solanaWallets: walletsRef.current || wallets,
      createWallet,
      isLoading,
      error,
    }),
    [wallets, createWallet, isLoading, error]
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
