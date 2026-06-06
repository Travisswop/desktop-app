const LOCAL_SWOP_API_BASE_URL = 'http://localhost:4000';
const PRODUCTION_SWOP_API_BASE_URL = 'https://app.apiswop.co';

function normalizeBaseUrl(value: string | undefined) {
  const normalized = value?.trim().replace(/\/+$/, '');
  return normalized && normalized !== 'undefined' ? normalized : '';
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalBaseUrl(baseUrl: string) {
  try {
    return isLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  }
}

function isBrowserOnLocalhost() {
  return typeof window !== 'undefined' && isLocalHostname(window.location.hostname);
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

export function getSwopApiBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  if (configuredBaseUrl) {
    if (isLocalBaseUrl(configuredBaseUrl)) {
      if (typeof window !== 'undefined') {
        return isBrowserOnLocalhost()
          ? configuredBaseUrl
          : PRODUCTION_SWOP_API_BASE_URL;
      }

      return isProductionRuntime()
        ? PRODUCTION_SWOP_API_BASE_URL
        : configuredBaseUrl;
    }

    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    return isBrowserOnLocalhost()
      ? LOCAL_SWOP_API_BASE_URL
      : PRODUCTION_SWOP_API_BASE_URL;
  }

  return isProductionRuntime()
    ? PRODUCTION_SWOP_API_BASE_URL
    : LOCAL_SWOP_API_BASE_URL;
}

export function buildSwopApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSwopApiBaseUrl()}${normalizedPath}`;
}
