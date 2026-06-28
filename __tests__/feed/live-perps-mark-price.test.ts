import {
  resolveLivePerpsMarkPriceState,
  type LivePerpsMarkPriceState,
} from '@/components/feed/useLivePerpsMarkPrice';

describe('resolveLivePerpsMarkPriceState', () => {
  const staleSnapshot: LivePerpsMarkPriceState = {
    lastUpdatedAt: 123,
    price: 4123.45,
    stale: false,
  };

  it('keeps the last good price and marks it stale on degraded fetches', () => {
    expect(
      resolveLivePerpsMarkPriceState(staleSnapshot, {
        degraded: true,
        price: null,
      }),
    ).toEqual({
      lastUpdatedAt: 123,
      price: 4123.45,
      stale: true,
    });
  });

  it('clears stale state when a fresh mark price arrives', () => {
    const next = resolveLivePerpsMarkPriceState(staleSnapshot, {
      degraded: false,
      price: 4200.12,
    });

    expect(next.price).toBe(4200.12);
    expect(next.stale).toBe(false);
    expect(typeof next.lastUpdatedAt).toBe('number');
  });

  it('resets to empty when a successful fetch has no usable mark price', () => {
    expect(
      resolveLivePerpsMarkPriceState(staleSnapshot, {
        degraded: false,
        price: null,
      }),
    ).toEqual({
      lastUpdatedAt: null,
      price: null,
      stale: false,
    });
  });
});
