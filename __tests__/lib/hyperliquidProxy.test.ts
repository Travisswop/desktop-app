import {
  HYPERLIQUID_INFO_PROXY_RETRY_WINDOW_MS,
  HYPERLIQUID_USER_FILLS_REQUEST_TIMEOUT_MS,
} from '@/lib/hyperliquidProxy';

describe('hyperliquid proxy timing budgets', () => {
  it('keeps user-fills callers alive longer than the proxy retry window', () => {
    expect(HYPERLIQUID_USER_FILLS_REQUEST_TIMEOUT_MS).toBeGreaterThan(
      HYPERLIQUID_INFO_PROXY_RETRY_WINDOW_MS,
    );
  });
});
