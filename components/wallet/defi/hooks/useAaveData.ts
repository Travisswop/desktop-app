'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AaveChain,
  AaveMarketsData,
  AavePositionsData,
} from '@/types/aave';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { apiFetch } from '@/lib/api/apiFetch';

type AaveApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

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

export function useAavePositions(
  chain: AaveChain,
  address: string | null,
  accessToken: string,
) {
  return useQuery({
    queryKey: ['aave-positions', chain, address],
    queryFn: () =>
      fetchAave<AavePositionsData>(
        `positions?chain=${chain}&address=${address}`,
        accessToken,
      ),
    enabled: Boolean(address && accessToken),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 2,
  });
}
