import { NextRequest } from 'next/server';

import { POLYMARKET_BACKEND_URL } from '@/constants/polymarket';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const FORWARDED_HEADERS = [
  'authorization',
  'content-type',
  'ngrok-skip-browser-warning',
];

function buildUpstreamUrl(path: string[], search: string) {
  const encodedPath = path.map((part) => encodeURIComponent(part)).join('/');
  const url = `${POLYMARKET_BACKEND_URL}/api/prediction-markets/${encodedPath}`;
  return search ? `${url}${search}` : url;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const key of FORWARDED_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  return headers;
}

async function proxyPolymarketRequest(
  request: NextRequest,
  context: RouteContext,
) {
  const { path = [] } = await context.params;
  const method = request.method.toUpperCase();
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: buildForwardHeaders(request),
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const headers = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    console.error('[polymarket/backend] upstream fetch error:', error);
    return Response.json(
      { error: 'Failed to reach Polymarket backend' },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyPolymarketRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyPolymarketRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyPolymarketRequest(request, context);
}
