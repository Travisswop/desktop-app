import WalletContent from '@/components/wallet/WalletContent';
import WalletPredictionsSection from '@/components/wallet/WalletPredictionsSection';
import { PolymarketProviders } from '@/providers/polymarket';

const Wallet: React.FC = () => {
  return (
    <div>
      <WalletContent />
      <PolymarketProviders>
        <WalletPredictionsSection />
      </PolymarketProviders>
    </div>
  );
};

export default Wallet;
