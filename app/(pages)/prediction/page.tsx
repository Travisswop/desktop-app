import { Suspense } from 'react';
import { PolymarketProviders } from '@/providers/polymarket';
import PredictionPageContent from '@/components/wallet/polymarket/PredictionPageContent';

const Prediction: React.FC = () => {
  return (
    <PolymarketProviders>
      <Suspense fallback={null}>
        <PredictionPageContent />
      </Suspense>
    </PolymarketProviders>
  );
};

export default Prediction;
