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

export function isOpenOrClaimablePosition(
  position: PolymarketPosition,
  dustThreshold: number,
) {
  if (position.redeemable) {
    return hasRedeemablePayout(position);
  }

  return isVisiblePortfolioPosition(position, dustThreshold);
}

/** The dollar value a position card displays: payout when claimable, mark-to-market otherwise. */
export function getPositionCardValue(position: PolymarketPosition) {
  return position.redeemable
    ? getRedeemablePayout(position)
    : Math.max(0, finiteNumber(position.currentValue));
}

/** The market has finished: closed flag set or its end date has passed. */
function isMarketFinished(position: PolymarketPosition) {
  if (position.marketClosed) return true;
  const endMs = Date.parse(position.endDate || '');
  return Number.isFinite(endMs) && endMs <= Date.now();
}

/**
 * True when a position card would render with a $0.00 value — nothing to
 * sell, nothing to claim. These are excluded from card grids (dashboard
 * preview, portfolio modal, positions list) but still appear in the My bets
 * table as settled/final rows. A position that later resolves with a payout
 * comes back as redeemable and shows again.
 *
 * A live (unfinished, non-redeemable) position is never worthless here: a
 * transient curPrice=0 from the positions API must not hide a position the
 * user may still want to sell.
 */
export function isWorthlessPositionCard(
  position: PolymarketPosition,
  dustThreshold: number,
) {
  if (getPositionCardValue(position) >= dustThreshold) return false;
  return position.redeemable || isMarketFinished(position);
}

function redeemErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).toLowerCase();
}

/**
 * True only when the redeem failed because the position tokens are already
 * gone (redeemed elsewhere) or the outcome pays nothing. These are the ONLY
 * precheck failures that are safe to present as "already redeemed" — other
 * PRECHECK_SKIPPED reasons (unresolved market, stale nonce) mean the payout
 * is still owed and the user must retry.
 */
export function isZeroPositionBalanceRedeemError(error: unknown) {
  const message = redeemErrorMessage(error);
  return (
    message.includes('zero position balance') ||
    message.includes('outcome has no payout')
  );
}

/** The market's oracle has not finalized on-chain yet — payout still owed. */
export function isMarketUnresolvedRedeemError(error: unknown) {
  return redeemErrorMessage(error).includes('market is not resolved');
}

/** The Safe nonce moved between signing and submit — safe to retry. */
export function isStaleNonceRedeemError(error: unknown) {
  return redeemErrorMessage(error).includes('stale safe nonce');
}
