import WalletContent from '@/components/wallet/WalletContent';
import { PolymarketProviders } from '@/providers/polymarket';

const Wallet: React.FC = () => {
  return (
    <PolymarketProviders>
      <WalletContent />
    </PolymarketProviders>
  );
};

export default Wallet;
