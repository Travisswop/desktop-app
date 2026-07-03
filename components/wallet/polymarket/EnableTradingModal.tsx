'use client';

import {
  ShieldCheck,
  PenLine,
  Wallet,
  CheckCircle2,
  X,
} from 'lucide-react';

/**
 * One-time consent + explainer shown before a Polymarket trading session is
 * initialized. Confirming runs the deploy → credentials → approvals flow
 * (a wallet signature; no funds are moved). Shared by the Predictions panel
 * and the market detail page so the entry point is consistent everywhere.
 */
export default function EnableTradingModal({
  onConfirm,
  onDismiss,
  disabledReason,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
  disabledReason?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Enable Polymarket Trading
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            A one-time setup is needed to activate your trading
            account. Your wallet will ask you to sign — no funds are
            moved.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <PenLine className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Sign to create trading credentials
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  A free signature — no gas fee, no transaction
                  on-chain
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Set up your Deposit Wallet
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creates your Polymarket deposit wallet for trading
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Approve pUSD for trading
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allows the exchange to settle your trades
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onConfirm}
            disabled={!!disabledReason}
            className="w-full py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors mb-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            Sign &amp; Enable Trading
          </button>
          {disabledReason && (
            <p className="mb-2 text-center text-xs font-medium text-red-600">
              {disabledReason}
            </p>
          )}
          <button
            onClick={onDismiss}
            className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
