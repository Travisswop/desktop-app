import { buildGoldmanAllocationRows } from '@/components/chat/goldman/goldmanAllocation';

// The shape from the console screenshot that prompted this: $42.95 sitting
// 60/28/12 against 40/40/20 targets.
const DRIFTED = {
  perpsTargetPct: 40,
  predictionsTargetPct: 40,
  walletUsd: 25.72,
  predictionsUsd: 12.2,
  perpsUsd: 5.03,
};

function row(rows: ReturnType<typeof buildGoldmanAllocationRows>, key: string) {
  return rows.find((entry) => entry.key === key)!;
}

describe('buildGoldmanAllocationRows', () => {
  it('reports current vs target and the dollar drift per bucket', () => {
    const rows = buildGoldmanAllocationRows(DRIFTED);

    expect(row(rows, 'wallet').targetPct).toBe(20);
    expect(row(rows, 'wallet').currentPct).toBe(60);
    expect(row(rows, 'perps').driftUsd).toBeCloseTo(12.15, 2);
    expect(row(rows, 'predictions').driftUsd).toBeCloseTo(4.98, 2);
    // The wallet gives up exactly what the two venues take on.
    expect(row(rows, 'wallet').driftUsd).toBeCloseTo(-17.13, 2);
  });

  it('renders nothing until at least one percentage is set', () => {
    expect(
      buildGoldmanAllocationRows({
        ...DRIFTED,
        perpsTargetPct: 0,
        predictionsTargetPct: 0,
      })
    ).toEqual([]);
  });

  it('renders nothing for an empty vault', () => {
    expect(
      buildGoldmanAllocationRows({
        ...DRIFTED,
        walletUsd: 0,
        predictionsUsd: 0,
        perpsUsd: 0,
      })
    ).toEqual([]);
  });

  it('keeps showing a bucket that holds money but has no target', () => {
    const rows = buildGoldmanAllocationRows({
      ...DRIFTED,
      predictionsTargetPct: 0,
    });

    expect(row(rows, 'predictions').targetPct).toBe(0);
    expect(row(rows, 'wallet').targetPct).toBe(60);
  });
});
