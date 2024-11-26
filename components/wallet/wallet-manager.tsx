'use client';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { WalletItem } from '@/types/wallet';
import { Dialog, DialogContent } from '../ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Check, Copy } from 'lucide-react';

const formatAddress = (address: string) => {
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

interface WalletManagerProps {
  walletData: WalletItem[];
  isOpen: boolean;
  onClose: () => void;
}

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
      className="h-6 w-6"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </Button>
  );
};

export default function WalletManager({
  walletData,
  isOpen,
  onClose,
}: WalletManagerProps) {
  const evm = walletData.filter((item) => item.isEVM);
  const sol = walletData.filter((item) => !item.isEVM);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>Wallet Address</DialogTitle>
        <Card className="w-full border-none">
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full  flex items-center justify-center`}
                >
                  <Image
                    src="/assets/icons/solana.png"
                    alt={'ETH Icons'}
                    height={25}
                    width={25}
                    className="h-4 w-4"
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatAddress(sol[0].address)}
                </span>
              </div>
              <CopyButton content={sol[0].address} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full  flex items-center justify-center`}
                >
                  <Image
                    src="/assets/icons/ethereum.png"
                    alt={'ETH Icons'}
                    height={25}
                    width={25}
                    className="h-4 w-4"
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatAddress(evm[0].address)}
                </span>
              </div>
              <CopyButton content={evm[0].address} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full  flex items-center justify-center`}
                >
                  <Image
                    src="/assets/icons/polygon.png"
                    alt={'ETH Icons'}
                    height={25}
                    width={25}
                    className="h-4 w-4"
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatAddress(evm[0].address)}
                </span>
              </div>
              <CopyButton content={evm[0].address} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full  flex items-center justify-center`}
                >
                  <Image
                    src="/assets/icons/base.png"
                    alt={'ETH Icons'}
                    height={25}
                    width={25}
                    className="h-4 w-4"
                  />
                </div>
                <span className="text-sm font-medium">
                  {formatAddress(evm[0].address)}
                </span>
              </div>
              <CopyButton content={evm[0].address} />
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
