'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AaveChain,
  AaveMarketsData,
  AavePositionsData,
} from '@/types/aave';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { apiFetch } from '@/lib/api/apiFetch';

type UseAavePositionsOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

type AaveApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type RetryableAaveDataError = Error & { retryable?: boolean };

const createRetryableAaveDataError = (): RetryableAaveDataError => {
  const error = new Error(
    'Aave RPC providers temporarily unavailable'
  ) as RetryableAaveDataError;
  error.retryable = true;
  return error;
};

const isRetryableAaveDataError = (
  error: unknown
): error is RetryableAaveDataError =>
  error instanceof Error && Boolean((error as RetryableAaveDataError).retryable);

const hasNoAavePositions = (data: AavePositionsData) =>
  (data.supplies || []).length === 0 && (data.borrows || []).length === 0;

async function fetchAave<T>(path: string, accessToken?: string): Promise<T> {
  const response = await apiFetch(buildSwopApiUrl(`/api/v5/defi/aave/${path}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const body = (await response
    .json()
    .catch(() => ({}))) as AaveApiResponse<T>;

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Could not load Aave data (${response.status}).`,
    );
  }

  return body.data;
}

export function useAaveMarkets(chain: AaveChain) {
  return useQuery({
    queryKey: ['aave-markets', chain],
    queryFn: () => fetchAave<AaveMarketsData>(`markets?chain=${chain}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });
}

export type AaveAllPositionsData = Partial<Record<AaveChain, AavePositionsData>>;

// One request for several chains (see GET /aave/positions/all). Each chain is
// fetched independently server-side, so a single chain's RPC failure comes back
// as a degraded entry rather than failing the batch.
export function useAaveAllPositions(
  chains: AaveChain[],
  address: string | null,
  accessToken: string,
  options: UseAavePositionsOptions = {},
) {
  const sortedChains = [...chains].sort();
  const chainsKey = sortedChains.join(',');
  return useQuery({
    queryKey: ['aave-positions-all', chainsKey, address],
    queryFn: () =>
      fetchAave<AaveAllPositionsData>(
        `positions/all?address=${address}&chains=${chainsKey}`,
        accessToken,
      ),
    enabled:
      Boolean(address && accessToken && sortedChains.length) &&
      options.enabled !== false,
    refetchInterval: options.refetchInterval ?? 30_000,
    staleTime: 10_000,
    retry: 2,
  });
}

export function useAavePositions(
  chain: AaveChain,
  address: string | null,
  accessToken: string,
  options: UseAavePositionsOptions = {},
) {
  return useQuery({
    queryKey: ['aave-positions', chain, address],
    queryFn: async () => {
      const data = await fetchAave<AavePositionsData>(
        `positions?chain=${chain}&address=${address}`,
        accessToken,
      );
      if (data.degraded && hasNoAavePositions(data)) {
        throw createRetryableAaveDataError();
      }
      return data;
    },
    enabled: Boolean(address && accessToken) && options.enabled !== false,
    refetchInterval: options.refetchInterval ?? 30_000,
    staleTime: 10_000,
    retry: (failureCount, error) =>
      isRetryableAaveDataError(error) ? failureCount < 3 : failureCount < 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
