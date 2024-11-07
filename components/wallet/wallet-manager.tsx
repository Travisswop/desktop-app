import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';

interface WalletItem {
  address: string;
  isActive: boolean;
}

const wallets: WalletItem[] = [
  {
    address: '0x990...c81',
    isActive: true,
  },
  {
    address: '6tuAy...QgE',
    isActive: false,
  },
];

export default function WalletManager() {
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
        {wallets.map((wallet, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xs text-red-600">🔑</span>
              </div>
              <span className="text-sm font-medium">
                {wallet.address}
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
