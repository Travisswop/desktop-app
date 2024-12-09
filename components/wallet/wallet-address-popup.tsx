'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { WalletItem } from '@/types/wallet';
import { useState } from 'react';

interface WalletAddressPopupProps {
  walletData: WalletItem[];
  show: boolean;
}

const addresses = [
  {
    chain: 'Solana',
    address: '3B3RL........VGXQC',
  },
  {
    chain: 'Ethereum',
    address: '3B3RL........VGXQC',
  },
  {
    chain: 'Polygon',
    address: '3B3RL........VGXQC',
  },
];

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

export default function WalletAddressPopup({
  walletData,
  show,
}: WalletAddressPopupProps) {
  if (!show) return null;

  const evm = walletData.filter((item) => item.isEVM);
  const sol = walletData.filter((item) => !item.isEVM);

  if (evm.length === 0 && sol.length === 0) return null;
  if (evm.length > 0) {
    addresses.map((item) => {
      if (item.chain !== 'Solana') {
        item.address = evm[0].address;
      }
    });
  }

  if (sol.length > 0) {
    addresses.map((item) => {
      if (item.chain === 'Solana') {
        item.address = sol[0].address;
      }
    });
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Card className="absolute top-20 right-12 w-96 z-10 border bg-background border-none shadow-2xl shadow-slate-300">
      <CardHeader className="pb-3">
        <CardTitle className=" text-xl font-normal">
          Copy Wallet Address
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {addresses.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-t-1 border-slate-300 p-2 text-sm"
          >
            <div className="grid gap-1">
              <div className="font-medium">{item.chain}</div>
              <div className="text-xs text-muted-foreground">
                {item.address.slice(0, 6)}...{item.address.slice(-6)}
              </div>
            </div>
            <CopyButton content={item.address} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
