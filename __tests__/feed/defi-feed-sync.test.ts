const mockPublishCreatedFeedItem = jest.fn();
const mockTriggerFeedRefetch = jest.fn();

jest.mock('@/zustandStore/modalstore', () => ({
  useModalStore: {
    getState: () => ({
      publishCreatedFeedItem: mockPublishCreatedFeedItem,
      triggerFeedRefetch: mockTriggerFeedRefetch,
    }),
  },
}));

import { upsertAavePositionFeed } from '@/lib/defi/defiFeedSync';

const content = {
  positionKey: 'aave:ethereum:usdc',
  action: 'supply',
  chain: 'ethereum',
  tokenSymbol: 'USDC',
  amount: 10,
  amountUsd: 10,
};

describe('DeFi feed sync publishing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: { _id: 'feed-1', postType: 'defiPosition' } }),
    })) as jest.Mock;
  });

  it('publishes manual Aave feed posts by default', async () => {
    await upsertAavePositionFeed({
      token: 'token',
      userId: 'user-1',
      smartsiteId: 'site-1',
      content: content as any,
    });

    expect(mockPublishCreatedFeedItem).toHaveBeenCalledWith({
      _id: 'feed-1',
      postType: 'defiPosition',
    });
  });

  it('keeps background Aave backfill sync silent', async () => {
    await upsertAavePositionFeed({
      token: 'token',
      userId: 'user-1',
      smartsiteId: 'site-1',
      content: content as any,
      publishToFeed: false,
    });

    expect(mockPublishCreatedFeedItem).not.toHaveBeenCalled();
  });
});
