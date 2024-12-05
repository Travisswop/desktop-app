import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from "@/lib/UserContext";

interface Order {
  id: string;
  customer: {
    name: string;
    avatar: string;
  };
  product: string;
  price: number;
  date: string;
  status: 'processing' | 'complete' | 'cancel';
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]); // State to hold orders
  const [userCollection, setUserCollection] = useState<any | null>(null); // State to hold user collection
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const { accessToken } = useUser();
  const [waitForToken, setWaitForToken] = useState(true);

  useEffect(() => {
    if (!accessToken && waitForToken) return; // Wait until accessToken is available or timeout
    if (!accessToken) {
      setError('Access token not available');
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/v1/desktop/nft/fetchUserOrders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();

        // Assuming the fetched data structure, map it to the Order interface
        const mappedOrders: Order[] = data.data.orders.map((order: any) => ({
          id: order.orderId,
          customer: {
            name: order.customerName,
            avatar: order.customerAvatar || '/assets/images/default-avatar.png', // Provide a default avatar if not available
          },
          product: order.productName || 'N/A', // Adjust based on actual data
          price: order.totalPriceOfNFTs,
          date: new Date(order.orderDate).toLocaleDateString(),
          status: mapDeliveryStatusToStatus(order.deliveryStatus),
        }));

        setOrders(mappedOrders);
        setUserCollection(data.data.userCollection);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [accessToken, waitForToken]);

  // Helper function to map deliveryStatus to status
  const mapDeliveryStatusToStatus = (deliveryStatus: string): 'processing' | 'complete' | 'cancel' => {
    switch (deliveryStatus.toLowerCase()) {
      case 'completed':
        return 'complete';
      case 'not initiated':
        return 'processing';
      case 'canceled':
        return 'cancel';
      default:
        return 'processing';
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-6">
        {/* Total Order Card */}
        <Card className="flex items-center justify-center col-span-1 border-none rounded-xl shadow">
          <CardContent className="flex flex-col items-center justify-center h-full">
            <CardTitle className="text-lg font-medium text-center">
              Total Order
            </CardTitle>
            <div className="text-5xl font-bold text-green-500 text-center">
              {orders.length}
            </div>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card className="col-span-4 border-none rounded-xl shadow">
          <CardContent className="p-6">
            <div className="p-4 border rounded-lg border-gray-300">
              <div className="text-lg font-medium mb-4">Payments</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Total Mints and Total Revenue */}
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">Total Mints</div>
                  <div className="text-3xl font-bold text-green-500">
                    {userCollection ? orders.length : 0}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                  <div className="text-3xl font-bold">
                    ${orders.reduce((total, order) => total + order.price, 0).toFixed(2)}
                  </div>
                </div>

                {/* $ in Escrow and Open Orders */}
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">$ in Escrow</div>
                  <div className="text-3xl font-bold text-blue-500">$200.34</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">Open Orders</div>
                  <div className="text-3xl font-bold">10</div>
                </div>

                {/* Closed Orders and Disputes */}
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">Closed Orders</div>
                  <div className="text-3xl font-bold">20</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">Disputes</div>
                  <div className="text-3xl font-bold">0</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <div className="space-y-4 bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between">
          <Button variant="black" className="gap-2">
            <Download className="h-4 w-4" />
            Download Spreadsheet
          </Button>
          <div className="flex items-center gap-4">
            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="purchases">Purchases</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter</span>
              <Select>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">A-Z</SelectItem>
                  <SelectItem value="desc">Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Customer</TableHead>
                {/* <TableHead>Product</TableHead> */}
                <TableHead>Price</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Status</TableHead>
              </TableRow>
            </TableHeader> 
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/order/${order.id}`}>{order.id}</Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* <Image
                        src={order.customer.avatar}
                        alt={order.customer.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      /> */}
                      {order.customer.name}
                    </div>
                  </TableCell>
                  {/* <TableCell>{order.product}</TableCell> */}
                  <TableCell>${order.price.toFixed(2)}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'complete'
                          ? 'bg-green-100 text-green-600'
                          : order.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
