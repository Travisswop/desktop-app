'use client';

import { useEffect, useMemo, useState } from 'react';
import type * as hl from '@nktkas/hyperliquid';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  CheckCheck,
  Copy,
  Loader2,
  Wallet,
  X,
} from 'lucide-react';
import { useTrading } from '@/providers/polymarket';
import { copyTextToClipboard } from '@/lib/clipboard';
import { DepositForm } from './DepositForm';
import { useHyperliquidDexTransfer } from './hooks/useHyperliquidDexTransfer';
import { useHyperliquidWithdraw } from './hooks/useHyperliquidWithdraw';

export type PerpsActionTab = 'deposit' | 'withdraw';

interface PerpsActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterAddress: string | null;
  masterClient: hl.ExchangeClient | null;
  withdrawable: number;
  dexWithdrawables: Record<string, number>;
  initialTab?: PerpsActionTab;
  onBridgeToArbitrum?: () => void;
  onDepositSubmitted?: () => void;
  onPredictionWithdrawSubmitted?: (amountUsd: number) => void;
}

export function PerpsActionsModal({
  isOpen,
  onClose,
  masterAddress,
  masterClient,
  withdrawable,
  dexWithdrawables,
  initialTab = 'deposit',
  onBridgeToArbitrum,
  onDepositSubmitted,
  onPredictionWithdrawSubmitted,
}: PerpsActionsModalProps) {
  const [tab, setTab] = useState<PerpsActionTab>(initialTab);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Perps Account
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <TabButton
              active={tab === 'deposit'}
              onClick={() => setTab('deposit')}
              icon={<ArrowDownToLine className="w-3.5 h-3.5" />}
              label="Deposit"
            />
            <TabButton
              active={tab === 'withdraw'}
              onClick={() => setTab('withdraw')}
              icon={<ArrowUpFromLine className="w-3.5 h-3.5" />}
              label="Withdraw"
            />
          </div>
        </div>

        {tab === 'deposit' ? (
          <DepositForm
            masterAddress={masterAddress}
            onClose={onClose}
            onBridgeToArbitrum={onBridgeToArbitrum}
            onDepositSubmitted={onDepositSubmitted}
            showHeader={false}
          />
        ) : (
          <WithdrawForm
            masterAddress={masterAddress}
            masterClient={masterClient}
            withdrawable={withdrawable}
            dexWithdrawables={dexWithdrawables}
            onClose={onClose}
            onPredictionWithdrawSubmitted={onPredictionWithdrawSubmitted}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

type WithdrawStep = 'amount' | 'confirm' | 'processing' | 'success' | 'error';
type DestinationId = 'main' | 'predictions';

interface DestinationOption {
  id: DestinationId;
  label: string;
  detail: string;
  address: string | null;
  withdrawAddress: string | null;
}

const formatAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const formatUsd = (amount: number) =>
  amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function WithdrawForm({
  masterAddress,
  masterClient,
  withdrawable,
  dexWithdrawables,
  onClose,
  onPredictionWithdrawSubmitted,
}: {
  masterAddress: string | null;
  masterClient: hl.ExchangeClient | null;
  withdrawable: number;
  dexWithdrawables: Record<string, number>;
  onClose: () => void;
  onPredictionWithdrawSubmitted?: (amountUsd: number) => void;
}) {
  const {
    depositWalletAddress,
    safeAddress,
    tradingWalletAddress,
    walletType,
  } = useTrading();
  const { withdraw, isWithdrawing } = useHyperliquidWithdraw({
    masterClient,
    masterAddress,
  });
  const { sweepDexToMain, isTransferring } = useHyperliquidDexTransfer({
    masterClient,
    masterAddress,
  });
  const [step, setStep] = useState<WithdrawStep>('amount');
  const [amount, setAmount] = useState('');
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationId>('main');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');

  const predictionAddress =
    tradingWalletAddress ?? depositWalletAddress ?? safeAddress ?? null;
  const availableWithdrawable = Number.isFinite(withdrawable)
    ? Math.max(withdrawable, 0)
    : 0;
  const mainWithdrawable = Number.isFinite(dexWithdrawables[''])
    ? Math.max(dexWithdrawables[''], 0)
    : availableWithdrawable;
  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid =
    parsedAmount > 0 && parsedAmount <= availableWithdrawable;

  const sweepPlan = useMemo(() => {
    let remaining = Math.max(parsedAmount - mainWithdrawable, 0);
    if (remaining <= 0.000001) return [];

    return Object.entries(dexWithdrawables)
      .filter(([dex, balance]) => dex && Number.isFinite(balance) && balance > 0)
      .sort((a, b) => b[1] - a[1])
      .flatMap(([dex, balance]) => {
        if (remaining <= 0.000001) return [];
        const amountToSweep = Math.min(balance, remaining);
        remaining -= amountToSweep;
        return amountToSweep > 0.000001
          ? [{ dex, amount: amountToSweep }]
          : [];
      });
  }, [dexWithdrawables, mainWithdrawable, parsedAmount]);

  const needsSweep = sweepPlan.length > 0;
  const destinations = useMemo<DestinationOption[]>(
    () => [
      {
        id: 'main',
        label: 'Main wallet',
        detail: 'Back to your selected EVM wallet',
        address: masterAddress,
        withdrawAddress: masterAddress,
      },
      {
        id: 'predictions',
        label: 'Predictions wallet',
        detail:
          walletType === 'deposit'
            ? 'Withdraw USDC to Arbitrum, then convert to pUSD'
            : 'Withdraw USDC to Arbitrum, then fund your Safe',
        address: predictionAddress,
        withdrawAddress: masterAddress,
      },
    ],
    [masterAddress, predictionAddress, walletType],
  );
  const destination = destinations.find(
    (option) => option.id === selectedDestination,
  );
  const destinationAddress = destination?.address ?? null;
  const withdrawAddress = destination?.withdrawAddress ?? null;
  const isPredictionDestination = selectedDestination === 'predictions';
  const canSubmit =
    isAmountValid &&
    Boolean(withdrawAddress) &&
    Boolean(masterAddress) &&
    Boolean(masterClient);

  useEffect(() => {
    if (selectedDestination === 'predictions' && !predictionAddress) {
      setSelectedDestination('main');
    }
  }, [predictionAddress, selectedDestination]);

  const resetAndClose = () => {
    if (step === 'processing') return;
    setStep('amount');
    setAmount('');
    setSelectedDestination('main');
    setCopiedAddress(null);
    setError(null);
    setProcessingStatus('');
    onClose();
  };

  const handleCopyAddress = async (address: string) => {
    const didCopy = await copyTextToClipboard(address);
    if (!didCopy) {
      setError('Could not copy address. Please try again.');
      setStep('error');
      return;
    }
    setCopiedAddress(address);
    window.setTimeout(() => setCopiedAddress(null), 1600);
  };

  const executeWithdraw = async () => {
    if (!withdrawAddress) {
      setError('Choose a withdrawal destination.');
      setStep('error');
      return;
    }

    setStep('processing');
    setError(null);
    setProcessingStatus(
      needsSweep
        ? 'Moving collateral back to your main perps account...'
        : 'Submitting Hyperliquid withdrawal...',
    );

    try {
      for (const sweep of sweepPlan) {
        setProcessingStatus(
          `Moving $${formatUsd(sweep.amount)} from ${sweep.dex} to main perps...`,
        );
        await sweepDexToMain(sweep.dex, sweep.amount);
      }

      setProcessingStatus('Submitting Hyperliquid withdrawal...');
      await withdraw({
        destination: withdrawAddress,
        amountUsd: parsedAmount,
      });
      setStep('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Withdrawal failed.';
      const rejected = [
        'rejected',
        'denied',
        'cancelled',
        'canceled',
        'user rejected',
      ].some((phrase) => message.toLowerCase().includes(phrase));
      setError(rejected ? 'Transaction was rejected.' : message);
      setStep('error');
    }
  };

  if (step === 'processing') {
    return (
      <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Processing withdrawal
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            {processingStatus ||
              `Sign the Hyperliquid request to send USDC to ${
                destination?.label.toLowerCase() || 'your wallet'
              }.`}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Withdrawal submitted
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            {isPredictionDestination
              ? `$${formatUsd(parsedAmount)} USDC is headed to your Arbitrum wallet. Convert it to pUSD with the Predictions deposit flow once it lands.`
              : `$${formatUsd(parsedAmount)} USDC is headed to ${
                  destination?.label.toLowerCase() || 'your wallet'
                }.`}
          </p>
        </div>
        {destinationAddress && (
          <div className="w-full rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-xs font-mono text-gray-600">
            {formatAddress(destinationAddress)}
          </div>
        )}
        {isPredictionDestination && onPredictionWithdrawSubmitted && (
          <button
            onClick={() => {
              onPredictionWithdrawSubmitted(parsedAmount);
              resetAndClose();
            }}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Open pUSD Deposit
          </button>
        )}
        <button
          onClick={resetAndClose}
          className={`w-full py-2.5 font-semibold rounded-xl transition-colors text-sm ${
            isPredictionDestination && onPredictionWithdrawSubmitted
              ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          }`}
        >
          Done
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="px-6 pb-8 pt-4 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Withdrawal failed
          </h3>
          <p className="text-sm text-red-600 mt-1 max-w-xs break-words">
            {error || 'Please try again.'}
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={resetAndClose}
            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              setError(null);
              setStep('amount');
            }}
            className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="px-6 pb-6 space-y-4">
        <div className="space-y-3">
          {[
            ['You withdraw', `${parsedAmount.toFixed(6)} USDC`],
            ['From', 'Perps wallet'],
            [
              'To',
              `${destination?.label || 'Wallet'} ${
                destinationAddress ? formatAddress(destinationAddress) : ''
              }`,
            ],
            [
              'Network',
              isPredictionDestination ? 'Arbitrum USDC → pUSD' : 'Arbitrum USDC',
            ],
            [
              'Preparation',
              needsSweep
                ? `Move ${sweepPlan.length} DEX balance${
                    sweepPlan.length === 1 ? '' : 's'
                  } to main first`
                : isPredictionDestination
                  ? 'Withdraw first, then LiFi deposit'
                  : 'Ready in main perps',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-right text-xs font-semibold text-gray-900">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 flex gap-3">
          <button
            onClick={() => setStep('amount')}
            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={executeWithdraw}
            disabled={isWithdrawing || isTransferring}
            className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            {isWithdrawing || isTransferring ? 'Submitting...' : 'Withdraw'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-2 space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Available to withdraw</p>
        <p className="text-2xl font-bold text-gray-900">
          ${formatUsd(availableWithdrawable)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Across your Hyperliquid perps accounts
        </p>
      </div>

      {mainWithdrawable < availableWithdrawable && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          ${formatUsd(mainWithdrawable)} is already in main perps. If you
          withdraw more, Swop will move available builder-market collateral
          back to main first.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Destination
        </label>
        <div className="grid gap-2">
          {destinations.map((option) => {
            const disabled = !option.address;
            const active = selectedDestination === option.id;
            return (
              <div
                key={option.id}
                className={`flex w-full items-stretch rounded-xl border text-left transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedDestination(option.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 px-3 py-3 text-left"
                >
                  <Wallet
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      active ? 'text-white' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p
                      className={`text-xs ${
                        active ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {option.detail}
                    </p>
                    <p
                      className={`mt-1 truncate text-xs font-mono ${
                        active ? 'text-white/75' : 'text-gray-400'
                      }`}
                    >
                      {option.address
                        ? formatAddress(option.address)
                        : option.id === 'predictions'
                          ? 'Enable Predictions trading first'
                          : 'Not available'}
                    </p>
                    {option.id === 'predictions' &&
                      option.address &&
                      masterAddress && (
                        <p
                          className={`mt-1 text-[11px] ${
                            active ? 'text-white/60' : 'text-gray-400'
                          }`}
                        >
                          Hyperliquid withdrawal lands at{' '}
                          {formatAddress(masterAddress)} first.
                        </p>
                      )}
                  </div>
                </button>
                {option.address && (
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(option.address!)}
                    className={`px-3 ${
                      active
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    aria-label={`Copy ${option.label} address`}
                  >
                    {copiedAddress === option.address ? (
                      <CheckCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Amount
          </label>
          <button
            type="button"
            onClick={() => setAmount(availableWithdrawable.toFixed(6))}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            MAX
          </button>
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          placeholder="0.00"
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-center text-xl font-semibold text-gray-900 outline-none focus:border-gray-900"
        />
        {amount && !isAmountValid && (
          <p className="text-xs text-red-500">
            {parsedAmount <= 0
              ? 'Enter an amount greater than 0.'
              : 'Amount exceeds withdrawable balance.'}
          </p>
        )}
      </div>

      {!masterClient && (
        <p className="text-xs text-center text-amber-600">
          Enable perps trading before withdrawing.
        </p>
      )}

      <button
        onClick={() => setStep('confirm')}
        disabled={!canSubmit}
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        Review Withdrawal
      </button>
    </div>
  );
}
