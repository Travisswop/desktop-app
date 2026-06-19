import { normalizePerpsEntryMarkers } from '@/components/feed/perpsEntryMarkers';

describe('normalizePerpsEntryMarkers', () => {
  it('collapses repeated open snapshots into one canonical marker', () => {
    const markers = normalizePerpsEntryMarkers(
      [
        {
          event: 'open',
          orderId: '473232762272',
          price: 1.9406,
          sizeCoins: 76,
          timestamp: '2026-06-18T18:52:38.528Z',
        },
        {
          event: 'open',
          orderId: '473232762272',
          price: 1.9407,
          sizeCoins: 76,
          timestamp: '2026-06-19T02:05:42.104Z',
        },
        {
          event: 'open',
          orderId: '473232762272',
          price: 1.9407,
          sizeCoins: 76,
          timestamp: '2026-06-19T02:07:13.013Z',
        },
      ],
      {
        entryPrice: 1.9407,
        markPrice: 1.96,
        sizeCoins: 76,
        notionalUsd: 147.49,
        openedAt: '2026-06-18T18:52:38.528Z',
        updatedAt: '2026-06-19T02:09:33.944Z',
      },
      '2026-06-18T18:52:38.528Z',
    );

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      event: 'open',
      orderId: '473232762272',
      price: 1.9407,
      sizeCoins: 76,
      notionalUsd: 147.49,
      timestamp: '2026-06-18T18:52:38.528Z',
    });
  });

  it('does not render ambiguous add rows as extra chart avatars', () => {
    const markers = normalizePerpsEntryMarkers(
      [
        {
          event: 'open',
          orderId: '473571771439',
          price: 79.153,
          sizeCoins: 4.66,
          timestamp: '2026-06-19T04:32:40.507Z',
        },
        {
          event: 'add',
          orderId: '473571771439',
          price: 79.247,
          sizeCoins: 4.66,
          timestamp: '2026-06-19T04:32:40.302Z',
        },
      ],
      {
        entryPrice: 79.247,
        markPrice: 78.67,
        sizeCoins: 4.66,
        notionalUsd: 369.29,
        openedAt: '2026-06-19T04:32:40.302Z',
      },
      '2026-06-19T04:32:40.302Z',
    );

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      event: 'open',
      orderId: '473571771439',
      price: 79.247,
      sizeCoins: 4.66,
      timestamp: '2026-06-19T04:32:40.302Z',
    });
  });

  it('builds one entry marker from card content when entries are missing', () => {
    const markers = normalizePerpsEntryMarkers(
      undefined,
      {
        entryPrice: 75.15,
        markPrice: 76.3,
        sizeCoins: 7.487,
        openedAt: '2026-06-18T21:11:04.000Z',
      },
      '2026-06-18T21:11:04.000Z',
    );

    expect(markers).toEqual([
      {
        event: 'open',
        price: 75.15,
        sizeCoins: 7.487,
        notionalUsd: 0,
        timestamp: '2026-06-18T21:11:04.000Z',
      },
    ]);
  });
});
