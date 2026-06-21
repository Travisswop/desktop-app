import type { AaveReserve } from '@/types/aave';

export type AaveSupplyApySortDirection = 'asc' | 'desc';

const MIN_SORTABLE_SUPPLY_APY = 0.00005;

const sortableRate = (value: number) => (Number.isFinite(value) ? value : 0);

export function compareAaveReservesBySupplyApy(
  a: AaveReserve,
  b: AaveReserve,
  direction: AaveSupplyApySortDirection = 'desc',
) {
  const aSupplyApy = sortableRate(a.supplyApy);
  const bSupplyApy = sortableRate(b.supplyApy);
  const aHasSupplyApy = aSupplyApy >= MIN_SORTABLE_SUPPLY_APY;
  const bHasSupplyApy = bSupplyApy >= MIN_SORTABLE_SUPPLY_APY;

  if (aHasSupplyApy !== bHasSupplyApy) {
    return aHasSupplyApy ? -1 : 1;
  }

  if (aSupplyApy !== bSupplyApy) {
    return direction === 'desc'
      ? bSupplyApy - aSupplyApy
      : aSupplyApy - bSupplyApy;
  }

  const aBorrowApy = sortableRate(a.variableBorrowApy);
  const bBorrowApy = sortableRate(b.variableBorrowApy);

  if (aBorrowApy !== bBorrowApy) {
    return bBorrowApy - aBorrowApy;
  }

  return a.symbol.localeCompare(b.symbol) || a.asset.localeCompare(b.asset);
}

export function sortAaveReservesBySupplyApy(
  reserves: AaveReserve[],
  direction: AaveSupplyApySortDirection = 'desc',
) {
  return [...reserves].sort((a, b) =>
    compareAaveReservesBySupplyApy(a, b, direction),
  );
}
