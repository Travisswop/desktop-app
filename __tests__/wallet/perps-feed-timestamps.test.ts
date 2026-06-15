import { inferPerpsPositionOpenedFill } from '@/lib/perps/perpsFeed';

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
});
