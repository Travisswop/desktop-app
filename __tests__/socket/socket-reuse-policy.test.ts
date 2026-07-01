import { shouldReuseSocketConnection } from '@/lib/socket';

describe('shouldReuseSocketConnection', () => {
  it('reuses an already-connected socket when the token still matches', () => {
    expect(
      shouldReuseSocketConnection({
        hasSocketInstance: true,
        hasMatchingToken: true,
        isSocketConnected: true,
      }),
    ).toBe(true);
  });

  it('forces a new socket when the retry explicitly requests reconnect', () => {
    expect(
      shouldReuseSocketConnection({
        hasSocketInstance: true,
        hasMatchingToken: true,
        isSocketConnected: true,
        forceReconnect: true,
      }),
    ).toBe(false);
  });
});
