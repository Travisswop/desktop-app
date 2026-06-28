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

const MAINNET_API_URL = 'https://api.hyperliquid.xyz';
const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz';
const RETRYABLE_INFO_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const INFO_REQUEST_TIMEOUT_MS = 8_000;
const INFO_RETRY_DELAY_MS = 250;

function isRetryableInfoEndpoint(endpoint: string) {
  return endpoint === 'info';
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorCode(error: unknown) {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'timeout';
  }

  if (error instanceof Error) {
    return error.name || 'fetch_failed';
  }

  return 'fetch_failed';
}

function buildResponseHeaders(
  contentType: string | null,
  metadata: {
    attempts: number;
    retryable: boolean;
    retried: boolean;
    error?: string | null;
  },
) {
  const headers = new Headers();
  headers.set('Content-Type', contentType ?? 'application/json');
  headers.set('x-hyperliquid-proxy-attempts', String(metadata.attempts));
  headers.set(
    'x-hyperliquid-proxy-retryable',
    metadata.retryable ? 'true' : 'false',
  );
  headers.set(
    'x-hyperliquid-proxy-retried',
    metadata.retried ? 'true' : 'false',
  );

  if (metadata.error) {
    headers.set('x-hyperliquid-proxy-error', metadata.error);
  }

  return headers;
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
  const retryableInfoRequest = isRetryableInfoEndpoint(endpoint);
  const maxAttempts = retryableInfoRequest ? 2 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        ...(retryableInfoRequest
          ? { signal: AbortSignal.timeout(INFO_REQUEST_TIMEOUT_MS) }
          : {}),
      });

      const responseBody = await upstream.text();
      const shouldRetry =
        retryableInfoRequest &&
        RETRYABLE_INFO_STATUSES.has(upstream.status) &&
        attempt < maxAttempts;

      if (shouldRetry) {
        console.warn('Hyperliquid info proxy retrying after upstream failure', {
          attempt,
          endpoint,
          network,
          status: upstream.status,
        });
        await delay(INFO_RETRY_DELAY_MS);
        continue;
      }

      return new NextResponse(responseBody, {
        status: upstream.status,
        headers: buildResponseHeaders(upstream.headers.get('Content-Type'), {
          attempts: attempt,
          retried: attempt > 1,
          retryable: retryableInfoRequest,
          error: upstream.ok ? null : `status_${upstream.status}`,
        }),
      });
    } catch (error) {
      const finalAttempt = attempt >= maxAttempts;
      const code = errorCode(error);

      console.warn('Hyperliquid proxy request failed', {
        attempt,
        code,
        endpoint,
        finalAttempt,
        network,
      });

      if (!finalAttempt && retryableInfoRequest) {
        await delay(INFO_RETRY_DELAY_MS);
        continue;
      }

      return NextResponse.json(
        {
          error: 'Hyperliquid upstream request failed',
          retryable: retryableInfoRequest,
          source: 'hyperliquid_proxy',
        },
        {
          status: 502,
          headers: buildResponseHeaders('application/json', {
            attempts: attempt,
            retried: attempt > 1,
            retryable: retryableInfoRequest,
            error: code,
          }),
        },
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Hyperliquid upstream request failed',
      retryable: retryableInfoRequest,
      source: 'hyperliquid_proxy',
    },
    {
      status: 502,
      headers: buildResponseHeaders('application/json', {
        attempts: maxAttempts,
        retried: retryableInfoRequest,
        retryable: retryableInfoRequest,
        error: 'unexpected_fallthrough',
      }),
    },
  );
}
