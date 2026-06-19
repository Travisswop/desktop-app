const PHANTOM_BROWSE_BASE_URL = 'https://phantom.app/ul/browse';

function browserOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function originForUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

export function normalizeCheckoutUrl(
  checkoutUrl?: string | null,
  intentId?: string,
  origin = browserOrigin()
) {
  const trimmedUrl = checkoutUrl?.trim();

  if (trimmedUrl) {
    if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
    if (origin) {
      try {
        return new URL(trimmedUrl, origin).toString();
      } catch {
        return trimmedUrl;
      }
    }
    return trimmedUrl;
  }

  if (intentId && origin) {
    return new URL(`/checkout/${encodeURIComponent(intentId)}`, origin).toString();
  }

  return '';
}

export function checkoutUrlWithPaymentMethod({
  checkoutUrl,
  intentId,
  method,
  origin = browserOrigin(),
}: {
  checkoutUrl?: string | null;
  intentId?: string;
  method: 'swop' | 'phantom';
  origin?: string;
}) {
  const normalizedUrl = normalizeCheckoutUrl(checkoutUrl, intentId, origin);
  if (!normalizedUrl) return '';

  try {
    const url = new URL(normalizedUrl, origin || undefined);
    url.searchParams.set('method', method);
    return url.toString();
  } catch {
    const [urlWithoutHash, hash = ''] = normalizedUrl.split('#');
    const separator = urlWithoutHash.includes('?') ? '&' : '?';
    const nextUrl = `${urlWithoutHash}${separator}method=${encodeURIComponent(
      method
    )}`;
    return hash ? `${nextUrl}#${hash}` : nextUrl;
  }
}

export function buildPhantomBrowseUrl(targetUrl: string, refUrl?: string) {
  const normalizedTarget = targetUrl.trim();
  if (!normalizedTarget) return '';

  const normalizedRef =
    refUrl?.trim() || originForUrl(normalizedTarget) || browserOrigin();
  if (!normalizedRef) return '';

  return `${PHANTOM_BROWSE_BASE_URL}/${encodeURIComponent(
    normalizedTarget
  )}?ref=${encodeURIComponent(normalizedRef)}`;
}

export function getPhantomCheckoutUrl({
  checkoutUrl,
  intentId,
  refUrl,
}: {
  checkoutUrl?: string | null;
  intentId?: string;
  refUrl?: string;
}) {
  const targetUrl = normalizeCheckoutUrl(checkoutUrl, intentId);
  return buildPhantomBrowseUrl(targetUrl, refUrl);
}
