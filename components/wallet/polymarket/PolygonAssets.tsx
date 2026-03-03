'use client';

import { useState } from 'react';
import { useTrading } from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import { Plus, TrendingUp, RefreshCw } from 'lucide-react';
import Card from './shared/Card';
import DepositModal from './DepositModal';

export default function PolygonAssets() {
  const { safeAddress } = useTrading();
  const { formattedUsdcBalance, usdcBalance, isLoading, isError } =
    usePolygonBalances(safeAddress);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Trading Balance</h3>
          {isLoading && (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* USDC.e Balance Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">USDC.e</p>
                <p className="text-xs text-gray-500">Trading Balance</p>
              </div>
            </div>
            {usdcBalance > 0 && (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>Active</span>
              </div>
            )}
          </div>

          <div className="mb-4">
            {isLoading ? (
              <div className="space-y-2">
                <div className="w-32 h-8 bg-gray-200 animate-pulse rounded" />
                <div className="w-20 h-4 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : isError ? (
              <p className="text-red-500 text-sm">Failed to load balance</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  ${formattedUsdcBalance}
                </p>
                <p className="text-sm text-gray-500">
                  {usdcBalance.toFixed(6)} USDC.e
                </p>
              </>
            )}
          </div>

          {/* Deposit Button */}
          <button
            onClick={() => setDepositModalOpen(true)}
            className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Deposit
          </button>
        </div>

        {/* Quick Stats */}
        {safeAddress && !isLoading && !isError && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Available</p>
              <p className="font-semibold text-gray-900">
                ${formattedUsdcBalance}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">In Orders</p>
              <p className="font-semibold text-gray-900">$0.00</p>
            </div>
          </div>
        )}

        {!safeAddress && (
          <p className="text-gray-500 text-sm mt-3 text-center">
            Initializing trading session...
          </p>
        )}
      </Card>

      {/* Deposit Modal */}
      <DepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
      />
    </>
  );
}
