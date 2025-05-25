# Frontend API Implementation Guide for Order Management
## Next.js App Router + TanStack React Query

## Overview

This guide provides best practices for implementing order fetching in Next.js applications using the App Router and TanStack React Query with our enhanced backend caching system. It covers proper API usage, error handling, performance optimization, and real-world implementation patterns.

## Table of Contents

- [Quick Start](#quick-start)
- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [TanStack React Query Implementation](#tanstack-react-query-implementation)
- [Next.js App Router Patterns](#nextjs-app-router-patterns)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Testing Strategies](#testing-strategies)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Order Fetching with React Query

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

// Fetch single order (uses cache)
const { data: order, isLoading, error } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => fetch(`/api/orders/${orderId}`).then(res => res.json())
});

// Force refresh from database
const { data: freshOrder } = useQuery({
  queryKey: ['order', orderId, 'fresh'],
  queryFn: () => fetch(`/api/orders/${orderId}?refresh=true`).then(res => res.json())
});
```

## Setup

### 1. Install Dependencies

```bash
npm install @tanstack/react-query
# or
yarn add @tanstack/react-query
```

### 2. Query Client Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3. Root Layout Integration

```typescript
// app/layout.tsx
import Providers from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## API Endpoints

### 1. Get Single Order

```
GET /api/orders/{orderId}
```

**Parameters:**
- `orderId` (path): Order ID
- `refresh` (query, optional): Boolean to bypass cache

**Example Requests:**
```bash
# Standard fetch (cached)
GET /api/orders/order123

# Force refresh
GET /api/orders/order123?refresh=true
```

**Response Format:**
```typescript
interface OrderResponse {
  orderId: string;
  buyer: BuyerInfo;
  seller: SellerInfo;
  status: OrderStatus;
  financial: FinancialInfo;
  mintedNfts: MintedNft[];
  cacheMetrics: {
    cached: boolean;
    timestamp: string;
  };
}
```

### 2. Get User Orders

```
GET /api/orders
```

**Parameters:**
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Items per page (default: 10)
- `role` (query, optional): 'buyer', 'seller', or 'all' (default: 'all')
- `status` (query, optional): Filter by delivery status
- `refresh` (query, optional): Boolean to bypass cache
- `sortBy` (query, optional): Sort field (default: 'orderDate')
- `sortOrder` (query, optional): 'asc' or 'desc' (default: 'desc')
- `startDate` (query, optional): Date range filter start
- `endDate` (query, optional): Date range filter end

**Response Format:**
```typescript
interface OrderListResponse {
  purchases: Order[];
  orders: Order[];
  summary: {
    total: number;
    asBuyer: number;
    asSeller: number;
    pendingDelivery: number;
    completed: number;
    totalSpent: number;
    totalEarned: number;
  };
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  cacheMetrics: {
    refreshed: boolean;
    timestamp: string;
  };
}
```

### 3. Get Guest Order

```
GET /api/orders/guest/{orderId}
```

**Parameters:**
- `orderId` (path): Order ID
- `email` (query): Guest email address
- `refresh` (query, optional): Boolean to bypass cache

## TanStack React Query Implementation

### 1. Order Query Hooks

```typescript
// hooks/useOrderQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OrderQueryOptions {
  refresh?: boolean;
  enabled?: boolean;
}

interface OrderListFilters {
  page?: number;
  limit?: number;
  role?: 'buyer' | 'seller' | 'all';
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  refresh?: boolean;
}

// Single Order Hook
export function useOrder(orderId: string, options: OrderQueryOptions = {}) {
  const { refresh = false, enabled = true } = options;

  return useQuery({
    queryKey: ['order', orderId, { refresh }],
    queryFn: async () => {
      const url = `/api/orders/${orderId}${refresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      return response.json() as Promise<OrderResponse>;
    },
    enabled: enabled && !!orderId,
    staleTime: refresh ? 0 : 5 * 60 * 1000, // Fresh data if refresh, otherwise 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Order List Hook
export function useOrderList(filters: OrderListFilters = {}) {
  const {
    page = 1,
    limit = 10,
    role = 'all',
    refresh = false,
    ...otherFilters
  } = filters;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    role,
    ...(refresh && { refresh: 'true' }),
    ...Object.fromEntries(
      Object.entries(otherFilters).filter(([_, value]) => value !== undefined)
    ),
  });

  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const response = await fetch(`/api/orders?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return response.json() as Promise<OrderListResponse>;
    },
    staleTime: refresh ? 0 : (page === 1 ? 2 * 60 * 1000 : 5 * 60 * 1000), // First page: 2min, others: 5min
    gcTime: 10 * 60 * 1000,
  });
}

// Guest Order Hook
export function useGuestOrder(orderId: string, email: string, options: OrderQueryOptions = {}) {
  const { refresh = false, enabled = true } = options;

  return useQuery({
    queryKey: ['guestOrder', orderId, email, { refresh }],
    queryFn: async () => {
      const params = new URLSearchParams({ email });
      if (refresh) params.append('refresh', 'true');

      const response = await fetch(`/api/orders/guest/${orderId}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch guest order: ${response.statusText}`);
      }

      return response.json() as Promise<OrderResponse>;
    },
    enabled: enabled && !!orderId && !!email,
    staleTime: refresh ? 0 : 30 * 60 * 1000, // 30 minutes for guest orders
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Refresh Order Mutation
export function useRefreshOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}?refresh=true`);

      if (!response.ok) {
        throw new Error(`Failed to refresh order: ${response.statusText}`);
      }

      return response.json() as Promise<OrderResponse>;
    },
    onSuccess: (data, orderId) => {
      // Update the cache with fresh data
      queryClient.setQueryData(['order', orderId, { refresh: false }], data);
      queryClient.setQueryData(['order', orderId, { refresh: true }], data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

### 2. Infinite Query for Order Lists

```typescript
// hooks/useInfiniteOrders.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteOrders(filters: Omit<OrderListFilters, 'page'> = {}) {
  const { limit = 10, ...otherFilters } = filters;

  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(otherFilters).filter(([_, value]) => value !== undefined)
        ),
      });

      const response = await fetch(`/api/orders?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return response.json() as Promise<OrderListResponse>;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

## Next.js App Router Patterns

### 1. Server Component with Prefetching

```typescript
// app/orders/[orderId]/page.tsx
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import OrderDetails from './OrderDetails';

async function prefetchOrder(orderId: string) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['order', orderId, { refresh: false }],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      return response.json();
    },
  });

  return queryClient;
}

export default async function OrderPage({ params }: { params: { orderId: string } }) {
  const queryClient = await prefetchOrder(params.orderId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrderDetails orderId={params.orderId} />
    </HydrationBoundary>
  );
}
```

### 2. Client Component Implementation

```typescript
// app/orders/[orderId]/OrderDetails.tsx
'use client';

import { useOrder, useRefreshOrder } from '@/hooks/useOrderQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, Database } from 'lucide-react';

interface OrderDetailsProps {
  orderId: string;
}

export default function OrderDetails({ orderId }: OrderDetailsProps) {
  const { data: order, isLoading, error, isFetching } = useOrder(orderId);
  const refreshMutation = useRefreshOrder();

  const handleRefresh = () => {
    refreshMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading order...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive">
            <span>Error: {error.message}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order {order.orderId}</CardTitle>
          <div className="flex items-center space-x-2">
            {order.cacheMetrics && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                {order.cacheMetrics.cached ? (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>From cache</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    <span>From database</span>
                  </>
                )}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending || isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(refreshMutation.isPending || isFetching) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Order Status</h3>
              <Badge variant={order.status.payment === 'completed' ? 'default' : 'secondary'}>
                {order.status.payment}
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Total Cost</h3>
              <p className="text-2xl font-bold">${order.financial.totalCost}</p>
            </div>
          </div>

          {order.cacheMetrics && (
            <div className="mt-4 text-xs text-muted-foreground">
              Last updated: {new Date(order.cacheMetrics.timestamp).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.mintedNfts.map((nft, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">NFT Item {index + 1}</h4>
                  <p className="text-sm text-muted-foreground">Quantity: {nft.quantity}</p>
                </div>
                <Badge variant={nft.mintResult.status === 'completed' ? 'default' : 'secondary'}>
                  {nft.mintResult.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Order List with Infinite Scroll

```typescript
// app/orders/OrderList.tsx
'use client';

import { useInfiniteOrders } from '@/hooks/useInfiniteOrders';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrderList() {
  const [filters, setFilters] = useState({
    role: 'all' as const,
    limit: 10,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteOrders(filters);

  const { ref, inView } = useInView();

  // Auto-fetch next page when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = () => {
    refetch();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-destructive">Error: {error.message}</span>
            <Button variant="outline" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allOrders = data?.pages.flatMap(page => page.orders) ?? [];
  const summary = data?.pages[0]?.summary;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select
                value={filters.role}
                onValueChange={(value) => handleFilterChange('role', value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="buyer">As Buyer</SelectItem>
                  <SelectItem value="seller">As Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              Refresh All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.asBuyer}</p>
                <p className="text-sm text-muted-foreground">As Buyer</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.asSeller}</p>
                <p className="text-sm text-muted-foreground">As Seller</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order List */}
      <div className="space-y-4">
        {allOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Order {order.orderId}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${order.totalCost}</p>
                  <Badge variant={order.status.payment === 'completed' ? 'default' : 'secondary'}>
                    {order.status.payment}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Trigger */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center p-4">
          {isFetchingNextPage ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          ) : (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More Orders
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. Real-time Order Updates

```typescript
// hooks/useRealtimeOrder.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export function useRealtimeOrder(orderId: string) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();

  const { data: order, ...queryResult } = useQuery({
    queryKey: ['order', orderId, { refresh: false }],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: !!orderId,
  });

  // Auto-refresh for pending orders
  useEffect(() => {
    if (order && ['pending', 'processing'].includes(order.status.payment)) {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: ['order', orderId, { refresh: false }]
        });
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [order, orderId, queryClient]);

  const forceRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['order', orderId]
    });
  };

  return {
    order,
    forceRefresh,
    isAutoRefreshing: order && ['pending', 'processing'].includes(order.status.payment),
    ...queryResult,
  };
}
```

## Best Practices

### 1. When to Use Refresh Flag

```typescript
// ✅ Good: Use refresh for critical operations
const handlePaymentUpdate = async (orderId: string) => {
  // Force refresh after payment to ensure data accuracy
  const { data } = await queryClient.fetchQuery({
    queryKey: ['order', orderId, { refresh: true }],
    queryFn: () => fetch(`/api/orders/${orderId}?refresh=true`).then(res => res.json())
  });
  return data;
};

// ✅ Good: Use refresh for admin operations
const AdminOrderView = ({ orderId }: { orderId: string }) => {
  const { data: order } = useOrder(orderId, { refresh: true });
  // Always get fresh data for admin views
};

// ✅ Good: Regular browsing uses cache
const RegularOrderView = ({ orderId }: { orderId: string }) => {
  const { data: order } = useOrder(orderId); // Uses cache by default
};

// ❌ Bad: Always using refresh
const BadOrderView = ({ orderId }: { orderId: string }) => {
  const { data: order } = useOrder(orderId, { refresh: true }); // Unnecessarily slow
};
```

### 2. Smart Query Key Management

```typescript
// Query key factory for consistent cache management
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string, options?: { refresh?: boolean }) =>
    [...orderKeys.details(), id, options] as const,
  guest: (id: string, email: string) =>
    [...orderKeys.all, 'guest', id, email] as const,
};

// Usage in hooks
export function useOrder(orderId: string, options: OrderQueryOptions = {}) {
  return useQuery({
    queryKey: orderKeys.detail(orderId, options),
    // ... rest of the query
  });
}
```

### 3. Optimistic Updates

```typescript
// hooks/useOrderMutations.ts
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(orderId) });

      // Snapshot previous value
      const previousOrder = queryClient.getQueryData(orderKeys.detail(orderId));

      // Optimistically update
      queryClient.setQueryData(orderKeys.detail(orderId), (old: any) => ({
        ...old,
        status: { ...old.status, payment: status },
      }));

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(variables.orderId), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
```

## Error Handling

### 1. Global Error Boundary

```typescript
// components/ErrorBoundary.tsx
'use client';

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Something went wrong</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </CardContent>
    </Card>
  );
}

export default function OrderErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={reset}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### 2. Custom Error Hook

```typescript
// hooks/useErrorHandler.ts
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useErrorHandler() {
  const queryClient = useQueryClient();

  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context}:`, error);

    // Show user-friendly error message
    if (error.message.includes('404')) {
      toast.error('Order not found');
    } else if (error.message.includes('403')) {
      toast.error('You do not have permission to view this order');
    } else if (error.message.includes('500')) {
      toast.error('Server error. Please try again later.');
    } else {
      toast.error('Something went wrong. Please try again.');
    }

    // Clear related queries on certain errors
    if (error.message.includes('401')) {
      queryClient.clear(); // Clear all queries on auth error
    }
  };

  const retryWithRefresh = async (orderId: string) => {
    try {
      await queryClient.fetchQuery({
        queryKey: orderKeys.detail(orderId, { refresh: true }),
        queryFn: () => fetch(`/api/orders/${orderId}?refresh=true`).then(res => res.json())
      });
      toast.success('Order refreshed successfully');
    } catch (error) {
      handleError(error as Error, 'retry with refresh');
    }
  };

  return { handleError, retryWithRefresh };
}
```

## Performance Optimization

### 1. Query Prefetching

```typescript
// utils/prefetch.ts
import { QueryClient } from '@tanstack/react-query';
import { orderKeys } from '@/hooks/useOrderQueries';

export async function prefetchUserOrders(queryClient: QueryClient, userId: string) {
  // Prefetch first page of orders
  await queryClient.prefetchQuery({
    queryKey: orderKeys.list({ page: 1, limit: 10, role: 'all' }),
    queryFn: () => fetch('/api/orders?page=1&limit=10').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export async function prefetchOrderDetails(queryClient: QueryClient, orderId: string) {
  await queryClient.prefetchQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => fetch(`/api/orders/${orderId}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });
}

// Usage in Server Components
export default async function OrdersPage() {
  const queryClient = new QueryClient();
  await prefetchUserOrders(queryClient, 'user-id');

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrderList />
    </HydrationBoundary>
  );
}
```

### 2. Background Refetching

```typescript
// hooks/useBackgroundSync.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useBackgroundSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Refetch stale queries when window regains focus
    const handleFocus = () => {
      queryClient.refetchQueries({
        stale: true,
        type: 'active'
      });
    };

    // Refetch when coming back online
    const handleOnline = () => {
      queryClient.refetchQueries({
        predicate: (query) => query.state.fetchStatus === 'idle'
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);
}
```

### 3. Selective Query Invalidation

```typescript
// utils/cacheInvalidation.ts
import { QueryClient } from '@tanstack/react-query';
import { orderKeys } from '@/hooks/useOrderQueries';

export function invalidateOrderCaches(queryClient: QueryClient, orderId: string) {
  // Invalidate specific order
  queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });

  // Invalidate order lists (they might contain this order)
  queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

  // Remove any cached guest order data for this order
  queryClient.removeQueries({
    queryKey: [...orderKeys.all, 'guest', orderId],
    exact: false
  });
}

export function invalidateUserOrderCaches(queryClient: QueryClient) {
  // Invalidate all order lists
  queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

  // Keep individual order details unless they're stale
  queryClient.invalidateQueries({
    queryKey: orderKeys.details(),
    refetchType: 'none' // Don't automatically refetch
  });
}
```

## Testing Strategies

### 1. MSW Setup for API Mocking

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/orders/:orderId', ({ params }) => {
    const { orderId } = params;

    return HttpResponse.json({
      orderId,
      buyer: { id: 'buyer1', name: 'John Doe' },
      seller: { id: 'seller1', name: 'Jane Smith' },
      status: { payment: 'completed' },
      financial: { totalCost: 100 },
      mintedNfts: [],
      cacheMetrics: { cached: true, timestamp: new Date().toISOString() }
    });
  }),

  http.get('/api/orders', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const refresh = url.searchParams.get('refresh') === 'true';

    return HttpResponse.json({
      orders: [
        { id: '1', orderId: 'order1', totalCost: 100, status: { payment: 'completed' } }
      ],
      summary: { total: 1, asBuyer: 1, asSeller: 0 },
      pagination: { totalCount: 1, totalPages: 1, currentPage: page, hasNextPage: false },
      cacheMetrics: { refreshed: refresh, timestamp: new Date().toISOString() }
    });
  }),
];
```

### 2. Component Testing

```typescript
// __tests__/OrderDetails.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from './mocks/server';
import OrderDetails from '@/app/orders/[orderId]/OrderDetails';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('OrderDetails', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('displays order information', async () => {
    render(<OrderDetails orderId="order123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Order order123')).toBeInTheDocument();
    });

    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<OrderDetails orderId="order123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Order order123')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Verify refresh functionality
    expect(refreshButton).toBeDisabled();
  });

  it('displays cache metrics', async () => {
    render(<OrderDetails orderId="order123" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('From cache')).toBeInTheDocument();
    });
  });
});
```

### 3. Hook Testing

```typescript
// __tests__/useOrder.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrder } from '@/hooks/useOrderQueries';
import { server } from './mocks/server';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useOrder', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches order data successfully', async () => {
    const { result } = renderHook(() => useOrder('order123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.orderId).toBe('order123');
    expect(result.current.data?.status.payment).toBe('completed');
  });

  it('handles refresh option', async () => {
    const { result } = renderHook(() => useOrder('order123', { refresh: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify that refresh was used in the query
    expect(result.current.data?.cacheMetrics.cached).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Hydration Mismatches

**Problem:** Server and client render different content
**Solution:** Proper SSR setup with prefetching

```typescript
// Ensure consistent data between server and client
export default async function OrderPage({ params }: { params: { orderId: string } }) {
  const queryClient = new QueryClient();

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: orderKeys.detail(params.orderId),
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/api/orders/${params.orderId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrderDetails orderId={params.orderId} />
    </HydrationBoundary>
  );
}
```

#### 2. Stale Cache Issues

**Problem:** Users seeing outdated information
**Solution:** Smart invalidation and background refetching

```typescript
// Auto-invalidate stale data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Manual invalidation after mutations
const updateOrderMutation = useMutation({
  mutationFn: updateOrder,
  onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  },
});
```

#### 3. Memory Leaks

**Problem:** Queries not being garbage collected
**Solution:** Proper cleanup and cache management

```typescript
// Set appropriate garbage collection time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Manual cleanup when needed
useEffect(() => {
  return () => {
    // Cleanup specific queries on unmount
    queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) });
  };
}, [orderId, queryClient]);
```

#### 4. Network Error Handling

**Problem:** Poor UX during network issues
**Solution:** Retry logic and offline support

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst', // Continue with cached data when offline
    },
  },
});
```

## Best Practices Summary

### ✅ Do's

1. **Use TanStack React Query** for all API calls
2. **Implement proper error boundaries** for graceful error handling
3. **Prefetch data** in Server Components when possible
4. **Use query keys consistently** with a factory pattern
5. **Implement optimistic updates** for better UX
6. **Set appropriate stale and cache times** based on data sensitivity
7. **Use refresh flag sparingly** - only for critical operations
8. **Implement proper loading states** and error handling

### ❌ Don'ts

1. **Don't fetch data in useEffect** - use React Query instead
2. **Don't ignore error states** - always handle and display errors
3. **Don't over-invalidate** - be selective about cache invalidation
4. **Don't use refresh flag everywhere** - it defeats caching benefits
5. **Don't forget to handle offline scenarios**
6. **Don't skip prefetching** for critical above-the-fold content
7. **Don't use inconsistent query keys** - use a factory pattern
8. **Don't forget cleanup** - set appropriate garbage collection times

---

This guide provides comprehensive coverage of Next.js App Router + TanStack React Query implementation patterns for the enhanced order caching system. Follow these patterns to build performant, reliable, and user-friendly order management interfaces.