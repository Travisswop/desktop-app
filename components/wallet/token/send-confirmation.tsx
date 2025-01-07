'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Wallet,
  ArrowDown,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NFT } from '@/types/nft';
import Image from 'next/image';
import { Network } from '@/types/wallet-types';
import { TokenData } from '@/types/token';
interface SendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  token: TokenData;
  recipient: string;
  recipientName: string;
  onConfirm: () => void;
  loading: boolean;
  nft: NFT | null;
  networkFee: string;
  network: Network;
  isUSD: boolean;
}

export default function SendConfirmation({
  open,
  onOpenChange,
  amount,
  token,
  recipient,
  recipientName,
  onConfirm,
  loading,
  nft,
  networkFee,
  network,
  isUSD,
}: SendConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Confirm Transaction
          </DialogTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Please review the transaction details carefully
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Transaction Overview */}
          <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
            {/* From/To Section */}
            <div className="space-y-4">
              {/* Amount Display */}
              <div className="flex flex-col items-center">
                {nft ? (
                  <div className="text-center space-y-3">
                    <div className="text-xl font-semibold">
                      {nft.name}
                    </div>
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      width={150}
                      height={150}
                      className="rounded-xl shadow-md"
                    />
                    <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                      Token ID: {nft.tokenId}
                    </div>
                  </div>
                ) : (
                  token && (
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-gray-700">
                        {isUSD
                          ? (
                              parseFloat(amount) /
                              parseFloat(token.marketData.price)
                            ).toFixed(2)
                          : parseFloat(amount).toFixed(2)}{' '}
                        {token.symbol}
                      </div>
                      {token.marketData.price && (
                        <p className="text-gray-500">
                          ≈ $
                          {isUSD
                            ? parseFloat(amount).toFixed(2)
                            : (
                                parseFloat(amount) *
                                parseFloat(token.marketData.price)
                              ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-center">
                <ArrowDown className="text-gray-400 w-5 h-5" />
              </div>

              {/* Recipient */}
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {recipientName || 'Recipient'}
                    </div>
                    <div className="text-sm text-gray-500 break-all">
                      {recipient}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">
              Transaction Details
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Network Fee
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Network fees are required to process your
                          transaction on the blockchain. These fees
                          vary based on network congestion.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="font-medium">
                  {networkFee}{' '}
                  {network === 'SOLANA'
                    ? 'SOL'
                    : network === 'ETHEREUM'
                    ? 'ETH'
                    : network === 'POLYGON'
                    ? 'MATIC'
                    : 'BASE'}
                </div>
              </div>
            </div>

            {/* Warning/Info Box */}
            <div className="bg-yellow-50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                Transactions cannot be reversed after confirmation.
                Please ensure the recipient address is correct.
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6 text-lg font-medium transition-colors"
            disabled={loading}
          >
            {loading
              ? 'Processing Transaction...'
              : 'Confirm Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
