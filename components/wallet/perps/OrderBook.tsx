'use client';

import { useMemo } from 'react';
import type { HLOrderBook, HLOrderBookLevel } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface OrderBookProps {
  book: HLOrderBook | null;
  coin: string | null;
  connected: boolean;
  /** Highlight a price level when the user hovers the order form */
  highlightPrice?: string;
}

const DISPLAY_LEVELS = 6;

/**
 * OrderBook — live bid/ask depth styled for the bento dashboard. Asks render
 * top, spread divider in the middle, bids render bottom. Each row paints a
 * coloured depth bar proportional to the level's relative size in view.
 */
export function OrderBook({ book, coin, connected, highlightPrice }: OrderBookProps) {
  const { asks, bids, spread, spreadPct } = useMemo(() => {
    if (!book) return { asks: [], bids: [], spread: null, spreadPct: null };

    const bids = book.levels[0].slice(0, DISPLAY_LEVELS);
    const asks = book.levels[1].slice(0, DISPLAY_LEVELS);

    const sortedBids = [...bids].sort((a, b) => parseFloat(b.px) - parseFloat(a.px));
    const sortedAsks = [...asks].sort((a, b) => parseFloat(a.px) - parseFloat(b.px));

    const bestBid = sortedBids[0] ? parseFloat(sortedBids[0].px) : 0;
    const bestAsk = sortedAsks[0] ? parseFloat(sortedAsks[0].px) : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : null;
    const spreadPct =
      spread && bestAsk > 0 ? ((spread / bestAsk) * 100).toFixed(3) : null;

    return { asks: sortedAsks, bids: sortedBids, spread, spreadPct };
  }, [book]);

  const maxSz = useMemo(() => {
    const allSizes = [...asks, ...bids].map((l) => parseFloat(l.sz));
    return allSizes.length > 0 ? Math.max(...allSizes) : 1;
  }, [asks, bids]);

  if (!coin) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 p-6">
        Select a market to view the order book
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-black/[0.06] flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-tight text-gray-900">
          Order Book
        </span>
        <LiveDot connected={connected} />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-2.5 py-1.5 text-[10px] font-bold text-gray-500 font-mono tracking-wider">
        <span>PRICE</span>
        <span className="text-right">SIZE</span>
        <span className="text-right">TOTAL</span>
      </div>

      {!book ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Asks */}
          <div className="flex-1 px-1.5 flex flex-col justify-end overflow-hidden">
            {[...asks].reverse().map((level, i) => (
              <Row
                key={`a-${i}`}
                level={level}
                side="ask"
                maxSz={maxSz}
                highlight={highlightPrice === level.px}
              />
            ))}
          </div>

          {/* Spread */}
          <div className="px-3 py-2 bg-[#f6f6f3] flex justify-between items-center border-y border-black/[0.06]">
            <span className="text-[11px] font-semibold text-gray-500 font-mono">
              Spread
            </span>
            <span className="text-[12px] font-mono font-semibold tabular-nums text-gray-900">
              {spread !== null ? `$${spread.toFixed(2)}` : '—'}
              {spreadPct !== null && (
                <span className="text-gray-400 ml-1.5">· {spreadPct}%</span>
              )}
            </span>
          </div>

          {/* Bids */}
          <div className="flex-1 px-1.5 overflow-hidden">
            {bids.map((level, i) => (
              <Row
                key={`b-${i}`}
                level={level}
                side="bid"
                maxSz={maxSz}
                highlight={highlightPrice === level.px}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono ${
        connected ? 'text-emerald-600' : 'text-gray-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? 'bg-emerald-500' : 'bg-gray-400'
        }`}
        style={
          connected
            ? { boxShadow: '0 0 0 3px rgba(25,169,116,0.13)' }
            : undefined
        }
      />
      {connected ? 'LIVE' : 'OFFLINE'}
    </span>
  );
}

function Row({
  level,
  side,
  maxSz,
  highlight,
}: {
  level: HLOrderBookLevel;
  side: 'bid' | 'ask';
  maxSz: number;
  highlight: boolean;
}) {
  const price = parseFloat(level.px);
  const size = parseFloat(level.sz);
  const barWidth = maxSz > 0 ? (size / maxSz) * 100 : 0;

  const isAsk = side === 'ask';
  const bg = isAsk ? 'bg-red-500/10' : 'bg-emerald-500/10';
  const txt = isAsk ? 'text-red-500' : 'text-emerald-600';
  const total = (price * size).toFixed(0);

  return (
    <div
      className={`relative h-[22px] flex items-center px-2.5 ${
        highlight ? 'bg-yellow-50' : ''
      }`}
    >
      <div
        className={`absolute inset-y-0 right-0 ${bg}`}
        style={{ width: `${barWidth}%` }}
      />
      <div className="relative grid grid-cols-3 w-full font-mono text-[11.5px] font-medium tabular-nums">
        <span className={txt}>{formatPrice(level.px)}</span>
        <span className="text-right text-gray-900">{size.toFixed(4)}</span>
        <span className="text-right text-gray-500">
          ${parseInt(total).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
