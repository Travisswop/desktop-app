import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { isNetworkFetchError } from '@/lib/api/fetchErrors';

type FetchConnectedFeedOptions = {
  accessToken: string;
  limit: number;
  page: number;
  signal?: AbortSignal;
  type?: 'non-post';
  userId: string;
};

export async function fetchConnectedUserFeed({
  accessToken,
  limit,
  page,
  signal,
  type,
  userId,
}: FetchConnectedFeedOptions) {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  const backendPath =
    type === 'non-post'
      ? `/api/v1/feed/user/connect/non-post/${encodeURIComponent(userId)}`
      : `/api/v2/feed/user/connect/${encodeURIComponent(userId)}`;
  const init: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
    signal,
  };

  try {
    return await apiFetch(buildSwopApiUrl(`${backendPath}?${query}`), init);
  } catch (error) {
    if (!isNetworkFetchError(error) || signal?.aborted) {
      throw error;
    }

    const proxyQuery = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      userId,
    });

    if (type) {
      proxyQuery.set('type', type);
    }

    return fetch(`/api/feed/user-connect?${proxyQuery.toString()}`, {
      ...init,
      credentials: 'include',
    });
  }
}
