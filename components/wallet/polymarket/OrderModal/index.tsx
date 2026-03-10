'use client';

import { useClobOrder, useTickSize } from '@/hooks/polymarket';
import { useState, useEffect, useRef } from 'react';
import { usePolymarketWallet } from '@/providers/polymarket';

import Portal from '../shared/Portal';
import BuySellToggle, { type OrderVariant } from './BuySellToggle';
import OutcomeSelector from './OutcomeSelector';
import AmountInput from './AmountInput';
import SharesInput from './SharesInput';
import ToWinDisplay from './ToWinDisplay';
import YoullReceiveDisplay from './YoullReceiveDisplay';
import OrderConfirmSheet, {
  type PendingOrderData,
} from '../shared/OrderConfirmSheet';

import type { ClobClient } from '@polymarket/clob-client';

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false;
  const multiplier = Math.round(price / tickSize);
  const expectedPrice = multiplier * tickSize;
  return Math.abs(price - expectedPrice) < 1e-10;
}

type OrderPlacementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  currentPrice: number;
  tokenId: string;
  negRisk?: boolean;
  clobClient: ClobClient | null;
  yesPrice?: number;
  noPrice?: number;
  yesTokenId?: string;
  noTokenId?: string;
  balance?: number;
  yesShares?: number;
  noShares?: number;
  orderMinSize?: number;
  yesOutcomeName?: string;
  noOutcomeName?: string;
};

