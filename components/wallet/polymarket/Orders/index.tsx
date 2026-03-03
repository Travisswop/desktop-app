'use client';

import { useState } from 'react';
import { useTrading } from '@/providers/polymarket';
import { useActiveOrders, useClobOrder } from '@/hooks/polymarket';

import ErrorState from '../shared/ErrorState';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import OrderCard from './OrderCard';

export default function ActiveOrders() {
  const { clobClient, safeAddress } = useTrading();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

  const {
    data: orders,
    isLoading,
    error,
  } = useActiveOrders(clobClient, safeAddress);

  const { cancelOrder } = useClobOrder(clobClient, safeAddress);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await cancelOrder(orderId);
    } catch (err) {
      console.error('Failed to cancel order:', err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading orders..." />;
  }

  if (error) {
    return <ErrorState error={error} title="Error loading orders" />;
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        title="No Open Orders"
        message="You don't have any open limit orders."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Open Orders ({orders.length})
        </h3>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onCancel={handleCancelOrder}
            isCancelling={cancellingOrderId === order.id}
          />
        ))}
      </div>
    </div>
  );
}
