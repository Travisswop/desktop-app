// app/orders/[orderId]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { useUser } from '@/lib/UserContext';

// TypeScript Interfaces

interface MintResult {
  id: string;
  onChain: {
    status: 'pending' | 'success' | 'failed';
    chain: 'solana' | 'ethereum';
  };
  actionId: string;
}

interface MintedNFT {
  _id: string;
  templateId: string;
  mintResult: MintResult;
  name?: string; // Product name fetched from API
  price?: number; // Product price fetched from API
  image?: string; // Product image fetched from API
}

interface OrderData {
  _id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerShippingAddress: string;
  collectionId: string;
  mintedNfts: MintedNFT[];
  totalPriceOfNFTs: number;
  orderDate: string; // ISO string
  deliveryStatus: 'Not Initiated' | 'In Progress' | 'Completed' | 'Cancelled';
  edited: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export default function OrderPage() {
  const { accessToken } = useUser();
  const params = useParams();
  console.log('Params:', params);
  console.log('token:', accessToken);
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Order ID:', orderId);
    console.log('Access Token:', accessToken);

    if (!orderId) {
      setIsError('Order ID is missing.');
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setIsError('Authentication token is missing.');
      setIsLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      setIsError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        if (!API_URL) {
          throw new Error('API base URL is not defined.');
        }

        // Fetch order details
        const orderResponse = await fetch(
          `${API_URL}/api/v1/desktop/nft/orders/${orderId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.message || 'Failed to fetch order data.');
        }

        const orderData = await orderResponse.json();
        if (orderData.state !== 'success') {
          throw new Error(orderData.message || 'Failed to fetch order data.');
        }

        const order = orderData.data;

        // Fetch template details for minted NFTs
        const templates = await Promise.all(
          order.mintedNfts.map(async (nft: MintedNFT) => {
            const templateResponse = await fetch(
              `${API_URL}/api/v1/desktop/nft/getTemplateDetails?collectionId=${order.collectionId}&templateId=${nft.templateId}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (!templateResponse.ok) {
              console.warn(`Failed to fetch details for Template ID: ${nft.templateId}`);
              return { ...nft }; // Return the original NFT if fetching fails
            }

            const templateData = await templateResponse.json();
            if (templateData.state !== 'success') {
              console.warn(`Failed to fetch details for Template ID: ${nft.templateId}`);
              return { ...nft }; // Return the original NFT if fetching fails
            }

            const { name, image, price } = templateData.data.template.metadata;
            return {
              ...nft,
              name,
              image,
              price: templateData.data.template.price,
            };
          })
        );

        // Replace minted NFTs with enriched data
        setOrder({
          ...order,
          mintedNfts: templates,
        });
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
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-500">Error: {isError}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">No order found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-start gap-4">
            {/* <div className="w-24 h-24 relative">
              <Image
                src="/placeholder.svg" // Replace with dynamic image if available
                alt="Product"
                width={96}
                height={96}
                className="rounded-lg border"
              />
            </div> */}
            <div>
              <h1 className="text-xl font-semibold">
                Order #{order.orderId}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Shipped:</span>
            <Switch
              checked={order.deliveryStatus === 'Completed'}
              disabled
              className="cursor-not-allowed"
              aria-label="Shipped Status"
            />
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mb-6 overflow-x-auto">
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.mintedNfts.map((item) => (
                <TableRow key={item._id} className="border-t">
                  <TableCell>{item.name || 'Unknown Product'}</TableCell>
                  <TableCell>
                    <Image
                      src={item.image || '/placeholder.svg'}
                      alt={item.name || 'Product Image'}
                      width={50}
                      height={50}
                      className="rounded-lg"
                    />
                  </TableCell>
                  <TableCell className="text-center">1</TableCell>
                  <TableCell className="text-right">
                    ${item.price?.toFixed(2) || '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="customer">Customer Details</TabsTrigger>
            <TabsTrigger value="description">Order Description</TabsTrigger>
          </TabsList>

          {/* Order History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  Delivery Status
                </span>
                <span>{order.deliveryStatus}</span>
              </div>

              <div className="flex items-center justify-between py-2 rounded-lg">
                <span className="text-muted-foreground">
                  Order Tracking Info
                </span>
                <div className="flex gap-2">
                  <span className="text-sm font-mono">{order.orderId}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  Order Placed
                </span>
                <span>{new Date(order.orderDate).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Total Price</span>
                <span>${order.totalPriceOfNFTs.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>

          {/* Customer Details Tab */}
          <TabsContent value="customer">
            <div className="text-muted-foreground">
              <h2 className="text-lg font-semibold mb-4">
                Customer Details
              </h2>
              <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
                <p className="font-normal">
                  Name:{' '}
                  <span className="font-semibold">{order.customerName}</span>
                </p>
                <p className="font-normal">
                  Email:{' '}
                  <span className="font-semibold">{order.customerEmail}</span>
                </p>
                <p className="font-normal">
                  Phone:{' '}
                  <span className="font-semibold">{order.customerPhone}</span>
                </p>
                <p className="font-normal">
                  Address:{' '}
                  <span className="font-semibold">
                    {order.customerShippingAddress}
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Order Description Tab */}
          <TabsContent value="description">
            <div className="text-muted-foreground">
              <h2 className="text-lg font-semibold mb-4">Order Description</h2>
              <p className="font-normal">
                This order includes a variety of NFTs minted from your selected
                collection. Each NFT has been carefully generated and is being
                prepared for delivery.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
