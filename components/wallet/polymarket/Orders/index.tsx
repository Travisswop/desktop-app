'use client';

import { usePolymarketWallet } from '@/providers/polymarket';
import { useActiveOrders } from '@/hooks/polymarket';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';

export default function ActiveOrders() {
  const { eoaAddress } = usePolymarketWallet();

  const { data: orders, isLoading } = useActiveOrders(null, eoaAddress);

  if (isLoading) return <LoadingState message="Loading orders..." />;

  // AMM trades settle instantly on-chain — no resting open orders in Phase 1.
  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        title="No Open Orders"
        message="AMM trades execute instantly. Open limit orders will appear here in a future update."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="p-3 border border-gray-200 rounded-xl text-sm">
          {order.side} {order.outcome} @ {order.price}
        </div>
      ))}
    </div>
  );
}
