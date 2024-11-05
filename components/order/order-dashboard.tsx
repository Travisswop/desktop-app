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

const orders: Order[] = [
  {
    id: '1009701',
    customer: {
      name: 'Hamid Hasan',
      avatar: '/assets/images/sadit.png?height=32&width=32',
    },
    product: 'Black NFC Card',
    price: 24.99,
    date: '7/11/2022',
    status: 'processing',
  },
  {
    id: '1009702',
    customer: {
      name: 'Wahid Khan',
      avatar: '/assets/images/sadit.png?height=32&width=32',
    },
    product: 'NFC Chip',
    price: 14.99,
    date: '1/4/2022',
    status: 'complete',
  },
  // Add more orders as needed
];

export default function OrderDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-6">
        {/* Total Order Card */}
        <Card className=" col-span-1 border-none rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Total Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-green-500">
              1827
            </div>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card className=" col-span-4 border-none rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Mints:
                </div>
                <div className="text-green-500">1827</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Revenue:
                </div>
                <div>$1002.33</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  $ in Escrow:
                </div>
                <div className="text-blue-500">$200.34</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Open Orders:
                </div>
                <div>10</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Closed Orders:
                </div>
                <div>20</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Disputes:
                </div>
                <div>0</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <div className="space-y-4 bg-white p-6 rounded-xl">
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
              <span className="text-sm text-muted-foreground">
                Filter
              </span>
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
                <TableHead>Order</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/order/${order.id}`}>
                      {' '}
                      {/* Wrap with Link */}
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Image
                        src={order.customer.avatar}
                        alt={order.customer.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      {order.customer.name}
                    </div>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>${order.price.toFixed(2)}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'complete'
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
