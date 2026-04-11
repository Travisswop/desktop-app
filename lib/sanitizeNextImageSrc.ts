export function sanitizeNextImageSrc(
  src?: string | null,
): string {
  if (!src) return '';

  const trimmed = String(src).trim();
  if (!trimmed) return '';

  // Already valid absolute URLs
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Common non-http URL schemes
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  // Basic IPFS support (avoids next/image parse errors)
  if (/^ipfs:\/\//i.test(trimmed)) {
    const cidPath = trimmed.replace(/^ipfs:\/\//i, '');
    return `https://ipfs.io/ipfs/${cidPath}`;
  }

  // Protocol-relative URLs
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  // "res.cloudinary.com/...": assume https
  if (/^[^\s/]+\.[^\s/]+\/.+/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Relative paths must start with "/" for next/image
  const withLeadingSlash = trimmed.startsWith('/')
    ? trimmed
    : `/${trimmed}`;

  // Encode spaces and other characters for a valid URL path
  return encodeURI(withLeadingSlash);
}

