/**
 * Hyperliquid API Proxy
 *
 * Proxies browser requests to the Hyperliquid API server-side, bypassing
 * the CORS restriction that blocks direct browser → api.hyperliquid.xyz calls.
 *
 * URL pattern:
 *   POST /api/hyperliquid/mainnet/<endpoint>  → https://api.hyperliquid.xyz/<endpoint>
 *   POST /api/hyperliquid/testnet/<endpoint>  → https://api.hyperliquid-testnet.xyz/<endpoint>
 */
import { NextRequest, NextResponse } from 'next/server';

import { isNetworkFetchError } from '@/lib/api/fetchErrors';

const MAINNET_API_URL = 'https://api.hyperliquid.xyz';
const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz';
const DEFAULT_TIMEOUT_MS = 15_000;
const INFO_TIMEOUT_MS = 8_000;
const INFO_RETRY_DELAYS_MS = [250, 750];
const RETRYABLE_INFO_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type HyperliquidFailureType = 'network' | 'timeout' | 'upstream_status';

function isInfoEndpoint(endpoint: string) {
  return endpoint === 'info';
}

function isRetryableInfoStatus(status: number) {
  return RETRYABLE_INFO_STATUSES.has(status);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failureTypeForError(error: unknown): HyperliquidFailureType | null {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'timeout';
  }

  if (isNetworkFetchError(error)) {
    return 'network';
  }

  return null;
}

function retryableInfoFailureResponse({
  endpoint,
  failureType,
  network,
  upstreamStatus,
  upstreamStatusText,
}: {
  endpoint: string;
  failureType: HyperliquidFailureType;
  network: string;
  upstreamStatus?: number;
  upstreamStatusText?: string;
}) {
  const status =
    failureType === 'timeout'
      ? 504
      : upstreamStatus === 429
      ? 429
      : 502;

  return NextResponse.json(
    {
      error: 'Hyperliquid info temporarily unavailable',
      code: 'hyperliquid_info_unavailable',
      retryable: true,
      failureType,
      network,
      endpoint,
      upstreamStatus: upstreamStatus ?? null,
      upstreamStatusText: upstreamStatusText ?? null,
    },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // path[0] = "mainnet" | "testnet", path[1..] = endpoint (e.g. "exchange", "info")
  const [network, ...rest] = path;
  const endpoint = rest.join('/');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const baseUrl = network === 'testnet' ? TESTNET_API_URL : MAINNET_API_URL;
  const targetUrl = `${baseUrl}/${endpoint}`;

  const body = await request.text();
  const infoEndpoint = isInfoEndpoint(endpoint);
  const attempts = infoEndpoint ? INFO_RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(
          infoEndpoint ? INFO_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
        ),
      });

      const responseBody = await upstream.text();

      if (
        infoEndpoint &&
        !upstream.ok &&
        isRetryableInfoStatus(upstream.status)
      ) {
        if (attempt < attempts - 1) {
          await wait(INFO_RETRY_DELAYS_MS[attempt] || 0);
          continue;
        }

        return retryableInfoFailureResponse({
          endpoint,
          failureType: 'upstream_status',
          network,
          upstreamStatus: upstream.status,
          upstreamStatusText: upstream.statusText,
        });
      }

      return new NextResponse(responseBody, {
        status: upstream.status,
        headers: {
          'Content-Type':
            upstream.headers.get('Content-Type') ?? 'application/json',
        },
      });
    } catch (error) {
      const failureType = infoEndpoint ? failureTypeForError(error) : null;

      if (infoEndpoint && failureType) {
        if (attempt < attempts - 1) {
          await wait(INFO_RETRY_DELAYS_MS[attempt] || 0);
          continue;
        }

        return retryableInfoFailureResponse({
          endpoint,
          failureType,
          network,
        });
      }

      throw error;
    }
  }

  return retryableInfoFailureResponse({
    endpoint,
    failureType: 'upstream_status',
    network,
  });
}
