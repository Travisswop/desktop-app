'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import { Transaction } from '@/types/transaction';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import TransactionDetails from './transaction-details';
import TransactionItem from './transaction-item';
import { ChainType, TokenData } from '@/types/token';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PrimaryButton } from '@/components/ui/Button/PrimaryButton';

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

// Error message component - Memoized
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

  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);

  // Fetch ALL transactions at once (no pagination at fetch level)
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
      limit: 10000, // Fetch all transactions
      offset: 0,
    }
  );

  // Helper function to detect spam/scam tokens - wrapped in useCallback to prevent recreation
  const isSpamToken = useCallback(
    (tokenSymbol?: string, tokenName?: string): boolean => {
      if (!tokenSymbol && !tokenName) return false;

      const spamIndicators = [
        /visit|claim|voucher|airdrop|\.io|\.com|\.me|\.do|t\.me|telegram/i,
        /^✅/,
        /^\$[A-Z]+.*claim/i,
        /distribution/i,
      ];

      const textToCheck = `${tokenSymbol || ''} ${tokenName || ''}`;
      return spamIndicators.some((pattern) =>
        pattern.test(textToCheck)
      );
    },
    []
  );

  // Filter transactions and add prices
  const processedTransactions = useMemo(() => {
    if (!tokens.length) return [];

    const allTransactions = [...transactions, ...newTransactions];

    return allTransactions.filter((tx) => {
      // Filter out spam tokens
      if (isSpamToken(tx.tokenSymbol, tx.tokenName)) {
        return false;
      }

      // Filter out failed transactions if they have error status
      if (tx.isError === '1' || tx.txreceipt_status === '0') {
        return false;
      }

      // Add native token price for network fee calculation
      tx.nativeTokenPrice = 1;

      // For native token transactions (no tokenSymbol), find the native token
      if (!tx.tokenSymbol || tx.tokenSymbol === '') {
        const nativeToken = tokens.find(
          (t: TokenData) =>
            t.isNative === true ||
            t.symbol === 'POL' ||
            t.symbol === 'MATIC' ||
            t.symbol === 'ETH' ||
            t.symbol === 'BASE' ||
            t.symbol === 'SOL'
        );

        if (nativeToken) {
          tx.currentPrice = nativeToken.marketData?.price
            ? parseFloat(nativeToken.marketData.price)
            : 0;
          tx.nativeTokenPrice = tx.currentPrice;
          return true;
        }
        return false;
      }

      return true;
    });
  }, [isSpamToken, newTransactions, tokens, transactions]);

  // Get transactions to display based on current limit
  const displayedTransactions = useMemo(() => {
    return processedTransactions.slice(0, displayLimit);
  }, [processedTransactions, displayLimit]);

  // Check if there are more transactions to load
  const hasMoreToDisplay =
    displayLimit < processedTransactions.length;

  // Wrap loadMore in useCallback to prevent recreation on every render
  const loadMore = useCallback(() => {
    setDisplayLimit((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  // Wrap setSelectedTransaction handler in useCallback
  const handleTransactionSelect = useCallback(
    (transaction: Transaction) => {
      setSelectedTransaction(transaction);
    },
    []
  );

  const handleCloseDetails = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  return (
    <>
      <section className="w-full h-full border-none rounded-xl overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-bold text-lg text-gray-700">
              Transactions
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </p>
            {processedTransactions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Showing {displayedTransactions.length} of{' '}
                {processedTransactions.length}
              </span>
            )}
          </div>
        </div>

        <div className="h-full overflow-hidden pb-4">
          {error && (
            <ErrorMessage
              message="Failed to load transactions. Please try again."
              onRetry={refetch}
            />
          )}

          {loading && displayedTransactions.length === 0 ? (
            <TransactionSkeleton />
          ) : (
            <>
              <ScrollArea className="h-full pr-1 overflow-y-auto">
                {displayedTransactions.map((transaction) => (
                  <TransactionItem
                    key={
                      transaction.hash ||
                      transaction.id ||
                      `${transaction.timeStamp}-${transaction.from}`
                    }
                    transaction={transaction}
                    onSelect={handleTransactionSelect}
                  />
                ))}
              </ScrollArea>

              {displayedTransactions.length === 0 && !loading && (
                <div className="text-center py-8 text-black">
                  No transactions found
                </div>
              )}

              {hasMoreToDisplay && (
                <div className="mt-4 flex justify-center sticky bottom-0 bg-white py-4">
                  <PrimaryButton
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
                  </PrimaryButton>
                </div>
              )}
            </>
          )}
        </div>
      </section>
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
        onClose={handleCloseDetails}
      />
    </>
  );
}
