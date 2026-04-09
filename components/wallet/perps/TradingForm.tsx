'use client';

import { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { HLMarket, HLPosition, OrderSide, OrderMode } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import type {
  PlaceLimitOrderParams,
  PlaceTpSlOrderParams,
} from './hooks/useHyperliquidTrading';

interface TradingFormProps {
  market: HLMarket | null;
  markPrice: string;
  existingPosition?: HLPosition;
  accountValue: string;
  isAgentReady: boolean;
  isSubmitting: boolean;
  error: string | null;
  onPlaceMarket: (assetIndex: number, isBuy: boolean, size: string, markPrice: string) => Promise<void>;
  onPlaceLimit: (params: PlaceLimitOrderParams) => Promise<void>;
  onPlaceTpSl: (params: PlaceTpSlOrderParams) => Promise<void>;
  onUpdateLeverage: (assetIndex: number, leverage: number, isCross: boolean) => Promise<void>;
  onClearError: () => void;
}

/**
 * TradingForm
 *
 * Full order entry form for Hyperliquid perpetuals.
 *  - Long / Short toggle
 *  - Market / Limit / TP-SL mode tabs
 *  - Size input (USD) with % buttons
 *  - Leverage slider (1x – maxLeverage)
 *  - TP/SL price fields (in TP-SL mode)
 *  - Estimated liquidation price
 *  - Submit button with loading state
 */
export function TradingForm({
  market,
  markPrice,
  existingPosition,
  accountValue,
  isAgentReady,
  isSubmitting,
  error,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isBuy = side === 'long';
  const markNum = parseFloat(markPrice) || 0;
  const accountNum = parseFloat(accountValue) || 0;
  const maxLev = market?.maxLeverage ?? 50;

  // ─── Size helpers ──────────────────────────────────────────────────

  const sizeInCoins = useMemo(() => {
    const sizeUsd = parseFloat(size);
    if (!sizeUsd || !markNum) return '0';
    return (sizeUsd / markNum).toFixed(market?.szDecimals ?? 4);
  }, [size, markNum, market?.szDecimals]);

  const setPercent = useCallback(
    (pct: number) => {
      const usd = (accountNum * pct * leverage) / 100;
      setSize(usd.toFixed(2));
    },
    [accountNum, leverage],
  );

  // ─── Estimated liquidation ─────────────────────────────────────────

  const estLiqPrice = useMemo(() => {
    if (!markNum || !leverage) return null;
    const liqBuffer = 1 / leverage;
    return isBuy
      ? (markNum * (1 - liqBuffer)).toFixed(2)
      : (markNum * (1 + liqBuffer)).toFixed(2);
  }, [markNum, leverage, isBuy]);

  // ─── Submit ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!market) return;
    onClearError();

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

      // Reset form on success
      setSize('');
      setLimitPrice('');
      setTakeProfit('');
      setStopLoss('');
    } catch {
      // error handled by parent via `error` prop
    }
  }, [
    market, mode, isBuy, sizeInCoins, limitPrice, markPrice, takeProfit,
    stopLoss, markNum, onPlaceMarket, onPlaceLimit, onPlaceTpSl, onClearError,
  ]);

  // ─── Leverage change ───────────────────────────────────────────────

  const handleLeverageChange = useCallback(
    async (newLev: number) => {
      setLeverage(newLev);
      if (market && isAgentReady) {
        await onUpdateLeverage(market.index, newLev, isCross).catch(() => {});
      }
    },
    [market, isAgentReady, isCross, onUpdateLeverage],
  );

  if (!market) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 p-6 text-center">
        Select a market to start trading
      </div>
    );
  }

  const submitDisabled = !isAgentReady || isSubmitting || !size || parseFloat(size) <= 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3">
      {/* ── Long / Short toggle ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setSide('long')}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${
            side === 'long'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${
            side === 'short'
              ? 'bg-red-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Short
        </button>
      </div>

      {/* ── Order mode tabs ──────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100">
        {(['market', 'limit', 'tpsl'] as OrderMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
              mode === m
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {m === 'market' ? 'Market' : m === 'limit' ? 'Limit' : 'TP/SL'}
          </button>
        ))}
      </div>

      {/* ── Limit price (limit + tpsl modes) ─────────────────────────── */}
      {(mode === 'limit' || mode === 'tpsl') && (
        <FormField
          label={mode === 'tpsl' ? 'Entry Price (USD)' : 'Limit Price (USD)'}
          value={limitPrice}
          onChange={setLimitPrice}
          placeholder={`≈ $${formatPrice(markPrice)}`}
          hint={`Mark: $${formatPrice(markPrice)}`}
        />
      )}

      {/* ── Size ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Size (USD)</label>
        <input
          type="number"
          min="0"
          step="1"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 tabular-nums"
        />
        {/* % buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setPercent(pct)}
              className="py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>
        {sizeInCoins !== '0' && (
          <p className="text-xs text-gray-400 pl-1">
            ≈ {sizeInCoins} {market.coin}
          </p>
        )}
      </div>

      {/* ── Leverage ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Leverage</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCross(!isCross)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                isCross
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              {isCross ? 'Cross' : 'Isolated'}
            </button>
            <span className="text-sm font-bold text-gray-800">{leverage}x</span>
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={maxLev}
          step={1}
          value={leverage}
          onChange={(e) => handleLeverageChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1x</span>
          <span>{Math.round(maxLev / 2)}x</span>
          <span>{maxLev}x</span>
        </div>
        {leverage > 20 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            High leverage increases liquidation risk significantly
          </div>
        )}
      </div>

      {/* ── TP/SL fields ─────────────────────────────────────────────── */}
      {mode === 'tpsl' && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs font-semibold text-gray-600">Take Profit / Stop Loss</p>
          <FormField
            label="Take Profit Price (USD)"
            value={takeProfit}
            onChange={setTakeProfit}
            placeholder={isBuy
              ? `e.g. $${(markNum * 1.1).toFixed(0)}`
              : `e.g. $${(markNum * 0.9).toFixed(0)}`}
            positive
          />
          <FormField
            label="Stop Loss Price (USD)"
            value={stopLoss}
            onChange={setStopLoss}
            placeholder={isBuy
              ? `e.g. $${(markNum * 0.95).toFixed(0)}`
              : `e.g. $${(markNum * 1.05).toFixed(0)}`}
            negative
          />
        </div>
      )}

      {/* ── Est. liquidation ─────────────────────────────────────────── */}
      {estLiqPrice && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Info className="w-3.5 h-3.5" />
            Est. Liquidation Price
          </span>
          <span className="font-semibold text-red-500">${formatPrice(estLiqPrice)}</span>
        </div>
      )}

      {/* ── Existing position notice ──────────────────────────────────── */}
      {existingPosition && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            You have an open {parseFloat(existingPosition.szi) > 0 ? 'LONG' : 'SHORT'} position
            ({Math.abs(parseFloat(existingPosition.szi)).toFixed(4)} {market.coin}).
            Use <strong>reduce-only</strong> to partially close it.
          </span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isBuy
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Placing Order…
          </>
        ) : !isAgentReady ? (
          'Connect Agent First'
        ) : (
          `${isBuy ? 'Buy / Long' : 'Sell / Short'} ${market.coin}`
        )}
      </button>

      {/* ── Advanced toggle ───────────────────────────────────────────── */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showAdvanced && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
          <p>Market: <span className="font-medium text-gray-700">{market.name}</span></p>
          <p>Asset Index: <span className="font-mono text-gray-700">{market.index}</span></p>
          <p>Max Leverage: <span className="font-medium text-gray-700">{market.maxLeverage}x</span></p>
          <p>Size Decimals: <span className="font-mono text-gray-700">{market.szDecimals}</span></p>
        </div>
      )}
    </div>
  );
}

// ─── FormField ───────────────────────────────────────────────────────────────

function FormField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  positive,
  negative,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors tabular-nums ${
          positive
            ? 'border-emerald-200 focus:ring-emerald-500/30 focus:border-emerald-400'
            : negative
              ? 'border-red-200 focus:ring-red-500/30 focus:border-red-400'
              : 'border-gray-200 focus:ring-emerald-500/30 focus:border-emerald-400'
        }`}
      />
    </div>
  );
}
