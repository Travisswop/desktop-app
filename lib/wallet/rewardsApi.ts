import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { isNetworkFetchError } from '@/lib/api/fetchErrors';

async function rewardFetchWithNetworkFallback(
  backendPath: string,
  proxyPath: string,
  init: RequestInit,
) {
  try {
    return await apiFetch(buildSwopApiUrl(backendPath), init);
  } catch (error) {
    if (!isNetworkFetchError(error)) {
      throw error;
    }

    return fetch(proxyPath, {
      ...init,
      credentials: 'include',
    });
  }
}

export function fetchRewardWalletStatus(accessToken: string) {
  return rewardFetchWithNetworkFallback(
    '/api/v5/wallet/reward-wallet',
    '/api/wallet/reward-wallet',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

export function fetchCopyTradeRewards(
  accessToken: string,
  { limit = 100, status = 'all' }: { limit?: number; status?: string } = {},
) {
  const query = new URLSearchParams({
    limit: String(limit),
    status,
  });

  return rewardFetchWithNetworkFallback(
    `/api/v5/wallet/copy-trade-rewards?${query.toString()}`,
    `/api/wallet/copy-trade-rewards?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

export function claimRewardWallet(
  accessToken: string,
  destinationWallet: string,
) {
  const body = JSON.stringify({ destinationWallet });

  return rewardFetchWithNetworkFallback(
    '/api/v5/wallet/reward-wallet/claim',
    '/api/wallet/reward-wallet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    },
  );
}
