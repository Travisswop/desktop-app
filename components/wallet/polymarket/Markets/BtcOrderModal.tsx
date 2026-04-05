'use client';

/**
 * BtcOrderModal
 *
 * A self-contained order modal for the "BTC 5 Minute Up or Down" market.
 * Unlike the generic OrderPlacementModal, this component calls
 * useBtcUpDownMarket() internally so that:
 *   • The Up/Down prices always reflect the *current* probability (live).
 *   • The "To win" figure recalculates instantly when the user types.
 *
 * Token IDs still come from a real Polymarket BTC backing market so orders
 * reach the CLOB.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ClobClient } from '@polymarket/clob-client';

import { useBtcUpDownMarket } from '@/hooks/polymarket/useBtcUpDownMarket';
import { useClobOrder, useTickSize } from '@/hooks/polymarket';
import { usePolymarketWallet } from '@/providers/polymarket';
import { MIN_ORDER_SIZE } from '@/constants/polymarket';

import Portal from '../shared/Portal';
import BuySellToggle, { type OrderVariant } from '../OrderModal/BuySellToggle';
import OutcomeSelector from '../OrderModal/OutcomeSelector';
import AmountInput from '../OrderModal/AmountInput';
import SharesInput from '../OrderModal/SharesInput';
import ToWinDisplay from '../OrderModal/ToWinDisplay';
import YoullReceiveDisplay from '../OrderModal/YoullReceiveDisplay';
import OrderConfirmSheet, {
  type PendingOrderData,
} from '../shared/OrderConfirmSheet';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  const multiplier = Math.round(price / tickSize);
  return Math.abs(price - multiplier * tickSize) < 1e-10;
}

/** Returns a human-readable label for the current 5-minute window, e.g. "Apr 5, 1:20AM-1:25AM". */
function formatWindowLabel(): string {
  const now = new Date();
  const wMin = Math.floor(now.getMinutes() / 5) * 5;
  const nMin = wMin + 5;
  const fmt = (h: number, m: number) => {
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ap}`;
  };
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const start = fmt(now.getHours(), wMin);
  const end = fmt(nMin >= 60 ? (now.getHours() + 1) % 24 : now.getHours(), nMin % 60);
  return `${date}, ${start}-${end}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BtcOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which button the user clicked on the BTC card */
  initialOutcome: 'Up' | 'Down';
  /** Token IDs from the Polymarket backing market (Up = yes token, Down = no token) */
  upTokenId: string;
  downTokenId: string;
  negRisk: boolean;
  orderMinSize?: number;
  clobClient: ClobClient | null;
  balance: number;
  upShares?: number;
  downShares?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BtcOrderModal({
  isOpen,
  onClose,
  initialOutcome,
  upTokenId,
  downTokenId,
  negRisk,
  orderMinSize = MIN_ORDER_SIZE,
  clobClient,
  balance,
  upShares = 0,
  downShares = 0,
}: BtcOrderModalProps) {
  // ── Live BTC probability — updates every second ──────────────────────────
  const { upProbability, currentPrice, countdownSeconds, isConnected } =
    useBtcUpDownMarket();

  // Prices derived from live probability. These re-compute on every render,
  // so OutcomeSelector and ToWinDisplay are always fresh.
  const upPrice = upProbability / 100;
  const downPrice = (100 - upProbability) / 100;

  // ── Form state ─────────────────────────────────────────────────────────
  const [selectedOutcome, setSelectedOutcome] = useState<'up' | 'down'>(
    initialOutcome === 'Down' ? 'down' : 'up',
  );
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<OrderVariant>('market');
  const [gtdHours, setGtdHours] = useState(24);
  const [inputValue, setInputValue] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrderData | null>(null);

  const { eoaAddress } = usePolymarketWallet();
  const modalRef = useRef<HTMLDivElement>(null);

  const activeTokenId = selectedOutcome === 'up' ? upTokenId : downTokenId;
  const activePrice = selectedOutcome === 'up' ? upPrice : downPrice;
  const activeShares = selectedOutcome === 'up' ? upShares : downShares;

  const isLimitVariant = orderType === 'limit' || orderType === 'gtd';
  const isMarketVariant = orderType === 'market' || orderType === 'fak';
  const limitPriceNum = (parseFloat(limitPrice) || 0) / 100;
  const effectivePrice = isLimitVariant ? limitPriceNum : activePrice;

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? activeTokenId : null,
  );
  const { submitOrder, isSubmitting, error: orderError, orderId, resetOrder } = useClobOrder(
    clobClient,
    eoaAddress,
  );

  // ── Derived figures (live on every render) ───────────────────────────────
  const inputNum = parseFloat(inputValue) || 0;

  const shares =
    side === 'BUY'
      ? isLimitVariant
        ? inputNum
        : effectivePrice > 0
          ? inputNum / effectivePrice
          : 0
      : inputNum;

  const totalCost =
    side === 'BUY' && isLimitVariant ? shares * limitPriceNum : inputNum;

  const potentialWin = side === 'BUY' ? shares : 0;
  const amountToReceive = side === 'SELL' ? inputNum * effectivePrice : 0;

  const EPSILON = 0.01 + 1e-6;
  const hasInsufficientBalance =
    side === 'BUY'
      ? totalCost - balance > EPSILON
      : inputNum - activeShares > EPSILON;

  // ── State reset ─────────────────────────────────────────────────────────
  // Called on every close path so the modal is always blank when reopened.
  // resetOrder() clears the orderId inside useClobOrder so the auto-close
  // effect does NOT re-fire the next time the modal is opened.
  const resetFormState = useCallback(() => {
    setSelectedOutcome(initialOutcome === 'Down' ? 'down' : 'up');
    setSide('BUY');
    setOrderType('market');
    setGtdHours(24);
    setInputValue('');
    setLimitPrice('');
    setLocalError(null);
    setShowSuccess(false);
    setPendingOrder(null);
    resetOrder(); // ← must come last; clears orderId so the success effect won't re-trigger
  }, [initialOutcome, resetOrder]);

  // Single close handler — always resets before dismissing.
  const handleClose = useCallback(() => {
    resetFormState();
    onClose();
  }, [resetFormState, onClose]);

  // Safety-net reset when the modal is opened (covers external re-opens
  // that bypass handleClose, e.g. parent toggling isOpen directly).
  useEffect(() => {
    if (isOpen) resetFormState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // intentionally omit resetFormState to avoid re-running on every render

  // Reset amount when switching buy/sell
  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  // Auto-close on success — go through handleClose so state is cleared.
  // Also persist the token IDs + window label to localStorage so the Positions
  // panel can reliably identify and relabel this position regardless of which
  // tab was active or which crypto markets page was loaded.
  useEffect(() => {
    if (orderId && isOpen) {
      try {
        localStorage.setItem(
          'btc5min_position_data',
          JSON.stringify({ upTokenId, downTokenId, windowLabel: formatWindowLabel() }),
        );
      } catch { /* ignore storage errors in private/restricted contexts */ }
      setPendingOrder(null);
      setShowSuccess(true);
      const t = setTimeout(handleClose, 2000);
      return () => clearTimeout(t);
    }
  }, [orderId, isOpen, handleClose, upTokenId, downTokenId]);

  // Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, handleClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handlePlaceOrder = () => {
    setLocalError(null);

    if (side === 'BUY') {
      if (isLimitVariant) {
        if (inputNum < orderMinSize) {
          setLocalError(`Minimum order is ${orderMinSize} shares`);
          return;
        }
      } else if (inputNum < 1) {
        setLocalError('Minimum order amount is $1.00');
        return;
      }
    } else {
      if (inputNum < 1) {
        setLocalError('Minimum shares to sell: 1');
        return;
      }
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
        setLocalError(`Price must be a multiple of tick size (${(tickSize * 100).toFixed(0)}¢)`);
        return;
      }
    }

    const orderSize = isMarketVariant && side === 'BUY' ? inputNum : shares;
    const gtdExpiration =
      orderType === 'gtd'
        ? Math.floor(Date.now() / 1000) + 60 + gtdHours * 3600
        : undefined;

    const outcomeName = selectedOutcome === 'up' ? 'Up' : 'Down';

    setPendingOrder({
      side,
      outcomeName,
      cost: side === 'SELL' ? amountToReceive : isLimitVariant ? totalCost : inputNum,
      potentialWin,
      amountToReceive,
      priceDecimal: effectivePrice,
      tokenId: activeTokenId,
      size: orderSize,
      price: isLimitVariant ? limitPriceNum : undefined,
      negRisk,
      isMarketOrder: isMarketVariant,
      fillType: orderType === 'fak' ? 'FAK' : 'FOK',
      expiration: gtdExpiration,
    });
  };

  const handleConfirm = async () => {
    if (!pendingOrder) return;
    try {
      await submitOrder({
        tokenId: pendingOrder.tokenId,
        size: pendingOrder.size,
        price: pendingOrder.price,
        side: pendingOrder.side,
        negRisk: pendingOrder.negRisk,
        isMarketOrder: pendingOrder.isMarketOrder,
        fillType: pendingOrder.fillType,
        expiration: pendingOrder.expiration,
      });
    } catch (err) {
      console.error('[BtcOrderModal] Order failed:', err);
    }
  };

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleMaxAmount = () => {
    if (isLimitVariant && limitPriceNum > 0) {
      setInputValue(String(Math.floor(balance / limitPriceNum)));
    } else if (balance > 0) {
      setInputValue((Math.floor((balance - 0.000001) * 100) / 100).toFixed(2));
    }
    setLocalError(null);
  };

  const handleMaxShares = () => {
    if (activeShares > 0) { setInputValue(activeShares.toFixed(2)); setLocalError(null); }
  };

  if (!isOpen) return null;

  // ── Countdown helper ────────────────────────────────────────────────────
  const cdMins = Math.floor(countdownSeconds / 60);
  const cdSecs = countdownSeconds % 60;
  const cdLabel = `${cdMins}:${String(cdSecs).padStart(2, '0')}`;

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl w-full max-w-[360px] border border-gray-200 shadow-2xl overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start justify-between">
              {/* Title + live meta */}
              <div className="flex-1 pr-2 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {/* Live dot */}
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isConnected ? 'bg-red-400' : 'bg-gray-300'
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        isConnected ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-wide ${
                      isConnected ? 'text-red-600' : 'text-gray-400'
                    }`}
                  >
                    {isConnected ? 'LIVE' : 'CONNECTING'}
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    · Resets {cdLabel}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
                  BTC 5 Minute Up or Down
                </h3>
                {currentPrice !== null && (
                  <p className="text-xs text-gray-400 tabular-nums">
                    BTC{' '}
                    {currentPrice.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-800 transition-colors p-1 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-4 pb-4">
            {/* Success */}
            {showSuccess && (
              <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-600 font-medium text-sm text-center">
                  Order placed successfully!
                </p>
              </div>
            )}

            {/* Errors */}
            {(localError || orderError) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-500 text-sm text-center">
                  {localError || orderError?.message}
                </p>
              </div>
            )}

            {/* Buy / Sell + order type */}
            <BuySellToggle
              side={side}
              onSideChange={(s) => { setSide(s); setLocalError(null); }}
              orderType={orderType}
              onOrderTypeChange={(t) => {
                const wasMarket = isMarketVariant;
                setOrderType(t);
                setLocalError(null);
                const nowMarket = t === 'market' || t === 'fak';
                const nowLimit = t === 'limit' || t === 'gtd';
                if ((wasMarket && nowLimit) || (!wasMarket && nowMarket)) {
                  setInputValue('');
                  setLimitPrice('');
                }
              }}
            />

            {/* GTD expiry */}
            {orderType === 'gtd' && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-500 flex-shrink-0">Expires in</span>
                <select
                  value={gtdHours}
                  onChange={(e) => setGtdHours(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            )}

            {/* Outcome selector — prices are live from useBtcUpDownMarket */}
            <OutcomeSelector
              selectedOutcome={selectedOutcome === 'up' ? 'yes' : 'no'}
              onOutcomeChange={(o) => {
                setSelectedOutcome(o === 'yes' ? 'up' : 'down');
                setInputValue('');
                setLocalError(null);
              }}
              yesPrice={upPrice}
              noPrice={downPrice}
              side={side}
              yesLabel="Up"
              noLabel="Down"
            />

            {/* Amount / Shares input */}
            {side === 'BUY' ? (
              <AmountInput
                amount={inputValue}
                onAmountChange={(v) => { setInputValue(v); setLocalError(null); }}
                balance={balance}
                onQuickAmount={(a) => { setInputValue(String(a)); setLocalError(null); }}
                onMaxAmount={handleMaxAmount}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => { setLimitPrice(v); setLocalError(null); }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                limitPriceDecimal={isLimitVariant ? limitPriceNum : undefined}
                minOrderAmount={isLimitVariant ? orderMinSize : 1}
              />
            ) : (
              <SharesInput
                shares={inputValue}
                onSharesChange={(v) => { setInputValue(v); setLocalError(null); }}
                shareBalance={activeShares}
                onQuickPercentage={(pct) => {
                  setInputValue((activeShares * pct / 100).toFixed(2));
                  setLocalError(null);
                }}
                onMaxShares={handleMaxShares}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(v) => { setLimitPrice(v); setLocalError(null); }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                minShares={orderMinSize}
              />
            )}

            {/* To win / You'll receive — live because effectivePrice and shares are re-derived */}
            {side === 'BUY' ? (
              <ToWinDisplay
                potentialWin={potentialWin}
                avgPrice={effectivePrice}
                amount={isLimitVariant ? totalCost : inputNum}
                totalCost={isLimitVariant ? totalCost : undefined}
              />
            ) : (
              <YoullReceiveDisplay
                amountToReceive={amountToReceive}
                avgPrice={effectivePrice}
                shares={inputNum}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            )}

            {/* Submit */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || inputNum <= 0 || !clobClient || hasInsufficientBalance}
              className={`w-full py-3.5 font-bold rounded-xl transition-all text-base text-white ${
                side === 'BUY'
                  ? selectedOutcome === 'up'
                    ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/30'
                    : 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/30'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30'
              } disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Placing Order...
                </span>
              ) : !clobClient ? (
                'Connect Wallet'
              ) : (
                `${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome === 'up' ? 'Up' : 'Down'}`
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

      {/* Confirm sheet */}
      {pendingOrder && (
        <OrderConfirmSheet
          isOpen
          onClose={() => setPendingOrder(null)}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          marketTitle="BTC 5 Minute Up or Down"
          order={pendingOrder}
          error={orderError?.message}
        />
      )}
    </Portal>
  );
}
