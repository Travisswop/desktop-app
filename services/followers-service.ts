/**
 * Followers Service
 * Handles API calls related to user followers functionality
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface FollowerMicrosite {
  _id: string;
  name: string;
  bio?: string;
  profilePic?: string;
  username?: string;
  profileUrl?: string;
  theme?: string;
  ens?: string;
  primary?: boolean;
  parentId?: string;
  ensData?: any;
}

export interface Follower {
  account: FollowerMicrosite;
  lat: number | null;
  lng: number | null;
  address: string | null;
  date: string | null;
  email: null;
  phoneNumber: null;
}

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GetFollowersResponse {
  state: 'success' | 'failed';
  message: string;
  data: {
    totalFollowers: number;
    followers: Follower[];
    source?: 'default' | 'user'; // default = from DefaultConnection, user = explicit followers
    pagination: PaginationMeta;
  };
}

export interface GetFollowersParams {
  userId: string;
  page?: number;
  limit?: number;
  accessToken?: string;
}

/**
 * Fetch followers for a user with pagination
 *
 * @param params - User ID, page number, limit, and access token
 * @returns Promise with followers data and pagination info
 */
export async function getFollowers({
  userId,
  page = 1,
  limit = 20,
  accessToken,
}: GetFollowersParams): Promise<GetFollowersResponse> {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured');
  }

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const url = `${API_BASE_URL}/api/v1/users/${userId}/followers?${queryParams}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store', // Disable caching for real-time data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(errorData.message || 'Failed to fetch followers');
    }

    const data: GetFollowersResponse = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
}

/**
 * React Query hook for fetching followers
 * Use this with TanStack Query for automatic caching and state management
 */
export const followersQueryKey = (userId: string, page: number, limit: number) => [
  'followers',
  userId,
  page,
  limit,
];
