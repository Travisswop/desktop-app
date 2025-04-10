'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink } from 'lucide-react';
import { NFT } from '@/types/nft';
import { TokenData } from '@/types/token';
import Image from 'next/image';
import Link from 'next/link';

interface TransactionSuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  nft: NFT | null;
  token: TokenData | null;
  isUSD: boolean;
  hash: string;
}

export default function TransactionSuccess({
  open,
  onOpenChange,
  amount,
  nft,
  token,
  isUSD,
  hash,
}: TransactionSuccessProps) {
  const getExplorerUrl = () => {
    switch (token?.chain) {
      case 'ETHEREUM':
        return `https://etherscan.io/tx/${hash}`;
      case 'SOLANA':
        return `https://solscan.io/tx/${hash}`;
      case 'POLYGON':
        return `https://polygonscan.com/tx/${hash}`;
      case 'BASE':
        return `https://basescan.org/tx/${hash}`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">
        Transaction Success
      </DialogTitle>
      <DialogContent className="max-w-md p-8 rounded-3xl">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center mb-2 ">
            <Check className="h-12 w-12 text-white" />
          </div>

          {/* Success Message */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">
              Transaction Complete!
            </h2>

            {nft ? (
              <div className="space-y-2">
                <p className="text-xl font-semibold">{nft.name}</p>
                <Image
                  src={nft.image}
                  alt={nft.name}
                  width={128}
                  height={128}
                  className="mx-auto rounded-lg"
                />
              </div>
            ) : (
              token && (
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-green-600">
                    {isUSD
                      ? (
                          parseFloat(amount) /
                          parseFloat(token.marketData.price)
                        ).toFixed(2)
                      : parseFloat(amount).toFixed(2)}{' '}
                    {token.symbol}
                  </p>
                  {token.marketData.price && (
                    <p className="text-gray-500">
                      ≈ $
                      {isUSD
                        ? parseFloat(amount).toFixed(2)
                        : (
                            parseFloat(amount) *
                            parseFloat(token.marketData.price)
                          ).toFixed(2)}
                      USD
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          <div className="flex flex-col w-full gap-3">
            <Link
              href={getExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-gray-500 "
            >
              View on Explorer <ExternalLink className="h-4 w-4" />
            </Link>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6 text-lg font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
