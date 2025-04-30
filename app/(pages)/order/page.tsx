'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import { format } from 'date-fns';
import {
  HiOutlineDownload,
  HiFilter,
  HiX,
  HiSearch,
} from 'react-icons/hi';

// UI Components
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Summary {
  total: number;
  asBuyer: number;
  asSeller: number;
  pendingDelivery: number;
  completed: number;
  totalSpent: number | null;
  totalEarned: number;
  totalInEscrow: number;
  totalDispute: number;
}

interface Order {
  id: string;
  orderId: string;
  orderDate: string;
  orderType: string;
  paymentMethod: string;
  totalCost: number;
  counterparty: {
    name: string;
    avatar?: string;
  };
  status: {
    payment: string;
    delivery: string;
    isDead: boolean;
  };
}

interface FilterOptions {
  role: string;
  status: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  startDate: string;
  endDate: string;
  deadOrders: string;
  search?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

const OrderManagement = () => {
  const router = useRouter();
  const { accessToken } = useUser();

  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    asBuyer: 0,
    asSeller: 0,
    pendingDelivery: 0,
    completed: 0,
    totalSpent: null,
    totalEarned: 0,
    totalInEscrow: 0,
    totalDispute: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Filter states with improved defaults
  const [filters, setFilters] = useState<FilterOptions>({
    role: 'all',
    status: '',
    page: 1,
    limit: 10,
    sortBy: 'orderDate',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
    deadOrders: 'exclude',
    search: '',
  });

  // Debounce search input
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        handleFilterChange('search', searchInput);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch orders based on current filters
  const fetchOrders = async () => {
    if (!accessToken) return;

    const controller = new AbortController();
    const { signal } = controller;

    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/v5/orders/getUserOrders?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const {
        orders,
        purchases,
        summary,
        pagination: paginationData,
      } = data.data;

      setPurchases(purchases);
      setOrders(orders);
      setPagination(paginationData);
      setSummary(summary);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(
          err.response?.data?.message ||
            err.message ||
            'An error occurred while fetching orders'
        );
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  };

  useEffect(() => {
    fetchOrders();
  }, [accessToken, filters]);

  const handleFilterChange = (
    name: string,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // Reset to page 1 when changing filters other than page
      ...(name !== 'page' && { page: 1 }),
    }));
  };

  const resetFilters = () => {
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
      search: '',
    });
    setSearchInput('');
  };

  // Format date with error handling
  const formatDate = (dateString: string | number | Date): string => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return String(dateString);
    }
  };

  /**
   * Determine what to show in the “Order Status” column.
   */
  function getOrderStatus(order: Order) {
    const {
      orderType,
      status: { payment, delivery, isDead },
    } = order;

    // 1) Non-phygitals: complete as soon as payment is done
    if (orderType === 'non-phygitals') {
      if (payment.toLowerCase() === 'completed') {
        return {
          text: 'Completed',
          variant: 'default',
          extraClasses: 'bg-green-100 text-green-600',
        };
      }
      // otherwise fall back to dead/active
      return {
        text: isDead ? 'Cancelled' : 'Active',
        variant: isDead ? 'destructive' : 'default',
      };
    }

    // 2) Phygitals: only complete when both payment AND delivery are done
    if (
      payment.toLowerCase() === 'completed' &&
      delivery.toLowerCase() === 'completed'
    ) {
      return {
        text: 'Completed',
        variant: 'default',
        extraClasses: 'bg-green-100 text-green-600',
      };
    }

    // 3) Everything else: cancelled vs active as before
    return {
      text: isDead ? 'Cancelled' : 'Active',
      variant: isDead ? 'destructive' : 'default',
    };
  }

  // Memoized display orders based on active tab
  const displayOrders = useMemo(() => {
    return activeTab === 'purchases' ? purchases : orders;
  }, [activeTab, purchases, orders]);

  // Status badge renderer
  const StatusBadge = ({
    status,
    type,
  }: {
    status: string;
    type: 'payment' | 'delivery';
  }) => {
    let colorClass = '';

    if (status === 'completed' || status === 'Completed') {
      colorClass = 'bg-green-100 text-green-600';
    } else if (status === 'pending' || status === 'In Progress') {
      colorClass = 'bg-yellow-100 text-yellow-600';
    } else {
      colorClass = 'bg-red-100 text-red-600';
    }

    const displayStatus =
      status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <Badge
        variant="outline"
        className={`${colorClass} font-medium px-2 py-1`}
      >
        {displayStatus}
      </Badge>
    );
  };

  const OrderSkeleton = () => (
    <div className="space-y-4 bg-white p-6 rounded-xl shadow animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-9 gap-4">
            {[...Array(9)].map((_, j) => (
              <div key={j} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-full px-4 py-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {/* Total Order Card */}
        <Card className="flex items-center justify-center col-span-1 border rounded-xl shadow hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center justify-center h-full py-6">
            <CardTitle className="text-lg font-medium text-center mb-2">
              Total Orders
            </CardTitle>
            <div className="text-5xl font-bold text-green-500 text-center">
              {loading ? (
                <Skeleton className="h-12 w-12" />
              ) : (
                summary.total
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments summary card */}
        <Card className="col-span-1 md:col-span-4 border rounded-xl shadow hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="p-4 border rounded-lg border-gray-200">
              <div className="text-lg font-medium mb-4">
                Payments Overview
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Mints
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-green-500">
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      orders.length || 0
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {loading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      `$${summary.totalEarned.toFixed(2)}`
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    In Escrow
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-500">
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      `$${summary.totalInEscrow}`
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Open Orders
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {loading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      summary.total - summary.completed
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Closed Orders
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {loading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      summary.completed
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-muted-foreground">
                    Disputes
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-red-500">
                    {loading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      summary.totalDispute
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        {/* Left Section - Export Button */}
        <Button
          variant="default"
          className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
        >
          <span>Export Orders</span>
          <div className="bg-white rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <HiOutlineDownload className="w-3 h-3 text-black" />
          </div>
        </Button>

        {/* Middle Section - Tabs */}
        <div className="flex justify-center bg-gray-100 rounded-full">
          <Button
            variant={activeTab === 'sales' ? 'default' : 'ghost'}
            className={`rounded-l-full ${
              activeTab === 'sales'
                ? 'bg-black text-white'
                : 'text-gray-700'
            }`}
            onClick={() => setActiveTab('sales')}
          >
            Orders
          </Button>
          <Button
            variant={activeTab === 'purchases' ? 'default' : 'ghost'}
            className={`rounded-r-full ${
              activeTab === 'purchases'
                ? 'bg-black text-white'
                : 'text-gray-700'
            }`}
            onClick={() => setActiveTab('purchases')}
          >
            My Purchases
          </Button>
        </div>

        {/* Right Section - Search and Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full"
            />
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  handleFilterChange('search', '');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <HiX size={16} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <HiFilter size={16} />
            <span>Filters</span>
            {Object.values(filters).some(
              (val) =>
                val !== '' &&
                val !== 'all' &&
                val !== 'exclude' &&
                val !== 'orderDate' &&
                val !== 'desc' &&
                val !== 1 &&
                val !== 10
            ) && (
              <Badge className="ml-1 bg-black text-white text-xs">
                Active
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow mb-6 p-6 transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-lg">Advanced Filters</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(false)}
            >
              <HiX size={16} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Status
              </label>
              <select
                className="w-full border border-gray-200 rounded-md py-2 px-3"
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
                className="w-full border border-gray-200 rounded-md py-2 px-3"
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
                className="w-full border border-gray-200 rounded-md py-2 px-3"
                value={filters.endDate}
                onChange={(e) =>
                  handleFilterChange('endDate', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Show Cancelled Orders
              </label>
              <select
                className="w-full border border-gray-200 rounded-md py-2 px-3"
                value={filters.deadOrders}
                onChange={(e) =>
                  handleFilterChange('deadOrders', e.target.value)
                }
              >
                <option value="exclude">Hide Cancelled</option>
                <option value="include">Show All</option>
                <option value="only">Only Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button
              className="bg-black text-white"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Order List */}
      {loading ? (
        <OrderSkeleton />
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow text-center">
          <div className="text-gray-400 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">
            No orders found
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'purchases'
              ? "You haven't made any purchases yet."
              : "You don't have any orders yet."}
          </p>
          <Button
            className="bg-black text-white"
            onClick={resetFilters}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border rounded-xl shadow-sm hover:shadow transition-all duration-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold">
                        Order No
                      </TableHead>
                      <TableHead className="font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold">
                        {activeTab === 'purchases'
                          ? 'Seller'
                          : 'Customer'}
                      </TableHead>
                      <TableHead className="font-semibold">
                        Type
                      </TableHead>
                      <TableHead className="font-semibold">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold">
                        Price
                      </TableHead>
                      <TableHead className="font-semibold">
                        Payment Status
                      </TableHead>
                      <TableHead className="font-semibold">
                        Delivery Status
                      </TableHead>
                      <TableHead className="font-semibold">
                        Order Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() =>
                          router.push(`/order/${order.orderId}`)
                        }
                      >
                        <TableCell className="font-medium">
                          {order.orderId}
                        </TableCell>
                        <TableCell>
                          {formatDate(order.orderDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.counterparty.avatar && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                <img
                                  src={order.counterparty.avatar}
                                  alt={order.counterparty.name}
                                />
                              </div>
                            )}
                            <span>{order.counterparty.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-normal"
                          >
                            {order.orderType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {order.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${order.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={order.status.payment}
                            type="payment"
                          />
                        </TableCell>
                        <TableCell>
                          {order.orderType === 'non-phygitals' ? (
                            <span className="text-gray-500 text-sm">
                              N/A
                            </span>
                          ) : (
                            <StatusBadge
                              status={order.status.delivery}
                              type="delivery"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const { text, variant, extraClasses } =
                              getOrderStatus(order);
                            return (
                              <Badge
                                variant={variant}
                                className={`font-normal ${
                                  extraClasses || ''
                                }`}
                              >
                                {text}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing{' '}
                {(pagination.currentPage - 1) * filters.limit + 1} to{' '}
                {Math.min(
                  pagination.currentPage * filters.limit,
                  pagination.totalCount
                )}{' '}
                of {pagination.totalCount} orders
              </div>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFilterChange(
                      'page',
                      pagination.currentPage - 1
                    )
                  }
                  disabled={pagination.currentPage === 1}
                  className={
                    pagination.currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <div className="flex gap-1 mx-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      // Logic to show pages around current page
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (
                        pagination.currentPage >=
                        pagination.totalPages - 2
                      ) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            pagination.currentPage === pageNum
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          className={
                            pagination.currentPage === pageNum
                              ? 'bg-black text-white'
                              : ''
                          }
                          onClick={() =>
                            handleFilterChange('page', pageNum)
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFilterChange(
                      'page',
                      pagination.currentPage + 1
                    )
                  }
                  disabled={
                    pagination.currentPage >= pagination.totalPages
                  }
                  className={
                    pagination.currentPage >= pagination.totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
