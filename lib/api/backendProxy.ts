import { NextRequest, NextResponse } from 'next/server';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

type ProxyBackendRequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: string;
  path: string;
  request: NextRequest;
  timeoutMs?: number;
};

export function getBackendTokenHeader(request: NextRequest) {
  const cookieToken = request.cookies.get('access-token')?.value;
  const authorization = request.headers.get('authorization');
  const bearerToken =
    authorization?.startsWith('Bearer ') ? authorization : null;

  return bearerToken || (cookieToken ? `Bearer ${cookieToken}` : '');
}

export function accessTokenRequiredResponse() {
  return NextResponse.json(
    { success: false, message: 'Access token required' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function proxyBackendRequest({
  body,
  headers,
  method = 'GET',
  path,
  request,
  timeoutMs = 30000,
}: ProxyBackendRequestOptions) {
  const tokenHeader = getBackendTokenHeader(request);

  if (!tokenHeader) {
    return accessTokenRequiredResponse();
  }

  try {
    const mergedHeaders = new Headers(headers);
    mergedHeaders.set('authorization', tokenHeader);
    mergedHeaders.set('ngrok-skip-browser-warning', 'true');

    const response = await fetch(buildSwopApiUrl(path), {
      body,
      cache: 'no-store',
      headers: mergedHeaders,
      method,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    const contentType =
      response.headers.get('content-type') || 'application/json';

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Backend request failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
