import {
  getRedeemTypedData,
  submitRedeem,
} from '@/lib/polymarket/backend-session';

const abortingFetch = () =>
  jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal;

    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
  });

describe('Polymarket redeem client timeouts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = abortingFetch() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('rejects when redeem typed-data setup hangs', async () => {
    const promise = getRedeemTypedData(
      {
        safeAddress: '0x0000000000000000000000000000000000000001',
        eoaAddress: '0x0000000000000000000000000000000000000002',
        conditionId:
          '0x0000000000000000000000000000000000000000000000000000000000000003',
        outcomeIndex: 0,
        size: 1,
      },
      'token',
    );

    const expectation = expect(promise).rejects.toThrow(
      'Redeem setup timed out. Please check your bets and try again.',
    );
    await jest.advanceTimersByTimeAsync(30000);
    await expectation;
  });

  it('rejects when redeem confirmation hangs', async () => {
    const promise = submitRedeem(
      {
        safeAddress: '0x0000000000000000000000000000000000000001',
        eoaAddress: '0x0000000000000000000000000000000000000002',
        conditionId:
          '0x0000000000000000000000000000000000000000000000000000000000000003',
        outcomeIndex: 0,
        size: 1,
        signature: '0xsignature',
        nonce: '1',
      },
      'token',
    );

    const expectation = expect(promise).rejects.toThrow(
      'Redeem confirmation timed out. Refresh your bets before trying again.',
    );
    await jest.advanceTimersByTimeAsync(120000);
    await expectation;
  });
});
