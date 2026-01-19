'use client';

import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

interface PrivyTransactionSignerContextType {
  signTransaction: (
    transaction: Transaction | VersionedTransaction
  ) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (
    transactions: (Transaction | VersionedTransaction)[]
  ) => Promise<(Transaction | VersionedTransaction)[]>;
}

const PrivyTransactionSignerContext =
  createContext<PrivyTransactionSignerContextType | null>(null);

// Helper to serialize transaction to Uint8Array for Privy 3.0
function serializeTransaction(
  transaction: Transaction | VersionedTransaction
): Uint8Array {
  if (transaction instanceof VersionedTransaction) {
    return transaction.serialize();
  }
  return transaction.serialize({ verifySignatures: false });
}

// Helper to deserialize Uint8Array back to transaction
function deserializeTransaction(
  serialized: Uint8Array,
  originalTransaction: Transaction | VersionedTransaction
): Transaction | VersionedTransaction {
  if (originalTransaction instanceof VersionedTransaction) {
    return VersionedTransaction.deserialize(serialized);
  }
  return Transaction.from(serialized);
}

export function PrivyTransactionSignerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { wallets, ready } = useWallets();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  const wallet = useMemo(() => wallets[0], [wallets]);

  const signTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<Transaction | VersionedTransaction> => {
      if (!privySignTransaction) {
        throw new Error('Privy signTransaction not available');
      }

      if (!wallet) {
        throw new Error('No wallet available');
      }

      // Privy 3.0 expects Uint8Array and returns { signedTransaction: Uint8Array }
      const serializedTx = serializeTransaction(transaction);
      const { signedTransaction } = await privySignTransaction({
        wallet,
        transaction: serializedTx,
      });

      // Deserialize back to the original transaction type
      return deserializeTransaction(signedTransaction, transaction);
    },
    [privySignTransaction, wallet]
  );

  const signAllTransactions = useCallback(
    async (
      transactions: (Transaction | VersionedTransaction)[]
    ): Promise<(Transaction | VersionedTransaction)[]> => {
      if (!privySignTransaction) {
        throw new Error('Privy signTransaction not available');
      }

      if (!wallet) {
        throw new Error('No wallet available');
      }

      // Sign all transactions sequentially
      const signedTransactions = await Promise.all(
        transactions.map(async (tx) => {
          const serializedTx = serializeTransaction(tx);
          const { signedTransaction } = await privySignTransaction({
            wallet,
            transaction: serializedTx,
          });
          return deserializeTransaction(signedTransaction, tx);
        })
      );

      return signedTransactions;
    },
    [privySignTransaction, wallet]
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
