jest.mock('@/lib/browserStorage', () => {
  const sessionStore = new Map<string, string>();

  return {
    __sessionStore: sessionStore,
    safeSessionStorage: {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, value);
      },
      removeItem: (key: string) => {
        sessionStore.delete(key);
      },
    },
  };
});

import {
  consumeExplicitLogoutRedirect,
  markExplicitLogoutRedirect,
} from '@/lib/authSession';

const { __sessionStore } = jest.requireMock('@/lib/browserStorage') as {
  __sessionStore: Map<string, string>;
};

describe('auth session helpers', () => {
  beforeEach(() => {
    __sessionStore.clear();
    jest.restoreAllMocks();
  });

  it('consumes an explicit logout marker once', () => {
    markExplicitLogoutRedirect();

    expect(consumeExplicitLogoutRedirect()).toBe(true);
    expect(consumeExplicitLogoutRedirect()).toBe(false);
  });

  it('ignores expired explicit logout markers', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    markExplicitLogoutRedirect();

    jest.spyOn(Date, 'now').mockReturnValue(1_000_000 + 121_000);

    expect(consumeExplicitLogoutRedirect()).toBe(false);
  });
});
