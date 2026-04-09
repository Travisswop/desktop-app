'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { useHyperliquidDeposit } from './hooks/useHyperliquidDeposit';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterAddress: string | null;
  /** Called when user needs to bridge funds to Arbitrum USDC — opens LiFi */
  onBridgeToArbitrum?: () => void;
}

const QUICK_AMOUNTS = ['10', '50', '100', '500'];

/**
 * DepositModal
 *
 * Guides the user through depositing USDC from Arbitrum to Hyperliquid:
 *
 *  Step 1 — Enter amount (min $5 USDC)
 *  Step 2 — Confirm in wallet (MetaMask popup)
 *  Step 3 — Success + Arbiscan link
 *
 * Requirements:
 *  - User must have USDC on Arbitrum One
 *  - Min deposit is $5 USDC
 *  - Funds arrive on Hyperliquid in ~2 minutes
 */
export function DepositModal({ isOpen, onClose, masterAddress, onBridgeToArbitrum }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const {
    deposit,
    reset,
    fetchArbitrumUsdcBalance,
    isDepositing,
    txHash,
    error,
    step,
    minDeposit,
  } = useHyperliquidDeposit();

  // Fetch USDC balance on open
  useEffect(() => {
    if (!isOpen || !masterAddress) return;
    setBalanceLoading(true);
    fetchArbitrumUsdcBalance(masterAddress)
      .then(setUsdcBalance)
      .finally(() => setBalanceLoading(false));
  }, [isOpen, masterAddress, fetchArbitrumUsdcBalance]);

  const handleClose = useCallback(() => {
    reset();
    setAmount('');
    onClose();
  }, [reset, onClose]);

  const handleDeposit = useCallback(async () => {
    await deposit(amount).catch(() => {});
  }, [deposit, amount]);

  const amountNum = parseFloat(amount) || 0;
  const balanceNum = parseFloat(usdcBalance ?? '0');
  const isInsufficient = balanceNum > 0 && amountNum > balanceNum;
  const isBelowMin = amountNum > 0 && amountNum < minDeposit;
  const canDeposit = amountNum >= minDeposit && !isInsufficient && !isDepositing;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'idle' || step === 'error' ? handleClose : undefined}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Deposit to Hyperliquid</h2>
              <p className="text-blue-100 text-sm">USDC on Arbitrum → Hyperliquid</p>
            </div>
          </div>
        </div>

        {/* ── Success State ────────────────────────────────────────── */}
        {step === 'success' && txHash ? (
          <SuccessView txHash={txHash} onClose={handleClose} />
        ) : (
          <>
            {/* ── Flow Steps ─────────────────────────────────────── */}
            <div className="px-6 pt-4 pb-2">
              <FlowSteps currentStep={step} />
            </div>

            {/* ── Body ───────────────────────────────────────────── */}
            <div className="px-6 pb-5 space-y-4">

              {/* How it works */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Transfer USDC from your wallet on{' '}
                  <strong>Arbitrum One</strong> to the Hyperliquid bridge. Funds
                  arrive on Hyperliquid in approximately{' '}
                  <strong>2–5 minutes</strong>.
                </p>
              </div>

              {/* Wallet + balance */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {masterAddress
                      ? `${masterAddress.slice(0, 6)}…${masterAddress.slice(-4)}`
                      : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">USDC on Arbitrum</p>
                  {balanceLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800">
                      ${parseFloat(usdcBalance ?? '0').toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Amount (USDC)
                  </label>
                  <span className="text-xs text-gray-400">Min ${minDeposit}</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    min={minDeposit}
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isDepositing}
                    className="w-full pl-7 pr-20 py-3 text-lg font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60 tabular-nums"
                  />
                  <button
                    onClick={() => usdcBalance && setAmount(parseFloat(usdcBalance).toFixed(2))}
                    disabled={!usdcBalance || isDepositing}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-semibold hover:text-blue-700 disabled:opacity-40"
                  >
                    MAX
                  </button>
                </div>

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      disabled={isDepositing || parseFloat(q) > balanceNum}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
                        amount === q
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      ${q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validation messages */}
              {isBelowMin && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Minimum deposit is ${minDeposit} USDC
                </p>
              )}
              {isInsufficient && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Insufficient USDC balance on Arbitrum
                </p>
              )}

              {/* No USDC warning */}
              {!balanceLoading && usdcBalance !== null && balanceNum < minDeposit && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 flex-1">
                    <p className="font-semibold mb-1">Not enough USDC on Arbitrum</p>
                    {onBridgeToArbitrum ? (
                      <button
                        onClick={onBridgeToArbitrum}
                        className="inline-flex items-center gap-1 text-blue-600 font-semibold underline hover:text-blue-800"
                      >
                        Bridge to Arbitrum USDC
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <p>
                        Bridge USDC to Arbitrum first using the Bridge tab or swap on any DEX.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && step === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Deposit summary */}
              {amountNum >= minDeposit && !isInsufficient && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>You send</span>
                    <span className="font-medium text-gray-800">${amountNum.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Network</span>
                    <span className="font-medium text-gray-800">Arbitrum One</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>You receive</span>
                    <span className="font-medium text-emerald-600">${amountNum.toFixed(2)} on Hyperliquid</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Estimated time</span>
                    <span className="font-medium text-gray-800">~2–5 min</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Bridge fee</span>
                    <span className="font-medium text-emerald-600">Free</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  disabled={isDepositing}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={!canDeposit}
                  className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {step === 'confirming' ? 'Confirm in wallet…' : 'Processing…'}
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4" />
                      Deposit ${amount || '0'} USDC
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Flow Steps ──────────────────────────────────────────────────────────────

function FlowSteps({ currentStep }: { currentStep: string }) {
  const steps = [
    { id: 'idle', label: 'Enter amount' },
    { id: 'confirming', label: 'Confirm in wallet' },
    { id: 'pending', label: 'Bridging…' },
    { id: 'success', label: 'Done' },
  ];

  const activeIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isDone = i < activeIndex || currentStep === 'success';
        const isActive = i === activeIndex && currentStep !== 'success';

        return (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium truncate ${
                  isActive ? 'text-blue-600' : isDone ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView({ txHash, onClose }: { txHash: string; onClose: () => void }) {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800">Deposit Submitted!</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your USDC is on its way to Hyperliquid.
          <br />
          Balance will update in <strong>2–5 minutes</strong>.
        </p>
      </div>

      <a
        href={`https://arbiscan.io/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors font-medium"
      >
        View on Arbiscan
        <ExternalLink className="w-3.5 h-3.5" />
      </a>

      <div className="w-full bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-left">
        <p className="font-semibold text-gray-700 mb-1">What happens next?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Arbitrum confirms the transaction (~2–5 min)</li>
          <li>Hyperliquid bridge processes the deposit</li>
          <li>Your Perps Balance updates automatically</li>
        </ul>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        Done
      </button>
    </div>
  );
}
