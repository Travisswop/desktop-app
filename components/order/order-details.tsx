'use client';

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

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  id: string;
  items: OrderItem[];
  tracking: string;
  orderDate: string;
  taxId: string;
  currency: string;
  isShipped: boolean;
}

export default function OrderInfos() {
  const order: OrderDetails = {
    id: '1234',
    items: [
      { name: 'Swop Table Stand', quantity: 3, price: 76.89 },
      { name: 'Gold Card', quantity: 3, price: 76.89 },
      { name: 'Wrist Band', quantity: 3, price: 76.89 },
    ],
    tracking: 'S49skhAGhabn',
    orderDate: '12/09/2024 - 5:23pm',
    taxId: 'N499khAGhabn',
    currency: 'USD',
    isShipped: true,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col items-start gap-4">
            <div className="w-24 h-24 relative">
              <Image
                src="/placeholder.svg?height=96&width=96"
                alt="Product"
                width={96}
                height={96}
                className="rounded-lg border"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Order #{order.id}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Shipped:</span>
            <Switch checked={order.isShipped} />
          </div>
        </div>

        <div className="mb-6">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">
                  Quantity
                </TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, index) => (
                <TableRow key={index} className=" border">
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-center">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.price.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="customer">
              Customer Details
            </TabsTrigger>
            <TabsTrigger value="description">
              Order Description
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  Product Shipped
                </span>
                <span>Yes</span>
              </div>

              <div className="flex items-center justify-between py-2  rounded-lg">
                <span className="text-muted-foreground">
                  Order Tracking Info
                </span>
                <div className="flex gap-2">
                  <span className="text-sm font-mono">
                    {order.tracking}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  Order Placed
                </span>
                <span>{order.orderDate}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Taxid</span>
                <span className="font-mono">{order.taxId}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  Currency
                </span>
                <span>{order.currency}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customer">
            <div className="text-muted-foreground">
              <h2 className="text-lg font-semibold mb-4">
                Customer Details
              </h2>
              <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
                <p className="font-normal">
                  Swop Id:{' '}
                  <span className="font-semibold">John.Swop.Id</span>
                </p>
                <p className="font-normal">
                  Name:{' '}
                  <span className="font-semibold">John Doe</span>
                </p>
                <p className="font-normal">
                  Email:{' '}
                  <span className="font-semibold">
                    john.doe@example.com
                  </span>
                </p>
                <p className="font-normal">
                  Phone:{' '}
                  <span className="font-semibold">
                    (123) 456-7890
                  </span>
                </p>
                <p className="font-normal">
                  Address:{' '}
                  <span className="font-semibold">
                    123 Main St, Anytown, USA
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="description">
            <div className="text-muted-foreground">
              <h2 className="text-lg font-semibold mb-4">
                Order Description
              </h2>
              <p className="font-normal">
                This order includes a variety of items purchased for
                the upcoming event. Each item has been carefully
                selected to ensure quality and satisfaction.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
