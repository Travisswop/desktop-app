'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePolymarketWallet } from '@/providers/polymarket';
import TransferModal from './TransferModal';
import PredictionsPanel, {
  type PredictionsPanelView,
} from './PredictionsPanel';

type TransferTab = 'deposit' | 'withdraw';

const VALID_VIEWS: PredictionsPanelView[] = [
  'main',
  'orders',
  'bets',
  'history',
];

const CANVAS = '#ecebe6';

/**
 * Standalone host for the predictions experience at the /prediction
 * route. Equivalent of the wallet-page modal flow, but rendered as a
 * dedicated page so drill-downs (View all / Browse) live on a real URL.
 */
export default function PredictionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    authenticated,
    isReady,
    isInitializing,
    hasWallet,
    retryInitialization,
  } = usePolymarketWallet();

  const viewParam = searchParams?.get('view') as PredictionsPanelView | null;
  const initialView: PredictionsPanelView =
    viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : 'main';

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTab, setTransferTab] = useState<TransferTab>('deposit');

  const handleTransfer = useCallback((tab: TransferTab) => {
    setTransferTab(tab);
    setTransferModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    router.push('/wallet');
  }, [router]);

  if (!authenticated || isInitializing || !hasWallet) {
    return (
      <div
        className="relative -m-6 min-h-[calc(100vh-6rem)] flex items-center justify-center"
        style={{ background: CANVAS }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Loading predictions...
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        className="relative -m-6 min-h-[calc(100vh-6rem)] flex items-center justify-center"
        style={{ background: CANVAS }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Wallet found but could not initialize.
          </p>
          <button
            onClick={retryInitialization}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Retry wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PredictionsPanel
        initialView={initialView}
        onClose={handleClose}
        onOpenTransfer={handleTransfer}
        embedded
      />
      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        defaultTab={transferTab}
      />
    </>
  );
}
