import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/api/backendProxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const backendQuery = new URLSearchParams();
  const status = request.nextUrl.searchParams.get('status') || 'all';
  const limit = request.nextUrl.searchParams.get('limit') || '100';

  backendQuery.set('status', status);
  backendQuery.set('limit', limit);

  return proxyBackendRequest({
    headers: {
      'Content-Type': 'application/json',
    },
    path: `/api/v5/wallet/copy-trade-rewards?${backendQuery.toString()}`,
    request,
  });
}
