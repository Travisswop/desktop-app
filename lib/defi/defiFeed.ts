import type {
  AaveActionMode,
  AaveChain,
  AavePosition,
  AaveReserve,
} from '@/types/aave';

export type DefiFeedAction = 'supply' | 'borrow';
export type DefiProjectionYears = 1 | 3 | 5 | 10;

export interface DefiBenchmarkRate {
  label: string;
  rate: number;
  compounding: 'daily' | 'monthly';
  source: string;
  asOf: string;
}

export interface DefiFeedContent {
  positionKey?: string;
  protocol?: string;
  chain?: AaveChain | string;
  action?: DefiFeedAction | AaveActionMode | string;
  status?: 'open' | 'closed' | string;
  txHash?: string;
  walletAddress?: string;
  asset?: string;
  symbol?: string;
  name?: string;
  amount?: number | string;
  amountUsd?: number | string;
  priceUsd?: number | string;
  supplyApy?: number | string;
  variableBorrowApy?: number | string;
  aaveRate?: number | string;
  benchmarkRate?: number | string;
  benchmarkLabel?: string;
  benchmarkSource?: string;
  benchmarkAsOf?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DefiProjectionPoint {
  index: number;
  years: number;
  aaveDelta: number;
  benchmarkDelta: number;
}

export interface DefiProjectionSummary {
  action: DefiFeedAction;
  principalUsd: number;
  aaveRate: number;
  benchmarkRate: number;
  aaveValue: number;
  benchmarkValue: number;
  aaveDelta: number;
  benchmarkDelta: number;
  difference: number;
  points: DefiProjectionPoint[];
}

export const DEFI_PROJECTION_YEARS: DefiProjectionYears[] = [
  1,
  3,
  5,
  10,
];

export const AVERAGE_CREDIT_CARD_APR: DefiBenchmarkRate = {
  label: 'Avg card APR',
  rate: 0.21,
  compounding: 'monthly',
  source: 'Federal Reserve G.19 / FRED TERMCBCCALLNS',
  asOf: 'Feb 2026',
};

export const AVERAGE_CHECKING_APY: DefiBenchmarkRate = {
  label: 'Avg checking APY',
  rate: 0.0007,
  compounding: 'monthly',
  source: 'FDIC National Rate: Interest Checking / FRED ICNDR',
  asOf: 'Jun 2026',
};

export function finiteNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeDefiAction(
  action: DefiFeedContent['action'],
): DefiFeedAction {
  const normalized = String(action || '').toLowerCase();
  return normalized === 'borrow' ? 'borrow' : 'supply';
}

export function getBenchmarkForDefiAction(
  action: DefiFeedAction,
): DefiBenchmarkRate {
  return action === 'borrow' ? AVERAGE_CREDIT_CARD_APR : AVERAGE_CHECKING_APY;
}

const normalizedAddress = (value?: string | null) =>
  String(value || '').trim().toLowerCase();

export function buildAavePositionKey({
  chain,
  action,
  asset,
  walletAddress,
}: {
  chain: AaveChain | string;
  action: DefiFeedAction;
  asset?: string | null;
  walletAddress?: string | null;
}) {
  const normalizedAsset = normalizedAddress(asset) || 'unknown-asset';
  const normalizedWallet = normalizedAddress(walletAddress) || 'unknown-wallet';
  return ['aave-v3', chain, action, normalizedWallet, normalizedAsset].join(':');
}

export function compoundDelta({
  principal,
  annualRate,
  years,
  periodsPerYear,
}: {
  principal: number;
  annualRate: number;
  years: number;
  periodsPerYear: number;
}) {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  return (
    principal *
    (Math.pow(1 + annualRate / periodsPerYear, periodsPerYear * years) - 1)
  );
}

export function effectiveAnnualDelta({
  principal,
  annualRate,
  years,
}: {
  principal: number;
  annualRate: number;
  years: number;
}) {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  return principal * (Math.pow(1 + annualRate, years) - 1);
}

export function buildDefiProjection({
  action,
  principalUsd,
  aaveRate,
  benchmarkRate,
  years,
  pointCount = 36,
}: {
  action: DefiFeedAction;
  principalUsd: number;
  aaveRate: number;
  benchmarkRate: number;
  years: DefiProjectionYears;
  pointCount?: number;
}): DefiProjectionSummary {
  const safePointCount = Math.max(2, Math.round(pointCount));
  const points = Array.from({ length: safePointCount }, (_, index) => {
    const progress = index / (safePointCount - 1);
    const pointYears = years * progress;
    return {
      index,
      years: pointYears,
      aaveDelta: effectiveAnnualDelta({
        principal: principalUsd,
        annualRate: aaveRate,
        years: pointYears,
      }),
      benchmarkDelta: compoundDelta({
        principal: principalUsd,
        annualRate: benchmarkRate,
        years: pointYears,
        periodsPerYear: 12,
      }),
    };
  });
  const lastPoint = points[points.length - 1];
  const difference =
    action === 'borrow'
      ? lastPoint.benchmarkDelta - lastPoint.aaveDelta
      : lastPoint.aaveDelta - lastPoint.benchmarkDelta;

  return {
    action,
    principalUsd,
    aaveRate,
    benchmarkRate,
    aaveValue: principalUsd + lastPoint.aaveDelta,
    benchmarkValue: principalUsd + lastPoint.benchmarkDelta,
    aaveDelta: lastPoint.aaveDelta,
    benchmarkDelta: lastPoint.benchmarkDelta,
    difference,
    points,
  };
}

export function buildAaveFeedContent({
  mode,
  chain,
  txHash,
  reserve,
  amount,
  amountUsd,
  walletAddress,
}: {
  mode: AaveActionMode;
  chain: AaveChain;
  txHash: string;
  reserve: AaveReserve;
  amount: number;
  amountUsd: number;
  walletAddress?: string | null;
}): DefiFeedContent | null {
  if (mode !== 'supply' && mode !== 'borrow') return null;
  const action = normalizeDefiAction(mode);
  const benchmark = getBenchmarkForDefiAction(action);
  const now = new Date().toISOString();

  return {
    positionKey: buildAavePositionKey({
      chain,
      action,
      asset: reserve.asset,
      walletAddress,
    }),
    protocol: 'Aave v3',
    chain,
    action,
    status: 'open',
    txHash,
    walletAddress: walletAddress || undefined,
    asset: reserve.asset,
    symbol: reserve.symbol,
    name: reserve.name,
    amount,
    amountUsd,
    priceUsd: reserve.priceUsd,
    supplyApy: reserve.supplyApy,
    variableBorrowApy: reserve.variableBorrowApy,
    aaveRate:
      action === 'borrow' ? reserve.variableBorrowApy : reserve.supplyApy,
    benchmarkRate: benchmark.rate,
    benchmarkLabel: benchmark.label,
    benchmarkSource: benchmark.source,
    benchmarkAsOf: benchmark.asOf,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildAavePositionFeedContent({
  action,
  chain,
  walletAddress,
  position,
  updatedAt,
}: {
  action: DefiFeedAction;
  chain: AaveChain;
  walletAddress?: string | null;
  position: AavePosition;
  updatedAt?: string;
}): DefiFeedContent | null {
  const amount = finiteNumber(position.amount);
  const amountUsd = finiteNumber(position.usdValue);
  if (amount <= 0 && amountUsd <= 0) return null;

  const benchmark = getBenchmarkForDefiAction(action);
  const now = updatedAt || new Date().toISOString();

  return {
    positionKey: buildAavePositionKey({
      chain,
      action,
      asset: position.asset,
      walletAddress,
    }),
    protocol: 'Aave v3',
    chain,
    action,
    status: 'open',
    walletAddress: walletAddress || undefined,
    asset: position.asset,
    symbol: position.symbol,
    name: position.name,
    amount,
    amountUsd,
    priceUsd: amount > 0 ? amountUsd / amount : undefined,
    supplyApy: position.supplyApy,
    variableBorrowApy: position.variableBorrowApy,
    aaveRate:
      action === 'borrow'
        ? position.variableBorrowApy
        : position.supplyApy,
    benchmarkRate: benchmark.rate,
    benchmarkLabel: benchmark.label,
    benchmarkSource: benchmark.source,
    benchmarkAsOf: benchmark.asOf,
    createdAt: now,
    updatedAt: now,
  };
}
