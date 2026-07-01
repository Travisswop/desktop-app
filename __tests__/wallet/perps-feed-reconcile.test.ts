const mockTriggerFeedRefetch = jest.fn();

jest.mock('@/zustandStore/modalstore', () => ({
  useModalStore: {
    getState: () => ({
      triggerFeedRefetch: mockTriggerFeedRefetch,
    }),
  },
}));

import { reconcilePerpsPositionFeed } from '@/lib/perps/perpsFeed';

describe('reconcilePerpsPositionFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
  });

  it('passes liquidation snapshots through to the reconcile route', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: { updatedCount: 1 } }),
    })) as jest.Mock;

    await reconcilePerpsPositionFeed({
      token: 'token',
      userId: 'user-1',
      smartsiteId: 'site-1',
      masterAddress: '0xabc',
      activePositionKeys: [],
      liquidationsByCoin: {
        ETH: {
          coin: 'ETH',
          px: 1675,
          markPx: 1676,
          closedPnl: -22.1,
          feeUsd: 0.44,
          orderId: '555',
          timestamp: '2026-06-15T10:05:00.000Z',
        },
      },
      closedFillsByCoin: {},
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v2/feed/perps-position/reconcile',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"liquidationsByCoin":{"ETH"'),
      }),
    );
    expect(mockTriggerFeedRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when reconciliation reports zero updates', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: { updatedCount: 0 } }),
    })) as jest.Mock;

    await reconcilePerpsPositionFeed({
      token: 'token',
      userId: 'user-1',
      smartsiteId: 'site-1',
      masterAddress: '0xabc',
      activePositionKeys: [],
      liquidationsByCoin: {},
      closedFillsByCoin: {},
    });

    expect(mockTriggerFeedRefetch).not.toHaveBeenCalled();
  });
});
