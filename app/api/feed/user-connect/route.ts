import { NextRequest, NextResponse } from 'next/server';
import { proxyBackendRequest } from '@/lib/api/backendProxy';

export const dynamic = 'force-dynamic';

function positiveIntParam(value: string | null, fallback: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : fallback;
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')?.trim();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: 'User ID required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const page = positiveIntParam(request.nextUrl.searchParams.get('page'), '1');
  const limit = positiveIntParam(
    request.nextUrl.searchParams.get('limit'),
    '10',
  );
  const feedType = request.nextUrl.searchParams.get('type');
  const endpoint =
    feedType === 'non-post'
      ? `/api/v1/feed/user/connect/non-post/${encodeURIComponent(userId)}`
      : `/api/v2/feed/user/connect/${encodeURIComponent(userId)}`;

  return proxyBackendRequest({
    headers: {
      'Content-Type': 'application/json',
    },
    path: `${endpoint}?page=${page}&limit=${limit}`,
    request,
  });
}
