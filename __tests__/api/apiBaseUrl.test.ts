import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

describe('apiBaseUrl', () => {
  const globalWithWindow = global as any;
  const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalWindow = globalWithWindow.window;

  afterEach(() => {
    if (originalNextPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
    }

    if (originalWindow === undefined) {
      delete globalWithWindow.window;
    } else {
      globalWithWindow.window = originalWindow;
    }
  });

  function setBrowserHostname(hostname: string) {
    globalWithWindow.window = {
      location: { hostname },
    };
  }

  test('uses production API when production browser has local public API config', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    setBrowserHostname('www.swopme.app');

    expect(buildSwopApiUrl('/api/v5/wallet/tokens')).toBe(
      'https://apps.apiswop.co/api/v5/wallet/tokens',
    );
  });

  test('keeps local API when localhost browser has local public API config', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    setBrowserHostname('localhost');

    expect(buildSwopApiUrl('/api/v5/wallet/tokens')).toBe(
      'http://localhost:4000/api/v5/wallet/tokens',
    );
  });

  test('uses same private LAN host for local API config', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    setBrowserHostname('192.168.1.60');

    expect(buildSwopApiUrl('/api/v5/wallet/tokens')).toBe(
      'http://192.168.1.60:4000/api/v5/wallet/tokens',
    );
  });

  test('uses same private LAN host for default local API fallback', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    setBrowserHostname('10.0.0.25');

    expect(buildSwopApiUrl('/health')).toBe(
      'http://10.0.0.25:4000/health',
    );
  });

  test('treats 0.0.0.0 browser host as local', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    setBrowserHostname('0.0.0.0');

    expect(buildSwopApiUrl('/health')).toBe(
      'http://localhost:4000/health',
    );
  });
});
