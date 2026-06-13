import React from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';

// Types based on the API guide
interface OrderResponse {
  orderId: string;
  orderDate?: string;
  orderType?: string;
  buyer: BuyerInfo;
  seller: SellerInfo;
  status: OrderStatus;
  financial: FinancialInfo;
  mintedNfts: MintedNft[];
  processingStages?: any[];
  stripePayment?: {
    paymentMethod?: {
      payment_type?: string;
      brand?: string;
      last4?: string;
    };
  };
  shipping?: {
    provider?: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
    notes?: string;
  };
  billing?: {
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  cacheMetrics: {
    cached: boolean;
    timestamp: string;
  };
}

interface BuyerInfo {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface SellerInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface OrderStatus {
  payment: string;
  delivery: string;
  isDead: boolean;
}

interface FinancialInfo {
  totalCost: number;
  subtotal?: number;
  discountRate?: number;
  shippingCost?: number;
  totalSpent?: number;
  totalEarned?: number;
  totalInEscrow?: number;
}

interface MintedNft {
  quantity: number;
  mintResult: {
    status: string;
  };
}

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
    totalInEscrow: number;
    totalDispute: number;
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
  payout?: {
    status: string;
    txHash: string;
  };
}

interface OrderQueryOptions {
  refresh?: boolean;
  enabled?: boolean;
}

export interface OrderListFilters {
  page?: number;
  limit?: number;
  role?: 'buyer' | 'seller' | 'all';
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  refresh?: boolean;
  search?: string;
  deadOrders?: string;
}

// Query key factory for consistent cache management
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderListFilters) =>
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string, options?: { refresh?: boolean }) =>
    [...orderKeys.details(), id, options] as const,
  guest: (id: string, email: string) =>
    [...orderKeys.all, 'guest', id, email] as const,
};

// Single Order Hook
export function useOrder(
  orderId: string,
  options: OrderQueryOptions = {}
) {
  const { refresh = false, enabled = true } = options;

  return useQuery({
    queryKey: orderKeys.detail(orderId, { refresh }),
    queryFn: async () => {
      const url = `${
        process.env.NEXT_PUBLIC_API_URL
      }/api/v5/orders/${orderId}${refresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch order: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Handle nested response structure
      return result.data || (result as OrderResponse);
    },
    enabled: enabled && !!orderId,
    staleTime: refresh ? 0 : 5 * 60 * 1000, // Fresh data if refresh, otherwise 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Order List Hook
export function useOrderList(
  filters: OrderListFilters = {},
  accessToken?: string
) {
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
      Object.entries(otherFilters).filter(
        ([_, value]) => value !== undefined && value !== ''
      )
    ),
  });

  // Create query key without refresh flag to maintain consistent caching
  const { refresh: _, ...filtersForKey } = filters;

  return useQuery({
    queryKey: orderKeys.list(filtersForKey),
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/getUserOrders?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && {
              Authorization: `Bearer ${accessToken}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch orders: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Handle nested response structure
      return result.data as OrderListResponse;
    },
    enabled: !!accessToken,
    staleTime: refresh
      ? 0
      : page === 1
      ? 2 * 60 * 1000
      : 5 * 60 * 1000, // First page: 2min, others: 5min
    gcTime: 10 * 60 * 1000,
  });
}

// Guest Order Hook
export function useGuestOrder(
  orderId: string,
  email: string,
  options: OrderQueryOptions = {}
) {
  const { refresh = false, enabled = true } = options;

  return useQuery({
    queryKey: orderKeys.guest(orderId, email),
    queryFn: async () => {
      const params = new URLSearchParams({ email });
      if (refresh) params.append('refresh', 'true');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/guest/${orderId}?${params}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch guest order: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Handle nested response structure
      return result.data || (result as OrderResponse);
    },
    enabled: enabled && !!orderId && !!email,
    staleTime: refresh ? 0 : 30 * 60 * 1000, // 30 minutes for guest orders
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Infinite Query for Order Lists
export function useInfiniteOrders(
  filters: Omit<OrderListFilters, 'page'> = {},
  accessToken?: string
) {
  const { limit = 10, ...otherFilters } = filters;

  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(otherFilters).filter(
            ([_, value]) => value !== undefined && value !== ''
          )
        ),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && {
              Authorization: `Bearer ${accessToken}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch orders: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Handle nested response structure
      return result.data as OrderListResponse;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Refresh Order Mutation
export function useRefreshOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/${orderId}?refresh=true`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to refresh order: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Handle nested response structure
      return result.data || (result as OrderResponse);
    },
    onSuccess: (data, orderId) => {
      // Update the cache with fresh data
      queryClient.setQueryData(
        orderKeys.detail(orderId, { refresh: false }),
        data
      );
      queryClient.setQueryData(
        orderKeys.detail(orderId, { refresh: true }),
        data
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

// Real-time Order Updates Hook
export function useRealtimeOrder(orderId: string) {
  const queryClient = useQueryClient();

  const { data: order, ...queryResult } = useQuery({
    queryKey: orderKeys.detail(orderId, { refresh: false }),
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/${orderId}`
      );
      if (!response.ok) throw new Error('Failed to fetch order');
      const result = await response.json();
      // Handle nested response structure
      return result.data || result;
    },
    enabled: !!orderId,
  });

  // Auto-refresh for pending orders
  React.useEffect(() => {
    let intervalRef: NodeJS.Timeout;

    if (
      order &&
      ['pending', 'processing'].includes(order.status.payment)
    ) {
      intervalRef = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail(orderId, { refresh: false }),
        });
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    };
  }, [order, orderId, queryClient]);

  const forceRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: orderKeys.detail(orderId),
    });
  };

  return {
    order,
    forceRefresh,
    isAutoRefreshing:
      order &&
      ['pending', 'processing'].includes(order.status.payment),
    ...queryResult,
  };
}

// Error Handler Hook
export function useErrorHandler() {
  const queryClient = useQueryClient();

  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context}:`, error);

    // Clear related queries on certain errors
    if (error.message.includes('401')) {
      queryClient.clear(); // Clear all queries on auth error
    }
  };

  const retryWithRefresh = async (orderId: string) => {
    try {
      await queryClient.fetchQuery({
        queryKey: orderKeys.detail(orderId, { refresh: true }),
        queryFn: () =>
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v5/orders/${orderId}?refresh=true`
          )
            .then((res) => res.json())
            .then((result) => result.data || result),
      });
    } catch (error) {
      handleError(error as Error, 'retry with refresh');
    }
  };

  return { handleError, retryWithRefresh };
}
