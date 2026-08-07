import { buildGoldmanVaultBuckets } from '@/lib/chat/ticketFormat';
import type { PolymarketPosition } from '@/hooks/polymarket/useUserPositions';

function position(
  overrides: Partial<PolymarketPosition> = {}
): PolymarketPosition {
  return {
    proxyWallet: '0xDeposit',
    asset: 'yes-token',
    conditionId: 'condition-1',
    size: 10,
    avgPrice: 0.5,
    initialValue: 5,
    currentValue: 6,
    cashPnl: 1,
    percentPnl: 20,
    totalBought: 5,
    realizedPnl: 0,
    percentRealizedPnl: 0,
    curPrice: 0.6,
    redeemable: false,
    mergeable: false,
    title: 'Market',
    slug: 'market',
    icon: '',
    eventSlug: 'event',
    outcome: 'YES',
    outcomeIndex: 0,
    oppositeOutcome: 'NO',
    oppositeAsset: 'no-token',
    endDate: '2026-12-31T00:00:00Z',
    negativeRisk: false,
    ...overrides,
  } as PolymarketPosition;
}

describe('buildGoldmanVaultBuckets', () => {
  // The vault holds $10 of pUSD and its Polymarket deposit wallet holds $5.
  // The on-chain sweep reads both ($15); the token list + server read see the
  // same $15 from the other direction.
  const overlapping = {
    walletTokensUsd: 40,
    vaultPusdUsd: 10,
    idlePusdAcrossWalletsUsd: 15,
    depositWalletPusdUsd: 5,
    positions: [],
    perpsAccountValueUsd: 20,
  };

  it('counts overlapping collateral reads once, not twice', () => {
    const buckets = buildGoldmanVaultBuckets(overlapping);

    // Summing the two measurements produced $30 of collateral from $15.
    expect(buckets.predictionsUsd).toBe(15);
    // pUSD is predictions collateral, so it leaves the wallet bucket.
    expect(buckets.walletUsd).toBe(30);
    expect(buckets.perpsUsd).toBe(20);
    expect(buckets.totalUsd).toBe(65);
  });

  it('falls back to the token + server read while the chain sweep is loading', () => {
    const buckets = buildGoldmanVaultBuckets({
      ...overlapping,
      idlePusdAcrossWalletsUsd: 0,
    });

    expect(buckets.predictionsUsd).toBe(15);
  });

  it('falls back to the chain sweep when the token list omits pUSD', () => {
    const buckets = buildGoldmanVaultBuckets({
      ...overlapping,
      vaultPusdUsd: 0,
      depositWalletPusdUsd: 0,
    });

    expect(buckets.predictionsUsd).toBe(15);
    // Nothing was subtracted from the wallet bucket, because nothing pUSD-shaped
    // was in the token list to begin with.
    expect(buckets.walletUsd).toBe(40);
  });

  it('counts open bets and settled-but-unclaimed winnings, but not dust', () => {
    const buckets = buildGoldmanVaultBuckets({
      ...overlapping,
      positions: [
        position({ currentValue: 6 }),
        position({ conditionId: 'condition-2', currentValue: 4, redeemable: true }),
        position({ conditionId: 'condition-3', currentValue: 0, size: 0 }),
      ],
    });

    expect(buckets.predictionsUsd).toBe(25);
  });

  it('never lets a negative wallet bucket appear', () => {
    const buckets = buildGoldmanVaultBuckets({
      ...overlapping,
      walletTokensUsd: 4,
      vaultPusdUsd: 10,
    });

    expect(buckets.walletUsd).toBe(0);
  });
});
