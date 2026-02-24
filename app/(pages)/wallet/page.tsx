import WalletContent from "@/components/wallet/WalletContent";
import WalletPredictionsSection from "@/components/wallet/WalletPredictionsSection";
import { PolymarketProviders } from "@/providers/polymarket";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const Wallet: React.FC = () => {
  return (
    <>
      <WalletContent />
      <PolymarketProviders>
        <WalletPredictionsSection />
      </PolymarketProviders>
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
};

export default Wallet;
