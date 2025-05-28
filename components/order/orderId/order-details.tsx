'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import {
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';

// Import modular components
import { useOrderData } from './hooks/useOrderData';
import { useShippingUpdate } from './hooks/useShippingUpdate';
import { useDispute } from './hooks/useDispute';
import { useOrderDisputes } from './hooks/useOrderDisputes';
import { OrderHeader } from './components/OrderHeader';
import { OrderItemsTable } from './components/OrderItemsTable';
import { OrderTabs } from './components/OrderTabs';
import { ShippingUpdateModal } from './components/ShippingUpdateModal';
import { DisputeData } from './components/OrderDispute';
import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from './components/LoadingState';

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  const orderId = params?.id as string;

  // State for selected tab
  const [selectedTab, setSelectedTab] = useState('paymentInfo');

  // State for confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Dispute management hook
  // const {
  //   isSubmitting: isDisputeSubmitting,
  //   error: disputeError,
  //   success: disputeSuccess,
  //   submitDispute,
  //   resetState: resetDisputeState,
  // } = useDispute();

  // Disputes data hook for refund detection
  const { disputes } = useOrderDisputes(orderId);

  // Memoize initial shipping data to prevent unnecessary re-renders
  const initialShippingData = useMemo(() => {
    return order?.shipping
      ? {
          deliveryStatus: order.status.delivery,
          trackingNumber: order.shipping.trackingNumber || '',
          shippingProvider: order.shipping.provider || '',
          estimatedDeliveryDate:
            order.shipping.estimatedDeliveryDate || '',
          additionalNotes: order.shipping.notes || '',
        }
      : undefined;
  }, [order?.shipping, order?.status.delivery]);

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
  } = useShippingUpdate(initialShippingData);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleOrderUpdate = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  // Actual API call for order completion
  const confirmOrderUpdate = useCallback(async () => {
    if (!orderId || !accessToken) return;

    setIsConfirming(true);
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

      // Close modal and refresh order details
      setIsConfirmModalOpen(false);
      setTimeout(() => {
        refetchOrder();
      }, 2000);
    } catch (error: any) {
      console.error('Update Error:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [orderId, accessToken, refetchOrder]);

  // Handle shipping update with success callback
  const handleShippingUpdateWithCallback = useCallback(() => {
    handleShippingUpdate(orderId, refetchOrder);
  }, [handleShippingUpdate, orderId, refetchOrder]);

  // Handle dispute submission
  // const handleDisputeSubmit = useCallback(
  //   async (disputeData: DisputeData) => {
  //     try {
  //       await submitDispute(orderId, disputeData);
  //       // Refresh order data after successful dispute submission
  //       setTimeout(() => {
  //         refetchOrder();
  //         resetDisputeState();
  //       }, 2000);
  //     } catch (error) {
  //       // Error is already handled in the hook
  //       console.error('Dispute submission failed:', error);
  //     }
  //   },
  //   [submitDispute, orderId, refetchOrder, resetDisputeState]
  // );

  // Memoize modal close handlers
  const handleConfirmModalClose = useCallback(() => {
    setIsConfirmModalOpen(false);
  }, []);

  const handleUpdateModalClose = useCallback(() => {
    setIsUpdateModalOpen(false);
    resetUpdateState();
  }, [setIsUpdateModalOpen, resetUpdateState]);

  const handleUpdateShippingModalOpen = useCallback(() => {
    setIsUpdateModalOpen(true);
  }, [setIsUpdateModalOpen]);

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
          onUpdateShipping={handleUpdateShippingModalOpen}
          disputes={disputes}
        />

        <CardBody className="p-6">
          {/* Order Items Table */}
          <OrderItemsTable nfts={nfts} order={order} />

          {/* Tabs Section */}
          {/* <OrderTabs
            order={order}
            nfts={nfts}
            processingStages={processingStages}
            userRole={userRole}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            onDisputeSubmit={handleDisputeSubmit}
            isDisputeSubmitting={isDisputeSubmitting}
          /> */}
        </CardBody>
      </Card>

      {/* Shipping Update Modal */}
      <ShippingUpdateModal
        isOpen={isUpdateModalOpen}
        isUpdating={isUpdating}
        updateError={updateError}
        updateSuccess={updateSuccess}
        shippingData={shippingData}
        onClose={handleUpdateModalClose}
        onUpdate={handleShippingUpdateWithCallback}
        onShippingDataChange={setShippingData}
      />

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader>Confirm Order Receipt</ModalHeader>
          <ModalBody>
            <p>
              By confirming receipt, you acknowledge that you have
              received the order in satisfactory condition. This
              action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={handleConfirmModalClose}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              color="success"
              onPress={confirmOrderUpdate}
              isLoading={isConfirming}
            >
              Confirm Receipt
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dispute Status Notifications */}
      {/* {disputeSuccess && (
        <Modal
          isOpen={!!disputeSuccess}
          onOpenChange={() => resetDisputeState()}
          backdrop="blur"
        >
          <ModalContent>
            <ModalHeader className="text-green-600">
              Dispute Submitted Successfully
            </ModalHeader>
            <ModalBody>
              <p>{disputeSuccess}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="success"
                onPress={() => resetDisputeState()}
              >
                OK
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {disputeError && (
        <Modal
          isOpen={!!disputeError}
          onOpenChange={() => resetDisputeState()}
          backdrop="blur"
        >
          <ModalContent>
            <ModalHeader className="text-red-600">
              Dispute Submission Failed
            </ModalHeader>
            <ModalBody>
              <p>{disputeError}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                onPress={() => resetDisputeState()}
              >
                OK
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )} */}
    </div>
  );
}
