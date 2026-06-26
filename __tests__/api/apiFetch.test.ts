import { apiFetch } from '@/lib/api/apiFetch';

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => new Response('{}')) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function getFetchHeaders() {
    const fetchMock = global.fetch as jest.Mock;
    const [, options] = fetchMock.mock.calls[0];
    return new Headers(options?.headers);
  }

  test('does not add the ngrok bypass header to production API requests', async () => {
    await apiFetch('https://app.apiswop.co/api/v2/desktop/user/test');

    expect(getFetchHeaders().has('ngrok-skip-browser-warning')).toBe(false);
  });

  test('adds the ngrok bypass header only for ngrok tunnel requests', async () => {
    await apiFetch('https://marlin-finer-bluegill.ngrok-free.app/health');

    expect(getFetchHeaders().get('ngrok-skip-browser-warning')).toBe('true');
  });

  test('preserves caller-provided headers', async () => {
    await apiFetch('https://app.apiswop.co/api/v2/desktop/user/test', {
      headers: { Authorization: 'Bearer token' },
    });

    expect(getFetchHeaders().get('Authorization')).toBe('Bearer token');
  });
});
