import { NextRequest, NextResponse } from 'next/server';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import {
  accessTokenRequiredResponse,
  getBackendTokenHeader,
} from '@/lib/api/backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const tokenHeader = getBackendTokenHeader(request);

  if (!tokenHeader) {
    return accessTokenRequiredResponse();
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

  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Backend wallet token request failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
