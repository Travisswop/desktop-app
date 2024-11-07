import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookKey, Lock, Upload } from 'lucide-react';

interface EmbeddedWalletProps {
  onSetPassword?: () => void;
  onExport?: () => void;
}

export default function EmbeddedWallet({
  onSetPassword = () => {},
  onExport = () => {},
}: EmbeddedWalletProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookKey className="h-5 w-5" />
          <CardTitle>Embedded Wallet</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          A user&apos;s embedded wallet is theirs to keep, and even
          take with them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onSetPassword}
          >
            <Lock className="mr-2 h-4 w-4" />
            Set a recovery password
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onExport}
          >
            <Upload className="mr-2 h-4 w-4" />
            Export Embedded wallet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
