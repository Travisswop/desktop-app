'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  AaveChain,
  AaveMarketsData,
  AavePositionsData,
} from '@/types/aave';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchAave<T>(path: string, accessToken?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api/v5/defi/aave/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'Could not load Aave data.');
  }
  return body.data as T;
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
