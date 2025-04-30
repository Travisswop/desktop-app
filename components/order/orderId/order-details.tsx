'use client';

import { useUser } from '@/lib/UserContext';
import {
  Switch,
  Tab,
  Tabs,
  Modal,
  Button,
  Input,
  Select,
  SelectItem,
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
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  CreditCard,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import React, {
  memo,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

// Interface definitions
interface NFT {
  _id: string;
  userId: string;
  collectionId: string;
  collectionMintAddress: string;
  ownerAddress: string;
  name: string;
  description: string;
  image: string;
  price: number;
  nftType: string;
  benefits?: string[];
  requirements?: string[];
  content?: string[];
  addons?: string[];
  quantity: number;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  wallet?: {
    ens?: string;
  };
  address?: {
    line1?: string;
  };
}

interface OrderData {
  _id: string;
  orderId: string;
  buyer: Customer;
  seller: Customer;
  collectionId: string;
  totalPriceOfNFTs: number;
  orderDate: string;
  status: {
    delivery:
      | 'Not Initiated'
      | 'In Progress'
      | 'Completed'
      | 'Cancelled';
    payment:
      | 'pending'
      | 'processing'
      | 'completed'
      | 'failed'
      | 'refunded'
      | 'cancelled';
  };
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  processingStages: ProcessingStage[];
  mintedNfts: any[];
  financial: {
    subtotal: number;
    discountRate: number;
    shippingCost: number;
    totalCost: number;
  };
}

interface ProcessingStage {
  _id: string;
  stage: string;
  status: string;
  timestamp: string;
}

interface ShippingUpdateData {
  deliveryStatus:
    | 'Not Initiated'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled';
  trackingNumber: string;
  shippingProvider: string;
  estimatedDeliveryDate: string;
  additionalNotes: string;
}

// Types
type StageKey =
  | 'order_created'
  | 'payment_verified'
  | 'nft_minted'
  | 'shipping_prepared'
  | 'completed';
type StatusKey = 'pending' | 'in_progress' | 'completed' | 'failed';

// Constants
const stageDisplayNames: Record<StageKey, string> = {
  order_created: 'Order Created',
  payment_verified: 'Payment Verified',
  nft_minted: 'NFT Minted',
  shipping_prepared: 'Shipping',
  completed: 'Order Completed',
};

const statusDisplayNames: Record<StatusKey, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  failed: 'Failed',
};

const stageIcons = {
  order_created: <ShoppingCart size={20} />,
  payment_verified: <CreditCard size={20} />,
  nft_minted: <Package size={20} />,
  shipping_prepared: <Truck size={20} />,
  completed: <CheckCircle size={20} />,
};

// Memoized components for better performance
const OrderProcessingTimeline = memo(
  ({ stages }: { stages: ProcessingStage[] }) => {
    // Memoize date formatter
    const dateFormatter = useMemo(() => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
    }, []);

    const formatDate = useCallback(
      (dateString: string) => {
        return dateFormatter.format(new Date(dateString));
      },
      [dateFormatter]
    );

    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="space-y-0">
            {stages.map((stage, index) => {
              const isCompleted = stage.status === 'completed';
              const isLast = index === stages.length - 1;
              const stageKey = stage.stage as StageKey;
              const statusKey = stage.status as StatusKey;

              return (
                <div key={stage.stage} className="relative">
                  <div className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`flex-shrink-0 p-2 rounded-full ${
                          isCompleted ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        {stageIcons[stageKey] ||
                          (isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          ))}
                      </div>
                      {!isLast && (
                        <div
                          className={`h-full w-0.5 ${
                            isCompleted
                              ? 'bg-green-300'
                              : 'bg-gray-300'
                          } mt-1`}
                          style={{ height: '40px' }}
                        />
                      )}
                    </div>

                    <div className="pb-8">
                      <p className="font-medium text-gray-900">
                        {stageDisplayNames[stageKey] || stage.stage}
                      </p>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500">
                          {formatDate(stage.timestamp)}
                        </span>
                        <Chip
                          className="ml-2"
                          size="sm"
                          color={
                            statusKey === 'completed'
                              ? 'success'
                              : statusKey === 'pending'
                              ? 'warning'
                              : statusKey === 'failed'
                              ? 'danger'
                              : 'primary'
                          }
                          variant="flat"
                        >
                          {statusDisplayNames[statusKey] ||
                            stage.status}
                        </Chip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    );
  }
);

OrderProcessingTimeline.displayName = 'OrderProcessingTimeline';

const DetailItem = memo(
  ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }) => (
    <div className="border-l-2 border-gray-300 pl-4 py-2">
      <p className="text-sm text-gray-500 flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {label}:
      </p>
      <p className="text-md font-semibold text-gray-700">
        {value || 'Not provided'}
      </p>
    </div>
  )
);

DetailItem.displayName = 'DetailItem';

const ListItem = memo(({ item }: { item: string }) => (
  <li className="text-sm tracking-tight ml-0.5">{item}</li>
));

ListItem.displayName = 'ListItem';

const NFTDetailSection = memo(({ nft }: { nft: NFT }) => {
  // Arrays to render with their labels
  const sections = [
    { label: 'Benefits', items: nft.benefits || [] },
    { label: 'Requirements', items: nft.requirements || [] },
    { label: 'Content', items: nft.content || [] },
    { label: 'Addons', items: nft.addons || [] },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <div className="flex flex-col">
          <p className="text-lg font-bold">
            {nft?.name || 'Unnamed Product'}
          </p>
          <p className="text-sm text-gray-500">
            Price: ${nft?.price?.toFixed(2) || '0.00'} ×{' '}
            {nft?.quantity || 0}
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            {nft?.image ? (
              <div className="relative w-full h-48">
                <Image
                  src={nft.image}
                  alt={nft.name || 'Product'}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">
                  No image available
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <div>
              <p className="text-base font-semibold text-gray-500">
                Description
              </p>
              <p className="text-sm text-gray-900">
                {nft?.description || 'No description provided'}
              </p>
            </div>

            {sections.map((section, idx) =>
              section.items.length > 0 ? (
                <div key={idx}>
                  <p className="text-base font-semibold text-gray-500">
                    {section.label}
                  </p>
                  <ul className="list-disc list-inside text-gray-900 space-y-1">
                    {section.items.map((item, itemIdx) => (
                      <ListItem key={itemIdx} item={item} />
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
});

NFTDetailSection.displayName = 'NFTDetailSection';

export default function OrderPage() {
  const { user, accessToken } = useUser();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [nfts, setNfts] = useState<NFT[] | null>(null);
  const [userRole, setUserRole] = useState<'buyer' | 'seller'>(
    'buyer'
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [selected, setSelected] = useState('orderHistory');
  const [isCompleted, setIsCompleted] = useState(false);
  const [processingStages, setProcessingStages] = useState<
    ProcessingStage[]
  >([]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(
    null
  );
  const [shippingData, setShippingData] =
    useState<ShippingUpdateData>({
      deliveryStatus: 'Not Initiated',
      trackingNumber: '',
      shippingProvider: '',
      estimatedDeliveryDate: '',
      additionalNotes: '',
    });

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId || !accessToken || !user._id) return;

    setIsLoading(true);
    setIsError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API base URL is not defined.');
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch order data. Status: ${response.status}`
        );
      }

      const { data } = await response.json();
      setOrder(data);

      const nfts = data.mintedNfts.map((nft: any) => ({
        ...nft.nftTemplateId,
        quantity: nft.quantity,
      }));

      setNfts(nfts);
      setUserRole(user._id === data.seller.id ? 'seller' : 'buyer');

      const filterProcessing = data.processingStages.filter(
        (item: any) =>
          Object.keys(stageDisplayNames).includes(item.stage)
      );

      setProcessingStages(filterProcessing);

      const findCompleteStatus = data.processingStages.find(
        (item: any) =>
          item.stage === 'completed' && item.status === 'completed'
      );

      setIsCompleted(!!findCompleteStatus);

      // Pre-fill shipping data if available
      if (data.shipping) {
        setShippingData({
          deliveryStatus: data.status.delivery,
          trackingNumber: data.shipping.trackingNumber || '',
          shippingProvider: data.shipping.provider || '',
          estimatedDeliveryDate:
            data.shipping.estimatedDeliveryDate || '',
          additionalNotes: data.shipping.notes || '',
        });
      }
    } catch (error: any) {
      console.error('Fetch Error:', error);
      setIsError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, accessToken, user]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleShippingUpdate = async () => {
    if (!orderId || !accessToken) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API base URL is not defined.');
      }

      const response = await fetch(
        `${API_URL}/api/v5/orders/${orderId}/shipping`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shippingData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`${result.message}`);
      }

      // Update the local order data with the new shipping information
      setOrder((prevOrder) => {
        if (!prevOrder) return null;
        return {
          ...prevOrder,
          status: {
            ...prevOrder.status,
            delivery: shippingData.deliveryStatus,
          },
        };
      });

      setUpdateSuccess('Shipping information updated successfully!');

      // Refresh order details
      setTimeout(() => {
        fetchOrderDetails();
        setIsUpdateModalOpen(false);
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

  const handleOrderUpdate = async () => {
    setIsUpdating(true);
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

      const updatedProcessingStages = processingStages.map(
        (stage) => {
          if (stage.stage === 'completed') {
            return { ...stage, status: 'completed' };
          }
          return stage;
        }
      );

      setProcessingStages(updatedProcessingStages);
      setIsCompleted(true);

      // Refresh order details
      setTimeout(() => {
        fetchOrderDetails();
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

  // Error state
  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen p-4">
        <Card className="max-w-lg w-full bg-red-50 border border-red-200">
          <CardBody className="p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <h2 className="text-xl font-semibold text-red-600">
                Error
              </h2>
            </div>
            <p className="text-red-500 mb-4">{isError}</p>
            <Button
              color="danger"
              variant="flat"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-screen p-4">
        <Card className="max-w-lg w-full">
          <CardBody className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">
              No order found with ID: {orderId}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { subtotal, discountRate, shippingCost, totalCost } =
    order.financial || {
      subtotal: 0,
      discountRate: 0,
      shippingCost: 0,
      totalCost: 0,
    };

  console.log('order', order);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card className="shadow-md w-full">
        {/* Header Section */}
        <CardHeader className="flex justify-between items-start p-6 border-b">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold mr-3">
                {userRole === 'buyer'
                  ? 'My Purchase'
                  : 'Customer Order'}
              </h1>
              {order?.orderType !== 'non-phygitals' ? (
                <Chip
                  color={
                    order.status.delivery === 'Completed'
                      ? 'success'
                      : order.status.delivery === 'In Progress'
                      ? 'primary'
                      : order.status.delivery === 'Cancelled'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {order.status.delivery}
                </Chip>
              ) : (
                <Chip
                  color={
                    order.status.payment === 'completed'
                      ? 'success'
                      : order.status.payment === 'processing'
                      ? 'primary'
                      : order.status.payment === 'cancelled'
                      ? 'danger'
                      : order.status.payment === 'failed'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {order.status.payment}
                </Chip>
              )}
            </div>
            <h4 className="text-gray-500">Order #{order.orderId}</h4>
            <p className="text-sm text-gray-500">
              Placed on{' '}
              {new Date(order.orderDate).toLocaleDateString()} at{' '}
              {new Date(order.orderDate).toLocaleTimeString()}
            </p>
          </div>

          {order?.orderType !== 'non-phygitals' &&
            userRole === 'buyer' && (
              <div>
                {isCompleted ? (
                  <Chip
                    color="success"
                    variant="flat"
                    size="lg"
                    radius="full"
                    startContent={
                      <CheckCircle size={16} aria-hidden />
                    }
                    css={{
                      dflex: 'center', // makes it a flex container, centering icon + text
                      gap: '$2', // theme spacing between icon and text
                      px: '$4', // horizontal padding
                      py: '$1.5', // vertical padding
                      fontWeight: '$semibold', // a bit bolder text
                    }}
                  >
                    Completed
                  </Chip>
                ) : (
                  <Button
                    color="primary"
                    size="md"
                    onPress={handleOrderUpdate}
                    isLoading={isUpdating}
                    disabled={order.status.delivery !== 'Completed'}
                    startContent={<CheckCircle size={16} />}
                  >
                    Mark as Complete
                  </Button>
                )}
              </div>
            )}

          {order?.orderType !== 'non-phygitals' &&
            userRole === 'seller' && (
              <div>
                {order.status.delivery === 'Completed' ? (
                  <Chip color="success" variant="flat" size="lg">
                    <Truck size={16} className="mr-1" />
                    Shipped
                  </Chip>
                ) : (
                  <Button
                    color="primary"
                    size="md"
                    onClick={() => setIsUpdateModalOpen(true)}
                    startContent={<Truck size={16} />}
                  >
                    Update Shipping
                  </Button>
                )}
              </div>
            )}
        </CardHeader>

        <CardBody className="p-6">
          {/* Order Items Table */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Order Items
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left">
                <thead className="text-base font-medium text-gray-700 bg-gray-50">
                  <tr>
                    {['Product', 'Price', 'Quantity', 'Total'].map(
                      (header, idx) => (
                        <th key={idx} className="px-6 py-3 text-left">
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {nfts && nfts.length > 0 ? (
                    nfts.map((nft, index) => (
                      <tr
                        key={index}
                        className="odd:bg-white even:bg-gray-50 border-b border-gray-200 text-base text-gray-800 hover:bg-gray-100 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 mr-3">
                              {nft?.image ? (
                                <Image
                                  src={nft.image}
                                  alt={nft.name || 'Product'}
                                  width={48}
                                  height={48}
                                  className="rounded object-cover"
                                  onError={(e) => {
                                    const target =
                                      e.target as HTMLImageElement;
                                    target.src = '/placeholder.svg';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-500">
                                    No image
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {nft.name || 'Unknown Product'}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {nft.description?.substring(0, 60) ||
                                  'No description'}
                                {nft.description?.length > 60
                                  ? '...'
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          ${nft.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4">{nft.quantity}</td>
                        <td className="px-6 py-4 font-medium">
                          ${(nft.price * nft.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-gray-500"
                      >
                        No products found in this order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Order summary */}
            <div className="flex flex-col items-end mt-6">
              <Card className="w-full md:w-1/3 bg-gray-50">
                <CardBody className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p>Subtotal</p>
                      <p className="font-medium">
                        ${subtotal?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p>Discount</p>
                      <p className="font-medium text-green-600">
                        -${discountRate?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p>Shipping</p>
                      <p className="font-medium">
                        ${shippingCost?.toFixed(2)}
                      </p>
                    </div>
                    <Divider />
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <p>Total</p>
                      <p>${totalCost?.toFixed(2)}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="mt-8">
            <Tabs
              aria-label="Order Details"
              selectedKey={selected}
              onSelectionChange={setSelected}
              variant="underlined"
              size="lg"
              classNames={{
                base: 'w-full',
                tabList: 'gap-6',
                tab: 'py-2 px-0',
                tabContent: 'text-base font-medium',
              }}
            >
              <Tab
                key="orderHistory"
                title={
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span>Order Timeline</span>
                  </div>
                }
              >
                <OrderProcessingTimeline stages={processingStages} />
              </Tab>

              {userRole === 'seller' && (
                <Tab
                  key="customerDetails"
                  title={
                    <div className="flex items-center gap-2">
                      <Package size={18} />
                      <span>Customer Details</span>
                    </div>
                  }
                >
                  <Card className="w-full">
                    <CardBody className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailItem
                          label="Customer Name"
                          value={
                            order?.buyer?.name || 'Unknown Customer'
                          }
                        />
                        {order?.buyer?.wallet?.ens && (
                          <DetailItem
                            label="Swop.ID"
                            value={order.buyer.wallet.ens}
                          />
                        )}
                        <DetailItem
                          label="Email"
                          value={
                            order?.buyer?.email || 'Unknown Email'
                          }
                        />
                        <DetailItem
                          label="Phone Number"
                          value={
                            order?.buyer?.phone || 'Not provided'
                          }
                        />
                        <DetailItem
                          label="Shipping Address"
                          value={
                            order?.buyer?.address?.line1 ||
                            'Unknown Address'
                          }
                        />
                        {shippingData.trackingNumber && (
                          <DetailItem
                            label="Tracking Number"
                            value={shippingData.trackingNumber}
                            icon={<Truck size={16} />}
                          />
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Tab>
              )}

              {userRole === 'buyer' && (
                <Tab
                  key="sellerDetails"
                  title={
                    <div className="flex items-center gap-2">
                      <Package size={18} />
                      <span>Seller Details</span>
                    </div>
                  }
                >
                  <Card className="w-full">
                    <CardBody className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailItem
                          label="Customer Name"
                          value={
                            order?.seller?.name || 'Unknown Customer'
                          }
                        />
                        {order?.seller?.wallet?.ens && (
                          <DetailItem
                            label="Swop.ID"
                            value={order.seller.wallet.ens}
                          />
                        )}
                        <DetailItem
                          label="Email"
                          value={
                            order?.seller?.email || 'Unknown Email'
                          }
                        />
                        <DetailItem
                          label="Phone Number"
                          value={
                            order?.seller?.phone || 'Not provided'
                          }
                        />
                      </div>
                    </CardBody>
                  </Card>
                </Tab>
              )}

              <Tab key="orderDescription" title="Order Description">
                <div className="w-full bg-white rounded p-4 shadow-sm">
                  <div className="space-y-8">
                    {nfts && nfts.length > 0 ? (
                      nfts.map((item, idx) => (
                        <NFTDetailSection key={idx} nft={item} />
                      ))
                    ) : (
                      <p className="text-gray-500 italic">
                        No product details available
                      </p>
                    )}
                  </div>
                </div>
              </Tab>
            </Tabs>
          </div>
        </CardBody>
      </Card>

      {/* Shipping Update Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        size="2xl"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-xl font-semibold">
              Update Shipping Status
            </h3>
          </ModalHeader>
          <ModalBody>
            {updateSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-600 text-sm flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateSuccess}
                </p>
              </div>
            )}

            {updateError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-500 text-sm">{updateError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Delivery Status"
                  placeholder="Select status"
                  selectedKeys={[shippingData.deliveryStatus]}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      deliveryStatus: e.target.value as any,
                    })
                  }
                  className="w-full"
                >
                  <SelectItem
                    key="Not Initiated"
                    value="Not Initiated"
                  >
                    Not Initiated
                  </SelectItem>
                  <SelectItem key="In Progress" value="In Progress">
                    In Progress
                  </SelectItem>
                  <SelectItem key="Completed" value="Completed">
                    Completed
                  </SelectItem>
                  <SelectItem key="Cancelled" value="Cancelled">
                    Cancelled
                  </SelectItem>
                </Select>
              </div>

              <div>
                <Input
                  label="Tracking Number"
                  placeholder="Enter tracking number"
                  value={shippingData.trackingNumber}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      trackingNumber: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <Input
                  label="Shipping Provider"
                  placeholder="Enter shipping provider"
                  value={shippingData.shippingProvider}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      shippingProvider: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <Input
                  type="date"
                  label="Estimated Delivery Date"
                  value={shippingData.estimatedDeliveryDate}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      estimatedDeliveryDate: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Enter any additional notes here..."
                  value={shippingData.additionalNotes}
                  onChange={(e) =>
                    setShippingData({
                      ...shippingData,
                      additionalNotes: e.target.value,
                    })
                  }
                  className="border-2 border-gray-300 rounded-lg p-2 w-full h-24 resize-none"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => setIsUpdateModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleShippingUpdate}
              isLoading={isUpdating}
            >
              Update Shipping
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
