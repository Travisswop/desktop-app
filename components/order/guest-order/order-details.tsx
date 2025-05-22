'use client';

import {
  Tab,
  Tabs,
  Modal,
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
} from '@nextui-org/react';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import {
  getGuestOrderById,
  confirmGuestOrderReceipt,
  createGuestOrderDispute,
} from '@/actions/guestOrderActions';

export default function GuestOrderInfos() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const orderId = id as string;

  // States
  const [order, setOrder] = useState<any>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [processingStages, setProcessingStages] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] =
    useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(
    null
  );

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || !email) return;

    setIsLoading(true);
    setIsError(null);

    try {
      const data = await getGuestOrderById(orderId, email as string);

      setOrder(data);

      const nfts = data.mintedNfts.map((nft: any) => ({
        ...nft.nftTemplateId,
        quantity: nft.quantity,
      }));

      setNfts(nfts);

      setProcessingStages(data.processingStages || []);

      const findCompleteStatus = data.processingStages?.find(
        (item: any) =>
          item.stage === 'completed' && item.status === 'completed'
      );

      setIsCompleted(!!findCompleteStatus);
    } catch (error: any) {
      console.error('Fetch Error:', error);
      setIsError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, email]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleOrderConfirm = async () => {
    if (!orderId || !email) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const result = await confirmGuestOrderReceipt({
        orderId,
        email: email as string,
        rating: 5,
        feedback: '',
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      setIsCompleted(true);
      setUpdateSuccess(
        result.message || 'Order confirmed successfully!'
      );

      // Refresh order details
      setTimeout(() => {
        fetchOrderDetails();
        setIsConfirmOrderModalOpen(false);
        setUpdateSuccess(null);
      }, 2000);
    } catch (error: any) {
      console.error('Update Error:', error);
      setUpdateError(
        error.message || 'An unexpected error occurred.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisputeSubmit = async () => {
    if (!orderId || !email || !disputeReason.trim()) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const result = await createGuestOrderDispute({
        orderId,
        email: email as string,
        reason: disputeReason,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      setUpdateSuccess(
        result.message || 'Dispute submitted successfully!'
      );

      // Refresh order details
      setTimeout(() => {
        fetchOrderDetails();
        setIsDisputeModalOpen(false);
        setUpdateSuccess(null);
      }, 2000);
    } catch (error: any) {
      console.error('Update Error:', error);
      setUpdateError(
        error.message || 'An unexpected error occurred.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse space-y-4 w-full max-w-4xl">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Error Loading Order
          </h2>
          <p className="text-gray-600 mb-4">{isError}</p>
          <Button
            color="primary"
            onClick={fetchOrderDetails}
            className="mx-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600">
            We couldn't find the order you're looking for.
          </p>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(dateString));
  };

  const canConfirmOrder =
    order.status.payment === 'completed' &&
    order.status.delivery === 'Completed' &&
    !isCompleted;

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Order #{order.orderId}
        </h1>
        <p className="text-gray-500">
          Placed on {formatDate(order.orderDate)}
        </p>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        className="mb-6"
      >
        <Tab key="details" title="Order Details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardHeader className="pb-0">
                  <h2 className="text-xl font-semibold">Items</h2>
                </CardHeader>
                <CardBody>
                  {nfts.map((nft) => (
                    <div
                      key={nft._id}
                      className="flex flex-col md:flex-row items-start md:items-center py-4 border-b last:border-b-0"
                    >
                      <div className="relative h-20 w-20 rounded-md overflow-hidden mb-4 md:mb-0 mr-0 md:mr-4">
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium text-gray-900">
                          {nft.name}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {nft.description?.substring(0, 100)}
                          {nft.description?.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center mt-1">
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                          >
                            {nft.nftType}
                          </Chip>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0 text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(nft.price)}
                        </div>
                        <div className="text-gray-500 text-sm">
                          Qty: {nft.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>

              {/* Actions */}
              {!isCompleted && (
                <Card className="mb-6">
                  <CardHeader className="pb-0">
                    <h2 className="text-xl font-semibold">Actions</h2>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-4">
                    {canConfirmOrder && (
                      <Button
                        color="success"
                        onClick={() =>
                          setIsConfirmOrderModalOpen(true)
                        }
                      >
                        Confirm Order Receipt
                      </Button>
                    )}
                    <Button
                      color="danger"
                      variant="flat"
                      onClick={() => setIsDisputeModalOpen(true)}
                    >
                      Report an Issue
                    </Button>
                  </CardBody>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="mb-6">
                <CardHeader className="pb-0">
                  <h2 className="text-xl font-semibold">
                    Order Summary
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Chip
                        color={
                          isCompleted
                            ? 'success'
                            : order.status.payment === 'completed'
                            ? 'primary'
                            : 'warning'
                        }
                      >
                        {isCompleted
                          ? 'Completed'
                          : order.status.payment === 'completed'
                          ? 'In Progress'
                          : 'Pending'}
                      </Chip>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment</span>
                      <Chip
                        color={
                          order.status.payment === 'completed'
                            ? 'success'
                            : order.status.payment === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {order.status.payment}
                      </Chip>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <Chip
                        color={
                          order.status.delivery === 'Completed'
                            ? 'success'
                            : order.status.delivery === 'In Progress'
                            ? 'primary'
                            : order.status.delivery ===
                              'Not Initiated'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {order.status.delivery}
                      </Chip>
                    </div>

                    {/* Payment Information */}
                    {order.stripePayment && (
                      <>
                        <Divider />
                        <div className="pt-2">
                          <h3 className="font-medium text-gray-800 mb-2">
                            Payment Information
                          </h3>
                          {order.stripePayment.paymentMethod && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  Payment Method
                                </span>
                                <span className="font-medium capitalize">
                                  {order.stripePayment.paymentMethod
                                    .payment_type || 'Card'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">
                                  {order.stripePayment.paymentMethod
                                    .brand || 'Card'}
                                </span>
                                <span className="font-medium">
                                  ••••{' '}
                                  {order.stripePayment.paymentMethod
                                    ?.last4 || '****'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <Divider />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(order.financial.subtotal)}
                      </span>
                    </div>
                    {order.financial.discountRate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Discount
                        </span>
                        <span className="font-medium text-green-600">
                          -
                          {formatCurrency(
                            order.financial.subtotal *
                              order.financial.discountRate
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {formatCurrency(order.financial.shippingCost)}
                      </span>
                    </div>
                    <Divider />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold">
                        {formatCurrency(order.financial.totalCost)}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card className="mb-6">
                <CardHeader className="pb-0">
                  <h2 className="text-xl font-semibold">
                    Shipping Information
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    <p className="font-medium">{order.buyer.name}</p>
                    <p className="text-gray-600">
                      {order.buyer.email}
                    </p>
                    <p className="text-gray-600">
                      {order.buyer.phone}
                    </p>
                    {order.buyer.address?.line1 && (
                      <p className="text-gray-600">
                        {order.buyer.address.line1}
                      </p>
                    )}
                  </div>

                  {order.shipping &&
                    order.orderType !== 'non-phygitals' && (
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="font-medium mb-2">
                          Shipping Details
                        </h3>
                        {order.shipping.provider && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">
                              Provider:
                            </span>{' '}
                            {order.shipping.provider}
                          </div>
                        )}
                        {order.shipping.trackingNumber && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">
                              Tracking Number:
                            </span>{' '}
                            {order.shipping.trackingNumber}
                          </div>
                        )}
                        {order.shipping.estimatedDeliveryDate && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">
                              Estimated Delivery:
                            </span>{' '}
                            {formatDate(
                              order.shipping.estimatedDeliveryDate
                            )}
                          </div>
                        )}
                        {order.shipping.notes && (
                          <div className="text-sm mt-2">
                            <span className="font-medium">
                              Notes:
                            </span>
                            <p className="mt-1 text-gray-600">
                              {order.shipping.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </CardBody>
              </Card>

              {/* Billing Details Card */}
              <Card className="mb-6">
                <CardHeader className="pb-0">
                  <h2 className="text-xl font-semibold">
                    Billing Details
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    <p className="font-medium">{order.buyer.name}</p>
                    <p className="text-gray-600">
                      {order.buyer.email}
                    </p>
                    {order.billing?.address && (
                      <>
                        <p className="text-gray-600">
                          {order.billing.address.line1}
                        </p>
                        {order.billing.address.line2 && (
                          <p className="text-gray-600">
                            {order.billing.address.line2}
                          </p>
                        )}
                        <p className="text-gray-600">
                          {order.billing.address.city},{' '}
                          {order.billing.address.state},{' '}
                          {order.billing.address.postalCode}
                        </p>
                        {order.billing.address.country && (
                          <p className="text-gray-600">
                            {order.billing.address.country}
                          </p>
                        )}
                      </>
                    )}
                    {!order.billing?.address &&
                      order.buyer.address && (
                        <>
                          <p className="text-gray-600">
                            {order.buyer.address.line1}
                          </p>
                          {order.buyer.address.line2 && (
                            <p className="text-gray-600">
                              {order.buyer.address.line2}
                            </p>
                          )}
                          <p className="text-gray-600">
                            {order.buyer.address.city},{' '}
                            {order.buyer.address.state},{' '}
                            {order.buyer.address.postalCode}
                          </p>
                          {order.buyer.address.country && (
                            <p className="text-gray-600">
                              {order.buyer.address.country}
                            </p>
                          )}
                        </>
                      )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tab>
      </Tabs>

      {/* Confirm Order Modal */}
      <Modal
        isOpen={isConfirmOrderModalOpen}
        onOpenChange={setIsConfirmOrderModalOpen}
      >
        <ModalContent>
          <ModalHeader>Confirm Order Receipt</ModalHeader>
          <ModalBody>
            {updateError && (
              <div className="text-red-500 mb-4">{updateError}</div>
            )}
            {updateSuccess && (
              <div className="text-green-500 mb-4">
                {updateSuccess}
              </div>
            )}
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
              onPress={() => setIsConfirmOrderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="success"
              onPress={handleOrderConfirm}
              isLoading={isUpdating}
            >
              Confirm Receipt
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={isDisputeModalOpen}
        onOpenChange={setIsDisputeModalOpen}
      >
        <ModalContent>
          <ModalHeader>Report an Issue</ModalHeader>
          <ModalBody>
            {updateError && (
              <div className="text-red-500 mb-4">{updateError}</div>
            )}
            {updateSuccess && (
              <div className="text-green-500 mb-4">
                {updateSuccess}
              </div>
            )}
            <p className="mb-4">
              Please describe the issue you're experiencing with this
              order. Our team will review your report and contact you.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Please describe the issue in detail"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => setIsDisputeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleDisputeSubmit}
              isLoading={isUpdating}
              isDisabled={!disputeReason.trim()}
            >
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
