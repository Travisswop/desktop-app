'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Wallet } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NFT } from '@/types/nft';
import Image from 'next/image';
import { Network } from '../WalletContent';

interface SendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  tokenAddress: string;
  recipient: string;
  recipientName: string;
  onConfirm: () => void;
  loading: boolean;
  nft: NFT | null;
  networkFee: string;
  network: Network;
}

export default function SendConfirmation({
  open,
  onOpenChange,
  amount,
  tokenAddress,
  recipient,
  recipientName,
  onConfirm,
  loading,
  nft,
  networkFee,
  network,
}: SendConfirmationProps) {
  console.log('nft', nft);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Send
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Amount */}
          <div className="flex flex-col items-center">
            {nft ? (
              <div className="text-center">
                <div className="text-xl font-medium">{nft.name}</div>
                <div className="mt-2">
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    width={100}
                    height={100}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Token ID: {nft.tokenId}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-medium">${amount}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {tokenAddress}
                </div>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="">
            <div className="text-sm font-medium mb-2 border-b-1 border-gray-300 pb-2">
              To
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              {recipientName || recipient}
            </div>
          </div>

          {/* Details */}
          <div className="">
            <div className="text-sm font-medium mb-2 border-b-1 border-gray-300 pb-2">
              Network Fee
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {networkFee}{' '}
                    {network === 'SOLANA'
                      ? 'SOL'
                      : network === 'ETHEREUM'
                      ? 'ETH'
                      : network === 'POLYGON'
                      ? 'MATIC'
                      : 'BASE'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>What are the network fees</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Network fees are required to process your
                          transaction
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6"
            disabled={loading}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
