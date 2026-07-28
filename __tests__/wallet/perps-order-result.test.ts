import {
  perpsOrderResultHasFill,
  perpsOrderResultOrderId,
} from '@/lib/perps/perpsFeed';

const responseWith = (...statuses: unknown[]) => ({
  status: 'ok',
  response: {
    type: 'order',
    data: { statuses },
  },
});

describe('Hyperliquid perps order results', () => {
  it('treats a marketable limit fill as an open position result', () => {
    const result = responseWith({
      filled: {
        totalSz: '0.1388',
        avgPx: '1869.4',
        oid: 504346366236,
      },
    });

    expect(perpsOrderResultHasFill(result)).toBe(true);
    expect(perpsOrderResultOrderId(result)).toBe('504346366236');
  });

  it('keeps a genuinely resting limit order pending', () => {
    const result = responseWith({ resting: { oid: 504346366237 } });

    expect(perpsOrderResultHasFill(result)).toBe(false);
    expect(perpsOrderResultOrderId(result)).toBe('504346366237');
  });

  it('detects a filled bracket entry among resting TP/SL orders', () => {
    const result = responseWith(
      { filled: { totalSz: '0.25', oid: 11 } },
      { resting: { oid: 12 } },
      { resting: { oid: 13 } },
    );

    expect(perpsOrderResultHasFill(result)).toBe(true);
    expect(perpsOrderResultOrderId(result)).toBe('11');
  });
});
