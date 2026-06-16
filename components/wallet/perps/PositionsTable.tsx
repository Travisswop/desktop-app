'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { HLPosition, HLOpenOrder } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import { MarketIcon } from './MarketIcon';
import {
  lookupHyperliquidPositionPrice,
  resolveHyperliquidPositionMarkPrice,
} from '@/lib/perps/hyperliquidPositionPricing';

export interface PerpsFill {
  coin: string;
  side: 'B' | 'A';
  px: string;
  sz: string;
  time: number;
  startPosition?: string;
  closedPnl?: string;
  hash?: string;
  oid?: number | string;
  dir?: string;
}

type Tab = 'positions' | 'orders' | 'history';

interface PositionsTableProps {
  positions: HLPosition[];
  openOrders: HLOpenOrder[];
  fills: PerpsFill[];
  mids: Record<string, string>;
  /** Coin → mark price from the polled markets feed. Fallback when `mids` has
   *  no live entry for a coin yet, so Mark never collapses to the entry price. */
  marketMarks?: Record<string, string>;
  connected?: boolean;
  closingCoin?: string | null;
  onClosePosition: (position: HLPosition) => Promise<void>;
  onSelectCoin?: (coin: string) => void;
}

/**
 * PositionsTable — the Fresh design's bottom panel. Replaces the live order book
 * with tabbed Positions / Open orders / Trade history tables. Positions show
 * size, entry, mark, PnL/ROE, a liquidation-distance bar, and a Close action.
 */
