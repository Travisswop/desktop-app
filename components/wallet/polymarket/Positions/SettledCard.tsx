'use client';

import type { PolymarketPosition } from '@/hooks/polymarket';

interface SettledCardProps {
  position: PolymarketPosition;
  onRedeem: (position: PolymarketPosition) => void;
  isRedeeming: boolean;
  canRedeem: boolean;
}

export default function SettledCard({
  position,
  onRedeem,
  isRedeeming,
  canRedeem,
}: SettledCardProps) {
  // A position is a WINNER only when the market is settled (redeemable=true)
  // AND curPrice > 0 (winning outcome). redeemable=true alone just means the
  // market has resolved — losing positions also have redeemable=true with curPrice=0.
  const won = position.redeemable && position.curPrice > 0;
  const cost = position.initialValue || position.avgPrice * position.size;

  // Redemption value: only winners receive a payout.
  // Use currentValue when curPrice is active; fall back to size×$1 for settled winners
  // where the API has not yet zeroed the price (edge case). Losers get $0.
  const redeemValue = won
    ? position.curPrice > 0
      ? position.currentValue
      : position.size
    : 0;

  // P&L = redeemValue minus cost for winners, full loss (cashPnl) for losers.
  // Add any realizedPnl from shares sold before settlement in both cases.
  const pnl = won
    ? redeemValue - cost + position.realizedPnl
    : position.cashPnl + position.realizedPnl;

  const isBinaryOutcome =
    position.outcome === 'Yes' || position.outcome === 'No';
  const displayPick = isBinaryOutcome ? position.title : position.outcome;

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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">You picked</p>
          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
            {displayPick}
          </p>
        </div>

        {/* Won / Lost badge */}
        <span
          className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            won
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {won ? 'WON' : 'LOST'}
        </span>
      </div>

      {/* Stats + action */}
      <div className="border-t border-dashed border-gray-200 mx-4" />
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Cost */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-0.5">Invested</p>
          <p className="text-sm font-bold text-gray-900">${cost.toFixed(2)}</p>
        </div>

        {/* P&L */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-0.5">P&amp;L</p>
          <p
            className={`text-sm font-bold ${
              pnl >= 0 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
          </p>
        </div>

        {/* Redeem button — winners only */}
        {won && (
          <button
            onClick={() => onRedeem(position)}
            disabled={isRedeeming || !canRedeem}
            className="flex-shrink-0 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
          >
            {isRedeeming ? '...' : `Redeem $${redeemValue.toFixed(2)}`}
          </button>
        )}
      </div>
    </div>
  );
}
