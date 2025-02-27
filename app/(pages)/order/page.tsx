'use client';
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { useUser } from '@/lib/UserContext';
import Link from 'next/link';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken } = useUser();
  const [activeTab, setActiveTab] = useState('sales'); // 'all', 'purchases', 'sales'
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    role: 'all',
    status: '',
    page: 1,
    limit: 10,
    sortBy: 'orderDate',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
    deadOrders: 'exclude',
  });

  // Fetch orders based on current filters
  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Convert filters to query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/v1/desktop/nft/fetchUserOrders?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.log('🚀 ~ fetchOrders ~ data:', data);

      if (data.state === 'success') {
        // Process orders received from backend
        const { orders, purchases } = data.data;

        setPurchases(purchases);
        setOrders(orders);
        setPagination(data.data.pagination);
      } else {
        setError(data.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'An error occurred while fetching orders'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [accessToken, filters]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // Reset to page 1 when changing filters
      ...(name !== 'page' && { page: 1 }),
    }));
  };

  const handlePageChange = (newPage: number) => {
    handleFilterChange('page', newPage.toString());
  };

  const formatDate = (dateString: string | number | Date): string => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return String(dateString); // Ensure it returns a string
    }
  };

  // Render orders based on active tab
  const renderOrders = () => {
    let displayOrders: any[] = [];

    if (activeTab === 'purchases') {
      displayOrders = [...purchases];
    } else if (activeTab === 'sales') {
      displayOrders = [...orders];
    }

    if (displayOrders.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No orders found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 bg-white p-6 rounded-xl shadow">
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
              {displayOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/order/${order.orderId}`}>
                      {order.orderId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.customer.name}
                    </div>
                  </TableCell>
                  <TableCell>${order.totalCost.toFixed(2)}</TableCell>
                  <TableCell>
                    {formatDate(order.orderDate) as string}
                  </TableCell>
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
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
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

        <Card className="col-span-4 border-none rounded-xl shadow">
          <CardContent className="p-6">
            <div className="p-4 border rounded-lg border-gray-300">
              <div className="text-lg font-medium mb-4">Payments</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Mints
                  </div>
                  <div className="text-3xl font-bold text-green-500">
                    0
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </div>
                  <div className="text-3xl font-bold">$0</div>
                </div>

                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    $ in Escrow
                  </div>
                  <div className="text-3xl font-bold text-blue-500">
                    $200.34
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Open Orders
                  </div>
                  <div className="text-3xl font-bold">10</div>
                </div>

                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Closed Orders
                  </div>
                  <div className="text-3xl font-bold">20</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Disputes
                  </div>
                  <div className="text-3xl font-bold">0</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'sales'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('sales')}
        >
          My Sales
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'purchases'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('purchases')}
        >
          My Purchases
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <h2 className="font-medium mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              value={filters.status}
              onChange={(e) =>
                handleFilterChange('status', e.target.value)
              }
            >
              <option value="">All Statuses</option>
              <option value="Not Initiated">Not Initiated</option>
              <option value="Processing">Processing</option>
              <option value="In Transit">In Transit</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range (Start)
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              value={filters.startDate}
              onChange={(e) =>
                handleFilterChange('startDate', e.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range (End)
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              value={filters.endDate}
              onChange={(e) =>
                handleFilterChange('endDate', e.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() =>
              setFilters({
                role: 'all',
                status: '',
                page: 1,
                limit: 10,
                sortBy: 'orderDate',
                sortOrder: 'desc',
                startDate: '',
                endDate: '',
                deadOrders: 'exclude',
              })
            }
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {renderOrders()}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex space-x-1">
                <button
                  onClick={() =>
                    handlePageChange(pagination.currentPage - 1)
                  }
                  disabled={pagination.currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    pagination.currentPage > 1
                      ? 'bg-gray-200 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Previous
                </button>

                <span className="px-3 py-1 bg-blue-600 text-white rounded-md">
                  {pagination.currentPage}
                </span>

                <button
                  onClick={() =>
                    handlePageChange(pagination.currentPage + 1)
                  }
                  disabled={
                    pagination.currentPage >= pagination.totalPages
                  }
                  className={`px-3 py-1 rounded-md ${
                    pagination.currentPage < pagination.totalPages
                      ? 'bg-gray-200 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 mt-4">
            Showing {(pagination.currentPage - 1) * filters.limit + 1}{' '}
            to{' '}
            {Math.min(
              pagination.currentPage * filters.limit,
              pagination.totalCount
            )}{' '}
            of {pagination.totalCount} orders
          </div>
        </>
      )}
    </div>
  );
};

export default OrderManagement;
