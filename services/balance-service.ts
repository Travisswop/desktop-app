/**
 * Balance Service
 * Handles API calls related to user wallet balance and balance history
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface BalanceHistoryEntry {
  createdAt: string;
  amount: number;
}

export interface BalanceData {
  balanceHistory: BalanceHistoryEntry[];
}

export interface GetBalanceResponse {
  balanceData: BalanceData;
  totalTokensValue: number;
}

export interface GetBalanceParams {
  userId: string;
}

/**
 * Fetch balance history for a user
 *
 * @param params - User ID
 * @returns Promise with balance data and history
 */
export async function getBalance({
  userId,
}: GetBalanceParams): Promise<GetBalanceResponse> {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured');
  }

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const url = `${API_BASE_URL}/api/v5/wallet/getBalance/${userId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Use default caching - let React Query handle cache invalidation
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(errorData.message || 'Failed to fetch balance data');
    }

    const data: GetBalanceResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching balance data:', error);
    throw error;
  }
}

/**
 * React Query key factory for balance queries
 * Use this with TanStack Query for automatic caching and state management
 *
 * @param userId - User ID to fetch balance for
 * @returns Query key array for React Query
 */
export const balanceQueryKey = (userId: string) => ['balance', userId] as const;
