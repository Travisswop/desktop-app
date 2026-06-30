import {
  normalizePerpsCoin,
  startLivePerpsMarkPricePolling,
} from '@/components/feed/useLivePerpsMarkPrice';

function flushMicrotasks() {
  return Promise.resolve().then(() => undefined);
}

describe('startLivePerpsMarkPricePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not start a new poll while the previous request is still in flight', async () => {
    const normalized = normalizePerpsCoin('BTC');
    expect(normalized).not.toBeNull();

    let resolveFetch:
      | ((value: { degraded: boolean; price: number | null }) => void)
      | null = null;
    const fetchPrice = jest.fn(
      () =>
        new Promise<{ degraded: boolean; price: number | null }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onResult = jest.fn();

    const poller = startLivePerpsMarkPricePolling(normalized!, onResult, {
      fetchPrice,
      intervalMs: 15_000,
    });

    expect(fetchPrice).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(45_000);
    await flushMicrotasks();

    expect(fetchPrice).toHaveBeenCalledTimes(1);

    resolveFetch?.({ degraded: false, price: 123.45 });
    await flushMicrotasks();

    expect(onResult).toHaveBeenCalledWith({ degraded: false, price: 123.45 });

    jest.advanceTimersByTime(15_000);
    await flushMicrotasks();

    expect(fetchPrice).toHaveBeenCalledTimes(2);

    poller.stop();
  });

  it('aborts the in-flight request on stop and ignores late resolutions', async () => {
    const normalized = normalizePerpsCoin('ETH');
    expect(normalized).not.toBeNull();

    let resolveFetch:
      | ((value: { degraded: boolean; price: number | null }) => void)
      | null = null;
    let capturedSignal: AbortSignal | undefined;
    const fetchPrice = jest.fn(
      (_nextNormalized, signal?: AbortSignal) =>
        new Promise<{ degraded: boolean; price: number | null }>((resolve) => {
          capturedSignal = signal;
          resolveFetch = resolve;
        }),
    );
    const onResult = jest.fn();

    const poller = startLivePerpsMarkPricePolling(normalized!, onResult, {
      fetchPrice,
      intervalMs: 15_000,
    });

    expect(fetchPrice).toHaveBeenCalledTimes(1);
    expect(capturedSignal?.aborted).toBe(false);

    poller.stop();

    expect(capturedSignal?.aborted).toBe(true);

    resolveFetch?.({ degraded: false, price: 99 });
    await flushMicrotasks();

    expect(onResult).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30_000);
    await flushMicrotasks();

    expect(fetchPrice).toHaveBeenCalledTimes(1);
  });
});
