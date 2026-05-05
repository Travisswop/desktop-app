'use client';

import { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { HLMarket, HLPosition, OrderSide, OrderMode } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import type {
  PlaceLimitOrderParams,
  PlaceTpSlOrderParams,
} from './hooks/useHyperliquidTrading';
import { OrderConfirmModal, type OrderConfirmDetails } from './OrderConfirmModal';

interface TradingFormProps {
  market: HLMarket | null;
  markPrice: string;
  existingPosition?: HLPosition;
  accountValue: string;
  isAgentReady: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** Bubble the chosen leverage to the parent so the account stats card can
   *  compute buying power consistently. */
  onLeverageChange?: (lev: number, isCross: boolean) => void;
  onPlaceMarket: (assetIndex: number, isBuy: boolean, size: string, markPrice: string) => Promise<unknown>;
  onPlaceLimit: (params: PlaceLimitOrderParams) => Promise<unknown>;
  onPlaceTpSl: (params: PlaceTpSlOrderParams) => Promise<unknown>;
  onUpdateLeverage: (assetIndex: number, leverage: number, isCross?: boolean) => Promise<unknown>;
  onClearError: () => void;
}

/**
 * TradingForm — order entry styled to match the bento dashboard's trade
 * ticket card. Long/Short pill toggle, mode tabs, mono USD size input,
 * leverage slider with risk callout, and a coloured submit pill.
 */
export function TradingForm({
  market,
  markPrice,
  existingPosition,
  accountValue,
  isAgentReady,
  isSubmitting,
  error,
  onLeverageChange,
  onPlaceMarket,
  onPlaceLimit,
  onPlaceTpSl,
  onUpdateLeverage,
  onClearError,
}: TradingFormProps) {
  const [side, setSide] = useState<OrderSide>('long');
  const [mode, setMode] = useState<OrderMode>('market');
  const [size, setSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [isCross, setIsCross] = useState(true);

  // Pending order details snapshot — populated when the user clicks the
  // primary CTA, drives the OrderConfirmModal. Kept as a separate piece of
  // state (rather than computed at render) so the modal continues to show the
  // order the user actually requested even if mark price drifts mid-confirm.
  const [pendingOrder, setPendingOrder] = useState<OrderConfirmDetails | null>(null);

  const isBuy = side === 'long';
  const markNum = parseFloat(markPrice) || 0;
  const accountNum = parseFloat(accountValue) || 0;
  const maxLev = market?.maxLeverage ?? 50;

  const sizeInCoins = useMemo(() => {
    const sizeUsd = parseFloat(size);
    if (!sizeUsd || !markNum) return '0';
    return (sizeUsd / markNum).toFixed(market?.szDecimals ?? 4);
  }, [size, markNum, market?.szDecimals]);

  const minOrderUsd = useMemo(() => {
    if (!markNum || !market) return 10;
    const szDecimals = market.szDecimals ?? 4;
    const step = Math.pow(10, -szDecimals);
    const minSteps = Math.ceil(10 / (markNum * step));
    return minSteps * step * markNum;
  }, [markNum, market]);

  const sizeUsdNum = parseFloat(size) || 0;
  const isBelowMinimum = sizeUsdNum > 0 && sizeUsdNum < minOrderUsd;

  const setPercent = useCallback(
    (pct: number) => {
      const usd = (accountNum * pct * leverage) / 100;
      setSize(usd.toFixed(2));
    },
    [accountNum, leverage],
  );

  const estLiqPrice = useMemo(() => {
    if (!markNum || !leverage) return null;
    const liqBuffer = 1 / leverage;
    return isBuy
      ? (markNum * (1 - liqBuffer)).toFixed(2)
      : (markNum * (1 + liqBuffer)).toFixed(2);
  }, [markNum, leverage, isBuy]);

  const estFee = useMemo(() => {
    if (!sizeUsdNum) return null;
    return (sizeUsdNum * 0.0007).toFixed(2);
  }, [sizeUsdNum]);

  // Step 1: user clicks the CTA → snapshot the order details and open the modal
  const requestConfirm = useCallback(() => {
    if (!market) return;
    const sizeNum = parseFloat(sizeInCoins);
    if (!sizeNum || sizeNum <= 0) return;
    if (mode === 'limit' && !limitPrice) return;
    if (mode === 'tpsl' && !takeProfit && !stopLoss) return;

    onClearError();

    const entryPxNum =
      mode === 'market' ? markNum : parseFloat(limitPrice) || markNum;
    const liqNum = entryPxNum
      ? isBuy
        ? entryPxNum * (1 - 1 / leverage)
        : entryPxNum * (1 + 1 / leverage)
      : 0;
    const liqDistancePct = entryPxNum
      ? Math.abs((entryPxNum - liqNum) / entryPxNum) * 100
      : 0;
    const sizeUsd = sizeNum * entryPxNum;
    const fee = sizeUsd * 0.0007;
    const margin = sizeUsd / leverage;

    const modeLabel = `${
      mode === 'market' ? 'Market' : mode === 'limit' ? 'Limit' : 'TP/SL'
    } order · ${isCross ? 'Cross' : 'Isolated'} margin`;

    setPendingOrder({
      side,
      coin: market.coin,
      modeLabel,
      leverage,
      isCross,
      sizeCoins: sizeInCoins,
      sizeUsd: formatUsd(sizeUsd),
      entryPrice: formatPrice(entryPxNum.toFixed(2)),
      entrySub: mode === 'market' ? 'Mark · slip < 0.05%' : undefined,
      liquidationPrice: formatPrice(liqNum.toFixed(2)),
      liquidationDistance: `${liqDistancePct.toFixed(1)}%`,
      estFees: fee.toFixed(2),
      marginRequired: margin.toFixed(2),
      isLimit: mode !== 'market',
    });
  }, [
    market, mode, isBuy, sizeInCoins, limitPrice, markNum, takeProfit, stopLoss,
    side, leverage, isCross, onClearError,
  ]);

  // Step 2: modal confirm → actually fire the order to Hyperliquid
  const handleConfirmedSubmit = useCallback(async () => {
    if (!market) return;
    const sizeNum = parseFloat(sizeInCoins);
    if (!sizeNum || sizeNum <= 0) return;

    try {
      if (mode === 'market') {
        await onPlaceMarket(market.index, isBuy, sizeInCoins, markPrice);
      } else if (mode === 'limit') {
        if (!limitPrice) return;
        await onPlaceLimit({
          assetIndex: market.index,
          isBuy,
          size: sizeInCoins,
          price: limitPrice,
        });
      } else if (mode === 'tpsl') {
        const entryPx = limitPrice || markPrice;
        if (!takeProfit && !stopLoss) return;
        await onPlaceTpSl({
          assetIndex: market.index,
          isBuy,
          size: sizeInCoins,
          entryPrice: entryPx,
          stopLossPrice: stopLoss || (isBuy
            ? String((markNum * 0.95).toFixed(2))
            : String((markNum * 1.05).toFixed(2))),
          takeProfitPrice: takeProfit || (isBuy
            ? String((markNum * 1.05).toFixed(2))
            : String((markNum * 0.95).toFixed(2))),
        });
      }

      setPendingOrder(null);
      setSize('');
      setLimitPrice('');
      setTakeProfit('');
      setStopLoss('');
    } catch {
      // surfaced via parent error prop — leave modal open so the user can retry
    }
  }, [
    market, mode, isBuy, sizeInCoins, limitPrice, markPrice, takeProfit,
    stopLoss, markNum, onPlaceMarket, onPlaceLimit, onPlaceTpSl,
  ]);

  const cancelConfirm = useCallback(() => {
    if (isSubmitting) return;
    setPendingOrder(null);
  }, [isSubmitting]);

  const handleLeverageChange = useCallback(
    (newLev: number) => {
      setLeverage(newLev);
      onLeverageChange?.(newLev, isCross);
    },
    [onLeverageChange, isCross],
  );

  const handleLeverageCommit = useCallback(
    async (newLev: number) => {
      if (market && isAgentReady) {
        await onUpdateLeverage(market.index, newLev, isCross).catch(() => {});
      }
    },
    [market, isAgentReady, isCross, onUpdateLeverage],
  );

  const toggleMargin = useCallback(() => {
    const next = !isCross;
    setIsCross(next);
    onLeverageChange?.(leverage, next);
  }, [isCross, leverage, onLeverageChange]);

  if (!market) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 p-6 text-center">
        Select a market to start trading
      </div>
    );
  }

  const submitDisabled =
    !isAgentReady || isSubmitting || !size || parseFloat(size) <= 0 || isBelowMinimum;

  const sideStyles = isBuy
    ? {
        btn: 'bg-emerald-500 hover:bg-emerald-600',
        shadow: '0 6px 18px -6px rgba(25,169,116,0.5)',
      }
    : {
        btn: 'bg-red-500 hover:bg-red-600',
        shadow: '0 6px 18px -6px rgba(229,72,77,0.5)',
      };

  return (
    <div className="flex flex-col h-full">
      {/* Long / Short toggle */}
      <div className="grid grid-cols-2 gap-1 p-[3px] bg-[#f2f2f0] rounded-xl mb-3.5">
        <button
          onClick={() => setSide('long')}
          className={`py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${
            side === 'long'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${
            side === 'short'
              ? 'bg-red-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Short
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-3.5 text-[12px] font-medium pb-2 mb-3.5 border-b border-black/[0.06]">
        {(['market', 'limit', 'tpsl'] as OrderMode[]).map((m) => {
          const label = m === 'market' ? 'Market' : m === 'limit' ? 'Limit' : 'TP/SL';
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`pb-2 -mb-[9px] transition-colors ${
                active
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Limit price */}
      {(mode === 'limit' || mode === 'tpsl') && (
        <div className="mb-3.5">
          <Label>{mode === 'tpsl' ? 'ENTRY PRICE (USD)' : 'LIMIT PRICE (USD)'}</Label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={`≈ $${formatPrice(markPrice)}`}
            className="mt-1.5 w-full px-3.5 py-3 text-[16px] font-mono font-semibold tabular-nums bg-[#fafafa] border border-black/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-[10.5px] text-gray-500 mt-1 font-mono">
            Mark ${formatPrice(markPrice)}
          </p>
        </div>
      )}

      {/* Size */}
      <Label>SIZE (USD)</Label>
      <input
        type="number"
        min="0"
        step="1"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="$0.00"
        className="mt-1.5 w-full px-3.5 py-3 text-[18px] font-mono font-semibold tabular-nums tracking-tight bg-[#fafafa] border border-black/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30"
      />

      {/* Quick % */}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPercent(p)}
            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              p === 50
                ? 'bg-gray-900 text-white'
                : 'bg-[#f2f2f0] text-gray-900 hover:bg-gray-100'
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      {sizeInCoins !== '0' && (
        <p className="text-[11px] text-gray-400 mt-1 font-mono">
          ≈ {sizeInCoins} {market.coin}
        </p>
      )}

      {isBelowMinimum && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Min order ${minOrderUsd.toFixed(2)} ({(minOrderUsd / markNum).toFixed(market?.szDecimals ?? 4)} {market.coin})
          </span>
        </div>
      )}

      {/* Leverage */}
      <div className="mt-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[11px] text-gray-500 font-medium">Leverage</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMargin}
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                isCross
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              {isCross ? 'Cross' : 'Isolated'}
            </button>
            <span className="font-mono text-[18px] font-semibold tabular-nums text-amber-600">
              {leverage}×
            </span>
          </div>
        </div>
        <div className="relative h-1.5 rounded-full bg-[#f2f2f0]">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-amber-600"
            style={{ width: `${(leverage / maxLev) * 100}%` }}
          />
          <input
            type="range"
            min={1}
            max={maxLev}
            step={1}
            value={leverage}
            onChange={(e) => handleLeverageChange(parseInt(e.target.value))}
            onMouseUp={(e) => handleLeverageCommit(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleLeverageCommit(parseInt((e.target as HTMLInputElement).value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute -top-[5px] w-4 h-4 rounded-full bg-white border-2 border-amber-600 shadow"
            style={{ left: `${(leverage / maxLev) * 100}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-mono">
          <span>1×</span>
          <span>{Math.round(maxLev / 5)}×</span>
          <span>{Math.round(maxLev / 2)}×</span>
          <span>{maxLev}×</span>
        </div>
      </div>

      {/* High-leverage warning */}
      {leverage > 20 && (
        <div className="mt-3.5 p-3 rounded-[10px] bg-[#fff8eb] border border-[#f6d999] flex items-start gap-2 text-[11.5px] text-[#78451d]">
          <span className="text-amber-600 leading-none">⚠</span>
          <span>High leverage increases liquidation risk significantly.</span>
        </div>
      )}

      {/* TP/SL */}
      {mode === 'tpsl' && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-[#fafafa] border border-black/[0.06]">
          <p className="text-[11px] font-semibold text-gray-700">Take Profit / Stop Loss</p>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder={`TP ≈ $${(markNum * (isBuy ? 1.1 : 0.9)).toFixed(0)}`}
            className="w-full px-3 py-2 text-[13px] font-mono tabular-nums bg-white border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder={`SL ≈ $${(markNum * (isBuy ? 0.95 : 1.05)).toFixed(0)}`}
            className="w-full px-3 py-2 text-[13px] font-mono tabular-nums bg-white border border-red-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      )}

      {/* Summary rows */}
      <div className="mt-3 space-y-1 text-[12px]">
        {estLiqPrice && (
          <SummaryRow label="Est. liquidation" value={`$${formatPrice(estLiqPrice)}`} valueColor="text-red-500" />
        )}
        <SummaryRow label="Slippage" value="0.04%" />
        {estFee && <SummaryRow label="Fee" value={`$${estFee}`} />}
      </div>

      {existingPosition && (
        <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[11px] text-blue-700">
          <span>
            You have an open {parseFloat(existingPosition.szi) > 0 ? 'LONG' : 'SHORT'} position
            ({Math.abs(parseFloat(existingPosition.szi)).toFixed(4)} {market.coin}).
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={requestConfirm}
        disabled={submitDisabled}
        className={`mt-3.5 w-full py-3.5 rounded-2xl text-[14.5px] font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${sideStyles.btn}`}
        style={{ boxShadow: submitDisabled ? undefined : sideStyles.shadow }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Placing order…
          </>
        ) : !isAgentReady ? (
          'Connect Agent First'
        ) : (
          `${isBuy ? 'Buy / Long' : 'Sell / Short'} ${market.coin}`
        )}
      </button>

      <OrderConfirmModal
        isOpen={!!pendingOrder}
        details={pendingOrder}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmedSubmit}
        onClose={cancelConfirm}
      />
    </div>
  );
}

function formatUsd(value: number): string {
  if (value >= 1_000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toFixed(2);
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold tracking-[0.14em] text-gray-500 font-mono uppercase">
      {children}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  valueColor = 'text-gray-900',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center text-gray-500">
      <span>{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
