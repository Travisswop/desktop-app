'use client';

import { useTrading } from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import { formatAddress } from '@/lib/polymarket/formatting';
import Card from './shared/Card';

export default function PolygonAssets() {
  const { safeAddress } = useTrading();

  const { formattedUsdcBalance, isLoading, isError } =
    usePolygonBalances(safeAddress);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold mb-3">Polygon Assets</h3>

      {/* Safe Address */}
      {safeAddress && (
        <div className="mb-4">
          <p className="text-sm  mb-1">Safe Wallet</p>
          <p className="text-sm  font-mono">
            {formatAddress(safeAddress)}
          </p>
        </div>
      )}

      {/* USDC.e Balance */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className=" font-bold">$</span>
            </div>
            <div>
              <p className="font-medium">USDC.e</p>
              <p className=" text-sm">Bridged USDC on Polygon</p>
            </div>
          </div>
          <div className="text-right">
            {isLoading ? (
              <div className="w-16 h-6 bg-gray-700 animate-pulse rounded" />
            ) : isError ? (
              <p className=" text-sm">Error</p>
            ) : (
              <p className="font-bold text-lg">
                ${formattedUsdcBalance}
              </p>
            )}
          </div>
        </div>
      </div>

      {!safeAddress && (
        <p className=" text-sm mt-3 text-center">
          Initialize trading session to see balance
        </p>
      )}
    </Card>
  );
}
