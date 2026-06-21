import { NextRequest, NextResponse } from 'next/server';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const cookieToken = request.cookies.get('access-token')?.value;
  const authorization = request.headers.get('authorization');
  const bearerToken =
    authorization?.startsWith('Bearer ') ? authorization : null;
  const tokenHeader = bearerToken || (cookieToken ? `Bearer ${cookieToken}` : '');

  if (!tokenHeader) {
    return NextResponse.json(
      { success: false, message: 'Access token required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = await fetch(buildSwopApiUrl('/api/v5/wallet/tokens'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: tokenHeader,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  });

  const text = await response.text();
  const contentType =
    response.headers.get('content-type') || 'application/json';

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });
}
