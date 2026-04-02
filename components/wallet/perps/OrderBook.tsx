'use client';

import { useMemo } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import type { HLOrderBook, HLOrderBookLevel } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface OrderBookProps {
  book: HLOrderBook | null;
  coin: string | null;
  connected: boolean;
  /** Highlight a price level when the user hovers the order form */
  highlightPrice?: string;
}

const DISPLAY_LEVELS = 10; // levels per side

/**
 * OrderBook
 *
 * Live bid/ask order book fed by the `l2Book` WebSocket subscription.
 * Displays a depth bar (relative to max size in view) and colour-codes
 * bids (green) and asks (red).
 *
 * The spread is shown in the centre row.
 */
export function OrderBook({ book, coin, connected, highlightPrice }: OrderBookProps) {
  // Pre-compute max size for bar width scaling
  const { asks, bids, spread, spreadPct } = useMemo(() => {
    if (!book) return { asks: [], bids: [], spread: null, spreadPct: null };

    const bids = book.levels[0].slice(0, DISPLAY_LEVELS);
    const asks = book.levels[1].slice(0, DISPLAY_LEVELS);

    // Sort: bids descending, asks ascending
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
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Select a market to view the order book
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="font-semibold text-gray-700">Order Book</span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-gray-400 animate-pulse" />
          )}
          <span className={`text-xs ${connected ? 'text-emerald-500' : 'text-gray-400'}`}>
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-gray-400 font-medium border-b border-gray-100">
        <span>Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {!book ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Asks (sell orders) — displayed in reverse so lowest ask is nearest spread */}
          <div className="flex-1 overflow-hidden flex flex-col justify-end">
            {[...asks].reverse().map((level, i) => (
              <OrderBookRow
                key={`ask-${i}`}
                level={level}
                side="ask"
                maxSz={maxSz}
                highlight={highlightPrice === level.px}
              />
            ))}
          </div>

          {/* Spread row */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-y border-gray-200">
            <span className="text-gray-500 font-medium">Spread</span>
            <span className="text-gray-700 tabular-nums font-semibold">
              {spread !== null ? `$${spread.toFixed(2)}` : '—'}
            </span>
            <span className="text-gray-400">
              {spreadPct !== null ? `${spreadPct}%` : ''}
            </span>
          </div>

          {/* Bids (buy orders) */}
          <div className="flex-1 overflow-hidden">
            {bids.map((level, i) => (
              <OrderBookRow
                key={`bid-${i}`}
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

// ─── Row component ─────────────────────────────────────────────────────────────

interface RowProps {
  level: HLOrderBookLevel;
  side: 'bid' | 'ask';
  maxSz: number;
  highlight: boolean;
}

function OrderBookRow({ level, side, maxSz, highlight }: RowProps) {
  const price = parseFloat(level.px);
  const size = parseFloat(level.sz);
  const barWidth = maxSz > 0 ? (size / maxSz) * 100 : 0;

  const isAsk = side === 'ask';
  const bgColor = isAsk ? 'bg-red-400/15' : 'bg-emerald-400/15';
  const textColor = isAsk ? 'text-red-500' : 'text-emerald-600';

  // Running total for the depth bar
  const total = (price * size).toFixed(0);

  return (
    <div
      className={`relative grid grid-cols-3 items-center px-3 py-[3px] tabular-nums transition-colors ${
        highlight ? 'bg-yellow-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Depth bar */}
      <div
        className={`absolute inset-y-0 ${isAsk ? 'right-0' : 'right-0'} ${bgColor} transition-all`}
        style={{ width: `${barWidth}%` }}
      />

      {/* Price */}
      <span className={`relative font-semibold ${textColor}`}>
        {formatPrice(level.px)}
      </span>

      {/* Size */}
      <span className="relative text-right text-gray-700">
        {size.toFixed(4)}
      </span>

      {/* Total notional */}
      <span className="relative text-right text-gray-400">
        ${parseInt(total).toLocaleString()}
      </span>
    </div>
  );
}
