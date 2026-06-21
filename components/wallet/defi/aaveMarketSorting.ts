import type { AaveReserve } from '@/types/aave';

const sortableRate = (value: number) => (Number.isFinite(value) ? value : 0);

export function compareAaveReservesBySupplyApy(
  a: AaveReserve,
  b: AaveReserve,
) {
  const aSupplyApy = sortableRate(a.supplyApy);
  const bSupplyApy = sortableRate(b.supplyApy);

  if (aSupplyApy !== bSupplyApy) {
    return bSupplyApy - aSupplyApy;
  }

  const aBorrowApy = sortableRate(a.variableBorrowApy);
  const bBorrowApy = sortableRate(b.variableBorrowApy);

  if (aBorrowApy !== bBorrowApy) {
    return bBorrowApy - aBorrowApy;
  }

  return a.symbol.localeCompare(b.symbol) || a.asset.localeCompare(b.asset);
}

export function sortAaveReservesBySupplyApy(reserves: AaveReserve[]) {
  return [...reserves].sort(compareAaveReservesBySupplyApy);
}
