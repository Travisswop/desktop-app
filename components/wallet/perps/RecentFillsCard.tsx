'use client';

import { formatPrice } from '@/services/hyperliquid/types';
import type { PerpsFill } from './PositionsTable';

interface RecentFillsCardProps {
  fills: PerpsFill[];
  connected?: boolean;
}

/**
 * RecentFillsCard — the Fresh design's right-column feed of the account's most
 * recent fills. Buy rows tint emerald, sell rows tint red.
 */
export function RecentFillsCard({ fills, connected = false }: RecentFillsCardProps) {
  const recent = fills.slice(0, 8);

  return (
    <div className="bg-white border border-black/[0.06] rounded-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06]">
        <span className="text-[10px] font-bold tracking-[0.14em] text-gray-400 font-mono uppercase">
          Recent fills
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-gray-400 font-mono uppercase">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      {recent.length === 0 ? (
        <div className="flex items-center justify-center h-28 text-[12.5px] text-gray-400">
          No fills yet
        </div>
      ) : (
        <div className="divide-y divide-black/[0.03]">
          {recent.map((f, i) => {
            const isBuy = f.side === 'B';
            return (
              <div
                key={`${f.hash ?? f.oid ?? ''}-${f.time}-${i}`}
                className="flex items-center justify-between px-4 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono ${
                      isBuy
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-gray-900 leading-tight">
                      {f.coin}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                      {Math.abs(parseFloat(f.sz)).toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-[12px] tabular-nums text-gray-900">
                    ${formatPrice(f.px)}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono tabular-nums">
                    {timeAgo(f.time)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(ms: number): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
