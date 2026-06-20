import {
  buildPerpsPositionKey,
  inferPerpsCloseFillsByCoin,
  inferPerpsPositionRiskPrices,
  inferPerpsPositionOpenedFill,
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
});
