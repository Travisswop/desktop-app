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

  return fetch(url, { ...options, headers: merged });
}
