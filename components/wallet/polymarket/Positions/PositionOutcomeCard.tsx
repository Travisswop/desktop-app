'use client';

import type { PolymarketPosition } from '@/hooks/polymarket';

type OutcomeResult = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'UNKNOWN';

function formatCents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function inferResolvedPrice(
  position: PolymarketPosition,
): number | null {
  if (!Number.isFinite(position.curPrice)) return null;

  // Many feeds will report exactly 0 or 1 after settlement.
  if (position.curPrice <= 0.001) return 0;
  if (position.curPrice >= 0.999) return 1;

  // Fallback: infer from currentValue/size when it looks like a settled payout.
  if (position.size > 0 && Number.isFinite(position.currentValue)) {
    const implied = position.currentValue / position.size;
    if (implied <= 0.001) return 0;
    if (implied >= 0.999) return 1;
  }

  return null;
}

function computeAvgBuyPrice(
  position: PolymarketPosition,
): number | null {
  const totalSharesBought = position.totalBought;
  const totalCost = position.initialValue;
  if (
    Number.isFinite(totalSharesBought) &&
    totalSharesBought > 0 &&
    Number.isFinite(totalCost) &&
    totalCost > 0
  ) {
    return totalCost / totalSharesBought;
  }
  if (Number.isFinite(position.avgPrice) && position.avgPrice > 0)
    return position.avgPrice;
  return null;
}

function computeAvgSellPrice(
  position: PolymarketPosition,
  avgBuyPrice: number | null,
): number | null {
  if (!avgBuyPrice) return null;
  const soldShares = Math.max(
    0,
    (position.totalBought || 0) - (position.size || 0),
  );
  if (soldShares <= 0) return null;
  // Treat missing, NaN, or zero realizedPnl as unresolvable — zero is ambiguous
  // and a genuine break-even is exceedingly rare; prefer UNKNOWN over a false EVEN.
  if (!Number.isFinite(position.realizedPnl) || position.realizedPnl === 0) return null;

  // realizedPnl ≈ (avgSell - avgBuy) * soldShares
  return avgBuyPrice + position.realizedPnl / soldShares;
}

function resolveOutcomeResult(
  avgBuyPrice: number | null,
  referencePrice: number | null,
): OutcomeResult {
  if (!avgBuyPrice || referencePrice == null) return 'UNKNOWN';
  const eps = 1e-6;
  if (referencePrice > avgBuyPrice + eps) return 'WIN';
  if (referencePrice < avgBuyPrice - eps) return 'LOSS';
  return 'BREAKEVEN';
}

export default function PositionOutcomeCard({
  position,
  onRedeem,
  isRedeeming,
  canRedeem,
}: {
  position: PolymarketPosition;
  onRedeem?: (position: PolymarketPosition) => void;
  isRedeeming?: boolean;
  canRedeem?: boolean;
}) {
  const avgBuyPrice = computeAvgBuyPrice(position);
  const avgSellPrice = computeAvgSellPrice(position, avgBuyPrice);
  const resolvedPrice = inferResolvedPrice(position);

  const referencePrice = avgSellPrice ?? resolvedPrice;
  const referenceLabel =
    avgSellPrice != null
      ? 'Avg sell'
      : resolvedPrice != null
        ? 'Resolved'
        : null;

  const result = resolveOutcomeResult(avgBuyPrice, referencePrice);

  console.log('[PositionOutcomeCard]', {
    title: position.title,
    outcome: position.outcome,
    conditionId: position.conditionId,
    // raw fields from API
    totalBought: position.totalBought,
    size: position.size,
    initialValue: position.initialValue,
    avgPrice: position.avgPrice,
    realizedPnl: position.realizedPnl,
    curPrice: position.curPrice,
    currentValue: position.currentValue,
    redeemable: position.redeemable,
    // computed
    avgBuyPrice,
    avgSellPrice,
    resolvedPrice,
    referencePrice,
    referenceLabel,
    result,
  });

  const soldShares = Math.max(
    0,
    (position.totalBought || 0) - (position.size || 0),
  );
  const canShowRedeem =
    !!onRedeem &&
    !!canRedeem &&
    position.redeemable &&
    position.size > 0 &&
    // If we can't infer the resolved price, still allow redeem to avoid hiding funds.
    (resolvedPrice == null || resolvedPrice > 0);

  const badge =
    result === 'WIN'
      ? { text: 'WIN', cls: 'bg-green-100 text-green-700' }
      : result === 'LOSS'
        ? { text: 'LOSS', cls: 'bg-red-100 text-red-600' }
        : result === 'BREAKEVEN'
          ? { text: 'EVEN', cls: 'bg-gray-100 text-gray-600' }
          : { text: '—', cls: 'bg-gray-100 text-gray-500' };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        {position.icon ? (
          <img
            src={position.icon}
            alt=""
            className="w-9 h-9 rounded-lg flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-gray-200" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
            {position.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {position.outcome}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}
            >
              {badge.text}
            </span>
            {avgBuyPrice != null && (
              <span className="text-xs text-gray-600">
                Avg buy {formatCents(avgBuyPrice)}
              </span>
            )}
            {referencePrice != null && referenceLabel && (
              <span className="text-xs text-gray-600">
                {referenceLabel} {formatCents(referencePrice)}
              </span>
            )}
          </div>
        </div>

        {canShowRedeem && (
          <button
            onClick={() => onRedeem?.(position)}
            disabled={!!isRedeeming || !canRedeem}
            className="flex-shrink-0 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
            title="Redeem settled winnings"
          >
            {isRedeeming ? '...' : 'Redeem'}
          </button>
        )}
      </div>

      <div className="border-t border-dashed border-gray-200 mx-4" />

      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Bought</p>
          <p className="text-xs font-semibold text-gray-800">
            {Number(position.totalBought || 0).toFixed(2)} shares
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Sold</p>
          <p className="text-xs font-semibold text-gray-800">
            {Number(soldShares).toFixed(2)} shares
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Realized</p>
          <p
            className={`text-xs font-semibold ${position.realizedPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {position.realizedPnl >= 0 ? '+' : '-'}$
            {Math.abs(position.realizedPnl || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
