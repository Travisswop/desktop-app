import { POLYMARKET_API_BASE } from '@/constants/polymarket/api';

/**
 * Thin fetch wrapper for all polymarket-backend calls.
 * Base URL: NEXT_PUBLIC_POLYMARKET_API_URL  (default http://localhost:5000)
 */
export async function pmApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${POLYMARKET_API_BASE}/api/prediction-markets${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
