'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import { Transaction } from '@/types/transaction';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import TransactionDetails from './transaction-details';
import TransactionItem from './transaction-item';
import { ChainType, TokenData } from '@/types/token';

type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

// Constants
const ITEMS_PER_PAGE = 20;

// Loading skeleton component
const TransactionSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// Error message component
const ErrorMessage = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="bg-red-50 p-4 rounded-lg flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="text-red-600 hover:text-red-700"
    >
      Try Again
    </Button>
  </div>
);

export default function TransactionList({
  solWalletAddress,
  evmWalletAddress,
  chains,
  tokens,
  newTransactions,
}: {
  solWalletAddress: string;
  evmWalletAddress: string;
  chains: ChainType[];
  tokens: TokenData[];
  newTransactions: any;
}) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [offset, setOffset] = useState(0);

  // Fetch transactions
  const {
    transactions,
    loading,
    error,
    hasMore,
    totalCount,
    refetch,
  } = useMultiChainTransactionData(
    solWalletAddress,
    evmWalletAddress,
    chains,
    {
      limit: ITEMS_PER_PAGE,
      offset,
    }
  );

  // Filter transactions and add prices
  const processedTransactions = useMemo(() => {
    if (!tokens.length) return [];

    const allTransactions = [...transactions, ...newTransactions];

    return allTransactions.filter((tx) => {
      // Add native token price for network fee calculation
      // tx.nativeTokenPrice = parseFloat(nativeToken.marketData.price);
      tx.nativeTokenPrice = 1;
      // Find matching token for transaction value
      const token = tokens.find(
        (t: TokenData) =>
          t.symbol === tx.tokenSymbol ||
          (tx.isSwapped &&
            (t.symbol === tx.swapped?.from.symbol ||
              t.symbol === tx.swapped?.to.symbol))
      );

      if (!token) return false;

      if (tx.isSwapped) {
        const fromToken = tokens.find(
          (t: TokenData) => t.symbol === tx.swapped?.from.symbol
        );
        const toToken = tokens.find(
          (t: TokenData) => t.symbol === tx.swapped?.to.symbol
        );

        if (!fromToken || !toToken) return false;

        if (tx.swapped) {
          tx.swapped.from.price = parseFloat(
            fromToken.marketData.price
          );
          tx.swapped.to.price = parseFloat(toToken.marketData.price);
        }
      } else {
        tx.currentPrice = parseFloat(token.marketData.price);
      }

      return true;
    });
  }, [transactions, newTransactions, tokens]);

  const loadMore = () => {
    setOffset((prev) => prev + ITEMS_PER_PAGE);
  };

  return (
    <>
      <Card className="w-full border-none rounded-xl mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Transactions
              {loading && offset === 0 && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </CardTitle>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground">
                Showing{' '}
                {Math.min(offset + ITEMS_PER_PAGE, totalCount)} of{' '}
                {totalCount}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <ErrorMessage
              message="Failed to load transactions. Please try again."
              onRetry={refetch}
            />
          )}

          {loading && offset === 0 ? (
            <TransactionSkeleton />
          ) : (
            <>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {processedTransactions.map((transaction, index) => (
                  <TransactionItem
                    key={index}
                    transaction={transaction}
                    onSelect={setSelectedTransaction}
                  />
                ))}

                {!hasMore && processedTransactions.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4 sticky bottom-0 bg-white py-4">
                    No more transactions to load
                  </p>
                )}
              </div>

              {!loading &&
                !error &&
                processedTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                )}

              {hasMore && (
                <div className="mt-4 flex justify-center sticky bottom-0 bg-white py-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <TransactionDetails
        transaction={selectedTransaction}
        userAddress={
          selectedTransaction?.network === 'SOLANA'
            ? solWalletAddress
            : evmWalletAddress
        }
        network={
          (selectedTransaction?.network || 'SOLANA') as Network
        }
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