export function PositionsTable({
  positions,
  openOrders,
  fills,
  mids,
  marketMarks,
  connected = false,
  closingCoin,
  onClosePosition,
  onSelectCoin,
}: PositionsTableProps) {
  const [tab, setTab] = useState<Tab>('positions');

  const counts: Record<Tab, number> = {
    positions: positions.length,
    orders: openOrders.length,
    history: fills.length,
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'positions', label: 'Positions' },
    { id: 'orders', label: 'Open orders' },
    { id: 'history', label: 'Trade history' },
  ];

  return (
    <div className="bg-white border border-black/[0.06] rounded-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] flex flex-col overflow-hidden min-h-[440px]">
      {/* Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06]">
        <div className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-[#f4f4f1] text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    tab === t.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 pr-1 text-[10px] font-bold tracking-[0.12em] text-gray-400 font-mono uppercase">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="flex-1 overflow-x-auto">
        {tab === 'positions' && (
          <PositionsBody
            positions={positions}
            mids={mids}
            marketMarks={marketMarks}
            closingCoin={closingCoin}
            onClosePosition={onClosePosition}
            onSelectCoin={onSelectCoin}
          />
        )}
        {tab === 'orders' && (
          <OrdersBody orders={openOrders} onSelectCoin={onSelectCoin} />
        )}
        {tab === 'history' && (
          <HistoryBody fills={fills} onSelectCoin={onSelectCoin} />
        )}
      </div>
    </div>
  );
}

// ─── Positions ──────────────────────────────────────────────────────────────

function PositionsBody({
  positions,
  mids,
  marketMarks,
  closingCoin,
  onClosePosition,
  onSelectCoin,
}: {
  positions: HLPosition[];
  mids: Record<string, string>;
  marketMarks?: Record<string, string>;
  closingCoin?: string | null;
  onClosePosition: (position: HLPosition) => Promise<void>;
  onSelectCoin?: (coin: string) => void;
}) {
  if (positions.length === 0) {
    return <EmptyState label="No open positions" />;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <HeaderRow
          cols={[
            'Market',
            'Size',
            'Entry',
            'Mark',
            'PnL · ROE',
            'Liq. distance',
            '',
          ]}
        />
      </thead>
      <tbody>
        {positions.map((p) => {
          const size = parseFloat(p.szi);
          const isLong = size > 0;
          const absSize = Math.abs(size);
          const entry = parseFloat(p.entryPx);
          const mark =
            resolveHyperliquidPositionMarkPrice(
              p,
              lookupHyperliquidPositionPrice(p, mids) ??
                lookupHyperliquidPositionPrice(p, marketMarks),
            ) ?? entry;
          const pnl = parseFloat(p.unrealizedPnl) || 0;
          const pnlUp = pnl >= 0;
          const roe = (parseFloat(p.returnOnEquity) || 0) * 100;
          const liqPx = p.liquidationPx ? parseFloat(p.liquidationPx) : null;
          const liqDist =
            liqPx != null
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    isLong ? (mark - liqPx) / mark : (liqPx - mark) / mark,
                  ),
                )
              : null;
          const isClosing = closingCoin === p.coin;

          return (
            <tr
              key={p.coin}
              className="border-t border-black/[0.04] hover:bg-gray-50/60 transition-colors"
            >
              <Td>
                <button
                  onClick={() => onSelectCoin?.(p.coin)}
                  className="flex items-center gap-2 text-left"
                >
                  <MarketIcon coin={p.coin} size="sm" />
                  <span className="flex flex-col">
                    <span className="text-[12.5px] font-semibold text-gray-900">
                      {p.coin}-PERP
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono tracking-wide ${
                        isLong ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {isLong ? 'LONG' : 'SHORT'} · {p.leverage.value}×
                    </span>
                  </span>
                </button>
              </Td>
              <Td>
                <Mono>{absSize.toFixed(4)}</Mono>
                <SubMono>${(absSize * mark).toFixed(2)}</SubMono>
              </Td>
              <Td>
                <Mono>${formatPrice(entry)}</Mono>
              </Td>
              <Td>
                <Mono>${formatPrice(mark)}</Mono>
              </Td>
              <Td>
                <Mono className={pnlUp ? 'text-emerald-600' : 'text-red-500'}>
                  {pnlUp ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                </Mono>
                <SubMono className={pnlUp ? 'text-emerald-600/70' : 'text-red-500/70'}>
                  {roe >= 0 ? '+' : ''}
                  {roe.toFixed(2)}%
                </SubMono>
              </Td>
              <Td>
                {liqDist != null && liqPx != null ? (
                  <div className="w-[120px]">
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1">
                      <span>{(liqDist * 100).toFixed(1)}%</span>
                      <span>${formatPrice(liqPx)}</span>
                    </div>
                    <LiqBar pct={liqDist * 100} />
                  </div>
                ) : (
                  <Mono className="text-gray-400">—</Mono>
                )}
              </Td>
              <Td className="text-right pr-3">
                <button
                  onClick={() => onClosePosition(p)}
                  disabled={isClosing}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11.5px] font-semibold hover:bg-black transition-colors disabled:opacity-60"
                >
                  {isClosing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Close'
                  )}
                </button>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Open orders ────────────────────────────────────────────────────────────

function OrdersBody({
  orders,
  onSelectCoin,
}: {
  orders: HLOpenOrder[];
  onSelectCoin?: (coin: string) => void;
}) {
  if (orders.length === 0) {
    return <EmptyState label="No open orders" />;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <HeaderRow
          cols={['Market', 'Side', 'Type', 'Size', 'Price', 'Placed']}
        />
      </thead>
      <tbody>
        {orders.map((o) => {
          const isBuy = o.side === 'B';
          return (
            <tr
              key={o.oid}
              className="border-t border-black/[0.04] hover:bg-gray-50/60 transition-colors"
            >
              <Td>
                <button
                  onClick={() => onSelectCoin?.(o.coin)}
                  className="flex items-center gap-2 text-left"
                >
                  <MarketIcon coin={o.coin} size="sm" />
                  <span className="text-[12.5px] font-semibold text-gray-900">
                    {o.coin}-PERP
                  </span>
                </button>
              </Td>
              <Td>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono ${
                    isBuy
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {isBuy ? 'BUY' : 'SELL'}
                </span>
              </Td>
              <Td>
                <Mono className="text-gray-500">
                  {o.orderType || 'Limit'}
                  {o.reduceOnly ? ' · RO' : ''}
                </Mono>
              </Td>
              <Td>
                <Mono>{Math.abs(parseFloat(o.sz)).toFixed(4)}</Mono>
              </Td>
              <Td>
                <Mono>${formatPrice(o.limitPx)}</Mono>
              </Td>
              <Td>
                <Mono className="text-gray-500">{timeAgo(o.timestamp)}</Mono>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Trade history ──────────────────────────────────────────────────────────

function HistoryBody({
  fills,
  onSelectCoin,
}: {
  fills: PerpsFill[];
  onSelectCoin?: (coin: string) => void;
}) {
  if (fills.length === 0) {
    return <EmptyState label="No trade history yet" />;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <HeaderRow cols={['Market', 'Side', 'Size', 'Price', 'PnL', 'Time']} />
      </thead>
      <tbody>
        {fills.map((f, i) => {
          const isBuy = f.side === 'B';
          const pnl = f.closedPnl ? parseFloat(f.closedPnl) : null;
          const pnlUp = (pnl ?? 0) >= 0;
          return (
            <tr
              key={`${f.hash ?? f.oid ?? ''}-${f.time}-${i}`}
              className="border-t border-black/[0.04] hover:bg-gray-50/60 transition-colors"
            >
              <Td>
                <button
                  onClick={() => onSelectCoin?.(f.coin)}
                  className="flex items-center gap-2 text-left"
                >
                  <MarketIcon coin={f.coin} size="sm" />
                  <span className="text-[12.5px] font-semibold text-gray-900">
                    {f.coin}-PERP
                  </span>
                </button>
              </Td>
              <Td>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono ${
                    isBuy
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {isBuy ? 'BUY' : 'SELL'}
                </span>
              </Td>
              <Td>
                <Mono>{Math.abs(parseFloat(f.sz)).toFixed(4)}</Mono>
              </Td>
              <Td>
                <Mono>${formatPrice(f.px)}</Mono>
              </Td>
              <Td>
                {pnl != null && pnl !== 0 ? (
                  <Mono className={pnlUp ? 'text-emerald-600' : 'text-red-500'}>
                    {pnlUp ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                  </Mono>
                ) : (
                  <Mono className="text-gray-400">—</Mono>
                )}
              </Td>
              <Td>
                <Mono className="text-gray-500">{timeAgo(f.time)}</Mono>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function HeaderRow({ cols }: { cols: string[] }) {
  return (
    <tr>
      {cols.map((c, i) => (
        <th
          key={i}
          className={`px-3 py-2 text-[9.5px] font-bold tracking-[0.12em] text-gray-400 font-mono uppercase ${
            i === cols.length - 1 ? 'text-right' : 'text-left'
          }`}
        >
          {c}
        </th>
      ))}
    </tr>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

function Mono({
  children,
  className = 'text-gray-900',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-mono font-semibold text-[12px] tabular-nums tracking-tight ${className}`}
    >
      {children}
    </div>
  );
}

function SubMono({
  children,
  className = 'text-gray-400',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`font-mono text-[10px] tabular-nums ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-28 text-[13px] text-gray-400">
      {label}
    </div>
  );
}

function LiqBar({ pct }: { pct: number }) {
  return (
    <div className="relative">
      <div className="h-1.5 rounded-full bg-[#f2f2f0] overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, #19a974 0%, #d97706 70%, #e5484d 100%)',
          }}
        />
      </div>
      <div
        className="absolute -top-0.5 w-0.5 h-2.5 bg-gray-900 rounded-sm"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}

function timeAgo(ms: number): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}
