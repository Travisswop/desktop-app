'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { CheckCircle2, ChevronDown, Loader2, Search, X } from 'lucide-react';
import type {
  AaveAccountSummary,
  AaveActionMode,
  AaveChain,
  AavePosition,
  AaveReserve,
} from '@/types/aave';
import { AaveTokenIcon } from './AaveTokenIcon';
import { useAaveActions } from './hooks/useAaveActions';
import { useAaveFunding } from './hooks/useAaveFunding';
import {
  describeAaveFundingRoute,
  getAaveFundingQuote,
  reserveIsWrappedNative,
  wrappedNativeFor,
  type AaveFundingQuote,
  type AavePayToken,
} from '@/lib/defi/aaveFunding';
import { CHAIN_ID } from '@/types/wallet-types';

const MODE_COPY: Record<
  AaveActionMode,
  { title: string; cta: string; balanceLabel: string }
> = {
  supply: { title: 'Supply', cta: 'Supply', balanceLabel: 'You pay' },
  borrow: {
    title: 'Borrow',
    cta: 'Borrow',
    balanceLabel: 'Available to borrow',
  },
  withdraw: { title: 'Withdraw', cta: 'Withdraw', balanceLabel: 'Supplied' },
  repay: { title: 'Repay', cta: 'Repay', balanceLabel: 'You pay' },
};

const PERCENT_STEPS = [25, 50, 75, 100];
const SLIPPAGE_BPS = 100;

// Which collateral asset to open the collateral stage on. Prefer one the user
// can actually fund from what they hold — the wrapped-native reserve when they
// hold the native coin (ETH is the usual answer), else a reserve matching a
// token already in the wallet, else the highest-LTV asset on the chain.
function pickDefaultCollateral(
  collateralReserves: AaveReserve[],
  chain: AaveChain,
  payTokens: AavePayToken[],
  chainId: number,
): AaveReserve | null {
  if (collateralReserves.length === 0) return null;
  const onChain = payTokens.filter((token) => token.chainId === chainId);
  if (onChain.some((token) => token.isNative)) {
    const wrapped = collateralReserves.find((entry) =>
      reserveIsWrappedNative(chain, entry),
    );
    if (wrapped) return wrapped;
  }
  const held = collateralReserves.find((entry) =>
    onChain.some(
      (token) => token.address.toLowerCase() === entry.asset.toLowerCase(),
    ),
  );
  if (held) return held;
  return [...collateralReserves].sort((a, b) => b.ltv - a.ltv)[0] ?? null;
}

type Step = 'idle' | 'working' | 'success';

export interface AaveActionSuccessDetails {
  mode: AaveActionMode;
  amount: number;
  amountUsd: number;
  reserve: AaveReserve;
}

interface AaveActionModalProps {
  mode: AaveActionMode;
  chain: AaveChain;
  poolAddress: string;
  reserve: AaveReserve;
  /** Every reserve on the chain — powers the in-modal asset picker. */
  reserves: AaveReserve[];
  /** EVM wallet tokens that can fund a supply/repay. */
  payTokens: AavePayToken[];
  userAddress: string;
  account?: AaveAccountSummary | null;
  /** Existing position for withdraw / repay flows */
  position?: AavePosition | null;
  onSelectReserve: (reserve: AaveReserve) => void;
  onClose: () => void;
  onSuccess: (txHash: string, details: AaveActionSuccessDetails) => void;
}

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 6 });

const formatPct = (value: number) => `${(value * 100).toFixed(2)}%`;

const trimZeros = (value: string) =>
  value.includes('.') ? value.replace(/\.?0+$/, '') : value;

