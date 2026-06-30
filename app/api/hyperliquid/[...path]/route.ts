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
import {
  HYPERLIQUID_INFO_PROXY_ATTEMPT_TIMEOUT_MS,
  HYPERLIQUID_INFO_PROXY_MAX_ATTEMPTS,
  HYPERLIQUID_INFO_PROXY_RETRY_DELAY_MS,
} from '@/lib/hyperliquidProxy';

const MAINNET_API_URL = 'https://api.hyperliquid.xyz';
const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz';
const RETRYABLE_INFO_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableInfoEndpoint(endpoint: string) {
  return endpoint === 'info';
}

function delay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timeoutId);
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }

    function cleanup() {
      signal?.removeEventListener('abort', onAbort);
    }

    if (!signal) return;

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type HyperliquidProxyErrorInfo = {
  code: string;
  detail: string | null;
};

function getErrorChain(error: unknown) {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (
    current &&
    !seen.has(current) &&
    chain.length < 6 &&
    (typeof current === 'object' || current instanceof Error)
  ) {
    chain.push(current);
    seen.add(current);

    if (!current || typeof current !== 'object' || !('cause' in current)) {
      break;
    }

    current = current.cause;
  }

  return chain;
}

function readErrorStringField(error: unknown, field: 'code' | 'message') {
  if (!error || typeof error !== 'object') return null;

  const value = (error as Partial<Record<'code' | 'message', unknown>>)[field];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getErrorCode(error: unknown) {
  return (
    getErrorChain(error)
      .map((entry) => readErrorStringField(entry, 'code'))
      .find(Boolean) ?? null
  );
}

function getErrorMessages(error: unknown) {
  return getErrorChain(error)
    .flatMap((entry) => {
      const message =
        entry instanceof Error
          ? entry.message
          : readErrorStringField(entry, 'message');
      return typeof message === 'string' && message.trim() ? [message] : [];
    })
    .filter(Boolean);
}

function isDnsResolutionError(error: unknown) {
  const errorCode = getErrorCode(error);
  if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN') {
    return {
      matched: true,
      detail: errorCode,
    };
  }

  const message = getErrorMessages(error).join(' ');
  if (/getaddrinfo|ENOTFOUND/i.test(message)) {
    return {
      matched: true,
      detail: errorCode ?? 'ENOTFOUND',
    };
  }

  return {
    matched: false,
    detail: null,
  };
}

function classifyProxyError(
  error: unknown,
  requestSignal: AbortSignal,
): HyperliquidProxyErrorInfo {
  if (requestSignal.aborted) {
    return {
      code: 'client_abort',
      detail: null,
    };
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return {
      code: 'timeout',
      detail: null,
    };
  }

  const dnsError = isDnsResolutionError(error);
  if (dnsError.matched) {
    return {
      code: 'dns_unavailable',
      detail: dnsError.detail,
    };
  }

  return {
    code: 'fetch_failed',
    detail: getErrorCode(error),
  };
}

function buildUpstreamSignal(
  requestSignal: AbortSignal,
  retryableInfoRequest: boolean,
) {
  if (!retryableInfoRequest) {
    return requestSignal;
  }

  return AbortSignal.any([
    requestSignal,
    AbortSignal.timeout(HYPERLIQUID_INFO_PROXY_ATTEMPT_TIMEOUT_MS),
  ]);
}

function buildResponseHeaders(
  contentType: string | null,
  metadata: {
    attempts: number;
    retryable: boolean;
    retried: boolean;
    error?: string | null;
    errorDetail?: string | null;
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

  if (metadata.errorDetail) {
    headers.set('x-hyperliquid-proxy-error-detail', metadata.errorDetail);
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
  const maxAttempts = retryableInfoRequest
    ? HYPERLIQUID_INFO_PROXY_MAX_ATTEMPTS
    : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        signal: buildUpstreamSignal(request.signal, retryableInfoRequest),
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
        await delay(HYPERLIQUID_INFO_PROXY_RETRY_DELAY_MS, request.signal);
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
      const errorInfo = classifyProxyError(error, request.signal);
      const retryableError =
        retryableInfoRequest &&
        errorInfo.code !== 'client_abort' &&
        !finalAttempt;

      console.warn('Hyperliquid proxy request failed', {
        attempt,
        code: errorInfo.code,
        detail: errorInfo.detail,
        endpoint,
        finalAttempt,
        network,
      });

      if (retryableError) {
        await delay(HYPERLIQUID_INFO_PROXY_RETRY_DELAY_MS, request.signal);
        continue;
      }

      return NextResponse.json(
        {
          error: 'Hyperliquid upstream request failed',
          reason: errorInfo.code,
          retryable:
            retryableInfoRequest && errorInfo.code !== 'client_abort',
          source: 'hyperliquid_proxy',
        },
        {
          status: errorInfo.code === 'client_abort' ? 499 : 502,
          headers: buildResponseHeaders('application/json', {
            attempts: attempt,
            retried: attempt > 1,
            retryable:
              retryableInfoRequest && errorInfo.code !== 'client_abort',
            error: errorInfo.code,
            errorDetail: errorInfo.detail,
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
