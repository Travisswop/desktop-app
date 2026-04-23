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
  Droplets,
} from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { useHyperliquidDeposit } from './hooks/useHyperliquidDeposit';
import { useHyperliquidFaucet } from './hooks/useHyperliquidFaucet';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { HL_IS_TESTNET } from '@/services/hyperliquid/config';

interface DepositFormProps {
  masterAddress: string | null;
  onClose: () => void;
  onBridgeToArbitrum?: () => void;
  onDepositSubmitted?: () => void;
  /** When true (default), renders the gradient header above the form. */
  showHeader?: boolean;
}

const QUICK_AMOUNTS = ['10', '50', '100', '500'];

/**
 * DepositForm
 *
 * The actual deposit/faucet UI used inside DepositModal and PerpsActionsModal.
 * Extracted so multiple modal frames can reuse the same flow without duplicating
 * the form logic or breaking the existing single-purpose DepositModal.
 */
export function DepositForm({
  masterAddress: masterAddressProp,
  onClose,
  onBridgeToArbitrum,
  onDepositSubmitted,
  showHeader = true,
}: DepositFormProps) {
  // Resolve the address from the Privy embedded wallet when the parent hasn't
  // provided one yet (e.g. deposit modal opened before agent initialization).
  const { wallets, ready: walletsReady } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const masterAddress =
    masterAddressProp ?? (walletsReady ? (embeddedWallet?.address ?? null) : null);

  const [amount, setAmount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [testnetMethod, setTestnetMethod] = useState<'bridge' | 'faucet'>(
    'bridge',
  );

  const {
    deposit,
    fetchArbitrumUsdcBalance,
    isDepositing,
    txHash,
    error,
    step,
    minDeposit,
  } = useHyperliquidDeposit();

  const faucet = useHyperliquidFaucet(masterAddress);
  const showFaucetTab = HL_IS_TESTNET && !faucet.alreadyClaimed;

  useEffect(() => {
    if (testnetMethod === 'faucet' && HL_IS_TESTNET && faucet.alreadyClaimed) {
      setTestnetMethod('bridge');
    }
  }, [testnetMethod, faucet.alreadyClaimed]);

  const {
    data: accountData,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = useHyperliquidPositions(HL_IS_TESTNET ? masterAddress : null);

  useEffect(() => {
    if (faucet.success) {
      refetchAccount();
      onDepositSubmitted?.();
    }
  }, [faucet.success, refetchAccount, onDepositSubmitted]);

  useEffect(() => {
    if (!masterAddress) return;
    setBalanceLoading(true);
    fetchArbitrumUsdcBalance(masterAddress)
      .then(setUsdcBalance)
      .finally(() => setBalanceLoading(false));
  }, [masterAddress, fetchArbitrumUsdcBalance]);

  const handleDeposit = useCallback(async () => {
    try {
      const hash = await deposit(amount);
      if (hash) onDepositSubmitted?.();
    } catch {
      // error state managed inside the hook
    }
  }, [deposit, amount, onDepositSubmitted]);

  const amountNum = parseFloat(amount) || 0;
  const balanceNum = parseFloat(usdcBalance ?? '0');
  const isInsufficient = balanceNum > 0 && amountNum > balanceNum;
  const isBelowMin = amountNum > 0 && amountNum < minDeposit;
  const canDeposit =
    amountNum >= minDeposit && !isInsufficient && !isDepositing;

  const isFaucetActive = showFaucetTab && testnetMethod === 'faucet';

  return (
    <>
      {/* Optional gradient header (used by stand-alone DepositModal) */}
      {showHeader &&
        (isFaucetActive ? (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Testnet Faucet</h2>
                <p className="text-purple-100 text-sm">
                  Claim $1,000 USDC on Hyperliquid testnet
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Deposit to Hyperliquid
                </h2>
                <p className="text-blue-100 text-sm">USDC on Arbitrum → Hyperliquid</p>
              </div>
            </div>
          </div>
        ))}

      {showFaucetTab && (
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setTestnetMethod('bridge')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                testnetMethod === 'bridge'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit USDC
            </button>
            <button
              onClick={() => setTestnetMethod('faucet')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                testnetMethod === 'faucet'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              Testnet Faucet
            </button>
          </div>
        </div>
      )}

      {isFaucetActive ? (
        <FaucetView
          masterAddress={masterAddress}
          isClaiming={faucet.isClaiming}
          success={faucet.success}
          error={faucet.error}
          accountValue={accountData?.accountValue ?? null}
          withdrawable={accountData?.withdrawable ?? null}
          balanceLoading={accountLoading}
          onClaim={() => masterAddress && faucet.claimFaucet(masterAddress)}
          onClose={onClose}
        />
      ) : step === 'success' && txHash ? (
        <SuccessView txHash={txHash} onClose={onClose} />
      ) : (
        <>
          <div className="px-6 pt-4 pb-2">
            <FlowSteps currentStep={step} />
          </div>

          <div className="px-6 pb-5 space-y-4">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Transfer USDC from your wallet on{' '}
                <strong>Arbitrum One</strong> to the Hyperliquid bridge. Funds
                arrive on Hyperliquid in approximately{' '}
                <strong>2–5 minutes</strong>.
              </p>
            </div>

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Amount (USDC)
                </label>
                <span className="text-xs text-gray-400">
                  Min ${minDeposit}
                </span>
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
                  onClick={() =>
                    usdcBalance &&
                    setAmount(parseFloat(usdcBalance).toFixed(2))
                  }
                  disabled={!usdcBalance || isDepositing}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-semibold hover:text-blue-700 disabled:opacity-40"
                >
                  MAX
                </button>
              </div>

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

            {!balanceLoading &&
              usdcBalance !== null &&
              balanceNum < minDeposit && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 flex-1">
                    <p className="font-semibold mb-1">
                      Not enough USDC on Arbitrum
                    </p>
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
                        Bridge USDC to Arbitrum first using the Bridge tab or
                        swap on any DEX.
                      </p>
                    )}
                  </div>
                </div>
              )}

            {error && step === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {amountNum >= minDeposit && !isInsufficient && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>You send</span>
                  <span className="font-medium text-gray-800">
                    ${amountNum.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Network</span>
                  <span className="font-medium text-gray-800">
                    Arbitrum One
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>You receive</span>
                  <span className="font-medium text-emerald-600">
                    ${amountNum.toFixed(2)} on Hyperliquid
                  </span>
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

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
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
    </>
  );
}

// ─── Faucet View (testnet only) ───────────────────────────────────────────────

interface FaucetViewProps {
  masterAddress: string | null;
  isClaiming: boolean;
  success: boolean;
  error: string | null;
  accountValue: string | null;
  withdrawable: string | null;
  balanceLoading: boolean;
  onClaim: () => void;
  onClose: () => void;
}

function FaucetView({
  masterAddress,
  isClaiming,
  success,
  error,
  accountValue,
  withdrawable,
  balanceLoading,
  onClaim,
  onClose,
}: FaucetViewProps) {
  const accountNum = parseFloat(accountValue ?? '0');
  const withdrawableNum = parseFloat(withdrawable ?? '0');

  const BalanceRow = () => (
    <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">HL Testnet Balance</span>
        {balanceLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
        ) : (
          <span className="text-sm font-bold text-gray-800">
            $
            {accountNum.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Available to withdraw</span>
        {balanceLoading ? (
          <span className="text-xs text-gray-300">—</span>
        ) : (
          <span className="text-xs font-medium text-emerald-600">
            $
            {withdrawableNum.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Funds Claimed!</h3>
          <p className="text-sm text-gray-500 mt-1">
            $1,000 testnet USDC has been added to your account.
          </p>
        </div>
        <div className="w-full">
          <BalanceRow />
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

  return (
    <div className="px-6 pb-6 pt-4 space-y-4">
      <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
        <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700">
          Claims <strong>$1,000 USDC</strong> directly on Hyperliquid testnet —
          no bridge or Arbitrum transaction needed. One claim per address.
        </p>
      </div>

      {masterAddress && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <Wallet className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-mono">
            {masterAddress.slice(0, 6)}…{masterAddress.slice(-4)}
          </span>
        </div>
      )}

      <BalanceRow />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          disabled={isClaiming}
          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onClaim}
          disabled={isClaiming || !masterAddress}
          className="flex-1 py-2.5 px-4 bg-violet-500 hover:bg-violet-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming…
            </>
          ) : (
            <>
              <Droplets className="w-4 h-4" />
              Claim $1,000 USDC
            </>
          )}
        </button>
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
                  isActive
                    ? 'text-blue-600'
                    : isDone
                      ? 'text-emerald-600'
                      : 'text-gray-400'
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

function SuccessView({
  txHash,
  onClose,
}: {
  txHash: string;
  onClose: () => void;
}) {
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
