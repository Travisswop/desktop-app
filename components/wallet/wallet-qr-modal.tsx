'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Copy, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { WalletItem } from '@/types/wallet';
import Image from 'next/image';

interface WalletQRProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletData: WalletItem[];
  setWalletShareAddress: (address: string) => void;
  setWalletQRShareModalOpen: (open: boolean) => void;
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className=" h-8 w-8 bg-gray-100 rounded-full"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </Button>
  );
};

export default function WalletQRModal({
  open = false,
  onOpenChange,
  walletData,
  setWalletShareAddress,
  setWalletQRShareModalOpen,
}: WalletQRProps) {
  const { toast } = useToast();
  const [activeQR, setActiveQR] = useState<'ethereum' | 'solana'>(
    'ethereum'
  );

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        description: 'Address copied to clipboard',
        duration: 2000,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        description: 'Failed to copy address',
        duration: 2000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl ">
        <DialogHeader>
          <div className="flex items-center justify-between ">
            <DialogTitle className="text-xl font-semibold">
              <span className="sr-only">Wallet QR</span>
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Wallet QR</h2>
            <p className="text-sm text-gray-500 ">
              Scan the QR code to connect with your wallet
            </p>
          </div>
          {/* Ethereum Address */}
          <div className="border p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Your EVM address
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {walletData.length > 0
                    ? formatAddress(walletData[0].address)
                    : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setActiveQR('ethereum');
                      setWalletQRShareModalOpen(true);
                      setWalletShareAddress(
                        walletData.length > 0
                          ? walletData[0].address
                          : ''
                      );
                    }}
                    className="h-8 w-8 bg-gray-100 rounded-full"
                  >
                    <QrCode className="h-4 w-4" />
                    <span className="sr-only">
                      Copy Ethereum address
                    </span>
                  </Button>
                  <CopyButton
                    content={
                      walletData.length > 0
                        ? walletData[0].address
                        : ''
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/icons/ethereum.png"
                  alt="Ethereum"
                  height={12}
                  width={12}
                />
                <Image
                  src="/assets/icons/polygon.png"
                  alt="Polygon"
                  height={12}
                  width={12}
                />
                <Image
                  src="/assets/icons/base.png"
                  alt="Base"
                  height={12}
                  width={12}
                />
              </div>
            </div>
          </div>

          {/* Solana Address */}
          <div className="border p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Your Solana address
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {walletData.length > 0
                    ? formatAddress(walletData[1].address)
                    : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setActiveQR('solana');
                      setWalletQRShareModalOpen(true);
                      setWalletShareAddress(
                        walletData.length > 0
                          ? walletData[1].address
                          : ''
                      );
                    }}
                    className="h-8 w-8 bg-gray-100 rounded-full"
                  >
                    <QrCode className="h-4 w-4" />
                    <span className="sr-only">
                      Copy Ethereum address
                    </span>
                  </Button>
                  <CopyButton
                    content={
                      walletData.length > 0
                        ? walletData[1].address
                        : ''
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/icons/solana.png"
                  alt="Solana"
                  height={12}
                  width={12}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
