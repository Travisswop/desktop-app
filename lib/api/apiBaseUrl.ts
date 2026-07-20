const LOCAL_SWOP_API_BASE_URL = 'http://localhost:4000';
const PRODUCTION_SWOP_API_BASE_URL = 'https://apps.apiswop.co';

function normalizeBaseUrl(value: string | undefined) {
  const normalized = value?.trim().replace(/\/+$/, '');
  return normalized && normalized !== 'undefined' ? normalized : '';
}

function isPrivateIpv4Hostname(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateLanHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return isPrivateIpv4Hostname(normalized) || normalized.endsWith('.local');
}

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    isPrivateLanHostname(hostname) ||
    hostname === 'marlin-finer-bluegill.ngrok-free.app'
  );
}

function isLocalBaseUrl(baseUrl: string) {
  try {
    return isLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return (
      baseUrl.includes('localhost') ||
      baseUrl.includes('127.0.0.1') ||
      isPrivateLanHostname(baseUrl)
    );
  }
}

function isBrowserOnLocalhost() {
  return (
    typeof window !== 'undefined' &&
    isLocalHostname(window.location.hostname)
  );
}

function getBrowserLocalBaseUrl(baseUrl: string) {
  if (typeof window === 'undefined') {
    return baseUrl;
  }

  const browserHostname = window.location.hostname;
  if (!isPrivateLanHostname(browserHostname)) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.hostname = browserHostname;
    return normalizeBaseUrl(url.toString());
  } catch {
    return baseUrl;
  }
}

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1'
  );
}

export function getSwopApiBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL,
  );

  if (configuredBaseUrl) {
    if (isLocalBaseUrl(configuredBaseUrl)) {
      if (typeof window !== 'undefined') {
        return isBrowserOnLocalhost()
          ? getBrowserLocalBaseUrl(configuredBaseUrl)
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
      ? getBrowserLocalBaseUrl(LOCAL_SWOP_API_BASE_URL)
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
