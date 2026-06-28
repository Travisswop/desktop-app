import { NextRequest, NextResponse } from 'next/server';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { getBackendTokenHeader } from '@/lib/api/backendProxy';

export const dynamic = 'force-dynamic';

type BackendProxyContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

function buildBackendPath(request: NextRequest, pathSegments: string[] = []) {
  const path = `/${pathSegments.join('/')}`;
  return `${path}${request.nextUrl.search}`;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const tokenHeader = getBackendTokenHeader(request);
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (tokenHeader) {
    headers.set('authorization', tokenHeader);
  }
  if (contentType) {
    headers.set('content-type', contentType);
  }
  if (accept) {
    headers.set('accept', accept);
  }

  headers.set('ngrok-skip-browser-warning', 'true');
  return headers;
}

async function proxySwopBackendRequest(
  request: NextRequest,
  { params }: BackendProxyContext,
) {
  const method = request.method.toUpperCase();
  const { path } = await params;
  const backendPath = buildBackendPath(request, path);

  if (!backendPath.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, message: 'Unsupported backend proxy path' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const response = await fetch(buildSwopApiUrl(backendPath), {
      body: BODYLESS_METHODS.has(method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      headers: buildForwardHeaders(request),
      method,
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    const contentType =
      response.headers.get('content-type') || 'application/json';

    return new NextResponse(method === 'HEAD' ? null : text, {
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

export const DELETE = proxySwopBackendRequest;
export const GET = proxySwopBackendRequest;
export const HEAD = proxySwopBackendRequest;
export const PATCH = proxySwopBackendRequest;
export const POST = proxySwopBackendRequest;
export const PUT = proxySwopBackendRequest;
