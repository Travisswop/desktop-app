import {
  buildPerpsActiveLimitOrderSnapshot,
  buildPerpsDexByCoinMap,
  findPerpsTrackedPositionByIdentity,
  buildPerpsReconcileSnapshotKey,
  buildPerpsTerminalFeedHealthEvents,
  buildPerpsPositionKey,
  filterPerpsTerminalFeedHealthEvents,
  inferPerpsCloseFillsByCoin,
  inferPerpsLiquidationsByCoin,
  inferPerpsPositionRiskPrices,
  inferPerpsPositionOpenedFill,
  isPerpsEntryLimitOrder,
  qualifyPerpsPositionCoin,
} from '@/lib/perps/perpsFeed';

describe('perps feed timestamps', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the fill that crossed a long position open instead of discovery time', () => {
    const opened = inferPerpsPositionOpenedFill(
      { coin: 'ETH', szi: '1.29' },
      [
        {
          coin: 'ETH',
          side: 'B',
          sz: '0.4',
          startPosition: '1.0',
          px: '1720',
          time: Date.parse('2026-06-15T11:50:00Z'),
          oid: 222,
        },
        {
          coin: 'ETH',
          side: 'B',
          sz: '1.0',
          startPosition: '0',
          px: '1680.98',
          time: Date.parse('2026-06-14T14:30:00Z'),
          oid: 111,
        },
      ],
    );

    expect(opened).toEqual({
      timestamp: '2026-06-14T14:30:00.000Z',
      orderId: '111',
      price: 1680.98,
    });
  });

  it('uses the fill that crossed a short position open', () => {
    const opened = inferPerpsPositionOpenedFill(
      { coin: 'BTC', szi: '-0.25' },
      [
        {
          coin: 'BTC',
          side: 'A',
          sz: '0.1',
          startPosition: '-0.2',
          px: '105000',
          time: Date.parse('2026-06-15T10:00:00Z'),
          oid: 333,
        },
        {
          coin: 'BTC',
          side: 'A',
          sz: '0.2',
          startPosition: '0',
          px: '106250',
          time: Date.parse('2026-06-13T18:15:00Z'),
          oid: 222,
        },
      ],
    );

    expect(opened?.timestamp).toBe('2026-06-13T18:15:00.000Z');
    expect(opened?.orderId).toBe('222');
  });

  it('ignores unrelated coins and future client-clock fills', () => {
    const opened = inferPerpsPositionOpenedFill(
      { coin: 'ETH', szi: '1' },
      [
        {
          coin: 'BTC',
          side: 'B',
          sz: '1',
          startPosition: '0',
          time: Date.parse('2026-06-14T14:30:00Z'),
        },
        {
          coin: 'ETH',
          side: 'B',
          sz: '1',
          startPosition: '0',
          time: Date.parse('2026-06-15T12:10:01Z'),
        },
      ],
    );

    expect(opened).toBeNull();
  });

  it('qualifies builder DEX positions for stable feed identity', () => {
    expect(qualifyPerpsPositionCoin({ coin: 'SPCX', dex: 'xyz' })).toBe(
      'XYZ:SPCX',
    );
    expect(
      buildPerpsPositionKey({
        masterAddress: '0xabc',
        coin: 'SPCX',
        dex: 'xyz',
      }),
    ).toBe('hyperliquid:0xabc:XYZ:SPCX');
  });

  it('rebuilds builder dex memory from current state plus explicit fills only', () => {
    expect(
      buildPerpsDexByCoinMap({
        activeEntries: [],
        explicitFillEntries: [{ coin: 'SPCX' }],
      }),
    ).toEqual({});

    expect(
      buildPerpsDexByCoinMap({
        activeEntries: [],
        explicitFillEntries: [
          { coin: 'XYZ:SPCX' },
          { coin: 'SPCX' },
        ],
      }),
    ).toEqual({ SPCX: 'xyz' });
  });

  it('matches builder fills whether Hyperliquid returns raw or qualified coin', () => {
    const opened = inferPerpsPositionOpenedFill(
      { coin: 'SPCX', dex: 'xyz', szi: '-2.39' },
      [
        {
          coin: 'XYZ:SPCX',
          side: 'A',
          sz: '2.39',
          startPosition: '0',
          px: '198.99',
          time: Date.parse('2026-06-15T11:55:00Z'),
          oid: 444,
        },
      ],
    );

    expect(opened).toEqual({
      timestamp: '2026-06-15T11:55:00.000Z',
      orderId: '444',
      price: 198.99,
    });
  });

  it('captures terminal take-profit close fills by coin', () => {
    const closeFills = inferPerpsCloseFillsByCoin([
      {
        coin: 'ETH',
        side: 'A',
        sz: '0.3171',
        startPosition: '0.3171',
        px: '1735',
        closedPnl: '9.19',
        fee: '0.38',
        time: Date.parse('2026-06-15T11:45:00Z'),
        oid: 555,
      },
      {
        coin: 'ETH',
        side: 'A',
        sz: '0.1',
        startPosition: '0.3171',
        px: '1724',
        time: Date.parse('2026-06-15T11:30:00Z'),
        oid: 444,
      },
    ]);

    expect(closeFills.ETH).toEqual({
      coin: 'ETH',
      px: 1735,
      closedPnl: 9.19,
      feeUsd: 0.38,
      orderId: '555',
      timestamp: '2026-06-15T11:45:00.000Z',
    });
  });

  it('qualifies builder close fills when Hyperliquid drops the dex prefix', () => {
    const closeFills = inferPerpsCloseFillsByCoin(
      [
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '188.4',
          closedPnl: '22.1',
          fee: '0.12',
          time: Date.parse('2026-06-15T11:47:00Z'),
          oid: 777,
        },
      ],
      { SPCX: 'xyz' },
    );

    expect(closeFills['XYZ:SPCX']).toEqual({
      coin: 'XYZ:SPCX',
      dex: 'xyz',
      px: 188.4,
      closedPnl: 22.1,
      feeUsd: 0.12,
      orderId: '777',
      timestamp: '2026-06-15T11:47:00.000Z',
    });
  });

  it('captures terminal short closes from buy fills', () => {
    const closeFills = inferPerpsCloseFillsByCoin([
      {
        coin: 'BTC',
        side: 'B',
        sz: '0.2',
        startPosition: '-0.2',
        px: '104500',
        time: Date.parse('2026-06-15T10:15:00Z'),
      },
    ]);

    expect(closeFills.BTC?.px).toBe(104500);
  });

  it('matches raw builder terminal fills to the tracked position instead of the latest dex cache', () => {
    const closeFills = inferPerpsCloseFillsByCoin(
      [
        {
          coin: 'XYZ:SPCX',
          side: 'B',
          sz: '3.42',
          startPosition: '0',
          px: '180.25',
          time: Date.parse('2026-06-15T11:20:00Z'),
          oid: 111,
        },
        {
          coin: 'ABC:SPCX',
          side: 'B',
          sz: '1.11',
          startPosition: '0',
          px: '181.75',
          time: Date.parse('2026-06-15T11:25:00Z'),
          oid: 222,
        },
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '188.4',
          time: Date.parse('2026-06-15T11:47:00Z'),
          oid: 777,
        },
      ],
      { SPCX: 'abc' },
    );

    expect(closeFills['XYZ:SPCX']).toEqual({
      coin: 'XYZ:SPCX',
      dex: 'xyz',
      px: 188.4,
      orderId: '777',
      timestamp: '2026-06-15T11:47:00.000Z',
    });
    expect(closeFills['ABC:SPCX']).toBeUndefined();
  });

  it('qualifies builder liquidations when Hyperliquid emits raw symbols', () => {
    const liquidations = inferPerpsLiquidationsByCoin(
      [
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '167.5',
          closedPnl: '-12.5',
          fee: '0.41',
          time: Date.parse('2026-06-15T11:46:00Z'),
          oid: 556,
          liquidation: {
            markPx: '167.4',
          },
        },
      ],
      { SPCX: 'xyz' },
    );

    expect(liquidations['XYZ:SPCX']).toEqual({
      coin: 'XYZ:SPCX',
      dex: 'xyz',
      terminalReason: 'liquidation',
      px: 167.5,
      markPx: 167.4,
      closedPnl: -12.5,
      feeUsd: 0.41,
      orderId: '556',
      timestamp: '2026-06-15T11:46:00.000Z',
    });
  });

  it('uses tracked active positions to qualify a raw builder liquidation fill', () => {
    const liquidations = inferPerpsLiquidationsByCoin(
      [
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '167.5',
          time: Date.parse('2026-06-15T11:46:00Z'),
          oid: 556,
          liquidation: {
            markPx: '167.4',
          },
        },
      ],
      { SPCX: 'abc' },
      [
        { coin: 'SPCX', dex: 'abc', szi: '1.11' },
        { coin: 'SPCX', dex: 'xyz', szi: '3.42' },
      ],
    );

    expect(liquidations['XYZ:SPCX']).toMatchObject({
      coin: 'XYZ:SPCX',
      dex: 'xyz',
      terminalReason: 'liquidation',
    });
    expect(liquidations['ABC:SPCX']).toBeUndefined();
  });

  it('resolves same-symbol builder liquidation economics from the qualified position', () => {
    const positions = [
      {
        coin: 'SPCX',
        dex: 'abc',
        szi: '1.11',
        entryPx: '155',
        returnOnEquity: '0.18',
      },
      {
        coin: 'SPCX',
        dex: 'xyz',
        szi: '3.42',
        entryPx: '205',
        returnOnEquity: '-0.44',
      },
    ];

    const liquidations = inferPerpsLiquidationsByCoin(
      [
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '167.5',
          time: Date.parse('2026-06-15T11:46:00Z'),
          oid: 556,
          liquidation: {
            markPx: '167.4',
          },
        },
      ],
      { SPCX: 'abc' },
      positions,
    );

    const position = findPerpsTrackedPositionByIdentity(
      positions,
      liquidations['XYZ:SPCX']?.coin,
    );

    expect(position).toMatchObject({
      dex: 'xyz',
      entryPx: '205',
      szi: '3.42',
      returnOnEquity: '-0.44',
    });
  });

  it('drops ambiguous raw builder close fills instead of guessing the dex', () => {
    const closeFills = inferPerpsCloseFillsByCoin(
      [
        {
          coin: 'SPCX',
          side: 'A',
          sz: '3.42',
          startPosition: '3.42',
          px: '188.4',
          time: Date.parse('2026-06-15T11:47:00Z'),
          oid: 777,
        },
      ],
      { SPCX: 'abc' },
      [
        { coin: 'SPCX', dex: 'abc', szi: '3.42' },
        { coin: 'SPCX', dex: 'xyz', szi: '3.42' },
      ],
    );

    expect(closeFills).toEqual({});
  });

  it('changes the reconcile snapshot when a terminal close fill arrives later', () => {
    const beforeFill = buildPerpsReconcileSnapshotKey({
      masterAddress: '0xabc',
      priceMapState: 'mids-ready',
      observedDexes: [''],
      activePositionKeys: [],
      activeLimitOrders: [],
      closedFillsByCoin: {},
    });
    const afterFill = buildPerpsReconcileSnapshotKey({
      masterAddress: '0xabc',
      priceMapState: 'mids-ready',
      observedDexes: [''],
      activePositionKeys: [],
      activeLimitOrders: [],
      closedFillsByCoin: inferPerpsCloseFillsByCoin([
        {
          coin: 'ETH',
          side: 'A',
          sz: '0.3171',
          startPosition: '0.3171',
          px: '1735',
          closedPnl: '9.19',
          fee: '0.38',
          time: Date.parse('2026-06-15T11:45:00Z'),
          oid: 555,
        },
      ]),
    });

    expect(afterFill).not.toBe(beforeFill);
    expect(afterFill).toContain('close=ETH=555=2026-06-15T11:45:00.000Z');
  });

  it('changes the reconcile snapshot when a liquidation fill arrives later', () => {
    const beforeFill = buildPerpsReconcileSnapshotKey({
      masterAddress: '0xabc',
      priceMapState: 'mids-ready',
      observedDexes: [''],
      activePositionKeys: [],
      activeLimitOrders: [],
      liquidationsByCoin: {},
    });
    const afterFill = buildPerpsReconcileSnapshotKey({
      masterAddress: '0xabc',
      priceMapState: 'mids-ready',
      observedDexes: [''],
      activePositionKeys: [],
      activeLimitOrders: [],
      liquidationsByCoin: inferPerpsLiquidationsByCoin([
        {
          coin: 'ETH',
          side: 'A',
          sz: '0.3171',
          startPosition: '0.3171',
          px: '1675',
          closedPnl: '-12.5',
          fee: '0.41',
          time: Date.parse('2026-06-15T11:46:00Z'),
          oid: 556,
          liquidation: {
            markPx: '1674.5',
          },
        },
      ]),
    });

    expect(afterFill).not.toBe(beforeFill);
    expect(afterFill).toContain(
      'liquidation=ETH=556=2026-06-15T11:46:00.000Z=1675=1674.5',
    );
  });

  it('emits a feed-health event for an inactive builder position with a terminal fill', () => {
    const events = buildPerpsTerminalFeedHealthEvents({
      userId: 'user-1',
      smartsiteId: 'smartsite-1',
      masterAddress: '0xwallet',
      activePositionKeys: [],
      observedDexes: ['xyz'],
      closedFillsByCoin: inferPerpsCloseFillsByCoin(
        [
          {
            coin: 'SPCX',
            side: 'A',
            sz: '3.42',
            startPosition: '3.42',
            px: '188.4',
            time: Date.parse('2026-06-15T11:47:00Z'),
            oid: 777,
          },
        ],
        { SPCX: 'xyz' },
      ),
      updatedAt: '2026-06-15T11:48:00.000Z',
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: 'feed_card_accuracy_perps_terminal_mismatch',
        terminalEvent: 'close',
        positionKey: 'hyperliquid:0xwallet:XYZ:SPCX',
        coin: 'XYZ:SPCX',
        dex: 'xyz',
      }),
    ]);
  });

  it('logs feed-health events only for cards the reconcile call actually updated', () => {
    const filtered = filterPerpsTerminalFeedHealthEvents({
      events: [
        {
          type: 'feed_card_accuracy_perps_terminal_mismatch',
          provider: 'hyperliquid',
          terminalEvent: 'close',
          fingerprint: 'close:hyperliquid:0xwallet:XYZ:SPCX:777',
          masterAddress: '0xwallet',
          userId: 'user-1',
          smartsiteId: 'smartsite-1',
          positionKey: 'hyperliquid:0xwallet:XYZ:SPCX',
          coin: 'XYZ:SPCX',
          displayCoin: 'SPCX',
          dex: 'xyz',
          orderId: '777',
          fillTimestamp: '2026-06-15T11:47:00.000Z',
          updatedAt: '2026-06-15T11:48:00.000Z',
          observedDexes: ['xyz'],
        },
        {
          type: 'feed_card_accuracy_perps_terminal_mismatch',
          provider: 'hyperliquid',
          terminalEvent: 'close',
          fingerprint: 'close:hyperliquid:0xwallet:ABC:SPCX:888',
          masterAddress: '0xwallet',
          userId: 'user-1',
          smartsiteId: 'smartsite-1',
          positionKey: 'hyperliquid:0xwallet:ABC:SPCX',
          coin: 'ABC:SPCX',
          displayCoin: 'SPCX',
          dex: 'abc',
          orderId: '888',
          fillTimestamp: '2026-06-15T11:49:00.000Z',
          updatedAt: '2026-06-15T11:50:00.000Z',
          observedDexes: ['abc'],
        },
      ],
      updatedPosts: [
        {
          content: {
            positionKey: 'hyperliquid:0xwallet:XYZ:SPCX',
          },
        },
      ],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.positionKey).toBe('hyperliquid:0xwallet:XYZ:SPCX');
  });

  it('maps long reduce-only triggers to take-profit and stop-loss prices', () => {
    expect(
      inferPerpsPositionRiskPrices(
        { coin: 'ETH', szi: '0.3171', entryPx: '1706' },
        [
          {
            coin: 'ETH',
            reduceOnly: true,
            triggerPx: '1735',
            orderType: 'Take Profit Market',
          },
          {
            coin: 'ETH',
            reduceOnly: true,
            triggerPx: '1680',
            orderType: 'Stop Market',
          },
        ],
      ),
    ).toEqual({
      takeProfitPrice: 1735,
      stopLossPrice: 1680,
    });
  });

  it('maps short reduce-only triggers by price direction when labels are generic', () => {
    expect(
      inferPerpsPositionRiskPrices(
        { coin: 'BTC', szi: '-0.2', entryPx: '105000' },
        [
          { coin: 'BTC', reduceOnly: true, triggerPx: '103000' },
          { coin: 'BTC', reduceOnly: true, triggerPx: '106000' },
        ],
      ),
    ).toEqual({
      takeProfitPrice: 103000,
      stopLossPrice: 106000,
    });
  });

  it('identifies resting entry limits separately from TP/SL reduce-only orders', () => {
    expect(
      isPerpsEntryLimitOrder({
        coin: 'ETH',
        side: 'B',
        sz: '0.3171',
        limitPx: '1715',
        orderType: 'Limit',
        reduceOnly: false,
        timestamp: Date.parse('2026-06-15T11:40:00Z'),
      }),
    ).toBe(true);

    expect(
      isPerpsEntryLimitOrder({
        coin: 'ETH',
        side: 'A',
        sz: '0.3171',
        limitPx: '1735',
        triggerPx: '1735',
        orderType: 'Take Profit Market',
        reduceOnly: true,
      }),
    ).toBe(false);
  });

  it('builds an active pending-limit feed snapshot with inferred TP/SL', () => {
    const snapshot = buildPerpsActiveLimitOrderSnapshot({
      order: {
        coin: 'ETH',
        side: 'B',
        sz: '0.3171',
        limitPx: '1715',
        oid: 777,
        orderType: 'Limit',
        reduceOnly: false,
        timestamp: Date.parse('2026-06-15T11:40:00Z'),
      },
      userId: 'user-1',
      masterAddress: '0xabc',
      markPricesByCoin: { ETH: 1720 },
      openOrders: [
        {
          coin: 'ETH',
          side: 'B',
          sz: '0.3171',
          limitPx: '1715',
          oid: 777,
          orderType: 'Limit',
          reduceOnly: false,
        },
        {
          coin: 'ETH',
          reduceOnly: true,
          triggerPx: '1735',
          orderType: 'Take Profit Market',
        },
        {
          coin: 'ETH',
          reduceOnly: true,
          triggerPx: '1680',
          orderType: 'Stop Market',
        },
      ],
    });

    expect(snapshot).toEqual({
      positionKey: 'hyperliquid:0xabc:ETH',
      coin: 'ETH',
      dex: null,
      side: 'long',
      orderId: '777',
      limitPrice: 1715,
      markPrice: 1720,
      sizeCoins: 0.3171,
      notionalUsd: 543.8265,
      takeProfitPrice: 1735,
      stopLossPrice: 1680,
      limitPlacedAt: '2026-06-15T11:40:00.000Z',
      updatedAt: '2026-06-15T11:40:00.000Z',
    });
  });
});