export default function OrderPlacementModal({
  isOpen,
  onClose,
  marketTitle,
  outcome,
  currentPrice,
  tokenId,
  negRisk = false,
  clobClient,
  yesPrice = currentPrice,
  noPrice = 1 - currentPrice,
  yesTokenId = tokenId,
  noTokenId,
  balance = 0,
  yesShares = 0,
  noShares = 0,
  orderMinSize = 5,
  yesOutcomeName = 'Yes',
  noOutcomeName = 'No',
}: OrderPlacementModalProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderVariant>('market');
  // GTD expiration in hours from now (converted to UTC seconds on submit)
  const [gtdHours, setGtdHours] = useState<number>(24);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcome, setSelectedOutcome] = useState<
    'yes' | 'no'
  >(noTokenId && tokenId === noTokenId ? 'no' : 'yes');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingOrder, setPendingOrder] =
    useState<PendingOrderData | null>(null);

  const { eoaAddress } = usePolymarketWallet();
  const modalRef = useRef<HTMLDivElement>(null);

  const activeTokenId =
    selectedOutcome === 'yes' ? yesTokenId : noTokenId || tokenId;
  const activePrice = selectedOutcome === 'yes' ? yesPrice : noPrice;
  const activeShareBalance =
    selectedOutcome === 'yes' ? yesShares : noShares;

  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? activeTokenId : null,
  );

  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(clobClient, eoaAddress);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setOrderType('market');
      setSide('BUY');
      setSelectedOutcome(
        noTokenId && tokenId === noTokenId ? 'no' : 'yes',
      );
      setLimitPrice('');
      setLocalError(null);
      setShowSuccess(false);
      setPendingOrder(null);
    }
  }, [isOpen, outcome]);

  // Reset input when switching between buy/sell
  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  useEffect(() => {
    if (orderId && isOpen) {
      setPendingOrder(null);
      setShowSuccess(true);
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orderId, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () =>
      document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const inputNum = parseFloat(inputValue) || 0;
  // limitPrice is entered by the user in cents (1–99); convert to decimal (0–1) for the API
  const limitPriceNum = (parseFloat(limitPrice) || 0) / 100;
  // Whether the current variant is a market-type or limit-type order
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
  const amountToReceive =
    side === 'SELL' ? inputNum * effectivePrice : 0;

  const hasInsufficientBalance =
    side === 'BUY' ? totalCost > balance : inputNum > activeShareBalance;

  const LIMIT_MIN_SHARES = orderMinSize;

  const handlePlaceOrder = () => {
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
        setLocalError(
          `Price must be a multiple of tick size (${(tickSize * 100).toFixed(0)}¢)`,
        );
        return;
      }
    }

    // Market BUY: pass dollar amount (CLOB converts internally)
    // Limit BUY:  pass share count directly
    // Any SELL:   pass share count
    const orderSize =
      isMarketVariant && side === 'BUY' ? inputNum : shares;

    // GTD expiration: current time + 60s security buffer + chosen hours
    const gtdExpiration =
      orderType === 'gtd'
        ? Math.floor(Date.now() / 1000) + 60 + gtdHours * 3600
        : undefined;

    setPendingOrder({
      // display
      side,
      outcomeName:
        selectedOutcome === 'yes' ? yesOutcomeName : noOutcomeName,
      cost: side === 'BUY' ? (isLimitVariant ? totalCost : inputNum) : inputNum,
      potentialWin,
      amountToReceive,
      priceDecimal: effectivePrice,
      // submit params
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
      console.error('Error placing order:', err);
    }
  };

  const handleBackdropClick = (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Buy mode: quick dollar amounts
  const handleQuickAmount = (quickAmount: number) => {
    setInputValue(quickAmount.toString());
    setLocalError(null);
  };

  const handleMaxAmount = () => {
    if (balance > 0) {
      setInputValue(balance.toFixed(2));
      setLocalError(null);
    }
  };

  // Sell mode: quick percentage of shares
  const handleQuickPercentage = (percentage: number) => {
    const shareAmount = activeShareBalance * (percentage / 100);
    setInputValue(shareAmount.toFixed(2));
    setLocalError(null);
  };

  const handleMaxShares = () => {
    if (activeShareBalance > 0) {
      setInputValue(activeShareBalance.toFixed(2));
      setLocalError(null);
    }
  };

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
          {/* Header with Market Title */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-600 line-clamp-2 flex-1 pr-2">
                {marketTitle}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-800 transition-colors p-1"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 pb-4">
            {/* Success Message */}
            {showSuccess && (
              <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-600 font-medium text-sm text-center">
                  Order placed successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {(localError || orderError) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-500 text-sm text-center">
                  {localError || orderError?.message}
                </p>
              </div>
            )}

            {/* Buy/Sell Toggle with Order Type */}
            <BuySellToggle
              side={side}
              onSideChange={(newSide: 'BUY' | 'SELL') => {
                setSide(newSide);
                setLocalError(null);
              }}
              orderType={orderType}
              onOrderTypeChange={(type: OrderVariant) => {
                setOrderType(type);
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

            {/* Outcome Selector */}
            <OutcomeSelector
              selectedOutcome={selectedOutcome}
              onOutcomeChange={(newOutcome: 'yes' | 'no') => {
                setSelectedOutcome(newOutcome);
                setInputValue('');
                setLocalError(null);
              }}
              yesPrice={yesPrice}
              noPrice={noPrice}
              side={side}
              yesLabel={yesOutcomeName}
              noLabel={noOutcomeName}
            />

            {/* Buy Mode: Amount Input */}
            {side === 'BUY' && (
              <AmountInput
                amount={inputValue}
                onAmountChange={(value: string) => {
                  setInputValue(value);
                  setLocalError(null);
                }}
                balance={balance}
                onQuickAmount={handleQuickAmount}
                onMaxAmount={() => {
                  if (isLimitVariant && limitPriceNum > 0) {
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
                onLimitPriceChange={(value: string) => {
                  setLimitPrice(value);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                limitPriceDecimal={isLimitVariant ? limitPriceNum : undefined}
                minOrderAmount={isLimitVariant ? LIMIT_MIN_SHARES : 1}
              />
            )}

            {/* Sell Mode: Shares Input */}
            {side === 'SELL' && (
              <SharesInput
                shares={inputValue}
                onSharesChange={(value: string) => {
                  setInputValue(value);
                  setLocalError(null);
                }}
                shareBalance={activeShareBalance}
                onQuickPercentage={handleQuickPercentage}
                onMaxShares={handleMaxShares}
                isSubmitting={isSubmitting}
                orderType={isLimitVariant ? 'limit' : 'market'}
                limitPrice={limitPrice}
                onLimitPriceChange={(value: string) => {
                  setLimitPrice(value);
                  setLocalError(null);
                }}
                tickSize={tickSize}
                isLoadingTickSize={isLoadingTickSize}
                minShares={orderMinSize}
              />
            )}

            {/* Buy Mode: To Win Display */}
            {side === 'BUY' && (
              <ToWinDisplay
                potentialWin={potentialWin}
                avgPrice={effectivePrice}
                amount={isLimitVariant ? totalCost : inputNum}
                totalCost={isLimitVariant ? totalCost : undefined}
              />
            )}

            {/* Sell Mode: You'll Receive Display */}
            {side === 'SELL' && (
              <YoullReceiveDisplay
                amountToReceive={amountToReceive}
                avgPrice={effectivePrice}
                shares={inputNum}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            )}

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={
                isSubmitting ||
                inputNum <= 0 ||
                !clobClient ||
                hasInsufficientBalance
              }
              className={`w-full py-3.5 font-bold rounded-xl transition-all text-base ${
                side === 'BUY'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/30'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30'
              } disabled:cursor-not-allowed text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
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
                `${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome === 'yes' ? yesOutcomeName : noOutcomeName}`
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

      {pendingOrder && (
        <OrderConfirmSheet
          isOpen={true}
          onClose={() => setPendingOrder(null)}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          marketTitle={marketTitle}
          order={pendingOrder}
          error={orderError?.message}
        />
      )}
    </Portal>
  );
}