export function AaveActionModal({
  mode: openMode,
  chain,
  poolAddress,
  reserve: openReserve,
  reserves,
  payTokens,
  userAddress,
  account,
  position: openPosition,
  onSelectReserve,
  onClose,
  onSuccess,
}: AaveActionModalProps) {
  const { execute, fetchBalanceAndAllowance } = useAaveActions();
  const { executeFunded } = useAaveFunding();

  const targetChainId = CHAIN_ID[chain];

  // Borrowing is gated on collateral, and a wallet with none had no way to add
  // any from here — Borrow just showed "Max 0" with no explanation. The modal
  // therefore has two stages: `collateral` runs a supply of a collateral-
  // eligible asset, `action` runs the mode the user actually opened.
  const [stage, setStage] = useState<'action' | 'collateral'>('action');
  const [collateralReserve, setCollateralReserve] =
    useState<AaveReserve | null>(null);
  const [collateralDone, setCollateralDone] = useState(false);

  // Assets Aave will actually lend against.
  const collateralReserves = useMemo(
    () => reserves.filter((entry) => entry.ltv > 0),
    [reserves],
  );
  const borrowPowerUsd = account?.availableBorrowsUsd ?? 0;
  const hasCollateral = (account?.totalCollateralUsd ?? 0) > 0;

  const mode: AaveActionMode = stage === 'collateral' ? 'supply' : openMode;
  const reserve =
    stage === 'collateral' ? (collateralReserve ?? openReserve) : openReserve;
  const position = stage === 'collateral' ? null : openPosition;

  // Supply and repay take funds IN, so they can be paid with any token and
  // converted. Borrow and withdraw pay funds OUT — no conversion involved.
  const converting = mode === 'supply' || mode === 'repay';

  // Opening Borrow with no borrowing power drops straight into the collateral
  // stage — that is the step the user is actually missing.
  const openKey = `${openMode}:${openReserve.asset}`;
  useEffect(() => {
    const needsCollateral = openMode === 'borrow' && borrowPowerUsd <= 0;
    setStage(needsCollateral ? 'collateral' : 'action');
    setCollateralDone(false);
    setCollateralReserve(
      pickDefaultCollateral(collateralReserves, chain, payTokens, targetChainId),
    );
    // Deliberately keyed on the open only: a mid-flow borrowPower change must
    // not yank the user back to the collateral stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const [amount, setAmount] = useState('');
  const [payTokenId, setPayTokenId] = useState<string | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [payPickerOpen, setPayPickerOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [quote, setQuote] = useState<AaveFundingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const quoteRequestRef = useRef(0);
  const busy = step === 'working';

  // Reset when the stage, asset or mode changes.
  useEffect(() => {
    setAmount('');
    setQuote(null);
    setQuoteError('');
    setError(null);
    setWalletBalance(null);
    // Re-default the pay token per asset — supplying WETH should preselect the
    // user's ETH, not whatever they paid with on the previous asset.
    setPayTokenId(null);
  }, [stage, mode, reserve.asset]);

  // Default the pay token: the reserve asset itself if held, then the native
  // coin for a wrapped-native reserve, then the largest holding on the chain.
  useEffect(() => {
    if (!converting || payTokens.length === 0) return;
    setPayTokenId((current) => {
      if (current && payTokens.some((token) => token.id === current)) {
        return current;
      }
      const onChain = payTokens.filter(
        (token) => token.chainId === targetChainId,
      );
      const exact = onChain.find(
        (token) => token.address.toLowerCase() === reserve.asset.toLowerCase(),
      );
      const native = reserveIsWrappedNative(chain, reserve)
        ? onChain.find((token) => token.isNative)
        : undefined;
      return (exact ?? native ?? onChain[0] ?? payTokens[0])?.id ?? null;
    });
  }, [converting, payTokens, targetChainId, chain, reserve]);

  const payToken = useMemo(
    () => payTokens.find((token) => token.id === payTokenId) ?? null,
    [payTokens, payTokenId],
  );

  // Live on-chain debt-token balance for repay (the cached token list lags).
  useEffect(() => {
    let cancelled = false;
    if (mode !== 'repay') return undefined;
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

  // The unit the amount is denominated in: the pay token for supply/repay, the
  // reserve asset for borrow/withdraw.
  const unitSymbol = converting
    ? (payToken?.symbol ?? reserve.symbol)
    : reserve.symbol;
  const unitDecimals = converting ? (payToken?.decimals ?? 18) : reserve.decimals;
  const unitPrice = converting ? (payToken?.priceUsd ?? 0) : reserve.priceUsd;

  const maxAmount = useMemo(() => {
    switch (mode) {
      case 'supply':
        return payToken?.balance ?? 0;
      case 'repay': {
        if (!payToken) return 0;
        const isDebtToken =
          payToken.chainId === targetChainId &&
          payToken.address.toLowerCase() === reserve.asset.toLowerCase();
        const debt = position?.amount ?? walletBalance ?? 0;
        return isDebtToken
          ? Math.min(payToken.balance, debt || payToken.balance)
          : payToken.balance;
      }
      case 'withdraw':
        return position?.amount ?? 0;
      case 'borrow': {
        if (!account || reserve.priceUsd <= 0) return 0;
        // 1% haircut so the tx doesn't revert on price movement between blocks
        return (account.availableBorrowsUsd / reserve.priceUsd) * 0.99;
      }
      default:
        return 0;
    }
  }, [
    mode,
    payToken,
    position,
    account,
    reserve.priceUsd,
    reserve.asset,
    walletBalance,
    targetChainId,
  ]);

  const amountNumber = Number(amount);
  const amountValid =
    !!amount && Number.isFinite(amountNumber) && amountNumber > 0;
  const overMax = amountValid && amountNumber > maxAmount * 1.000001;
  const usdEstimate = amountValid ? amountNumber * unitPrice : null;
  const isFullAmount = amountValid && amountNumber >= maxAmount * 0.999999;

  const setPercent = useCallback(
    (percent: number) => {
      if (maxAmount <= 0) return;
      const next = (maxAmount * percent) / 100;
      setAmount(trimZeros(next.toFixed(Math.min(unitDecimals, 18))));
    },
    [maxAmount, unitDecimals],
  );

  // ── Conversion quote (supply / repay) ──
  // Every amount change drops the quote synchronously: the refetch is
  // debounced, and in that window a live CTA would execute stale amounts.
  useEffect(() => {
    const requestId = ++quoteRequestRef.current;
    if (!converting || busy || step === 'success') return undefined;
    setQuote(null);
    setQuoteError('');
    if (!payToken || !amountValid || overMax) {
      setQuoting(false);
      return undefined;
    }
    const handle = setTimeout(() => {
      if (quoteRequestRef.current !== requestId) return;
      setQuoting(true);
      getAaveFundingQuote({
        payToken,
        chain,
        reserve,
        amount,
        slippageBps: SLIPPAGE_BPS,
        userAddress,
      })
        .then((next) => {
          if (quoteRequestRef.current === requestId) setQuote(next);
        })
        .catch((err) => {
          if (quoteRequestRef.current === requestId) {
            setQuoteError(
              err instanceof Error
                ? err.message
                : 'Unable to quote this conversion.',
            );
          }
        })
        .finally(() => {
          if (quoteRequestRef.current === requestId) setQuoting(false);
        });
    }, 500);
    return () => clearTimeout(handle);
  }, [
    converting,
    payToken,
    amount,
    amountValid,
    overMax,
    chain,
    reserve,
    userAddress,
    busy,
    step,
  ]);

  const handleSubmit = async () => {
    if (!amountValid || busy) return;
    setError(null);
    setStep('working');
    try {
      if (converting) {
        if (!payToken) throw new Error('Choose a token to pay with.');
        setStatus('Refreshing quote…');
        // Re-quote right before executing — a displayed quote can be minutes
        // old and every route spends its quote-time amounts.
        const executable = await getAaveFundingQuote({
          payToken,
          chain,
          reserve,
          amount,
          slippageBps: SLIPPAGE_BPS,
          userAddress,
        });
        const { hash } = await executeFunded({
          quote: executable,
          mode,
          payToken,
          chain,
          poolAddress,
          reserve,
          userAddress,
          isMax: isFullAmount,
          onStatus: setStatus,
        });
        if (stage === 'collateral') setCollateralDone(true);
        setStep('success');
        onSuccess(hash, {
          mode,
          amount: executable.reserveAmount,
          amountUsd: executable.reserveAmountUsd,
          reserve,
        });
        return;
      }

      const parsed = ethers.parseUnits(
        amountNumber.toFixed(reserve.decimals),
        reserve.decimals,
      );
      setStatus(mode === 'borrow' ? 'Borrowing…' : 'Withdrawing…');
      const { hash } = await execute(
        mode,
        {
          chain,
          poolAddress,
          reserve,
          userAddress,
          amount: parsed,
          isMax: mode === 'withdraw' && isFullAmount,
        },
        (progress) =>
          setStatus(
            progress === 'approving' ? 'Approving…' : 'Confirm in wallet…',
          ),
      );
      setStep('success');
      onSuccess(hash, {
        mode,
        amount: amountNumber,
        amountUsd: usdEstimate ?? 0,
        reserve,
      });
    } catch (err) {
      setStep('idle');
      setError(
        err instanceof Error ? err.message : 'Transaction failed. Try again.',
      );
    } finally {
      setStatus('');
    }
  };

  const copy = MODE_COPY[mode];
  const routeLabel = quote
    ? describeAaveFundingRoute(quote, reserve.symbol)
    : null;
  const wrapped = wrappedNativeFor(targetChainId);
  const showWrapHint =
    mode === 'supply' && !!wrapped && reserveIsWrappedNative(chain, reserve);

  const pickableReserves = useMemo(() => {
    const base =
      // The collateral stage may only offer assets Aave lends against.
      stage === 'collateral'
        ? collateralReserves
        : mode === 'borrow'
          ? reserves.filter((entry) => entry.borrowingEnabled)
          : // Drop reserves that neither earn nor collateralise (expired Pendle
            // PTs and the like); keep 0%-APY collateral assets, which is exactly
            // what people supply when they want to borrow against a holding.
            reserves.filter((entry) => entry.supplyApy > 0 || entry.ltv > 0);
    const query = assetSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (entry) =>
        entry.symbol.toLowerCase().includes(query) ||
        entry.name.toLowerCase().includes(query),
    );
  }, [reserves, mode, assetSearch, stage, collateralReserves]);

  const canSubmit =
    amountValid && !overMax && !busy && (!converting || (!!quote && !quoting));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                {stage === 'collateral' ? 'Add collateral' : copy.title}
              </h2>
              {stage === 'collateral' && (
                <p className="text-[11px] text-gray-400 font-mono">
                  Step 1 of 2 · then borrow {openReserve.symbol}
                </p>
              )}
            </div>
            <button
              onClick={() => setAssetPickerOpen(true)}
              disabled={busy}
              className="flex items-center gap-2 rounded-full border border-black/[0.08] pl-1.5 pr-2.5 py-1 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <AaveTokenIcon symbol={reserve.symbol} size={22} />
              <span className="text-sm font-semibold text-gray-900">
                {reserve.symbol}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
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
              {collateralDone ? 'Collateral supplied' : `${copy.title} submitted`}
            </p>
            <p className="text-xs text-gray-500">
              {collateralDone
                ? `Your borrowing power updates in a few seconds. You can then borrow ${openReserve.symbol} against it.`
                : 'Your position will refresh shortly.'}
            </p>
            {collateralDone && (
              <button
                onClick={() => {
                  setCollateralDone(false);
                  setStep('idle');
                  setStage('action');
                }}
                className="mt-3 w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Continue to borrow
              </button>
            )}
            <button
              onClick={onClose}
              className={`mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                collateralDone
                  ? 'border border-black/[0.08] text-gray-700 hover:bg-gray-50'
                  : 'mt-3 bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {stage === 'collateral' && (
              <p className="rounded-xl bg-violet-50 px-3 py-2.5 text-[12px] leading-4 text-violet-900">
                Aave lends against collateral, so you supply an asset first and
                borrow against it. Pay with anything in your wallet — it converts
                to {reserve.symbol} automatically.
              </p>
            )}

            {/* No borrowing power — say why the max is zero, and offer the way out. */}
            {stage === 'action' && mode === 'borrow' && maxAmount <= 0 && (
              <div className="rounded-xl bg-violet-50 px-3 py-2.5 space-y-2">
                <p className="text-[12px] leading-4 text-violet-900">
                  {hasCollateral
                    ? `Your collateral on ${chain} is fully borrowed against. Supply more to borrow ${reserve.symbol}.`
                    : `You have no collateral on ${chain} yet. Supply an asset first — Aave lends against it.`}
                </p>
                <button
                  onClick={() => setStage('collateral')}
                  className="rounded-full bg-gray-900 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  Add collateral
                </button>
              </div>
            )}

            {/* Pay with (supply / repay) */}
            {converting && (
              <button
                onClick={() => setPayPickerOpen(true)}
                disabled={busy}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <span className="text-left">
                  <span className="block text-[13px] font-semibold text-gray-800">
                    Pay with
                  </span>
                  <span className="block text-[11px] text-gray-400 font-mono">
                    {payToken
                      ? `${formatAmount(maxAmount)} ${payToken.symbol} available`
                      : 'Choose a token'}
                  </span>
                </span>
                <span className="flex items-center gap-2 rounded-full border border-black/[0.08] pl-1.5 pr-2.5 py-1">
                  {payToken && (
                    <AaveTokenIcon symbol={payToken.symbol} size={20} />
                  )}
                  <span className="text-[13px] font-semibold text-gray-900">
                    {payToken?.symbol ?? 'Select'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </button>
            )}

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
                <span className="text-sm font-semibold text-gray-500 shrink-0">
                  {unitSymbol}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>
                  {usdEstimate !== null ? formatUsd(usdEstimate) : '—'}
                </span>
                <span>
                  {copy.balanceLabel}:{' '}
                  <span className="font-mono">
                    {formatAmount(maxAmount)} {unitSymbol}
                  </span>
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                {PERCENT_STEPS.map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setPercent(percent)}
                    disabled={busy || maxAmount <= 0}
                    className="flex-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 border border-black/[0.08] rounded-full py-1 transition-colors disabled:opacity-40"
                  >
                    {percent === 100 ? 'Max' : `${percent}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.06] p-3 space-y-1.5 text-xs">
              {converting && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">
                    {mode === 'supply' ? 'You supply' : 'You repay'}
                  </span>
                  <span className="font-mono text-gray-900 text-right">
                    {quoting
                      ? 'Quoting…'
                      : quote
                        ? `${formatAmount(quote.reserveAmount)} ${reserve.symbol}`
                        : '—'}
                  </span>
                </div>
              )}
              {converting && routeLabel && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400">Route</span>
                  <span className="font-mono text-gray-900 text-right">
                    {routeLabel}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {mode === 'borrow' || mode === 'repay'
                    ? 'Borrow APY (variable)'
                    : 'Supply APY'}
                </span>
                <span
                  className={`font-mono font-medium ${
                    mode === 'borrow' || mode === 'repay'
                      ? 'text-gray-900'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatPct(
                    mode === 'borrow' || mode === 'repay'
                      ? reserve.variableBorrowApy
                      : reserve.supplyApy,
                  )}
                </span>
              </div>
              {mode === 'supply' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Max LTV as collateral</span>
                  <span className="font-mono text-gray-900">
                    {reserve.ltv > 0
                      ? `${(reserve.ltv * 100).toFixed(0)}%`
                      : 'Not collateral'}
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

            {showWrapHint && wrapped && (
              <p className="text-[11px] leading-4 text-gray-400">
                Aave lends {wrapped.wrapped}, not {wrapped.native} — paying with{' '}
                {wrapped.native} wraps it 1:1 first, at no extra cost.
              </p>
            )}
            {quote?.route.kind === 'lifi' && quote.route.crossChain && (
              <p className="text-[11px] leading-4 text-gray-400">
                This route bridges to {chain} first — the {reserve.symbol} is
                supplied automatically once it lands, usually within a few
                minutes.
              </p>
            )}

            {overMax && (
              <p className="text-xs text-red-500">
                Amount exceeds {copy.balanceLabel.toLowerCase()}.
              </p>
            )}
            {quoteError && <p className="text-xs text-red-500">{quoteError}</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy
                ? status || 'Working…'
                : quoting
                  ? 'Quoting…'
                  : stage === 'collateral'
                    ? `Supply ${reserve.symbol} as collateral`
                    : `${copy.cta} ${reserve.symbol}`}
            </button>

            {/* Escape hatches between the two stages. */}
            {stage === 'collateral' ? (
              <button
                onClick={() => setStage('action')}
                disabled={busy}
                className="w-full text-center text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
              >
                Skip — I already have collateral
              </button>
            ) : mode === 'borrow' && maxAmount > 0 ? (
              <button
                onClick={() => setStage('collateral')}
                disabled={busy}
                className="w-full text-center text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
              >
                Add more collateral
              </button>
            ) : null}
          </div>
        )}

        {/* Aave asset picker */}
        {assetPickerOpen && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-semibold text-gray-800">
                {stage === 'collateral'
                  ? 'Which asset as collateral?'
                  : mode === 'borrow'
                    ? 'Borrow which asset?'
                    : 'Which asset?'}
              </h3>
              <button
                onClick={() => setAssetPickerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                aria-label="Back"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-gray-50 px-3 h-9">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                  placeholder="Search assets"
                  className="w-full bg-transparent text-[13px] outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4 max-h-[420px]">
              {pickableReserves.map((entry) => (
                <button
                  key={entry.asset}
                  onClick={() => {
                    setAssetPickerOpen(false);
                    setAssetSearch('');
                    // The collateral stage owns its own asset — changing it
                    // must not rewrite the borrow the user came here for.
                    if (stage === 'collateral') setCollateralReserve(entry);
                    else onSelectReserve(entry);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <AaveTokenIcon symbol={entry.symbol} size={28} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-gray-900 truncate">
                      {entry.symbol}
                    </span>
                    <span className="block text-[11px] text-gray-400 truncate">
                      {entry.name}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] text-gray-900">
                    {formatPct(
                      mode === 'borrow'
                        ? entry.variableBorrowApy
                        : entry.supplyApy,
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pay-with picker */}
        {payPickerOpen && (
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-semibold text-gray-800">Pay with</h3>
              <button
                onClick={() => setPayPickerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                aria-label="Back"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4 max-h-[460px]">
              {payTokens.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  No EVM tokens with a balance in this wallet.
                </p>
              ) : (
                payTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => {
                      setPayTokenId(token.id);
                      setPayPickerOpen(false);
                      setAmount('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <AaveTokenIcon symbol={token.symbol} size={28} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-gray-900 truncate">
                        {token.symbol}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate">
                        {token.name}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-[12px] text-gray-900">
                        {formatAmount(token.balance)}
                      </span>
                      <span className="block font-mono text-[11px] text-gray-400">
                        {formatUsd(token.balance * token.priceUsd)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
