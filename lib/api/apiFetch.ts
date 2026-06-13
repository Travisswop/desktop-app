/**
 * Drop-in replacement for `fetch` that automatically injects default headers
 * for every request (e.g. ngrok tunnel bypass).
 *
 * To change default headers globally, edit only this file.
 */

const DEFAULT_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

export function apiFetch(
  url: string | URL | Request,
  options?: RequestInit,
): Promise<Response> {
  const merged = new Headers(options?.headers as HeadersInit | undefined);

  for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  }

  return fetch(url, { ...options, headers: merged });
}
