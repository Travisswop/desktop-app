import {
  createFeedHealthFingerprint,
  sanitizeFeedHealthPayload,
  type FeedHealthIssue,
} from '@/lib/feed/feedHealth';
import {
  buildPerpsCardHealthIssue,
  buildPerpsTerminalFillsByPositionKey,
  type PerpsFeedSourceSnapshot,
} from '@/lib/feed/perpsFeedHealth';

describe('feed health logging helpers', () => {
  it('redacts secrets before feed health payloads are logged', () => {
    expect(
      sanitizeFeedHealthPayload({
        accessToken: 'secret-token',
        nested: {
          authorization: 'Bearer private',
          reason: 'card stale',
        },
      }),
    ).toEqual({
      accessToken: '[redacted]',
      nested: {
        authorization: '[redacted]',
        reason: 'card stale',
      },
    });
  });

  it('builds stable fingerprints that ignore createdAt timestamps', () => {
    const baseIssue: FeedHealthIssue = {
      surface: 'perps',
      cardType: 'perpsPosition',
      issueType: 'perps_stale_open_after_terminal_fill',
      severity: 'high',
      title: 'Perps stale open',
      description: 'Position is closed in source of truth.',
      createdAt: '2026-06-20T10:00:00.000Z',
      fingerprintComponents: {
        provider: 'hyperliquid',
        positionKey: 'hyperliquid:0xabc:BTC',
      },
    };

    expect(createFeedHealthFingerprint(baseIssue)).toBe(
      createFeedHealthFingerprint({
        ...baseIssue,
        createdAt: '2026-06-20T11:00:00.000Z',
      }),
    );
  });

  it('extracts TP terminal fills into position-key evidence', () => {
    const terminalFills = buildPerpsTerminalFillsByPositionKey({
      userId: 'user-1',
      masterAddress: '0xMaster',
      fills: [
        {
          coin: 'BTC',
          side: 'A',
          sz: '0.25',
          px: '110000',
          startPosition: '0.25',
          time: 1781970000000,
          oid: 123,
          dir: 'Take Profit Market',
        },
      ],
    });

    expect(terminalFills['hyperliquid:0xmaster:btc']).toMatchObject({
      coin: 'BTC',
      side: 'A',
      price: 110000,
      sizeCoins: 0.25,
      startPosition: 0.25,
      endPosition: 0,
      orderId: '123',
      closeReason: 'take_profit',
    });
  });

  it('reports an open perps card missing from the live Hyperliquid snapshot', () => {
    const sourceSnapshot: PerpsFeedSourceSnapshot = {
      provider: 'hyperliquid',
      masterAddress: '0xMaster',
      activePositionKeys: [],
      terminalPositionKeys: ['hyperliquid:0xmaster:btc'],
      terminalFillsByPositionKey: {
        'hyperliquid:0xmaster:btc': {
          coin: 'BTC',
          side: 'A',
          price: 110000,
          sizeCoins: 0.25,
          startPosition: 0.25,
          endPosition: 0,
          orderId: '123',
          timestamp: '2026-06-20T15:00:00.000Z',
          closeReason: 'take_profit',
        },
      },
      receivedAt: '2026-06-20T15:00:30.000Z',
    };

    const issue = buildPerpsCardHealthIssue({
      feedId: 'feed-1',
      userId: 'user-1',
      smartsiteId: 'smartsite-1',
      sourceSnapshot,
      renderedStatus: 'open',
      nowMs: Date.parse('2026-06-20T15:01:00.000Z'),
      content: {
        provider: 'hyperliquid',
        positionKey: 'hyperliquid:0xMaster:BTC',
        masterAddress: '0xMaster',
        coin: 'BTC',
        side: 'long',
        status: 'open',
        event: 'open',
        updatedAt: '2026-06-20T14:00:00.000Z',
      },
    });

    expect(issue).toMatchObject({
      issueType: 'perps_stale_open_after_terminal_fill',
      severity: 'high',
      expectedState: {
        status: 'closed',
        event: 'take_profit',
        closedAt: '2026-06-20T15:00:00.000Z',
        exitPrice: 110000,
      },
      observedState: {
        renderedStatus: 'open',
        activePositionKeysIncludesCard: false,
      },
    });
  });

  it('waits through the stale-open grace period before reporting', () => {
    const issue = buildPerpsCardHealthIssue({
      sourceSnapshot: {
        provider: 'hyperliquid',
        masterAddress: '0xMaster',
        activePositionKeys: [],
        terminalPositionKeys: [],
        terminalFillsByPositionKey: {},
        receivedAt: '2026-06-20T15:00:30.000Z',
      },
      renderedStatus: 'open',
      nowMs: Date.parse('2026-06-20T15:00:10.000Z'),
      content: {
        provider: 'hyperliquid',
        positionKey: 'hyperliquid:0xMaster:BTC',
        masterAddress: '0xMaster',
        coin: 'BTC',
        status: 'open',
        event: 'open',
        updatedAt: '2026-06-20T15:00:00.000Z',
      },
    });

    expect(issue).toBeNull();
  });
});
