'use client';

import { Switch, Tab, Tabs } from '@nextui-org/react';
import { CheckCircle, Clock } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';

interface MintResult {
  id: string;
  onChain: {
    status: 'pending' | 'success' | 'failed';
    chain: 'solana' | 'ethereum';
  };
  actionId: string;
}

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

interface MintedNFT {
  _id: string;
  templateId: string;
  mintResult: MintResult;
  name?: string;
  price?: number;
  image?: string;
}

interface OrderData {
  _id: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    ens?: string;
  };
  collectionId: string;
  mintedNfts: MintedNFT[];
  totalPriceOfNFTs: number;
  orderDate: string;
  deliveryStatus:
    | 'Not Initiated'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled';
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  processingStages: ProcessingStage[];
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

const OrderProcessingTimeline = ({
  stages,
}: {
  stages: ProcessingStage[];
}) => {
  // Memoize date formatter to prevent unnecessary recreation
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

  // Format date function
  const formatDate = (dateString: string) => {
    return dateFormatter.format(new Date(dateString));
  };

  // Stage display names mapping
  const stageDisplayNames = {
    order_created: 'Order Created',
    payment_verified: 'Payment Verified',
    nft_minted: 'NFT Minted',
    completed: 'Order Completed',
  };

  return (
    <div className="w-full max-w-3xl bg-white rounded-lg shadow-sm p-4">
      <div className="space-y-0">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === 'completed';
          const isLast = index === stages.length - 1;

          return (
            <div key={stage._id} className="relative">
              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Clock className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className="h-full w-0.5 bg-gray-300 mt-1"
                      style={{ height: '40px' }}
                    />
                  )}
                </div>

                <div className="pb-8">
                  <p className="font-medium text-gray-900">
                    {stageDisplayNames[stage.stage] || stage.stage}
                  </p>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">
                      {formatDate(stage.timestamp)}
                    </span>
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                      {stage.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="border-l-2 border-gray-300 pl-4">
    <p className="text-sm text-gray-500">{label}:</p>
    <p className="text-md font-semibold text-gray-700">{value}</p>
  </div>
);

const ListItem = ({ item }: { item: string }) => (
  <li className="text-sm tracking-tight ml-0.5">{item}</li>
);

const NFTDetailSection = ({ nft }: { nft: NFT }) => {
  // Arrays to render with their labels
  const sections = [
    { label: 'Benefits', items: nft.benefits || [] },
    { label: 'Requirements', items: nft.requirements || [] },
    { label: 'Content', items: nft.content || [] },
    { label: 'Addons', items: nft.addons || [] },
  ];

  return (
    <div className="border-l-2 border-gray-300 pl-4 flex flex-col space-y-2">
      <div>
        <p className="text-base font-semibold text-gray-500">Title</p>
        <p className="text-sm text-gray-900">
          {nft?.name || 'No name'}
        </p>
      </div>

      <div>
        <p className="text-base font-semibold text-gray-500">
          Description
        </p>
        <p className="text-sm text-gray-900">
          {nft?.description || 'No Description'}
        </p>
      </div>

      {sections.map((section, idx) =>
        section.items.length > 0 ? (
          <div key={idx}>
            <p className="text-base font-semibold text-gray-500">
              {section.label}
            </p>
            <ul className="list-disc list-inside text-gray-900 space-y-1 w-44">
              {section.items.map((item, itemIdx) => (
                <ListItem key={itemIdx} item={item} />
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
};

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [nfts, setNfts] = useState<NFT[] | null>(null);
  const [userRole, setUserRole] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<string | null>(null);
  const [selected, setSelected] = React.useState('orderHistory');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId || !accessToken) return;

      setIsLoading(true);
      setIsError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        if (!API_URL) {
          throw new Error('API base URL is not defined.');
        }

        const response = await fetch(
          `${API_URL}/api/v1/desktop/nft/orders/${orderId}`,
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
        setOrder(data.order);
        const nfts = data.order.mintedNfts.map((nft: any) => {
          return {
            ...nft.nftTemplateId,
            quantity: nft.quantity,
          };
        });
        setNfts(nfts);
        setUserRole(data.userRole);
      } catch (error: any) {
        console.error('Fetch Error:', error);
        setIsError(error.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, accessToken]);

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
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Error
          </h2>
          <p className="text-red-500">{isError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-lg text-center">
          <p className="text-lg text-gray-600">
            No order found with ID: {orderId}
          </p>
        </div>
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

  return (
    <div className="mx-auto">
      <div className="p-8 bg-white shadow-md rounded-lg">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6 border-b pb-4">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-xl font-bold">
              My {userRole === 'buyer' ? 'Purchase' : 'Order'}
            </h1>
            <h4 className="text-muted-foreground">
              Order #{order.orderId}
            </h4>
            <p className="text-gray-500">
              Placed on{' '}
              {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
          {order?.orderType !== 'non-phygitals' && (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
              <span className="text-base">Shipped:</span>
              <Switch
                checked={order.deliveryStatus === 'Completed'}
                disabled
                className="cursor-not-allowed"
                aria-label="Shipped Status"
              />
            </div>
          )}
        </div>

        {/* Order Items Table */}
        <div className="mb-8 overflow-x-auto">
          <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="text-base font-medium text-gray-700 bg-gray-50">
              <tr>
                {[
                  'Product Name',
                  'Product Image',
                  'Quantity',
                  'Price',
                ].map((header, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-center border-r border-gray-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nfts && nfts.length > 0 ? (
                nfts.map((el, index) => (
                  <tr
                    key={index}
                    className="odd:bg-white even:bg-gray-50 border-b border-gray-200 text-base text-gray-800 text-center hover:bg-gray-100 transition-colors"
                  >
                    <td className="border-r border-gray-200 py-4">
                      {el.name || 'Unknown Product'}
                    </td>
                    <td className="border-r border-gray-200 py-4">
                      <div className="flex items-center justify-center">
                        {el?.image ? (
                          <Image
                            src={el.image}
                            alt={el.name || 'Product'}
                            width={50}
                            height={50}
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
                    </td>
                    <td className="border-r border-gray-200 py-4">
                      {el.quantity}
                    </td>
                    <td className="py-4">
                      <div className="font-medium">
                        ${el.price?.toFixed(2) || '0.00'}
                      </div>
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

          {/* Order summary with improved layout */}
          <div className="flex flex-col items-end mt-6 space-y-2 bg-gray-50 p-4 rounded-lg w-full md:w-1/3 ml-auto">
            <div className="flex justify-between w-full text-sm">
              <p>Subtotal</p>
              <p className="font-medium">${subtotal?.toFixed(2)}</p>
            </div>
            <div className="flex justify-between w-full text-sm">
              <p>Discount</p>
              <p className="font-medium text-green-600">
                -${discountRate?.toFixed(2)}
              </p>
            </div>
            <div className="flex justify-between w-full text-sm">
              <p>Shipping</p>
              <p className="font-medium">
                ${shippingCost?.toFixed(2)}
              </p>
            </div>
            <div className="border-b border-gray-300 w-full my-2"></div>
            <div className="flex justify-between w-full font-bold">
              <p>Total</p>
              <p>${totalCost?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}

        <div className="mt-8">
          <Tabs
            aria-label="Order Details"
            selectedKey={selected}
            onSelectionChange={setSelected}
            variant="underlined"
            size="large"
            classNames={{
              base: 'w-full',
              tabList: 'gap-6',
              tab: 'py-2 px-0',
              tabContent: 'text-base font-medium',
            }}
          >
            <Tab key="orderHistory" title="Order History">
              <OrderProcessingTimeline
                stages={order.processingStages}
              />
            </Tab>

            <Tab key="customerDetails" title="Customer Details">
              <div className="max-w-2xl bg-white rounded p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem
                    label="Customer Name"
                    value={
                      order?.customer?.name || 'Unknown Customer'
                    }
                  />
                  <DetailItem
                    label="Swop.ID"
                    value={order?.customer?.ens || ''}
                  />
                  <DetailItem
                    label="Customer Email"
                    value={order?.customer?.email || 'Unknown Email'}
                  />
                  <DetailItem
                    label="Customer Number"
                    value={order?.customer?.phone || '+8801318470354'}
                  />

                  <DetailItem
                    label="Shipping Address"
                    value={
                      order?.customer?.shippingAddress ||
                      'Unknown Address'
                    }
                  />
                </div>
              </div>
            </Tab>

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
      </div>
    </div>
  );
}
