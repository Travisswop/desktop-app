'use client';

import { useState } from 'react';
import { Shield, Zap, AlertTriangle, Loader2, CheckCircle2, ArrowDownToLine, RefreshCw } from 'lucide-react';
import type { DepositCheckStatus } from './hooks/useHyperliquidBalanceCheck';

interface AgentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isInitializing: boolean;
  error: string | null;
  /** Current Hyperliquid balance check status */
  depositStatus: DepositCheckStatus;
  /** Open the deposit modal so the user can fund their account */
  onOpenDeposit: () => void;
  /** Re-check balance after the user returns from DepositModal */
  onRecheckBalance: () => void;
}

/**
 * AgentSetupModal
 *
 * Shown once when the user first opens the trading panel.
 * Enforces a deposit-first flow:
 *  - If depositStatus is 'no-deposit', shows a "Deposit required" gate.
 *  - If depositStatus is 'pending',   shows a "Waiting for deposit…" state.
 *  - If depositStatus is 'ready',     shows the normal "Enable Trading" flow.
 *
 * The "Enable Trading" button is disabled until the master account has a
 * non-zero Hyperliquid balance, preventing the "Must deposit before
 * performing actions" error from Hyperliquid.
 */
export function AgentSetupModal({
  isOpen,
  onClose,
  onConfirm,
  isInitializing,
  error,
  depositStatus,
  onOpenDeposit,
  onRecheckBalance,
}: AgentSetupModalProps) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  const isMustDeposit = depositStatus === 'no-deposit';
  const isPending = depositStatus === 'pending';
  const isChecking = depositStatus === 'checking' || depositStatus === 'idle';
  const isReady = depositStatus === 'ready';

  // Detect the specific "Must deposit" error from Hyperliquid so we can show
  // the inline deposit CTA even if the pre-flight check was bypassed.
  const isMustDepositError =
    typeof error === 'string' && error.toLowerCase().includes('must deposit');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
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
              <p className="text-emerald-100 text-sm">One-time setup · No wallet popup per trade</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* ── Deposit gate: no balance ─────────────────────────────── */}
          {(isMustDeposit || isMustDepositError) && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Deposit required first</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your Hyperliquid account has no balance. Deposit USDC on Arbitrum to
                    activate your account. On testnet, claim the faucet after depositing.
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenDeposit}
                className="w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Deposit USDC
              </button>

              <button
                onClick={onRecheckBalance}
                className="w-full py-2 px-4 border border-gray-200 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                I already deposited — check again
              </button>
            </div>
          )}

          {/* ── Deposit gate: pending settlement ────────────────────── */}
          {isPending && !isMustDepositError && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Deposit pending…</p>
                <p className="text-xs text-blue-700 mt-1">
                  Waiting for your deposit to settle on Hyperliquid mainnet. This
                  typically takes 2–5 minutes. The button will unlock automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── Balance check in progress ────────────────────────────── */}
          {isChecking && !isMustDepositError && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
              <p className="text-xs text-gray-500">Checking account balance…</p>
            </div>
          )}

          {/* ── How it works (shown when ready or pending) ───────────── */}
          {!isMustDeposit && !isMustDepositError && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                How it works
              </p>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-600">1</span>
                </div>
                <p className="text-sm text-gray-600">
                  Your <strong>external wallet</strong> owns your Hyperliquid account —
                  it holds all funds and receives PnL.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-600">2</span>
                </div>
                <p className="text-sm text-gray-600">
                  An <strong>agent keypair</strong> is approved once to sign orders silently —
                  no popups per trade.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-600">3</span>
                </div>
                <p className="text-sm text-gray-600">
                  Only your master wallet can <strong>withdraw funds</strong> — the agent
                  cannot.
                </p>
              </div>
            </div>
          )}

          {/* ── Benefits bar (shown only when ready) ─────────────────── */}
          {isReady && (
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
                  Non-custodial · agent-key secured
                </p>
              </div>
            </div>
          )}

          {/* ── Generic / non-deposit error ──────────────────────────── */}
          {error && !isMustDepositError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* ── Acknowledge checkbox (shown only when ready) ─────────── */}
          {isReady && (
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
                I understand the agent keypair will be used to sign my trades.
              </p>
            </label>
          )}
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

          {/* Only show Enable Trading when ready */}
          {(isReady || isPending) && (
            <button
              onClick={onConfirm}
              disabled={!hasRead || isInitializing || !isReady}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up…
                </>
              ) : isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for deposit…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Enable Trading
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
