import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/api/backendProxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyBackendRequest({
    headers: {
      'Content-Type': 'application/json',
    },
    path: '/api/v5/wallet/reward-wallet',
    request,
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  return proxyBackendRequest({
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    path: '/api/v5/wallet/reward-wallet/claim',
    request,
  });
}
