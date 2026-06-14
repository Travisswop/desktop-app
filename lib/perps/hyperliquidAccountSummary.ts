import type {
  HLMarginSummary,
  HLOpenOrder,
  HLPosition,
} from '@/services/hyperliquid/types';

export interface PerpsAccountSummary {
  /** All open positions (filtered out zero-size entries) */
  positions: HLPosition[];
  /** All open limit / trigger orders */
  openOrders: HLOpenOrder[];
  /** Total account value in USD */
  accountValue: string;
  /** Total position notional value */
  totalNtlPos: string;
  /** Unrealized PnL across all positions */
  unrealizedPnl: string;
  /** Total margin currently in use */
  marginUsed: string;
  /** Amount available to withdraw (not in margin) */
  withdrawable: string;
}

interface HyperliquidStateLike {
  assetPositions: Array<{ position: HLPosition }>;
  marginSummary: HLMarginSummary;
  crossMarginSummary?: HLMarginSummary;
  withdrawable: string;
}

const num = (value: string | undefined | null) =>
  Number.parseFloat(value ?? '0') || 0;

export function getActiveHyperliquidPositions(
  state: Pick<HyperliquidStateLike, 'assetPositions'>,
) {
  return state.assetPositions
    .filter((assetPosition) => num(assetPosition.position.szi) !== 0)
    .map((assetPosition) => assetPosition.position as unknown as HLPosition);
}

export function sumUnrealizedPnl(
  positions: Array<Pick<HLPosition, 'unrealizedPnl'>>,
) {
  return positions.reduce(
    (total, position) => total + num(position.unrealizedPnl),
    0,
  );
}

export function buildPerpsAccountSummary(
  state: HyperliquidStateLike,
  openOrders: HLOpenOrder[],
): PerpsAccountSummary {
  const positions = getActiveHyperliquidPositions(state);

  return {
    positions,
    openOrders,
    accountValue: state.marginSummary.accountValue,
    totalNtlPos: state.marginSummary.totalNtlPos,
    unrealizedPnl: sumUnrealizedPnl(positions).toFixed(2),
    marginUsed:
      state.marginSummary.totalMarginUsed ??
      state.crossMarginSummary?.totalMarginUsed ??
      '0',
    withdrawable: state.withdrawable,
  };
}
