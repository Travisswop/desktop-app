import logger from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface FilterOptions {
  page?: number;
  perPage?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  role?: string;
  [key: string]: string | number | boolean | undefined | null;
}

export interface Order {
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

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

export interface OrdersAPIResponse {
  orders: Order[];
  pagination: Pagination;
  stats: {
    pendingDelivery: number;
    completed: number;
    totalSpent: number | null;
    totalEarned: number;
    totalInEscrow: number;
    totalDispute: number;
  };
}

async function fetchUserOrders(
  accessToken: string,
  filters: FilterOptions
): Promise<OrdersAPIResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.append(key, String(value));
    }
  });

  logger.info('access token', accessToken);

  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL
    }/api/v5/orders/getUserOrders?${params.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch orders: ${res.status} ${res.statusText}`
    );
  }

  const { data } = await res.json();
  console.log('🚀 ~ json:', data);
  return data;
}

export function useUserOrders(
  accessToken: string | undefined,
  filters: FilterOptions
) {
  const queryKey = useMemo(
    () => ['userOrders', accessToken, filters],
    [accessToken, filters]
  );

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Missing access token');
      }
      return fetchUserOrders(accessToken, filters);
    },
    enabled: Boolean(accessToken),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
