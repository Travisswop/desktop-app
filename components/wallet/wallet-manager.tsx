import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import Image from 'next/image';
import { WalletItem } from '@/types/wallet';

const formatAddress = (address: string) => {
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

interface WalletManagerProps {
  walletData: WalletItem[];
}

export default function WalletManager({
  walletData,
}: WalletManagerProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <CardTitle>Wallets</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect and link wallets to your account.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {walletData.map((wallet, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full ${
                  wallet.isEVM ? 'bg-blue-200' : 'bg-slate-800'
                } flex items-center justify-center`}
              >
                <Image
                  src={
                    wallet.isEVM
                      ? '/assets/icons/ethereum.png'
                      : '/assets/icons/solana.png'
                  }
                  alt="ETH Icons"
                  height={25}
                  width={25}
                  className="h-4 w-4"
                />
              </div>
              <span className="text-sm font-medium">
                {formatAddress(wallet.address)}
              </span>
            </div>
            {wallet.isActive && (
              <Badge className="bg-purple-100 text-purple-600 hover:bg-purple-100">
                Active
              </Badge>
            )}
          </div>
        ))}
        <Button variant="outline" className="w-full mt-2">
          + Link a Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
