import type { HLPosition, HLOpenOrder } from '@/services/hyperliquid/types';
import { __test } from '@/components/wallet/perps/PositionsTable';

function position(overrides: Partial<HLPosition> = {}): HLPosition {
  const base: HLPosition = {
    coin: 'BTC',
    szi: '0.25',
    entryPx: '100',
    positionValue: '25',
    unrealizedPnl: '0',
    returnOnEquity: '0',
    liquidationPx: '80',
    marginUsed: '2.5',
    leverage: { type: 'cross', value: 10 },
    maxTradeSzs: ['1', '1'],
    cumFunding: {
      allTime: '0',
      sinceChange: '0',
      sinceOpen: '0',
    },
  };

  return {
    ...base,
    ...overrides,
  } as HLPosition;
}

function order(overrides: Partial<HLOpenOrder> = {}): HLOpenOrder {
  return {
    coin: 'BTC',
    limitPx: '100',
    oid: 1,
    orderType: 'Limit',
    origSz: '0.25',
    reduceOnly: true,
    side: 'A',
    sz: '0.25',
    timestamp: 1,
    tif: 'Gtc',
    triggerCondition: '',
    triggerPx: '',
    ...overrides,
  };
}

describe('position TP/SL helpers', () => {
  test('finds existing reduce-only TP and SL orders for a long position', () => {
    const triggers = __test.getPositionTriggerOrders(
      position(),
      [
        order({
          oid: 101,
          orderType: 'Take Profit Market',
          triggerPx: '120',
          timestamp: 2,
        }),
        order({
          oid: 102,
          orderType: 'Stop Market',
          triggerPx: '90',
          timestamp: 3,
        }),
        order({
          oid: 103,
          reduceOnly: false,
          orderType: 'Take Profit Market',
          triggerPx: '130',
        }),
      ],
      100,
    );

    expect(triggers.map((item) => [item.kind, item.triggerPx, item.order.oid]))
      .toEqual([
        ['sl', 90, 102],
        ['tp', 120, 101],
      ]);
  });

  test('classifies short position trigger prices when the order label is generic', () => {
    const short = position({ szi: '-0.25' });

    expect(
      __test.classifyTriggerOrder(
        order({ side: 'B', orderType: 'Trigger Market', triggerPx: '80' }),
        short,
        100,
      ),
    ).toBe('tp');
    expect(
      __test.classifyTriggerOrder(
        order({ side: 'B', orderType: 'Trigger Market', triggerPx: '115' }),
        short,
        100,
      ),
    ).toBe('sl');
  });

  test('ignores orders that do not close the same position', () => {
    const spcx = position({ coin: 'SPCX', dex: 'testdex' });
    const candidates = [
      order({ coin: 'SPCX', dex: 'other', orderType: 'Stop Market', triggerPx: '90' }),
      order({ coin: 'SPCX', dex: 'testdex', side: 'B', orderType: 'Stop Market', triggerPx: '90' }),
      order({ coin: 'SPCX', dex: 'testdex', reduceOnly: false, orderType: 'Stop Market', triggerPx: '90' }),
    ];

    expect(__test.getPositionTriggerOrders(spcx, candidates, 100)).toEqual([]);
  });
});
