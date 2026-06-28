import { isNetworkFetchError } from '@/lib/api/fetchErrors';

describe('isNetworkFetchError', () => {
  test('detects browser fetch failures', () => {
    expect(isNetworkFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFetchError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkFetchError(new Error('Load failed'))).toBe(true);
    expect(isNetworkFetchError(new Error('fetch failed'))).toBe(true);
  });

  test('does not treat aborts or HTTP errors as network fetch failures', () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    expect(isNetworkFetchError(abortError)).toBe(false);
    expect(isNetworkFetchError(new Error('HTTP 401'))).toBe(false);
    expect(isNetworkFetchError(new Error('Failed to fetch wallet tokens: 401'))).toBe(false);
  });
});
