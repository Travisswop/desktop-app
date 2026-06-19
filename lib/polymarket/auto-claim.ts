export type AutoClaimPosition = {
  asset: string;
};

export type AutoClaimSelectionParams<T extends AutoClaimPosition> = {
  enabled: boolean;
  canRedeem: boolean;
  busy: boolean;
  positions: T[];
  attemptedAssets: ReadonlySet<string>;
  pendingAssets: ReadonlySet<string>;
  manualRequiredAssets?: ReadonlySet<string>;
};

export function selectNextAutoClaimPosition<T extends AutoClaimPosition>({
  enabled,
  canRedeem,
  busy,
  positions,
  attemptedAssets,
  pendingAssets,
  manualRequiredAssets,
}: AutoClaimSelectionParams<T>): T | null {
  if (!enabled || !canRedeem || busy) return null;

  return (
    positions.find(
      (position) =>
        !attemptedAssets.has(position.asset) &&
        !pendingAssets.has(position.asset) &&
        !manualRequiredAssets?.has(position.asset),
    ) ?? null
  );
}

export function pruneAssetSet(
  assets: ReadonlySet<string>,
  currentAssets: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();
  assets.forEach((asset) => {
    if (currentAssets.has(asset)) {
      next.add(asset);
    }
  });
  return next;
}
