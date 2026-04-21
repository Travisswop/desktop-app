'use client';

import { useState } from 'react';
import { Shield, Zap, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface AgentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isInitializing: boolean;
  error: string | null;
}

/**
 * AgentSetupModal
 *
 * Shown once when the user first opens the trading panel.
 * Explains that the Privy embedded wallet will be used as the Hyperliquid
 * master account — no external wallet or MetaMask popup required.
 */
export function AgentSetupModal({
  isOpen,
  onClose,
  onConfirm,
  isInitializing,
  error,
}: AgentSetupModalProps) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isInitializing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Enable Perps Trading</h2>
              <p className="text-emerald-100 text-sm">One-time setup · No wallet popup</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* How it works */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              How it works
            </p>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">1</span>
              </div>
              <p className="text-sm text-gray-600">
                Your <strong>Privy embedded wallet</strong> is used as your Hyperliquid
                account — it holds all your funds and positions.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">2</span>
              </div>
              <p className="text-sm text-gray-600">
                Privy signs orders silently in the background — <strong>no popups</strong>,
                no MetaMask required.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">3</span>
              </div>
              <p className="text-sm text-gray-600">
                Your private key is <strong>never exposed</strong> — Privy's infrastructure
                handles all signing securely.
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="flex gap-3">
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
              <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-medium">
                Instant trades — no popup per order
              </p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium">
                Non-custodial · Privy-secured key
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Acknowledge */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={hasRead}
                onChange={(e) => setHasRead(e.target.checked)}
                className="sr-only"
                disabled={isInitializing}
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  hasRead
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                {hasRead && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              I understand my Privy wallet will be used as my Hyperliquid account.
            </p>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isInitializing}
            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!hasRead || isInitializing}
            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Enable Trading
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
