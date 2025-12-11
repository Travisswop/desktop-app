'use client';

import React from 'react';
import { PrimaryButton } from '../ui/Button/PrimaryButton';
import Link from 'next/link';
import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import { ChainType } from '@/types/token';
import { Loader2 } from 'lucide-react';

interface TransactionsListProps {
  solWalletAddress: string;
  evmWalletAddress: string;
  chains?: ChainType[];
}

const TransactionsListPreview: React.FC<TransactionsListProps> = ({
  solWalletAddress,
  evmWalletAddress,
  chains = ['ETHEREUM', 'POLYGON', 'SOLANA'],
}) => {
  const { transactions, loading, error } =
    useMultiChainTransactionData(
      solWalletAddress,
      evmWalletAddress,
      chains,
      { limit: 3, offset: 0 }
    );

  // Format transaction data for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}....${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatAmount = (
    value: string,
    tokenSymbol?: string,
    currentPrice?: number
  ) => {
    const numValue = parseFloat(value);
    console.log('numValue', numValue);
    console.log('currentPrice', currentPrice);
    const usdValue = currentPrice
      ? (numValue * currentPrice).toFixed(4)
      : '0.00';
    console.log('usdValue', usdValue);
    return {
      usd: usdValue,
      crypto: `${numValue.toFixed(4)}${tokenSymbol || ''}`,
    };
  };

  const displayTransactions = transactions.slice(0, 3);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">
          Transactions
        </h2>
        <Link href={'/wallet'}>
          <PrimaryButton className="text-sm">View</PrimaryButton>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-red-500">
          Failed to load transactions
        </div>
      )}

      {/* Transactions List */}
      {!loading && !error && (
        <div className="space-y-2">
          {displayTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No transactions found
            </div>
          ) : (
            displayTransactions.map((transaction, index) => {
              const amounts = formatAmount(
                transaction.value,
                transaction.tokenSymbol,
                transaction.currentPrice
              );
              const isReceived =
                transaction.to.toLowerCase() ===
                  evmWalletAddress.toLowerCase() ||
                transaction.to.toLowerCase() ===
                  solWalletAddress.toLowerCase();

              return (
                <div key={transaction.hash}>
                  <div className="flex items-start gap-2">
                    {/* Transaction Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {isReceived ? '↓' : '↑'}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      {/* Type and Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {isReceived ? 'Received' : 'Sent'}
                        </h3>
                        <span className="text-lg text-gray-400 font-normal">
                          {transaction.tokenSymbol || 'Token'}
                        </span>
                      </div>

                      {/* Wallet Address */}
                      <div className="text-base font-medium text-gray-900 mb-1">
                        {formatAddress(
                          isReceived
                            ? transaction.from
                            : transaction.to
                        )}
                      </div>

                      {/* Date */}
                      <div className="text-sm text-gray-400">
                        {formatDate(transaction.timeStamp)}
                      </div>
                    </div>

                    {/* Right Side - Amounts and Time */}
                    <div className="flex-shrink-0 text-right">
                      {/* Timestamp */}
                      <div className="text-sm text-gray-400 mb-3">
                        {formatTimestamp(transaction.timeStamp)}
                      </div>

                      {/* Amount in USD */}
                      <div className="text-xl font-semibold text-gray-900 mb-1">
                        ${amounts.usd}
                      </div>

                      {/* Crypto Amount */}
                      <div className="text-sm text-gray-400">
                        {amounts.crypto}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  {index < displayTransactions.length - 1 && (
                    <div className="mt-2 border-t border-gray-200"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionsListPreview;
