import { sortAaveReservesBySupplyApy } from '@/components/wallet/defi/aaveMarketSorting';
import type { AaveReserve } from '@/types/aave';

const reserve = (
  symbol: string,
  supplyApy: number,
  variableBorrowApy = 0,
): AaveReserve => ({
  asset: `0x${symbol.toLowerCase()}`,
  symbol,
  name: symbol,
  decimals: 18,
  supplyApr: supplyApy,
  supplyApy,
  variableBorrowApr: variableBorrowApy,
  variableBorrowApy,
  ltv: 0,
  liquidationThreshold: 0,
  borrowingEnabled: variableBorrowApy > 0,
  priceUsd: 1,
  aTokenAddress: `0xa${symbol.toLowerCase()}`,
  variableDebtTokenAddress: `0xd${symbol.toLowerCase()}`,
});

describe('Aave market sorting', () => {
  it('orders market rows by supply APY from highest to lowest', () => {
    const sorted = sortAaveReservesBySupplyApy([
      reserve('USDC', 0.0316),
      reserve('WETH', 0.0149),
      reserve('PYUSD', 0.052),
      reserve('WBTC', 0.0001),
    ]);

    expect(sorted.map((item) => item.symbol)).toEqual([
      'PYUSD',
      'USDC',
      'WETH',
      'WBTC',
    ]);
  });

  it('keeps blank supply rates after assets with supply yield', () => {
    const sorted = sortAaveReservesBySupplyApy([
      reserve('CBBTC', 0, 0.0029),
      reserve('GHO', 0, 0.038),
      reserve('USDT', 0.021),
    ]);

    expect(sorted.map((item) => item.symbol)).toEqual([
      'USDT',
      'GHO',
      'CBBTC',
    ]);
  });
});
