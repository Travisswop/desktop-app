'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClobOrder, useTickSize } from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import type { PolymarketMarket } from '@/hooks/polymarket';
import type { ClobClient } from '@polymarket/clob-client';

import Portal from '../shared/Portal';
import BuySellToggle, { type OrderVariant } from '../OrderModal/BuySellToggle';
import AmountInput from '../OrderModal/AmountInput';
import SharesInput from '../OrderModal/SharesInput';
import ToWinDisplay from '../OrderModal/ToWinDisplay';
import YoullReceiveDisplay from '../OrderModal/YoullReceiveDisplay';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  return Math.abs(price - Math.round(price / tickSize) * tickSize) < 1e-10;
}

/** djb2-XOR hash — produces a deterministic pseudo-random float in [0, 1) */
function seededRand(seed: string, idx: number): number {
  let h = 5381;
  const s = seed + String(idx);
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

const CHART_W = 210;
const CHART_H = 80;
const PAD_Y = 10;

function generateSparklinePoints(
  seed: string,
  endPrice: number,
): { x: number; y: number }[] {
  const count = 12;
  const startP = 0.47 + seededRand(seed, 999) * 0.06;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const base = startP + (endPrice - startP) * t;
    const noiseScale = 0.08 * (1 - t * 0.6);
    const noise = (seededRand(seed, i) - 0.5) * noiseScale * 2;
    const p = Math.max(0.03, Math.min(0.97, base + noise));
    return { x: t * CHART_W, y: PAD_Y + (1 - p) * CHART_H };
  });
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const cx = ((p.x + c.x) / 2).toFixed(1);
    d += ` C ${cx} ${p.y.toFixed(1)}, ${cx} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

function toAmericanOdds(p: number): string {
  if (!isFinite(p) || p <= 0 || p >= 1) return '—';
  if (Math.abs(p - 0.5) < 0.001) return 'EVEN';
  return p > 0.5
    ? String(Math.round(-(p / (1 - p)) * 100))
    : `+${Math.round(((1 - p) / p) * 100)}`;
}

function getAbbr(name: string): string {
  if (!name) return '?';
  if (name.length <= 4) return name.toUpperCase();
  const words = name.trim().split(/\s+/);
  if (words.length >= 2)
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  return name.slice(0, 3).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

type MarketDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  market: PolymarketMarket;
  clobClient: ClobClient | null;
  balance?: number;
  yesShares?: number;
  noShares?: number;
};

export default function MarketDetailModal({
  isOpen,
  onClose,
  market,
  clobClient,
  balance = 0,
  yesShares = 0,
  noShares = 0,
}: MarketDetailModalProps) {
  // ── Derived market data ───────────────────────────────────────────────────
  const outcomes = useMemo(
    () =>
      market.outcomes
        ? (JSON.parse(market.outcomes) as string[])
        : ['Yes', 'No'],
    [market.outcomes],
  );
  const tokenIds = useMemo(
    () =>
      market.clobTokenIds
        ? (JSON.parse(market.clobTokenIds) as string[])
        : [],
    [market.clobTokenIds],
  );
  const staticPrices = useMemo(
    () =>
      market.outcomePrices
        ? (JSON.parse(market.outcomePrices) as string[]).map(Number)
        : [0.5, 0.5],
    [market.outcomePrices],
  );

  const yesTokenId = tokenIds[0] || '';
  const noTokenId = tokenIds[1] || '';

  const yesPrice =
    market.realtimePrices?.[yesTokenId]?.bidPrice ?? staticPrices[0] ?? 0.5;
  const noPrice =
    market.realtimePrices?.[noTokenId]?.bidPrice ?? staticPrices[1] ?? 0.5;

  const yesOutcomeName = outcomes[0] || 'Yes';
  const noOutcomeName = outcomes[1] || 'No';
  const yesAbbr = getAbbr(yesOutcomeName);
  const noAbbr = getAbbr(noOutcomeName);

  const negRisk = market.negRisk || false;
  const seed = market.slug || market.id || 'market';

  const isLive = market.gameStartTime
    ? new Date(market.gameStartTime).getTime() < Date.now()
    : false;

  // ── Chart paths ───────────────────────────────────────────────────────────
  const yesPoints = useMemo(
    () => generateSparklinePoints(seed + 'y', yesPrice),
    [seed, yesPrice],
  );
  const noPoints = useMemo(
    () => generateSparklinePoints(seed + 'n', noPrice),
    [seed, noPrice],
  );
  const yesPath = useMemo(() => pointsToPath(yesPoints), [yesPoints]);
  const noPath = useMemo(() => pointsToPath(noPoints), [noPoints]);

  // Label Y positions: higher-probability outcome label goes to top
  const yesIsHigher = yesPrice >= noPrice;
  const yesLabelY = yesIsHigher ? 18 : 72;
  const noLabelY = yesIsHigher ? 72 : 18;

  // ── Order state ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [orderType, setOrderType] = useState<OrderVariant>('market');
  const [gtdHours, setGtdHours] = useState(24);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  const [limitPrice, setLimitPrice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { eoaAddress } = usePolymarketWallet();

  const activeTokenId = selectedOutcome === 'yes' ? yesTokenId : noTokenId;
  const activePrice = selectedOutcome === 'yes' ? yesPrice : noPrice;
  const activeShareBalance = selectedOutcome === 'yes' ? yesShares : noShares;

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? activeTokenId : null,
  );
  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setOrderType('market');
      setSide('BUY');
      setSelectedOutcome('yes');
      setLimitPrice('');
      setLocalError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  useEffect(() => {
    if (orderId && isOpen) {
      setShowSuccess(true);
      const t = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [orderId, isOpen, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const inputNum = parseFloat(inputValue) || 0;
  // limitPrice is entered by the user in cents (1–99); convert to decimal (0–1) for the API
  const limitPriceNum = (parseFloat(limitPrice) || 0) / 100;
  const isMarketVariant = orderType === 'market' || orderType === 'fak';
  const isLimitVariant = orderType === 'limit' || orderType === 'gtd';
  const effectivePrice = isLimitVariant ? limitPriceNum : activePrice;

  // Limit BUY: inputNum is shares (shares-first input like Polymarket)
  // Market BUY: inputNum is dollars — divide by price to get shares
  // SELL (any):  inputNum is shares
  const shares =
    side === 'BUY'
      ? isLimitVariant
        ? inputNum
        : effectivePrice > 0
          ? inputNum / effectivePrice
          : 0
      : inputNum;

  // Limit BUY: cost = shares × price  |  Market / SELL: cost = inputNum
  const totalCost =
    side === 'BUY' && isLimitVariant ? shares * limitPriceNum : inputNum;

  const potentialWin = side === 'BUY' ? shares : 0;
  const amountToReceive = side === 'SELL' ? inputNum * effectivePrice : 0;
  const hasInsufficientBalance =
    side === 'BUY' ? totalCost > balance : inputNum > activeShareBalance;

  const LIMIT_MIN_SHARES = market.orderMinSize ?? 5;

  const handlePlaceOrder = async () => {
    if (side === 'BUY') {
      if (isLimitVariant) {
        if (inputNum < LIMIT_MIN_SHARES) {
          setLocalError(`Minimum order is ${LIMIT_MIN_SHARES} shares`);
          return;
        }
        if (totalCost < 1) {
          setLocalError('Minimum order value is $1.00');
          return;
        }
      } else if (inputNum < 1) {
        setLocalError('Minimum order amount is $1.00');
        return;
      }
    }
    if (side === 'SELL' && inputNum < 1) {
      setLocalError('Minimum shares to sell: 1');
      return;
    }
    if (isLimitVariant) {
      if (!limitPrice || limitPriceNum <= 0) {
        setLocalError('Limit price is required');
        return;
      }
      if (limitPriceNum < tickSize || limitPriceNum > 1 - tickSize) {
        setLocalError(
          `Price must be between ${(tickSize * 100).toFixed(0)}¢ and ${((1 - tickSize) * 100).toFixed(0)}¢`,
        );
        return;
      }
      if (!isValidTickPrice(limitPriceNum, tickSize)) {
        setLocalError(
          `Price must be a multiple of tick size (${(tickSize * 100).toFixed(0)}¢)`,
        );
        return;
      }
    }
    try {
      // Market BUY: pass dollar amount (CLOB converts internally)
      // Limit BUY:  pass share count directly
      // Any SELL:   pass share count
      const orderSize = isMarketVariant && side === 'BUY' ? inputNum : shares;
      const gtdExpiration =
        orderType === 'gtd'
          ? Math.floor(Date.now() / 1000) + 60 + gtdHours * 3600
          : undefined;
      await submitOrder({
        tokenId: activeTokenId,
        size: orderSize,
        price: isLimitVariant ? limitPriceNum : undefined,
        side,
        negRisk,
        isMarketOrder: isMarketVariant,
        fillType: orderType === 'fak' ? 'FAK' : 'FOK',
        expiration: gtdExpiration,
      });
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white w-full max-w-[400px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  Live
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 text-center max-w-[200px] truncate">
                {market.eventTitle || market.question}
              </span>
            )}

            {/* spacer to center title */}
            <div className="w-9" />
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 px-4 pb-6">
            {/* ── Team / Match Row ── */}
            <div className="flex items-center justify-center gap-4 py-3">
              {/* Yes outcome */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {market.icon || market.eventIcon ? (
                    <img
                      src={market.icon || market.eventIcon}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-500">
                      {yesAbbr.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    {yesAbbr}
                  </p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">
                    {Math.round(yesPrice * 100)}
                  </p>
                </div>
              </div>

              {/* Divider / Status */}
              <div className="text-center px-1">
                {isLive ? (
                  <p className="text-xs font-bold text-red-500 tracking-widest">
                    LIVE
                  </p>
                ) : market.gameStartTime ? (
                  <p className="text-xs text-gray-400">
                    {new Date(market.gameStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-gray-300">vs</p>
                )}
              </div>

              {/* No outcome */}
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide text-right">
                    {noAbbr}
                  </p>
                  <p className="text-2xl font-black text-gray-900 leading-tight text-right">
                    {Math.round(noPrice * 100)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-gray-500">
                    {noAbbr.slice(0, 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Price Sparkline Chart ── */}
            <div className="mb-4">
              <svg
                viewBox="0 0 270 100"
                className="w-full"
                style={{ height: 100 }}
                aria-hidden="true"
              >
                {/* Yes sparkline (blue) */}
                <path
                  d={yesPath}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {yesPoints.length > 0 && (
                  <circle
                    cx={yesPoints[yesPoints.length - 1].x}
                    cy={yesPoints[yesPoints.length - 1].y}
                    r="4"
                    fill="white"
                    stroke="#3B82F6"
                    strokeWidth="2"
                  />
                )}

                {/* No sparkline (dark gray) */}
                <path
                  d={noPath}
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {noPoints.length > 0 && (
                  <circle
                    cx={noPoints[noPoints.length - 1].x}
                    cy={noPoints[noPoints.length - 1].y}
                    r="4"
                    fill="white"
                    stroke="#6B7280"
                    strokeWidth="2"
                  />
                )}

                {/* Yes label (abbr + American odds) */}
                <text
                  x="218"
                  y={yesLabelY}
                  fontSize="10"
                  fontWeight="bold"
                  fill="#374151"
                  fontFamily="system-ui, sans-serif"
                >
                  {yesAbbr}
                </text>
                <text
                  x="218"
                  y={yesLabelY + 15}
                  fontSize="13"
                  fontWeight="bold"
                  fill={yesPrice >= 0.5 ? '#374151' : '#16A34A'}
                  fontFamily="system-ui, sans-serif"
                >
                  {toAmericanOdds(yesPrice)}
                </text>

                {/* No label (abbr + American odds) */}
                <text
                  x="218"
                  y={noLabelY}
                  fontSize="10"
                  fontWeight="bold"
                  fill="#374151"
                  fontFamily="system-ui, sans-serif"
                >
                  {noAbbr}
                </text>
                <text
                  x="218"
                  y={noLabelY + 15}
                  fontSize="13"
                  fontWeight="bold"
                  fill={noPrice >= 0.5 ? '#374151' : '#16A34A'}
                  fontFamily="system-ui, sans-serif"
                >
                  {toAmericanOdds(noPrice)}
                </text>
              </svg>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-gray-100 mb-3" />

            {/* ── Success / Error feedback ── */}
            {showSuccess && (
              <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-green-600 font-medium text-sm text-center">
                  Order placed successfully!
                </p>
              </div>
            )}
            {(localError || orderError) && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-500 text-sm text-center">
                  {localError || orderError?.message}
                </p>
              </div>
            )}

            {/* ── Buy / Sell toggle + order type ── */}
            <BuySellToggle
              side={side}
              onSideChange={(s) => {
                setSide(s);
                setLocalError(null);
              }}
              orderType={orderType}
              onOrderTypeChange={(t) => {
                setOrderType(t);
                setLocalError(null);
              }}
            />

            {/* GTD expiration selector */}
            {orderType === 'gtd' && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-500 flex-shrink-0">Expires in</span>
                <select
                  value={gtdHours}
                  onChange={(e) => setGtdHours(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            )}

            {/* ── Outcome selector (team / Yes-No buttons) ── */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => {
                  setSelectedOutcome('yes');
                  setInputValue('');
                  setLocalError(null);
                }}
                className={`flex-1 py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedOutcome === 'yes'
                    ? side === 'SELL'
                      ? 'bg-green-500 border-2 border-green-500 text-white'
                      : 'bg-green-50 border-2 border-green-500 text-green-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300'
                }`}
              >
                {yesOutcomeName}{' '}
                <span className="font-normal opacity-70">
                  .{String(Math.round(yesPrice * 100)).padStart(2, '0')}
                </span>
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome('no');
                  setInputValue('');
                  setLocalError(null);
                }}
                className={`flex-1 py-3 px-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedOutcome === 'no'
                    ? side === 'SELL'
                      ? 'bg-red-500 border-2 border-red-500 text-white'
                      : 'bg-red-50 border-2 border-red-500 text-red-700'
                    : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300'
                }`}
              >
                {noOutcomeName}{' '}
                <span className="font-normal opacity-70">
                  .{String(Math.round(noPrice * 100)).padStart(2, '0')}
                </span>
              </button>
            </div>

            {/* ── Amount input (Buy mode) ── */}
            {side === 'BUY' && (
              <AmountInput
                amount={inputValue}
                onAmountChange={(v) => {
                  setInputValue(v);
                  setLocalError(null);
                }}
                balance={balance}
                onQuickAmount={(a) => {
                  setInputValue(String(a));
                  setLocalError(null);
                }}
                onMaxAmount={() => {
                  if (isLimitVariant && limitPriceNum > 0) {
                    // Max shares = how many whole shares the balance can buy
                    const maxShares = Math.floor(balance / limitPriceNum);
                    setInputValue(String(maxShares));
                  } else if (balance > 0) {
                    setInputValue(balance.toFixed(2));
                  }
                  setLocalError(null);
                }}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => {
                  setLimitPrice(v);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                limitPriceDecimal={isLimitVariant ? limitPriceNum : undefined}
                minOrderAmount={isLimitVariant ? LIMIT_MIN_SHARES : 1}
              />
            )}

            {/* ── Shares input (Sell mode) ── */}
            {side === 'SELL' && (
              <SharesInput
                shares={inputValue}
                onSharesChange={(v) => {
                  setInputValue(v);
                  setLocalError(null);
                }}
                shareBalance={activeShareBalance}
                onQuickPercentage={(pct) => {
                  setInputValue(((activeShareBalance * pct) / 100).toFixed(2));
                  setLocalError(null);
                }}
                onMaxShares={() => {
                  if (activeShareBalance > 0) {
                    setInputValue(activeShareBalance.toFixed(2));
                    setLocalError(null);
                  }
                }}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => {
                  setLimitPrice(v);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                minShares={market.orderMinSize || 5}
              />
            )}

            {/* ── To Win (Buy) ── */}
            {side === 'BUY' && (
              <ToWinDisplay
                potentialWin={potentialWin}
                avgPrice={effectivePrice}
                amount={isLimitVariant ? totalCost : inputNum}
                totalCost={isLimitVariant ? totalCost : undefined}
              />
            )}

            {/* ── You'll Receive (Sell) ── */}
            {side === 'SELL' && (
              <YoullReceiveDisplay
                amountToReceive={amountToReceive}
                avgPrice={effectivePrice}
                shares={inputNum}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            )}

            {/* ── Place Order button ── */}
            <button
              onClick={handlePlaceOrder}
              disabled={
                isSubmitting ||
                inputNum <= 0 ||
                !clobClient ||
                hasInsufficientBalance
              }
              className={`w-full py-4 font-bold rounded-xl transition-all text-base ${
                side === 'BUY'
                  ? 'bg-green-400 hover:bg-green-500 disabled:bg-green-300'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
              } disabled:cursor-not-allowed text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Placing Order...
                </span>
              ) : !clobClient ? (
                'Connect Wallet'
              ) : (
                'Place Order'
              )}
            </button>

            {!clobClient && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Initialize trading session to place orders
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
