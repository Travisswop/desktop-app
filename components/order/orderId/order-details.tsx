'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import { Card, CardBody } from '@nextui-org/react';

// Import modular components
import { useOrderData } from './hooks/useOrderData';
import { useShippingUpdate } from './hooks/useShippingUpdate';
import { OrderHeader } from './components/OrderHeader';
import { OrderItemsTable } from './components/OrderItemsTable';
import { OrderTabs } from './components/OrderTabs';
import { ShippingUpdateModal } from './components/ShippingUpdateModal';
import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from './components/LoadingState';

/**
 * OrderPage Component - Modularized Order Details Page
 *
 * This component has been refactored to follow e-commerce best practices:
 * - Separated concerns into focused, reusable components
 * - Custom hooks for data fetching and state management
 * - Centralized types, constants, and utilities
 * - Improved performance with proper memoization
 * - Better error handling and loading states
 */

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  const orderId = params?.id as string;

  // State for selected tab
  const [selectedTab, setSelectedTab] = useState('orderHistory');

  // Custom hooks for data and shipping management
  const {
    order,
    nfts,
    userRole,
    isLoading,
    isError,
    isCompleted,
    processingStages,
    refetchOrder,
  } = useOrderData(orderId);

  const {
    isUpdateModalOpen,
    isUpdating,
    updateError,
    updateSuccess,
    shippingData,
    setIsUpdateModalOpen,
    setShippingData,
    handleShippingUpdate,
    resetUpdateState,
  } = useShippingUpdate(
    order?.shipping
      ? {
          deliveryStatus: order.status.delivery,
          trackingNumber: order.shipping.trackingNumber || '',
          shippingProvider: order.shipping.provider || '',
          estimatedDeliveryDate:
            order.shipping.estimatedDeliveryDate || '',
          additionalNotes: order.shipping.notes || '',
        }
      : undefined
  );

  // Handle order completion
  const handleOrderUpdate = async () => {
    if (!orderId || !accessToken) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API base URL is not defined.');
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}/confirm-receipt`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating: 5, feedback: '' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`${result.message}`);
      }

      // Refresh order details
      setTimeout(() => {
        refetchOrder();
      }, 2000);
    } catch (error: any) {
      console.error('Update Error:', error);
    }
  };

  // Handle shipping update with success callback
  const handleShippingUpdateWithCallback = () => {
    handleShippingUpdate(orderId, refetchOrder);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        error={isError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Not found state
  if (!order) {
    return <NotFoundState orderId={orderId} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card className="shadow-md w-full">
        {/* Header Section */}
        <OrderHeader
          order={order}
          userRole={userRole}
          isCompleted={isCompleted}
          isUpdating={isUpdating}
          onMarkComplete={handleOrderUpdate}
          onUpdateShipping={() => setIsUpdateModalOpen(true)}
        />

        <CardBody className="p-6">
          {/* Order Items Table */}
          <OrderItemsTable nfts={nfts} order={order} />

          {/* Tabs Section */}
          <OrderTabs
            order={order}
            nfts={nfts}
            processingStages={processingStages}
            userRole={userRole}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />
        </CardBody>
      </Card>

      {/* Shipping Update Modal */}
      <ShippingUpdateModal
        isOpen={isUpdateModalOpen}
        isUpdating={isUpdating}
        updateError={updateError}
        updateSuccess={updateSuccess}
        shippingData={shippingData}
        onClose={() => {
          setIsUpdateModalOpen(false);
          resetUpdateState();
        }}
        onUpdate={handleShippingUpdateWithCallback}
        onShippingDataChange={setShippingData}
      />
    </div>
  );
}
