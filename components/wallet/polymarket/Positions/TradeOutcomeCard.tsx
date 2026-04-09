'use client';

type OutcomeResult = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'UNKNOWN';

function formatCents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function resolveOutcomeResult(
  avgBuyPrice: number | null,
  avgSellPrice: number | null,
): OutcomeResult {
  if (avgBuyPrice == null || avgSellPrice == null) return 'UNKNOWN';
  const eps = 1e-6;
  if (avgSellPrice > avgBuyPrice + eps) return 'WIN';
  if (avgSellPrice < avgBuyPrice - eps) return 'LOSS';
  return 'BREAKEVEN';
}

export type AggregatedTradeOutcome = {
  key: string;
  title: string;
  outcome: string;
  icon?: string | null;
  boughtShares: number;
  soldShares: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  realizedPnl: number;
};

export default function TradeOutcomeCard({
  item,
}: {
  item: AggregatedTradeOutcome;
}) {
  const result = resolveOutcomeResult(
    item.avgBuyPrice,
    item.avgSellPrice,
  );

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
        {item.icon ? (
          <img
            src={item.icon}
            alt=""
            className="w-9 h-9 rounded-lg flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-gray-200" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
            {item.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {item.outcome}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}
            >
              {badge.text}
            </span>
            {item.avgBuyPrice != null && (
              <span className="text-xs text-gray-600">
                Avg buy {formatCents(item.avgBuyPrice)}
              </span>
            )}
            {item.avgSellPrice != null && (
              <span className="text-xs text-gray-600">
                Avg sell {formatCents(item.avgSellPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200 mx-4" />

      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Bought</p>
          <p className="text-xs font-semibold text-gray-800">
            {Number(item.boughtShares || 0).toFixed(2)} shares
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Sold</p>
          <p className="text-xs font-semibold text-gray-800">
            {Number(item.soldShares || 0).toFixed(2)} shares
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Realized</p>
          <p
            className={`text-xs font-semibold ${item.realizedPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {item.realizedPnl >= 0 ? '+' : '-'}$
            {Math.abs(item.realizedPnl || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
