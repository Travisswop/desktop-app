'use client';

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Percent,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { HLPosition, HLOpenOrder } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import { useToast } from '@/hooks/use-toast';
import { MarketIcon } from './MarketIcon';
import {
  lookupHyperliquidPositionPrice,
  resolveHyperliquidPositionMarkPrice,
} from '@/lib/perps/hyperliquidPositionPricing';
import {
  buildPositionShareDetails,
  sharePerpsPositionImage,
} from './perpsPositionShare';

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
type TpSlKind = 'tp' | 'sl';

const DEFAULT_TPSL_PERCENT = 5;
const MIN_TPSL_PERCENT = 0.1;
const MAX_TPSL_PERCENT = 50;
const TPSL_PERCENT_STEP = 0.1;

export interface PositionTpSlRequest {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  replaceExisting: boolean;
  existingOrdersToCancel: HLOpenOrder[];
}

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
  onSetPositionTpSl: (
    position: HLPosition,
    request: PositionTpSlRequest,
  ) => Promise<void>;
  onCancelOrder: (order: HLOpenOrder) => Promise<void>;
  cancellingOrderKey?: string | null;
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
  onSetPositionTpSl,
  onCancelOrder,
  cancellingOrderKey,
  onSelectCoin,
}: PositionsTableProps) {
  const [tab, setTab] = useState<Tab>('positions');
  const [tpSlPosition, setTpSlPosition] = useState<HLPosition | null>(null);

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
            onOpenTpSl={setTpSlPosition}
            onSelectCoin={onSelectCoin}
          />
        )}
        {tab === 'orders' && (
          <OrdersBody
            orders={openOrders}
            cancellingOrderKey={cancellingOrderKey}
            onCancelOrder={onCancelOrder}
            onSelectCoin={onSelectCoin}
          />
        )}
        {tab === 'history' && (
          <HistoryBody fills={fills} onSelectCoin={onSelectCoin} />
        )}
      </div>

      {tpSlPosition && (
        <PositionTpSlModal
          key={`${tpSlPosition.dex ?? ''}:${tpSlPosition.coin}:${tpSlPosition.szi}`}
          position={tpSlPosition}
          openOrders={openOrders}
          mids={mids}
          marketMarks={marketMarks}
          onClose={() => setTpSlPosition(null)}
          onSubmit={async (request) => {
            await onSetPositionTpSl(tpSlPosition, request);
            setTpSlPosition(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Positions ──────────────────────────────────────────────────────────────

function positionRowKey(position: HLPosition) {
  return [
    position.dex || 'main',
    position.coin,
    position.szi,
    position.entryPx,
  ].join(':');
}

function PositionsBody({
  positions,
  mids,
  marketMarks,
  closingCoin,
  onClosePosition,
  onOpenTpSl,
  onSelectCoin,
}: {
  positions: HLPosition[];
  mids: Record<string, string>;
  marketMarks?: Record<string, string>;
  closingCoin?: string | null;
  onClosePosition: (position: HLPosition) => Promise<void>;
  onOpenTpSl: (position: HLPosition) => void;
  onSelectCoin?: (coin: string) => void;
}) {
  const shareInFlightRef = useRef(false);
  const [sharingPositionKey, setSharingPositionKey] = useState<string | null>(
    null,
  );
  const { toast } = useToast();

  if (positions.length === 0) {
    return <EmptyState label="No open positions" />;
  }

  const handleSharePosition = async (
    position: HLPosition,
    markPx: number | null,
    rowKey: string,
  ) => {
    if (shareInFlightRef.current) return;

    shareInFlightRef.current = true;
    setSharingPositionKey(rowKey);
    try {
      await sharePerpsPositionImage(
        buildPositionShareDetails(position, markPx),
        toast,
      );
    } finally {
      shareInFlightRef.current = false;
      setSharingPositionKey(null);
    }
  };

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
          const rowKey = positionRowKey(p);
          const isSharing = sharingPositionKey === rowKey;
          const marginModeLabel =
            p.leverage.type === 'isolated' ? 'ISOLATED' : 'CROSS';

          return (
            <tr
              key={rowKey}
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
                      className={`whitespace-nowrap text-[10px] font-bold font-mono tracking-wide ${
                        isLong ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {isLong ? 'LONG' : 'SHORT'} · {p.leverage.value}× ·{' '}
                      {marginModeLabel}
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
                <div className="flex justify-end gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onOpenTpSl(p)}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f4f4f1] text-gray-900 text-[11.5px] font-semibold hover:bg-gray-100 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    TP/SL
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSharePosition(p, mark, rowKey)}
                    disabled={isSharing}
                    aria-label={`Share ${p.coin} position`}
                    title="Share position"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f4f1] text-gray-900 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
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
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Position TP/SL ───────────────────────────────────────────────────────────

function PositionTpSlModal({
  position,
  openOrders,
  mids,
  marketMarks,
  onClose,
  onSubmit,
}: {
  position: HLPosition;
  openOrders: HLOpenOrder[];
  mids: Record<string, string>;
  marketMarks?: Record<string, string>;
  onClose: () => void;
  onSubmit: (request: PositionTpSlRequest) => Promise<void>;
}) {
  const size = parseFloat(position.szi);
  const isLong = size > 0;
  const entry = parseFloat(position.entryPx) || 0;
  const leverage = Math.max(1, Number(position.leverage.value) || 1);
  const mark =
    resolveHyperliquidPositionMarkPrice(
      position,
      lookupHyperliquidPositionPrice(position, mids) ??
        lookupHyperliquidPositionPrice(position, marketMarks),
    ) ?? entry;
  const referencePrice = mark || entry;
  const hasReferencePrice =
    Number.isFinite(referencePrice) && referencePrice > 0;
  const [takeProfitPercent, setTakeProfitPercent] =
    useState(DEFAULT_TPSL_PERCENT);
  const [stopLossPercent, setStopLossPercent] =
    useState(DEFAULT_TPSL_PERCENT);
  const [takeProfitPrice, setTakeProfitPrice] = useState(() =>
    formatTriggerInput(
      priceFromPercent(
        referencePrice,
        isLong,
        'tp',
        DEFAULT_TPSL_PERCENT,
        leverage,
      ),
    ),
  );
  const [stopLossPrice, setStopLossPrice] = useState(() =>
    formatTriggerInput(
      priceFromPercent(
        referencePrice,
        isLong,
        'sl',
        DEFAULT_TPSL_PERCENT,
        leverage,
      ),
    ),
  );
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerOrders = getPositionTriggerOrders(position, openOrders, mark);
  const existingTakeProfit = triggerOrders.find((item) => item.kind === 'tp');
  const existingStopLoss = triggerOrders.find((item) => item.kind === 'sl');
  const cancelCandidates = triggerOrders
    .filter((item) => {
      if (item.kind === 'tp') return !!takeProfitPrice.trim();
      if (item.kind === 'sl') return !!stopLossPrice.trim();
      return false;
    })
    .map((item) => item.order);
  const tpPlaceholder =
    mark > 0 ? `$${formatPrice(mark * (isLong ? 1.05 : 0.95))}` : 'Price';
  const slPlaceholder =
    mark > 0 ? `$${formatPrice(mark * (isLong ? 0.95 : 1.05))}` : 'Price';

  const handlePercentChange = (kind: TpSlKind, nextPercent: number) => {
    const percent = normalizeTpSlPercent(nextPercent);
    const nextPrice = formatTriggerInput(
      priceFromPercent(referencePrice, isLong, kind, percent, leverage),
    );

    if (kind === 'tp') {
      setTakeProfitPercent(percent);
      setTakeProfitPrice(nextPrice);
    } else {
      setStopLossPercent(percent);
      setStopLossPrice(nextPrice);
    }
    setError(null);
  };

  const handlePriceChange = (kind: TpSlKind, nextPrice: string) => {
    if (kind === 'tp') {
      setTakeProfitPrice(nextPrice);
    } else {
      setStopLossPrice(nextPrice);
    }

    const impliedPercent = percentFromPrice(
      referencePrice,
      isLong,
      kind,
      Number(nextPrice),
      leverage,
    );
    if (
      impliedPercent != null &&
      impliedPercent >= MIN_TPSL_PERCENT &&
      impliedPercent <= MAX_TPSL_PERCENT
    ) {
      const normalized = normalizeTpSlPercent(impliedPercent);
      if (kind === 'tp') {
        setTakeProfitPercent(normalized);
      } else {
        setStopLossPercent(normalized);
      }
    }
    setError(null);
  };

  const validate = () => {
    const tp = takeProfitPrice.trim();
    const sl = stopLossPrice.trim();
    const reference = mark || entry;

    if (!tp && !sl) return 'Add a take-profit or stop-loss price.';
    if (tp) {
      const value = Number(tp);
      if (!Number.isFinite(value) || value <= 0) {
        return 'Take-profit price must be a positive number.';
      }
      if (reference > 0 && (isLong ? value <= reference : value >= reference)) {
        return isLong
          ? 'Take profit must be above the current mark for a long.'
          : 'Take profit must be below the current mark for a short.';
      }
    }
    if (sl) {
      const value = Number(sl);
      if (!Number.isFinite(value) || value <= 0) {
        return 'Stop-loss price must be a positive number.';
      }
      if (reference > 0 && (isLong ? value >= reference : value <= reference)) {
        return isLong
          ? 'Stop loss must be below the current mark for a long.'
          : 'Stop loss must be above the current mark for a short.';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        takeProfitPrice: takeProfitPrice.trim() || undefined,
        stopLossPrice: stopLossPrice.trim() || undefined,
        replaceExisting,
        existingOrdersToCancel: replaceExisting ? cancelCandidates : [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add TP/SL triggers.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-32px)] w-full max-w-[480px] overflow-y-auto rounded-[18px] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(10,10,12,0.24)]"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
          <div>
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-gray-400">
              Add TP/SL
            </p>
            <h3 className="text-[16px] font-semibold text-gray-900">
              {position.coin}-PERP
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close TP/SL modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f7f7f4] p-2 text-[11px]">
            <Metric label="Side" value={isLong ? 'LONG' : 'SHORT'} />
            <Metric label="Size" value={Math.abs(size).toFixed(4)} />
            <Metric label="Mark" value={`$${formatPrice(mark)}`} />
          </div>

          {(existingTakeProfit || existingStopLoss) && (
            <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2">
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                {existingTakeProfit && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600">
                    TP ${formatPrice(existingTakeProfit.triggerPx)}
                  </span>
                )}
                {existingStopLoss && (
                  <span className="rounded-md bg-red-500/10 px-2 py-1 font-semibold text-red-500">
                    SL ${formatPrice(existingStopLoss.triggerPx)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-gray-500">
                <Percent className="h-3.5 w-3.5" />
                Position return
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                {leverage}x adjusted
              </span>
            </div>
            <div className="space-y-3">
              <PercentDial
                kind="tp"
                label="TP"
                percent={takeProfitPercent}
                price={takeProfitPrice}
                disabled={!hasReferencePrice}
                onChange={(value) => handlePercentChange('tp', value)}
              />
              <PercentDial
                kind="sl"
                label="SL"
                percent={stopLossPercent}
                price={stopLossPrice}
                disabled={!hasReferencePrice}
                onChange={(value) => handlePercentChange('sl', value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500">
                TAKE PROFIT
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={takeProfitPrice}
                onChange={(event) => handlePriceChange('tp', event.target.value)}
                placeholder={tpPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-3 font-mono text-[15px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500">
                STOP LOSS
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stopLossPrice}
                onChange={(event) => handlePriceChange('sl', event.target.value)}
                placeholder={slPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3.5 py-3 font-mono text-[15px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          </div>

          {triggerOrders.length > 0 && (
            <label className="flex items-start gap-2 rounded-xl bg-[#f7f7f4] px-3 py-2 text-[11.5px] text-gray-600">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900"
              />
              <span>Replace matching existing TP/SL orders</span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-600">
              <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-[12px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3.5 text-[12px] font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Submit TP/SL
          </button>
        </div>
      </form>
    </div>
  );
}

function PercentDial({
  kind,
  label,
  percent,
  price,
  disabled,
  onChange,
}: {
  kind: TpSlKind;
  label: string;
  percent: number;
  price: string;
  disabled?: boolean;
  onChange: (percent: number) => void;
}) {
  const tone =
    kind === 'tp'
      ? {
          label: 'text-emerald-600',
          badge: 'bg-emerald-500/10 text-emerald-600',
          accent: 'accent-emerald-500',
          focus: 'focus:ring-emerald-500/25',
        }
      : {
          label: 'text-red-500',
          badge: 'bg-red-500/10 text-red-500',
          accent: 'accent-red-500',
          focus: 'focus:ring-red-500/25',
        };
  const displayPrice = Number(price);

  return (
    <div className="grid grid-cols-[44px_1fr_74px] items-center gap-2">
      <div className={`font-mono text-[12px] font-bold ${tone.label}`}>
        {label}
      </div>
      <div className="min-w-0">
        <input
          type="range"
          min={MIN_TPSL_PERCENT}
          max={MAX_TPSL_PERCENT}
          step={TPSL_PERCENT_STEP}
          value={percent}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`h-2 w-full cursor-pointer ${tone.accent} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={`${label} percent distance`}
        />
        <div className="mt-1 font-mono text-[10px] font-semibold text-gray-400">
          {Number.isFinite(displayPrice) && displayPrice > 0
            ? `$${formatPrice(displayPrice)}`
            : '--'}
        </div>
      </div>
      <label className={`flex h-9 items-center rounded-lg px-2 ${tone.badge}`}>
        <input
          type="number"
          min={MIN_TPSL_PERCENT}
          max={MAX_TPSL_PERCENT}
          step={TPSL_PERCENT_STEP}
          value={formatPercent(percent)}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`min-w-0 flex-1 bg-transparent text-right font-mono text-[12px] font-bold tabular-nums outline-none ${tone.focus} disabled:cursor-not-allowed`}
          aria-label={`${label} percent value`}
        />
        <span className="ml-0.5 font-mono text-[12px] font-bold">%</span>
      </label>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-[11px] font-semibold text-gray-900">
        {value}
      </div>
    </div>
  );
}

function normalizeTpSlPercent(percent: number) {
  if (!Number.isFinite(percent)) return DEFAULT_TPSL_PERCENT;
  const clamped = Math.min(
    MAX_TPSL_PERCENT,
    Math.max(MIN_TPSL_PERCENT, percent),
  );
  return Math.round(clamped * 10) / 10;
}

function formatPercent(percent: number) {
  const normalized = normalizeTpSlPercent(percent);
  return Number.isInteger(normalized)
    ? normalized.toFixed(0)
    : normalized.toFixed(1);
}

function formatTriggerInput(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '';
  return (Math.round(price * 100) / 100).toFixed(2);
}

function priceFromPercent(
  reference: number,
  isLong: boolean,
  kind: TpSlKind,
  percent: number,
  leverage = 1,
) {
  if (!Number.isFinite(reference) || reference <= 0) return 0;
  const effectiveLeverage =
    Number.isFinite(leverage) && leverage > 0 ? leverage : 1;
  const normalizedPercent =
    normalizeTpSlPercent(percent) / effectiveLeverage / 100;
  const direction =
    kind === 'tp'
      ? isLong
        ? 1
        : -1
      : isLong
        ? -1
        : 1;
  return reference * (1 + direction * normalizedPercent);
}

function percentFromPrice(
  reference: number,
  isLong: boolean,
  kind: TpSlKind,
  price: number,
  leverage = 1,
) {
  if (
    !Number.isFinite(reference) ||
    reference <= 0 ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  const effectiveLeverage =
    Number.isFinite(leverage) && leverage > 0 ? leverage : 1;

  const ratio = price / reference;
  const priceMovePercent =
    kind === 'tp'
      ? isLong
        ? (ratio - 1) * 100
        : (1 - ratio) * 100
      : isLong
        ? (1 - ratio) * 100
        : (ratio - 1) * 100;
  const percent = priceMovePercent * effectiveLeverage;

  return Number.isFinite(percent) ? percent : null;
}

function getPositionTriggerOrders(
  position: HLPosition,
  openOrders: HLOpenOrder[],
  mark: number,
) {
  return openOrders
    .filter((order) => orderBelongsToPosition(order, position))
    .map((order) => {
      const kind = classifyTriggerOrder(order, position, mark);
      return kind
        ? {
            order,
            kind,
            triggerPx: Number(order.triggerPx || order.limitPx),
          }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        order: HLOpenOrder;
        kind: 'tp' | 'sl';
        triggerPx: number;
      } => Boolean(item),
    )
    .sort((a, b) => b.order.timestamp - a.order.timestamp);
}

function orderBelongsToPosition(order: HLOpenOrder, position: HLPosition) {
  const positionDex = position.dex?.trim() || '';
  const orderDex = order.dex?.trim() || '';
  const isLong = parseFloat(position.szi) > 0;
  const closeSide = isLong ? 'A' : 'B';

  return (
    order.coin === position.coin &&
    orderDex === positionDex &&
    order.reduceOnly &&
    order.side === closeSide &&
    Boolean(order.triggerPx || order.limitPx)
  );
}

function classifyTriggerOrder(
  order: HLOpenOrder,
  position: HLPosition,
  mark: number,
): 'tp' | 'sl' | null {
  const triggerPx = Number(order.triggerPx || order.limitPx);
  if (!Number.isFinite(triggerPx) || triggerPx <= 0) return null;

  const descriptor = `${order.orderType || ''} ${
    order.triggerCondition || ''
  }`.toLowerCase();
  if (/\b(tp|take)\b/.test(descriptor)) return 'tp';
  if (/\b(sl|stop|loss)\b/.test(descriptor)) return 'sl';

  const isLong = parseFloat(position.szi) > 0;
  const reference = mark || parseFloat(position.entryPx) || 0;
  if (reference <= 0) return null;

  return isLong
    ? triggerPx > reference
      ? 'tp'
      : 'sl'
    : triggerPx < reference
      ? 'tp'
      : 'sl';
}

export const __test = {
  classifyTriggerOrder,
  formatTriggerInput,
  getPositionTriggerOrders,
  normalizeTpSlPercent,
  orderBelongsToPosition,
  percentFromPrice,
  priceFromPercent,
};

// ─── Open orders ────────────────────────────────────────────────────────────

export function getOpenOrderRowKey(
  order: Pick<HLOpenOrder, 'coin' | 'dex' | 'oid'>,
) {
  return [order.dex || 'main', order.coin, order.oid].join(':');
}

function OrdersBody({
  orders,
  cancellingOrderKey,
  onCancelOrder,
  onSelectCoin,
}: {
  orders: HLOpenOrder[];
  cancellingOrderKey?: string | null;
  onCancelOrder: (order: HLOpenOrder) => Promise<void>;
  onSelectCoin?: (coin: string) => void;
}) {
  if (orders.length === 0) {
    return <EmptyState label="No open orders" />;
  }

  const isCancelInFlight = Boolean(cancellingOrderKey);

  return (
    <table className="w-full text-left">
      <thead>
        <HeaderRow
          cols={['Market', 'Side', 'Type', 'Size', 'Price', 'Placed', '']}
          stickyLast
        />
      </thead>
      <tbody>
        {orders.map((o) => {
          const isBuy = o.side === 'B';
          const rowKey = getOpenOrderRowKey(o);
          const isCancelling = cancellingOrderKey === rowKey;
          return (
            <tr
              key={rowKey}
              className="group border-t border-black/[0.04] hover:bg-gray-50/60 transition-colors"
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
              <Td className="sticky right-0 bg-white text-right shadow-[-12px_0_16px_-16px_rgba(10,10,12,0.45)] transition-colors group-hover:bg-gray-50">
                <button
                  type="button"
                  onClick={() => void onCancelOrder(o)}
                  disabled={isCancelInFlight}
                  aria-label={`Cancel ${o.coin}-PERP order ${o.oid}`}
                  title="Cancel order"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCancelling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
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

function HeaderRow({
  cols,
  stickyLast = false,
}: {
  cols: string[];
  stickyLast?: boolean;
}) {
  return (
    <tr>
      {cols.map((c, i) => (
        <th
          key={i}
          className={`px-3 py-2 text-[9.5px] font-bold tracking-[0.12em] text-gray-400 font-mono uppercase ${
            i === cols.length - 1 ? 'text-right' : 'text-left'
          } ${
            stickyLast && i === cols.length - 1
              ? 'sticky right-0 z-10 bg-white shadow-[-12px_0_16px_-16px_rgba(10,10,12,0.45)]'
              : ''
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
