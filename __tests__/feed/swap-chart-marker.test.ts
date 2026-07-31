// d3-shape ships ESM that jest does not transform; the marker math under test
// does not touch it.
jest.mock('d3-shape', () => ({
  line: () => ({ curve: () => () => '' }),
  curveLinear: 'curveLinear',
  curveMonotoneX: 'curveMonotoneX',
}));

import { swapMarkerX } from '@/components/feed/SwapTransactionShowGraph';

// The avatar marks where on the price line the swap happened. It used to be
// placed by assuming the x-axis spanned exactly [now - period, now], but the
// series routinely covers less than that — thin tokens have few trades, new
// listings have no old history — so the marker drifted off the line entirely.

const WIDTH = 300;
const HOUR = 60 * 60 * 1000;

/** Evenly spaced timestamps ending `now`, oldest first. */
const series = (count: number, stepMs: number, now = Date.now()) =>
  Array.from({ length: count }, (_, i) => now - (count - 1 - i) * stepMs);

describe('swapMarkerX', () => {
  it('places the marker proportionally along the plotted range', () => {
    const now = Date.now();
    const timestamps = series(5, HOUR, now); // spans 4 hours
    const midpoint = new Date(now - 2 * HOUR).toISOString();

    expect(swapMarkerX(timestamps, midpoint, WIDTH)).toBeCloseTo(WIDTH / 2, 5);
  });

  it('anchors to the data range, not the nominal period window', () => {
    // A "1Y" chart whose token only has a week of history: a swap made 3 days
    // ago sits mid-line, not at 99% of the way across.
    const now = Date.now();
    const timestamps = series(8, 24 * HOUR, now); // 7 days of data
    const threeDaysAgo = new Date(now - 3 * 24 * HOUR).toISOString();

    const x = swapMarkerX(timestamps, threeDaysAgo, WIDTH);
    expect(x).toBeCloseTo((4 / 7) * WIDTH, 5);
    expect(x).toBeLessThan(WIDTH * 0.9);
  });

  it('interpolates across unevenly spaced samples', () => {
    // Two 1h gaps then one 3h gap: a swap halfway through the wide gap must
    // land halfway across that segment, not halfway across the chart.
    const now = Date.now();
    const timestamps = [
      now - 5 * HOUR,
      now - 4 * HOUR,
      now - 3 * HOUR,
      now,
    ];
    const inWideGap = new Date(now - 1.5 * HOUR).toISOString();

    // Segment index 2 → 3, halfway → position 2.5 of 3 steps.
    expect(swapMarkerX(timestamps, inWideGap, WIDTH)).toBeCloseTo(
      (2.5 / 3) * WIDTH,
      5,
    );
  });

  it('returns the edges for swaps at the range boundaries', () => {
    const now = Date.now();
    const timestamps = series(4, HOUR, now);

    expect(
      swapMarkerX(timestamps, new Date(timestamps[0]).toISOString(), WIDTH),
    ).toBe(0);
    expect(
      swapMarkerX(timestamps, new Date(now).toISOString(), WIDTH),
    ).toBeCloseTo(WIDTH, 5);
  });

  it('hides the marker when the swap predates the plotted history', () => {
    const now = Date.now();
    const timestamps = series(5, HOUR, now);
    const lastYear = new Date(now - 400 * 24 * HOUR).toISOString();

    expect(swapMarkerX(timestamps, lastYear, WIDTH)).toBeNull();
  });

  it('hides the marker when the swap is after the last sample', () => {
    const now = Date.now();
    const timestamps = series(5, HOUR, now);
    const future = new Date(now + 5 * HOUR).toISOString();

    expect(swapMarkerX(timestamps, future, WIDTH)).toBeNull();
  });

  it('returns null for unusable input rather than NaN pixels', () => {
    const timestamps = series(5, HOUR);
    const at = new Date(timestamps[2]).toISOString();

    expect(swapMarkerX([], at, WIDTH)).toBeNull();
    expect(swapMarkerX([1], at, WIDTH)).toBeNull();
    expect(swapMarkerX(timestamps, at, 0)).toBeNull();
    expect(swapMarkerX(timestamps, null, WIDTH)).toBeNull();
    expect(swapMarkerX(timestamps, 'not-a-date', WIDTH)).toBeNull();
    // A flat series (every sample the same instant) has no range to map onto.
    expect(swapMarkerX([500, 500, 500], at, WIDTH)).toBeNull();
  });
});
