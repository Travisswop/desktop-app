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
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import TransactionDetails from './transaction-details';

type CHAINS = 'ETHEREUM' | 'POLYGON' | 'BASE';

// Constants
const ITEMS_PER_PAGE = 20;
const ADDRESS = '0xC0988f5AB63F78E08Ebe9BE7850B1DAf74d515e3';

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
  const formattedDate = format(
    new Date(parseInt(transaction.timeStamp) * 1000),
    'MMM dd, yyyy'
  );

  return (
    <Card
      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onSelect(transaction)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full ${
              isOutgoing ? 'bg-red-100' : 'bg-green-100'
            } flex items-center justify-center`}
          >
            {isOutgoing ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-green-600" />
            )}
          </div>
        </div>
        <div>
          <p className="font-medium max-w-[200px] md:max-w-[300px]">
            {isOutgoing
              ? truncateAddress(transaction.to)
              : truncateAddress(transaction.from)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formattedDate}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-medium ${
            isOutgoing ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {isOutgoing ? '-' : '+'}
          {transaction.value} ETH
        </p>
        <p className="text-sm text-muted-foreground">
          ${(parseFloat(transaction.value) * 3000).toFixed(2)}
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
  console.log('🚀 ~ transactions:', transactions);

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
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.hash}
                    transaction={transaction}
                    userAddress={ADDRESS}
                    onSelect={setSelectedTransaction}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-4 flex justify-center">
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

              {!hasMore && transactions.length > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  No more transactions to load
                </p>
              )}

              {!loading && transactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <TransactionDetails
        transaction={selectedTransaction}
        userAddress={ADDRESS}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
