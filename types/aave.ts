// Shapes returned by the Swop backend Aave endpoints (/api/v5/defi/aave/*)

export type AaveChain = 'ethereum' | 'polygon' | 'base' | 'arbitrum';

export interface AaveReserve {
  asset: string;
  symbol: string;
  name: string;
  decimals: number;
  supplyApr: number;
  supplyApy: number;
  variableBorrowApr: number;
  variableBorrowApy: number;
  ltv: number;
  liquidationThreshold: number;
  borrowingEnabled: boolean;
  priceUsd: number;
  aTokenAddress: string;
  variableDebtTokenAddress: string;
}

export interface AaveMarketsData {
  chain: AaveChain;
  chainId: number;
  poolAddress: string;
  reserves: AaveReserve[];
  updatedAt: string;
  degraded?: boolean;
  reason?: string;
}

export interface AavePosition {
  asset: string;
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  amountRaw: string;
  usdValue: number;
  supplyApy: number;
  variableBorrowApy: number;
}

export interface AaveAccountSummary {
  totalCollateralUsd: number;
  totalDebtUsd: number;
  availableBorrowsUsd: number;
  ltv: number;
  currentLiquidationThreshold: number;
  healthFactor: number | null;
}

export interface AavePositionsData {
  chain: AaveChain;
  chainId: number;
  poolAddress: string;
  address: string;
  account: AaveAccountSummary;
  supplies: AavePosition[];
  borrows: AavePosition[];
  updatedAt: string;
  degraded?: boolean;
  reason?: string;
}

export type AaveActionMode = 'supply' | 'borrow' | 'withdraw' | 'repay';
