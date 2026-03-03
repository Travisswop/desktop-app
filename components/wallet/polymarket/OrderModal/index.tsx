'use client';

import { useState, useEffect, useRef } from 'react';
import { useTrading } from '@/providers/polymarket';
import { useAMMQuote } from '@/hooks/polymarket/useAMMPool';
import Portal from '../shared/Portal';
import OutcomeSelector from './OutcomeSelector';
import AmountInput from './AmountInput';
import ToWinDisplay from './ToWinDisplay';
import YoullReceiveDisplay from './YoullReceiveDisplay';

type OrderPlacementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  currentPrice: number;
  marketId: `0x${string}`;
  poolAddress: `0x${string}` | undefined;
  yesPrice?: number;
  noPrice?: number;
  balance?: number;
  yesShares?: number;
  noShares?: number;
};

export default function OrderPlacementModal({
  isOpen,
  onClose,
  marketTitle,
  outcome,
  currentPrice,
  marketId,
  poolAddress,
  yesPrice = currentPrice,
  noPrice = 1 - currentPrice,
  balance = 0,
  yesShares = 0,
  noShares = 0,
}: OrderPlacementModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>(
    outcome.toLowerCase() === 'no' ? 'no' : 'yes',
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { submitOrder, isSubmitting, orderError, txHash } = useTrading();
  const modalRef = useRef<HTMLDivElement>(null);

  const isYes = selectedOutcome === 'yes';
  const activePrice = isYes ? yesPrice : noPrice;
  const activeShareBalance = isYes ? yesShares : noShares;
  const inputNum = parseFloat(inputValue) || 0;

  // AMM quote for buy side
  const { data: quote } = useAMMQuote(
    poolAddress,
    isYes,
    side === 'BUY' ? inputNum : 0,
  );

  const tokensOut = quote?.tokensOut ?? (inputNum / (activePrice || 0.5));
  const priceImpact = quote?.priceImpact ?? 0;
  const amountToReceive = side === 'SELL' ? inputNum * activePrice : 0;
  const hasInsufficientBalance =
    side === 'BUY' ? inputNum > balance : inputNum > activeShareBalance;

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSide('BUY');
      setSelectedOutcome(outcome.toLowerCase() === 'no' ? 'no' : 'yes');
      setLocalError(null);
      setShowSuccess(false);
    }
  }, [isOpen, outcome]);

  useEffect(() => {
    setInputValue('');
    setLocalError(null);
  }, [side]);

  useEffect(() => {
    if (txHash && isOpen) {
      setShowSuccess(true);
      const timer = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(timer);
    }
  }, [txHash, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // 5% default slippage tolerance on AMM trades
  const SLIPPAGE = 0.05;

  const handlePlaceOrder = async () => {
    if (inputNum < 1) {
      setLocalError('Minimum order amount is $1.00');
      return;
    }
    if (hasInsufficientBalance) {
      setLocalError('Insufficient balance');
      return;
    }
    try {
      const minOut = side === 'BUY'
        ? tokensOut * (1 - SLIPPAGE)
        : amountToReceive * (1 - SLIPPAGE);

      await submitOrder({ marketId, isYes, isBuy: side === 'BUY', amount: inputNum, minOut });
    } catch {
      // error surfaced via orderError
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl w-full max-w-[360px] border border-gray-200 shadow-2xl overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-600 line-clamp-2 flex-1 pr-2">
                {marketTitle}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            {showSuccess && (
              <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-600 font-medium text-sm text-center">Order placed successfully!</p>
              </div>
            )}

            {(localError || orderError) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-500 text-sm text-center">{localError || orderError?.message}</p>
              </div>
            )}

            {/* Buy / Sell Toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    side === s
                      ? s === 'BUY' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              ))}
            </div>

            <OutcomeSelector
              selectedOutcome={selectedOutcome}
              onOutcomeChange={(o: 'yes' | 'no') => { setSelectedOutcome(o); setInputValue(''); setLocalError(null); }}
              yesPrice={yesPrice}
              noPrice={noPrice}
              side={side}
            />

            {side === 'BUY' && (
              <AmountInput
                amount={inputValue}
                onAmountChange={(v: string) => { setInputValue(v); setLocalError(null); }}
                balance={balance}
                onQuickAmount={(a: number) => { setInputValue(a.toString()); setLocalError(null); }}
                onMaxAmount={() => { setInputValue(balance.toFixed(2)); setLocalError(null); }}
                isSubmitting={isSubmitting}
                orderType="market"
                limitPrice=""
                onLimitPriceChange={() => {}}
                tickSize={0.01}
                isLoadingTickSize={false}
                minOrderAmount={1}
              />
            )}

            {side === 'SELL' && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Shares to sell</label>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setLocalError(null); }}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Balance: {activeShareBalance.toFixed(2)} shares</p>
              </div>
            )}

            {/* Price impact badge */}
            {side === 'BUY' && priceImpact > 0.01 && (
              <p className={`text-xs mb-2 ${priceImpact > 0.05 ? 'text-red-500' : 'text-yellow-600'}`}>
                Price impact: {(priceImpact * 100).toFixed(1)}%
              </p>
            )}

            {side === 'BUY' && (
              <ToWinDisplay potentialWin={tokensOut} avgPrice={activePrice} amount={inputNum} />
            )}
            {side === 'SELL' && (
              <YoullReceiveDisplay
                amountToReceive={amountToReceive}
                avgPrice={activePrice}
                shares={inputNum}
                hasInsufficientBalance={hasInsufficientBalance}
              />
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || inputNum <= 0 || hasInsufficientBalance}
              className={`w-full py-3.5 font-bold rounded-xl transition-all text-base ${
                side === 'BUY'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/30'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30'
              } disabled:cursor-not-allowed text-white`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Placing Order...
                </span>
              ) : (
                `${side === 'BUY' ? 'Buy' : 'Sell'} ${isYes ? 'Yes' : 'No'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
