'use client';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  ArrowLeftRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

// Constants
const CHAINS = {
  ETHEREUM: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io/',
  },
  POLYGON: {
    name: 'Polygon',
    symbol: 'POL',
    explorer: 'https://polygonscan.com/',
  },
  BASE: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://basescan.org/',
  },
  SOLANA: {
    name: 'SOLANA',
    symbol: 'SOL',
    explorer: 'https://solscan.io/',
  },
} as const;

interface TransactionDetailsProps {
  transaction: Transaction | null;
  userAddress: string;
  network: keyof typeof CHAINS;
  isOpen: boolean;
  onClose: () => void;
}

const truncateAddress = (address: string) => {
  return `${address.slice(0, 8)}.....${address.slice(-8)}`;
};

// Transaction Details Dialog
const SwappedView = ({
  transaction,
  network,
  isOpen,
  onClose,
}: TransactionDetailsProps) => {
  if (!transaction) return null;

  const formattedDate = new Date(
    parseInt(transaction.timeStamp) * 1000
  ).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const calculateValue = (value: string, price: number) => {
    const numericValue = parseFloat(value);
    return (numericValue * price).toFixed(2);
  };

  const calculateNetworkFeeInUSD = (
    networkFee: string,
    nativeTokenPrice: number
  ) => {
    const feeInNative = parseFloat(networkFee);
    return (feeInNative * nativeTokenPrice).toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="p-2">
          {/* Header */}
          <div className="mb-4">
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={`/assets/crypto-icons/${transaction.swapped?.from.symbol}.png`}
                  alt={transaction.swapped?.from.symbol || ''}
                  width={40}
                  height={40}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      '/assets/crypto-icons/DOLLAR.png';
                  }}
                />
              </div>

              <ArrowLeftRight className="h-5 w-5 text-gray-400" />

              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={`/assets/crypto-icons/${transaction.swapped?.to.symbol}.png`}
                  alt={transaction.swapped?.to.symbol || ''}
                  width={40}
                  height={40}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      '/assets/crypto-icons/DOLLAR.png';
                  }}
                />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2">
              Swapped
            </h1>
            <p className="text-gray-400 text-center">
              {formattedDate}
            </p>
          </div>

          {/* Swap Details Card */}
          <Card className="bg-zinc-50 border-zinc-100 mb-8">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
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
                    <div>
                      <div className="font-semibold">Swap</div>
                      <div className="text-gray-400">
                        {transaction.swapped?.to.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-500">
                      -
                      {parseFloat(
                        transaction.swapped?.from.value || '0'
                      ).toFixed(2)}{' '}
                      {transaction.swapped?.from.symbol}
                    </div>
                    <div className="text-gray-400">
                      ${' '}
                      {calculateValue(
                        transaction.swapped!.from.value,
                        transaction.swapped!.from.price
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-700 flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 text-gray-700 -rotate-90" />
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={`/assets/crypto-icons/${transaction.swapped?.to.symbol}.png`}
                        alt={transaction.swapped?.to.symbol || ''}
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
                    <div>
                      <div className="font-semibold">Swap</div>
                      <div className="text-gray-400">
                        {transaction.swapped?.to.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-500">
                      +
                      {parseFloat(
                        transaction.swapped?.to.value || '0'
                      ).toFixed(2)}{' '}
                      {transaction.swapped?.to.symbol}
                    </div>
                    <div className="text-gray-400">
                      ${' '}
                      {calculateValue(
                        transaction.swapped!.to.value,
                        transaction.swapped!.to.price
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <div className="space-y-4 mb-12">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Network Fee
              </span>
              <div className="text-right">
                <div className="text-gray-700">
                  {parseFloat(transaction.networkFee).toFixed(6)}{' '}
                  {CHAINS[network].symbol}
                </div>
                <div className="text-sm text-muted-foreground">
                  $
                  {calculateNetworkFeeInUSD(
                    transaction.networkFee,
                    transaction.nativeTokenPrice
                  )}
                </div>
              </div>
            </div>
            <div className="border-t"></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Transaction hash
              </span>
              <span className="text-muted-foreground">
                {truncateAddress(transaction.hash)}
              </span>
            </div>
            <div className="border-t"></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Block explorer
              </span>
              <Link
                href={`${CHAINS[network].explorer}/tx/${transaction.hash}`}
                className="flex flex-col items-center gap-2 text-gray-400 "
                target="_blank"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwappedView;
