// Target-vs-actual math for the Goldman console's allocation strip.
// Extracted from ChatArea so it is testable, and kept deliberately identical
// to the backend planner (services/groupAgents/goldmanRebalance.js): an unset
// percentage means that bucket is UNMANAGED — never a target of 0% — and the
// wallet bucket is always whatever the venues don't claim.

export type GoldmanAllocationRow = {
  key: 'wallet' | 'predictions' | 'perps';
  targetPct: number;
  currentPct: number;
  // Positive = under target (needs funding), negative = over target.
  driftUsd: number;
};

export function buildGoldmanAllocationRows({
  perpsTargetPct,
  predictionsTargetPct,
  walletUsd,
  predictionsUsd,
  perpsUsd,
}: {
  perpsTargetPct: number;
  predictionsTargetPct: number;
  walletUsd: number;
  predictionsUsd: number;
  perpsUsd: number;
}): GoldmanAllocationRow[] {
  const perps = Number(perpsTargetPct) || 0;
  const predictions = Number(predictionsTargetPct) || 0;
  if (!perps && !predictions) return [];

  const totalUsd = walletUsd + predictionsUsd + perpsUsd;
  if (!(totalUsd > 0)) return [];

  const walletTargetPct = Math.max(0, 100 - perps - predictions);

  return (
    [
      { key: 'wallet', usd: walletUsd, targetPct: walletTargetPct },
      { key: 'predictions', usd: predictionsUsd, targetPct: predictions },
      { key: 'perps', usd: perpsUsd, targetPct: perps },
    ] as Array<{
      key: GoldmanAllocationRow['key'];
      usd: number;
      targetPct: number;
    }>
  )
    // A bucket with no target and no money is noise; one holding money still
    // shows, so capital parked outside the plan stays visible.
    .filter((row) => row.targetPct > 0 || row.usd > 0)
    .map((row) => ({
      key: row.key,
      targetPct: row.targetPct,
      currentPct: Math.round((row.usd / totalUsd) * 100),
      driftUsd: (row.targetPct / 100) * totalUsd - row.usd,
    }));
}
