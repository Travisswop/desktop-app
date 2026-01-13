/**
 * URL utility functions
 */

/**
 * Convert relative URLs to absolute URLs using the API base URL
 * @param imageUrl - The image URL (can be relative or absolute)
 * @returns Absolute URL or undefined if input is undefined
 */
export function convertToAbsoluteUrl(
  imageUrl: string | undefined
): string | undefined {
  if (!imageUrl) return undefined;

  // Already absolute URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Convert relative to absolute
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const separator = imageUrl.startsWith('/') ? '' : '/';
  return `${apiUrl}${separator}${imageUrl}`;
}
