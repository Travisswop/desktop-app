'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { type BetType, type Currency } from '@/types/predictionMarkets';

interface BetAmountModalProps {
  marketId: string;
  marketQuestion: string;
  betType: BetType;
  onConfirm: (amount: number, currency: Currency) => void;
  onCancel: () => void;
}

export function BetAmountModal({
  marketId,
  marketQuestion,
  betType,
  onConfirm,
  onCancel,
}: BetAmountModalProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USDC');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (numAmount > 1000000) {
      setError('Amount is too large');
      return;
    }

    onConfirm(numAmount, currency);
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    const formatted = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : sanitized;

    setAmount(formatted);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>🎲</span>
              Place Your Bet
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {marketId}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Market Question */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Market</div>
          <div className="text-sm font-medium text-gray-900 line-clamp-2">
            {marketQuestion}
          </div>
        </div>

        {/* Bet Type Badge */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Betting on</div>
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
              betType === 'YES'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {betType}
          </div>
        </div>

        {/* Currency Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <div className="flex gap-2">
            {(['USDC', 'SOL', 'CASH'] as Currency[]).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  currency === curr
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Bet
          </label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-medium"
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              {currency}
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="mb-6">
          <div className="text-xs text-gray-500 mb-2">Quick select</div>
          <div className="grid grid-cols-4 gap-2">
            {['10', '25', '50', '100'].map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => handleAmountChange(quickAmount)}
                className="py-2 px-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
              >
                {quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
