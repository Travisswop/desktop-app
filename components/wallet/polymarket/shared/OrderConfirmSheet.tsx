'use client';

import Portal from './Portal';

export type PendingOrderData = {
  // Display
  side: 'BUY' | 'SELL';
  outcomeName: string;
  cost: number;
  potentialWin: number;
  amountToReceive: number;
  priceDecimal: number;
  // Submit params
  tokenId: string;
  size: number;
  price?: number;
  negRisk: boolean;
  isMarketOrder: boolean;
  fillType: 'FAK' | 'FOK';
  expiration?: number;
};

type OrderConfirmSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  marketTitle: string;
  order: PendingOrderData;
  error?: string | null;
};

function decimalToAmericanOdds(price: number): string {
  if (price <= 0 || price >= 1) return 'N/A';
  if (price >= 0.5) {
    return `-${Math.round((price / (1 - price)) * 100)}`;
  }
  return `+${Math.round(((1 - price) / price) * 100)}`;
}

export default function OrderConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  marketTitle,
  order,
  error,
}: OrderConfirmSheetProps) {
  if (!isOpen) return null;

  const odds = decimalToAmericanOdds(order.priceDecimal);
  const priceCents = Math.round(order.priceDecimal * 100);

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-[360px] border border-gray-200 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative flex items-center justify-center pt-4 pb-2 px-4">
            <button
              onClick={onClose}
              className="absolute left-4 text-gray-400 hover:text-gray-800 transition-colors p-1"
              aria-label="Close"
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
            <div className="flex items-center gap-1.5 text-gray-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 2l2.4 5.4 5.6.8-4 4 .9 5.8L12 15.4l-5 2.6.9-5.8-4-4 5.6-.8L12 2z"
                />
              </svg>
              <span className="text-sm font-medium">Position</span>
            </div>
          </div>

          {/* Market / brand info */}
          <div className="text-center px-4 pb-4">
            <p className="text-2xl font-black tracking-tight text-gray-900 mb-1">
              SWOP
            </p>
            <p className="text-sm text-gray-500 line-clamp-2">
              {marketTitle}
            </p>
          </div>

          {/* "You bought / sold [outcome]" */}
          <div className="flex items-center justify-center gap-2 mb-5 px-4">
            <span className="text-base text-gray-700">
              {order.side === 'BUY' ? 'You buy' : 'You sell'}
            </span>
            <span className="inline-flex items-center bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
              <span className="text-sm font-bold text-gray-900">
                {order.outcomeName}
              </span>
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-500 text-sm text-center">
                {error}
              </p>
            </div>
          )}

          {/* Stats table */}
          <div className="mx-4 border border-gray-100 rounded-xl overflow-hidden mb-4">
            {/* Cost */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Cost</span>
              <span className="text-sm font-semibold text-gray-900">
                ${order.cost.toFixed(2)}
              </span>
            </div>

            {/* Odds */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Odds</span>
              <span className="text-sm font-semibold text-gray-900">
                {odds}{' '}
                <span className="text-gray-400 font-normal">
                  ({priceCents}¢)
                </span>
              </span>
            </div>

            {/* To win (BUY) */}
            {order.side === 'BUY' && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">
                    To win
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ${order.potentialWin.toFixed(2)}
                </span>
              </div>
            )}

            {/* Receive (SELL) */}
            {order.side === 'SELL' && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Receive</span>
                <span className="text-sm font-semibold text-green-600">
                  ${order.amountToReceive.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Confirm button */}
          <div className="px-4 pb-4">
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-xl transition-colors text-base"
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
                  Confirming...
                </span>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
