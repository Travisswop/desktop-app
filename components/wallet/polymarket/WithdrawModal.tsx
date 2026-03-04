'use client';

import { useState, useCallback } from 'react';
import {
  erc20Abi,
  parseUnits,
  encodeFunctionData,
} from 'viem';
import {
  OperationType,
  type SafeTransaction,
} from '@polymarket/builder-relayer-client';
import { useQueryClient } from '@tanstack/react-query';
import CustomModal from '@/components/modal/CustomModal';
import { useTrading, usePolymarketWallet } from '@/providers/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket';
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import {
  ArrowDownToLine,
  Check,
  Loader2,
  AlertCircle,
  Wallet,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WithdrawStep =
  | 'amount'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'error';

export default function WithdrawModal({
  open,
  onOpenChange,
}: WithdrawModalProps) {
  const { safeAddress, relayClient } = useTrading();
  const { eoaAddress } = usePolymarketWallet();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WithdrawStep>('amount');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const destination = eoaAddress;

  // --- Derived state ---
  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid =
    parsedAmount > 0 && parsedAmount <= usdcBalance;

  // --- Helpers ---
  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopyAddress = async () => {
    if (!destination) return;
    await navigator.clipboard.writeText(destination);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMax = () => {
    setAmount(usdcBalance.toFixed(6));
  };

  const handleClose = () => {
    if (step === 'processing') return;
    setStep('amount');
    setAmount('');
    setTxHash(null);
    setError(null);
    onOpenChange(false);
  };

  // --- Execute withdrawal via relayClient ---
  const executeWithdraw = useCallback(async () => {
    if (!relayClient || !destination || !safeAddress) {
      setError('Trading session not ready. Please try again.');
      setStep('error');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const amountInWei = parseUnits(
        parsedAmount.toFixed(USDC_E_DECIMALS),
        USDC_E_DECIMALS,
      );

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [destination as `0x${string}`, amountInWei],
      });

      const withdrawTx: SafeTransaction = {
        to: USDC_E_CONTRACT_ADDRESS,
        operation: OperationType.Call,
        data,
        value: '0',
      };

      const response = await relayClient.execute(
        [withdrawTx],
        `Withdraw ${parsedAmount.toFixed(2)} USDC.e to ${truncateAddress(destination)}`,
      );

      const receipt = await response.wait();
      setTxHash(
        typeof receipt === 'string'
          ? receipt
          : (receipt as any)?.transactionHash ?? null,
      );
      setStep('success');

      // Invalidate balance cache so it refreshes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['usdcBalance', safeAddress] });
      }, 3000);
    } catch (err: any) {
      const msg =
        err?.message || err?.toString() || 'Withdrawal failed';
      const isRejected =
        msg.includes('rejected') ||
        msg.includes('denied') ||
        msg.includes('cancelled') ||
        msg.includes('user rejected');

      setError(
        isRejected
          ? 'Transaction was rejected.'
          : `Withdrawal failed: ${msg}`,
      );
      setStep('error');
    }
  }, [
    relayClient,
    destination,
    safeAddress,
    parsedAmount,
    queryClient,
  ]);

  // --- Render helpers ---
  const renderAmountStep = () => (
    <div className="p-5 space-y-5">
      {/* Available balance */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-gray-500 mb-1">Available to withdraw</p>
        <p className="text-2xl font-bold text-gray-900">
          ${usdcBalance.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {usdcBalance.toFixed(6)} USDC.e (Safe wallet)
        </p>
      </div>

      {/* Destination */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Destination (Privy wallet)
        </label>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-700 font-mono flex-1">
            {destination ? truncateAddress(destination) : 'Not connected'}
          </span>
          {destination && (
            <button
              onClick={handleCopyAddress}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copied ? (
                <CheckCheck className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Amount input */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Amount (USDC.e)
        </label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16 text-base"
            min="0"
            step="0.01"
          />
          <button
            onClick={handleMax}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            MAX
          </button>
        </div>
        {amount && !isAmountValid && (
          <p className="text-xs text-red-500">
            {parsedAmount <= 0
              ? 'Enter a valid amount'
              : 'Exceeds available balance'}
          </p>
        )}
      </div>

      <Button
        onClick={() => setStep('confirm')}
        disabled={!isAmountValid || !destination || !relayClient}
        className="w-full bg-black text-white hover:bg-gray-800"
      >
        <ArrowDownToLine className="w-4 h-4 mr-2" />
        Review Withdrawal
      </Button>

      {!relayClient && (
        <p className="text-xs text-center text-amber-600">
          Trading session must be initialized to withdraw.
        </p>
      )}
    </div>
  );

  const renderConfirmStep = () => (
    <div className="p-5 space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">You withdraw</span>
          <span className="font-semibold text-gray-900">
            {parsedAmount.toFixed(6)} USDC.e
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">USD value</span>
          <span className="font-semibold text-gray-900">
            ≈ ${parsedAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">From</span>
          <span className="font-mono text-gray-700 text-xs">
            {safeAddress ? truncateAddress(safeAddress) : '—'}{' '}
            <span className="text-gray-400">(Safe)</span>
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">To</span>
          <span className="font-mono text-gray-700 text-xs">
            {destination ? truncateAddress(destination) : '—'}{' '}
            <span className="text-gray-400">(Privy wallet)</span>
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Network</span>
          <span className="text-gray-700">Polygon</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Gas fee</span>
          <span className="text-green-600 font-medium">Sponsored</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep('amount')}
        >
          Back
        </Button>
        <Button
          className="flex-1 bg-black text-white hover:bg-gray-800"
          onClick={executeWithdraw}
        >
          Confirm Withdrawal
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Processing withdrawal...</p>
        <p className="text-sm text-gray-500 mt-1">
          Signing and submitting via Safe relay
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Withdrawal successful!</p>
        <p className="text-sm text-gray-500 mt-1">
          {parsedAmount.toFixed(2)} USDC.e sent to your Privy wallet
        </p>
      </div>
      {txHash && (
        <a
          href={`https://polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline truncate max-w-xs text-center"
        >
          View on Polygonscan ↗
        </a>
      )}
      <Button
        className="w-full bg-black text-white hover:bg-gray-800 mt-2"
        onClick={handleClose}
      >
        Done
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="p-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Withdrawal failed</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
      </div>
      <div className="flex gap-3 w-full mt-2">
        <Button variant="outline" className="flex-1" onClick={handleClose}>
          Close
        </Button>
        <Button
          className="flex-1 bg-black text-white hover:bg-gray-800"
          onClick={() => {
            setError(null);
            setStep('confirm');
          }}
        >
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <CustomModal
      isOpen={open}
      onClose={handleClose}
      title="Withdraw USDC.e"
      width="max-w-md"
    >
      {step === 'amount' && renderAmountStep()}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'success' && renderSuccessStep()}
      {step === 'error' && renderErrorStep()}
    </CustomModal>
  );
}
