import type { PolymarketPosition } from '@/hooks/polymarket';

const MIN_DISPLAY_PAYOUT = 0.005;

function finiteNumber(value: number | undefined | null, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function getPositionCost(position: PolymarketPosition) {
  const initialValue = finiteNumber(position.initialValue);
  if (initialValue > 0) return initialValue;
  return Math.max(
    0,
    finiteNumber(position.avgPrice) * finiteNumber(position.size),
  );
}

export function getRedeemablePayout(position: PolymarketPosition) {
  if (!position.redeemable) return 0;

  const size = Math.max(0, finiteNumber(position.size));
  if (size <= 0) return 0;

  const currentValue = Math.max(0, finiteNumber(position.currentValue));
  const impliedFromPnl = Math.max(
    0,
    getPositionCost(position) + finiteNumber(position.cashPnl),
  );

  const payout = Math.min(size, Math.max(currentValue, impliedFromPnl));
  return payout >= MIN_DISPLAY_PAYOUT ? payout : 0;
}

export function hasRedeemablePayout(position: PolymarketPosition) {
  return getRedeemablePayout(position) > 0;
}

export function isVisiblePortfolioPosition(
  position: PolymarketPosition,
  dustThreshold: number,
) {
  const size = Math.max(0, finiteNumber(position.size));
  if (size < dustThreshold) return false;
  if (position.redeemable) return true;
  if (finiteNumber(position.currentValue) >= dustThreshold) return true;

  const endMs = Date.parse(position.endDate || '');
  return !Number.isFinite(endMs) || endMs > Date.now();
}

export function isZeroPositionBalanceRedeemError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('PRECHECK_SKIPPED') ||
    message.toLowerCase().includes('zero position balance')
  );
}
