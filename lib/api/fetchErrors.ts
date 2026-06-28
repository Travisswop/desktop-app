export function isNetworkFetchError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const normalized = message.toLowerCase();

  return (
    normalized === 'failed to fetch' ||
    normalized === 'fetch failed' ||
    normalized.includes('networkerror') ||
    normalized === 'load failed'
  );
}
