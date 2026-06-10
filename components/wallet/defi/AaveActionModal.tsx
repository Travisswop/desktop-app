'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import type {
  AaveAccountSummary,
  AaveActionMode,
  AaveChain,
  AavePosition,
  AaveReserve,
} from '@/types/aave';
import { AaveTokenIcon } from './AaveTokenIcon';
import { useAaveActions } from './hooks/useAaveActions';

const MODE_COPY: Record<
  AaveActionMode,
  { title: string; cta: string; balanceLabel: string }
> = {
  supply: { title: 'Supply', cta: 'Supply', balanceLabel: 'Wallet balance' },
  borrow: { title: 'Borrow', cta: 'Borrow', balanceLabel: 'Available to borrow' },
  withdraw: { title: 'Withdraw', cta: 'Withdraw', balanceLabel: 'Supplied' },
  repay: { title: 'Repay', cta: 'Repay', balanceLabel: 'Debt' },
};

type Step = 'idle' | 'approving' | 'confirming' | 'success';

interface AaveActionModalProps {
  mode: AaveActionMode;
  chain: AaveChain;
  poolAddress: string;
  reserve: AaveReserve;
  userAddress: string;
  account?: AaveAccountSummary | null;
  /** Existing position for withdraw / repay flows */
  position?: AavePosition | null;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 6 });

export function AaveActionModal({
  mode,
  chain,
  poolAddress,
  reserve,
  userAddress,
  account,
  position,
  onClose,
  onSuccess,
}: AaveActionModalProps) {
  const { execute, fetchBalanceAndAllowance } = useAaveActions();

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Wallet token balance is needed for supply (cap) and repay (cap by funds)
  useEffect(() => {
    let cancelled = false;
    if (mode !== 'supply' && mode !== 'repay') return undefined;
    fetchBalanceAndAllowance(chain, reserve.asset, userAddress, poolAddress)
      .then(({ balance }) => {
        if (!cancelled) {
          setWalletBalance(
            Number(ethers.formatUnits(balance, reserve.decimals)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    chain,
    reserve.asset,
    reserve.decimals,
    userAddress,
    poolAddress,
    fetchBalanceAndAllowance,
  ]);

  const maxAmount = useMemo(() => {
    switch (mode) {
      case 'supply':
        return walletBalance ?? 0;
      case 'withdraw':
        return position?.amount ?? 0;
      case 'repay': {
        const debt = position?.amount ?? 0;
        return walletBalance === null ? debt : Math.min(debt, walletBalance);
      }
      case 'borrow': {
        if (!account || reserve.priceUsd <= 0) return 0;
        // 1% haircut so the tx doesn't revert on price movement between blocks
        return (account.availableBorrowsUsd / reserve.priceUsd) * 0.99;
      }
      default:
        return 0;
    }
  }, [mode, walletBalance, position, account, reserve.priceUsd]);

  const parsedAmount = useMemo(() => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) return null;
    try {
      return ethers.parseUnits(value.toFixed(reserve.decimals), reserve.decimals);
    } catch {
      return null;
    }
  }, [amount, reserve.decimals]);

  const usdEstimate = useMemo(() => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value)) return null;
    return value * reserve.priceUsd;
  }, [amount, reserve.priceUsd]);

  const overMax = Number(amount) > maxAmount * 1.000001;
  const busy = step === 'approving' || step === 'confirming';
  const canSubmit = Boolean(parsedAmount) && !overMax && !busy;

  const handleMax = () => setAmount(String(maxAmount));

  const handleSubmit = async () => {
    if (!parsedAmount) return;
    setError(null);
    try {
      const isMax =
        (mode === 'withdraw' || mode === 'repay') &&
        Number(amount) >= maxAmount * 0.999999;
      const { hash } = await execute(
        mode,
        {
          chain,
          poolAddress,
          reserve,
          userAddress,
          amount: parsedAmount,
          isMax,
        },
        (progress) => setStep(progress),
      );
      setStep('success');
      onSuccess(hash);
    } catch (err) {
      setStep('idle');
      setError(
        err instanceof Error ? err.message : 'Transaction failed. Try again.',
      );
    }
  };

  const copy = MODE_COPY[mode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <AaveTokenIcon symbol={reserve.symbol} size={28} />
            <h2 className="text-base font-semibold text-gray-800">
              {copy.title} {reserve.symbol}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-5 pb-6 pt-2 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-800">
              {copy.title} submitted
            </p>
            <p className="text-xs text-gray-500">
              Your position will refresh shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-3 w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-xl border border-black/[0.06] bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={busy}
                  className="w-full bg-transparent text-2xl font-semibold text-gray-900 outline-none placeholder:text-gray-300"
                />
                <button
                  onClick={handleMax}
                  disabled={busy || maxAmount <= 0}
                  className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800 border border-black/[0.08] rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
                >
                  Max
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>{usdEstimate !== null ? formatUsd(usdEstimate) : '—'}</span>
                <span>
                  {copy.balanceLabel}:{' '}
                  <span className="font-mono">
                    {formatAmount(maxAmount)} {reserve.symbol}
                  </span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.06] p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {mode === 'borrow' || mode === 'repay'
                    ? 'Borrow APR (variable)'
                    : 'Supply APY'}
                </span>
                <span
                  className={`font-mono font-medium ${
                    mode === 'borrow' || mode === 'repay'
                      ? 'text-gray-900'
                      : 'text-emerald-600'
                  }`}
                >
                  {(
                    (mode === 'borrow' || mode === 'repay'
                      ? reserve.variableBorrowApr
                      : reserve.supplyApy) * 100
                  ).toFixed(2)}
                  %
                </span>
              </div>
              {mode === 'supply' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Max LTV as collateral</span>
                  <span className="font-mono text-gray-900">
                    {(reserve.ltv * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {account?.healthFactor != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Health factor</span>
                  <span className="font-mono text-gray-900">
                    {account.healthFactor.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {overMax && (
              <p className="text-xs text-red-500">
                Amount exceeds {copy.balanceLabel.toLowerCase()}.
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 'approving'
                ? `Approving ${reserve.symbol}…`
                : step === 'confirming'
                  ? 'Confirm in wallet…'
                  : `${copy.cta} ${reserve.symbol}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
