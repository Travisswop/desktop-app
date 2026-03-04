'use client';

import { useState } from 'react';
import { useTrading } from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import { ArrowUpDown } from 'lucide-react';
import TransferModal from './TransferModal';

export default function PolygonAssets() {
  const { safeAddress } = useTrading();
  const { formattedUsdcBalance, isLoading } = usePolygonBalances(safeAddress);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-1 py-2">
        <div>
          <p className="text-sm text-gray-500">Predictions Balance</p>
          <div className="flex items-center gap-2 mt-0.5">
            {isLoading ? (
              <div className="w-32 h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-900">
                  ${formattedUsdcBalance}
                </span>
                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="text-gray-500 hover:text-gray-800 transition-colors"
                  title="Deposit / Withdraw"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <TransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
      />
    </>
  );
}
