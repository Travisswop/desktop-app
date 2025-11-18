"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import {
  Card as NextUICard,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button as NextUIButton,
} from "@nextui-org/react";

// Import shadcn components for dashboard cards
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderList, OrderListFilters } from "@/lib/hooks/useOrderQueries";

// Import modular components
import { useOrderData } from "./hooks/useOrderData";
import { useShippingUpdate } from "./hooks/useShippingUpdate";
import { useDispute } from "./hooks/useDispute";
import { useOrderDisputes } from "./hooks/useOrderDisputes";
import { OrderHeader } from "./components/OrderHeader";
import { OrderItemsTable } from "./components/OrderItemsTable";
import { OrderTabs } from "./components/OrderTabs";
import { ShippingUpdateModal } from "./components/ShippingUpdateModal";
import { DisputeData } from "./components/OrderDispute";
import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "./components/LoadingState";

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  const orderId = params?.id as string;

  // State for selected tab
  const [selectedTab, setSelectedTab] = useState("paymentInfo");

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

  // Filters for order summary data
  const summaryFilters: OrderListFilters = useMemo(
    () => ({
      role: userRole === "seller" ? "seller" : "buyer",
      status: "",
      page: 1,
      limit: 10,
      sortBy: "orderDate",
      sortOrder: "desc",
      startDate: "",
      endDate: "",
      deadOrders: "exclude",
      search: "",
      refresh: false,
    }),
    [userRole]
  );

  // Fetch order summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useOrderList(
    summaryFilters,
    accessToken || ""
  );

  // Dispute management hook
  const {
    isSubmitting: isDisputeSubmitting,
    error: disputeError,
    success: disputeSuccess,
    submitDispute,
    resetState: resetDisputeState,
  } = useDispute();

  // Disputes data hook for refund detection
  const { disputes } = useOrderDisputes(orderId);

  // Memoize initial shipping data to prevent unnecessary re-renders
  const initialShippingData = useMemo(() => {
    return order?.shipping
      ? {
          deliveryStatus: order.status.delivery,
          trackingNumber: order.shipping.trackingNumber || "",
          shippingProvider: order.shipping.provider || "",
          estimatedDeliveryDate: order.shipping.estimatedDeliveryDate || "",
          additionalNotes: order.shipping.notes || "",
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
        throw new Error("API base URL is not defined.");
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}/confirm-receipt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5, feedback: "" }),
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
      console.error("Update Error:", error);
    } finally {
      setIsConfirming(false);
    }
  }, [orderId, accessToken, refetchOrder]);

  // Handle shipping update with success callback
  const handleShippingUpdateWithCallback = useCallback(() => {
    handleShippingUpdate(orderId, refetchOrder);
  }, [handleShippingUpdate, orderId, refetchOrder]);

  // Handle dispute submission
  const handleDisputeSubmit = useCallback(
    async (disputeData: DisputeData) => {
      try {
        await submitDispute(orderId, disputeData);
        // Refresh order data after successful dispute submission
        setTimeout(() => {
          refetchOrder();
          resetDisputeState();
        }, 2000);
      } catch (error) {
        // Error is already handled in the hook
        console.error("Dispute submission failed:", error);
      }
    },
    [submitDispute, orderId, refetchOrder, resetDisputeState]
  );

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
      <ErrorState error={isError} onRetry={() => window.location.reload()} />
    );
  }

  // Not found state
  if (!order) {
    return <NotFoundState orderId={orderId} />;
  }

  return (
    <div className="w-full">
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        {/* Total Order Card */}
        <Card className="flex items-center justify-center col-span-1 border rounded-xl shadow hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center justify-center h-full py-6">
            <CardTitle className="text-lg font-medium text-center mb-2">
              Total Orders
            </CardTitle>
            <div className="text-5xl font-bold text-green-500 text-center">
              {isSummaryLoading ? (
                <Skeleton className="h-12 w-12" />
              ) : (
                summaryData?.summary.total || 0
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments summary card */}
        <Card className="col-span-1 md:col-span-4 border rounded-xl shadow hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="p-4 border rounded-lg border-gray-200">
              <div className="text-lg font-medium mb-4">
                {userRole === "seller" ? "Sales Overview" : "Purchase Overview"}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    {userRole === "seller" ? "Total Orders" : "Total Purchases"}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-green-500">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : userRole === "seller" ? (
                      summaryData?.summary.asSeller || 0
                    ) : (
                      summaryData?.summary.asBuyer || 0
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    {userRole === "seller" ? "Total Revenue" : "Total Spent"}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      `$${
                        userRole === "seller"
                          ? (summaryData?.summary.totalEarned || 0).toFixed(2)
                          : (summaryData?.summary.totalSpent || 0)?.toFixed(2)
                      }`
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    In Escrow
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-500">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      `$${summaryData?.summary.totalInEscrow || 0}`
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Open Orders
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      (summaryData?.summary.total || 0) -
                      (summaryData?.summary.completed || 0)
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Closed Orders
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      summaryData?.summary.completed || 0
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Disputes
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-red-500">
                    {isSummaryLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      summaryData?.summary.totalDispute || 0
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Card */}
      <div className="bg-white p-5 w-full rounded-xl">
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

        <div className="">
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
            onDisputeSubmit={handleDisputeSubmit}
            isDisputeSubmitting={isDisputeSubmitting}
          />
        </div>
      </div>

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
              By confirming receipt, you acknowledge that you have received the
              order in satisfactory condition. This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <NextUIButton
              color="danger"
              variant="light"
              onPress={handleConfirmModalClose}
              disabled={isConfirming}
            >
              Cancel
            </NextUIButton>
            <NextUIButton
              color="success"
              onPress={confirmOrderUpdate}
              isLoading={isConfirming}
            >
              Confirm Receipt
            </NextUIButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dispute Status Notifications */}
      {disputeSuccess && (
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
              <NextUIButton color="success" onPress={() => resetDisputeState()}>
                OK
              </NextUIButton>
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
              <NextUIButton color="danger" onPress={() => resetDisputeState()}>
                OK
              </NextUIButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
