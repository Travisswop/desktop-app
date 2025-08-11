'use client';

import { useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
} from 'react';

// Create a connection instance for mainnet
const connection = new Connection(
  process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_ENDPOINT ||
    clusterApiUrl('mainnet-beta')
);

interface PrivyTransactionSignerContextType {
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
}

const PrivyTransactionSignerContext =
  createContext<PrivyTransactionSignerContextType | null>(null);

export function PrivyTransactionSignerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signTransaction: privySignTransaction } =
    useSignTransaction();

  const signTransaction = useCallback(
    async (transaction: any) => {
      if (!privySignTransaction) {
        throw new Error('Privy signTransaction not available');
      }

      return await privySignTransaction({
        transaction,
        connection,
      });
    },
    [privySignTransaction]
  );

  const signAllTransactions = useCallback(
    async (transactions: any[]) => {
      if (!privySignTransaction) {
        throw new Error('Privy signTransaction not available');
      }

      return await Promise.all(
        transactions.map((tx) =>
          privySignTransaction({
            transaction: tx,
            connection,
          })
        )
      );
    },
    [privySignTransaction]
  );

  // Set up global access to the signer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__privyTransactionSigner = {
        signTransaction,
        signAllTransactions,
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__privyTransactionSigner;
      }
    };
  }, [signTransaction, signAllTransactions]);

  return (
    <PrivyTransactionSignerContext.Provider
      value={{ signTransaction, signAllTransactions }}
    >
      {children}
    </PrivyTransactionSignerContext.Provider>
  );
}

export function usePrivyTransactionSigner() {
  const context = useContext(PrivyTransactionSignerContext);
  if (!context) {
    throw new Error(
      'usePrivyTransactionSigner must be used within a PrivyTransactionSignerProvider'
    );
  }
  return context;
}
