'use client';

import { useState } from 'react';
import { Shield, Zap, AlertTriangle, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

interface AgentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  masterAddress: string | null;
  isInitializing: boolean;
  error: string | null;
}

/**
 * AgentSetupModal
 *
 * Shown once when the user first opens the trading panel.
 * Explains what the agent wallet does and prompts the user to
 * approve the one-time MetaMask signature for `approveAgent`.
 */
export function AgentSetupModal({
  isOpen,
  onClose,
  onConfirm,
  masterAddress,
  isInitializing,
  error,
}: AgentSetupModalProps) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  const shortAddress = masterAddress
    ? `${masterAddress.slice(0, 6)}…${masterAddress.slice(-4)}`
    : '—';

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
              <h2 className="text-lg font-bold text-white">Set Up Perps Trading</h2>
              <p className="text-emerald-100 text-sm">One-time setup · Non-custodial</p>
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
                Your connected wallet{' '}
                <span className="font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {shortAddress}
                </span>{' '}
                becomes your Hyperliquid master account — it owns all your funds.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">2</span>
              </div>
              <p className="text-sm text-gray-600">
                Your Privy embedded wallet is authorized as an <strong>agent</strong> —
                it can place/cancel orders silently without repeated popups.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">3</span>
              </div>
              <p className="text-sm text-gray-600">
                The agent wallet <strong>cannot withdraw funds</strong> or transfer
                your balance — only you can, using your master wallet.
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
                Funds stay in your master wallet
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This will trigger <strong>one MetaMask signature</strong> to register
              the agent on Hyperliquid. You won&apos;t be asked again this session.
            </p>
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
              I understand the agent wallet cannot withdraw funds, and I am
              approving this setup voluntarily.
            </p>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
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

        {/* Footer link */}
        <div className="px-6 pb-4 text-center">
          <a
            href="https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Learn about Hyperliquid agent wallets
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
