'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Transaction,
  useMultiChainTransactionData,
} from '@/lib/hooks/useTransaction';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import TransactionDetails from './transaction-details';
import Image from 'next/image';
import { useMultiChainTokenData } from '@/lib/hooks/useTokenBalance';

type CHAINS = 'ETHEREUM' | 'POLYGON' | 'BASE';

// Constants
const ITEMS_PER_PAGE = 20;

// Function to truncate address
const truncateAddress = (address: string) => {
  return `${address.slice(0, 8)}.....${address.slice(-8)}`;
};

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

interface TransactionItemProps {
  transaction: Transaction;
  userAddress: string;
  onSelect: (transaction: Transaction) => void;
}

// Transaction item component
const TransactionItem = ({
  transaction,
  userAddress,
  onSelect,
}: TransactionItemProps) => {
  const isOutgoing =
    transaction.from.toLowerCase() === userAddress.toLowerCase();

  const calculateValue = (value: string, price: number) => {
    const numericValue = parseFloat(value);
    return (numericValue * price).toFixed(2);
  };

  return (
    <Card
      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onSelect(transaction)}
    >
      <div className="flex items-center gap-3">
        {transaction.isSwapped ? (
          <>
            <div className="relative flex items-center">
              {/* From Token Icon */}
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={`/assets/crypto-icons/${transaction.swapped?.from.symbol}.png`}
                  alt={transaction.swapped?.from.symbol || ''}
                  width={32}
                  height={32}
                  className="object-cover"
                  onError={(e) => {
                    // Fallback to default icon if token icon not found
                    (e.target as HTMLImageElement).src =
                      '/assets/crypto-icons/DOLLAR.png';
                  }}
                />
              </div>
              {/* To Token Icon */}
              <div className="w-8 h-8 rounded-full overflow-hidden -ml-2">
                <Image
                  src={`/assets/crypto-icons/${transaction.swapped?.to.symbol}.png`}
                  alt={transaction.swapped?.to.symbol || ''}
                  width={32}
                  height={32}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      '/assets/crypto-icons/DOLLAR.png';
                  }}
                />
              </div>
            </div>
            <div>
              <p className="font-semibold">Swapped</p>
              <p className="text-sm text-muted-foreground">
                {transaction.swapped?.from.symbol}{' '}
                <span>&#x2192;</span> {transaction.swapped?.to.symbol}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={`/assets/crypto-icons/${transaction.tokenSymbol}.png`}
                alt={transaction.tokenSymbol || ''}
                width={40}
                height={40}
                className="object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    '/assets/crypto-icons/DOLLAR.png';
                }}
              />
            </div>
            <div>
              <p className="font-semibold">
                {isOutgoing ? 'Sent' : 'Received'}
              </p>
              <p className="text-sm text-muted-foreground max-w-[200px] md:max-w-[300px]">
                {isOutgoing ? (
                  <span>To {truncateAddress(transaction.to)}</span>
                ) : (
                  <span>
                    From {truncateAddress(transaction.from)}
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="text-right">
        <p
          className={`font-medium ${
            isOutgoing ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {isOutgoing ? '-' : '+'}
          {parseFloat(transaction.value).toFixed(2)}{' '}
          {transaction.tokenSymbol}
        </p>
        <p className="text-sm text-muted-foreground">
          {transaction.isSwapped ? (
            <>
              $
              {calculateValue(
                transaction.swapped!.from.value,
                transaction.swapped!.from.price
              )}
              {' → '}$
              {calculateValue(
                transaction.swapped!.to.value,
                transaction.swapped!.to.price
              )}
            </>
          ) : (
            `$${calculateValue(
              transaction.value,
              transaction.currentPrice
            )}`
          )}
        </p>
      </div>
    </Card>
  );
};

export default function TransactionList({
  address,
  network,
}: {
  address: string | undefined;
  network: CHAINS;
}) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [offset, setOffset] = useState(0);

  // Fetch token data to get current prices including native token
  const { tokens } = useMultiChainTokenData(address, [network]);

  // Get native token price
  const nativeToken = useMemo(() => {
    return tokens.find(
      (token) =>
        (network === 'ETHEREUM' && token.symbol === 'ETH') ||
        (network === 'POLYGON' && token.symbol === 'POL') ||
        (network === 'BASE' && token.symbol === 'ETH')
    );
  }, [tokens, network]);

  // Fetch transactions
  const {
    transactions,
    loading,
    error,
    hasMore,
    totalCount,
    refetch,
  } = useMultiChainTransactionData(address, [network], {
    limit: ITEMS_PER_PAGE,
    offset,
  });

  // Filter transactions and add prices
  const processedTransactions = useMemo(() => {
    if (!tokens.length || !nativeToken) return [];

    return transactions.filter((tx) => {
      // Add native token price for network fee calculation
      tx.nativeTokenPrice = parseFloat(nativeToken.marketData.price);

      // Find matching token for transaction value
      const token = tokens.find(
        (t) =>
          t.symbol === tx.tokenSymbol ||
          (tx.isSwapped &&
            (t.symbol === tx.swapped?.from.symbol ||
              t.symbol === tx.swapped?.to.symbol))
      );

      if (!token) return false;

      if (tx.isSwapped) {
        const fromToken = tokens.find(
          (t) => t.symbol === tx.swapped?.from.symbol
        );
        const toToken = tokens.find(
          (t) => t.symbol === tx.swapped?.to.symbol
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
  }, [transactions, tokens, nativeToken]);

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
                    userAddress={address || ''}
                    onSelect={setSelectedTransaction}
                  />
                ))}

                {!hasMore && processedTransactions.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4 sticky bottom-0 bg-white py-4">
                    No more transactions to load
                  </p>
                )}
              </div>

              {!loading && processedTransactions.length === 0 && (
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
        userAddress={address || ''}
        network={network}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
