import {
  pruneAssetSet,
  selectNextAutoClaimPosition,
} from '@/lib/polymarket/auto-claim';

describe('Polymarket auto-claim selection', () => {
  const positions = [{ asset: 'winner-1' }, { asset: 'winner-2' }];

  it('selects claimable wins from redeem readiness, without a CLOB client dependency', () => {
    expect(
      selectNextAutoClaimPosition({
        enabled: true,
        canRedeem: true,
        busy: false,
        positions,
        attemptedAssets: new Set(),
        pendingAssets: new Set(),
      }),
    ).toEqual({ asset: 'winner-1' });
  });

  it('does not auto-claim when redeem signing is not ready', () => {
    expect(
      selectNextAutoClaimPosition({
        enabled: true,
        canRedeem: false,
        busy: false,
        positions,
        attemptedAssets: new Set(),
        pendingAssets: new Set(),
      }),
    ).toBeNull();
  });

  it('skips assets that need manual confirmation after silent signing fails', () => {
    expect(
      selectNextAutoClaimPosition({
        enabled: true,
        canRedeem: true,
        busy: false,
        positions,
        attemptedAssets: new Set(),
        pendingAssets: new Set(),
        manualRequiredAssets: new Set(['winner-1']),
      }),
    ).toEqual({ asset: 'winner-2' });
  });

  it('prunes attempted/manual state when assets are no longer claimable', () => {
    expect(
      Array.from(
        pruneAssetSet(
          new Set(['winner-1', 'old-winner']),
          new Set(['winner-1']),
        ),
      ),
    ).toEqual(['winner-1']);
  });
});
