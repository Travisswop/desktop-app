import { getSwopApiBaseUrl } from './apiBaseUrl';
import { isNetworkFetchError } from './fetchErrors';

const NGROK_BYPASS_HEADER = 'ngrok-skip-browser-warning';

function getRequestUrl(url: string | URL | Request) {
  if (typeof url === 'string') return url;
  if (url instanceof URL) return url.toString();
  return url.url;
}

function shouldAddNgrokBypassHeader(url: string | URL | Request) {
  try {
    return new URL(getRequestUrl(url)).hostname.endsWith('.ngrok-free.app');
  } catch {
    return false;
  }
}

export function apiFetch(
  url: string | URL | Request,
  options?: RequestInit,
): Promise<Response> {
  const merged = new Headers(options?.headers as HeadersInit | undefined);

  if (shouldAddNgrokBypassHeader(url) && !merged.has(NGROK_BYPASS_HEADER)) {
    merged.set(NGROK_BYPASS_HEADER, 'true');
  }

  return fetch(url, { ...options, headers: merged }).catch((error) => {
    const fallbackUrl = getSwopBackendProxyUrl(url);
    if (!fallbackUrl || !isNetworkFetchError(error)) {
      throw error;
    }

    return fetch(fallbackUrl, {
      ...options,
      credentials: 'include',
      headers: merged,
    });
  });
}

function getSwopBackendProxyUrl(url: string | URL | Request) {
  if (typeof window === 'undefined' || url instanceof Request) {
    return null;
  }

  let requestUrl: URL;
  let swopApiBase: URL;
  try {
    requestUrl = new URL(getRequestUrl(url));
    swopApiBase = new URL(getSwopApiBaseUrl());
  } catch {
    return null;
  }

  if (
    requestUrl.origin !== swopApiBase.origin ||
    !requestUrl.pathname.startsWith('/api/')
  ) {
    return null;
  }

  return `/api/backend${requestUrl.pathname}${requestUrl.search}`;
}
