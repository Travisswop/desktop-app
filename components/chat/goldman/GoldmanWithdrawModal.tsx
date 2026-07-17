'use client';

// Withdraw popup for the Goldman strategy vault: pick a vault token, enter an
// amount (or MAX), and the backend sends it from the vault straight to the
// owner's main wallet. The destination is resolved server-side from the
// authenticated user — this UI never chooses a recipient.

import { useMemo, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { TokenData } from '@/types/token';
import { formatCompactUsd } from '@/lib/chat/ticketFormat';
import {
  withdrawGoldmanVault,
  type GoldmanVaultWithdrawResult,
} from './goldmanApi';

// Chains the backend treasury scans for vault holdings — the withdraw
// endpoint validates against the same set, so don't offer anything else.
const WITHDRAWABLE_CHAINS = new Set([
  'ETHEREUM',
  'POLYGON',
  'BASE',
  'ARBITRUM',
]);

function tokenKey(token: TokenData) {
  return `${token.chain}:${token.address || 'native'}:${token.symbol}`;
}

function tokenBalance(token: TokenData) {
  const balance = Number(token.balance);
  return Number.isFinite(balance) && balance > 0 ? balance : 0;
}

function tokenUsd(token: TokenData) {
  if (Number.isFinite(token.value) && (token.value as number) > 0) {
    return token.value as number;
  }
  const price = Number(token.marketData?.price);
  const balance = tokenBalance(token);
  return Number.isFinite(price) && price > 0 ? balance * price : 0;
}

export default function GoldmanWithdrawModal({
  open,
  onClose,
  tokens,
  groupId,
  accessToken,
  onWithdrawn,
}: {
  open: boolean;
  onClose: () => void;
  tokens: TokenData[];
  groupId: string;
  accessToken: string;
  onWithdrawn?: (result: GoldmanVaultWithdrawResult) => void;
}) {
  const withdrawableTokens = useMemo(
    () =>
      (tokens || []).filter(
        (token) =>
          WITHDRAWABLE_CHAINS.has(String(token.chain || '').toUpperCase()) &&
          tokenBalance(token) > 0
      ),
    [tokens]
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [isMax, setIsMax] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GoldmanVaultWithdrawResult | null>(
    null
  );

  const selectedToken =
    withdrawableTokens.find((token) => tokenKey(token) === selectedKey) ||
    withdrawableTokens[0] ||
    null;

  const amount = Number(amountInput);
  const balance = selectedToken ? tokenBalance(selectedToken) : 0;
  const amountValid =
    isMax || (Number.isFinite(amount) && amount > 0 && amount <= balance);
  const canSubmit =
    Boolean(selectedToken && groupId && accessToken) &&
    amountValid &&
    !isSubmitting;

  if (!open) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setResult(null);
    setAmountInput('');
    setIsMax(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedToken || !canSubmit) return;
    setIsSubmitting(true);
    try {
      const withdrawal = await withdrawGoldmanVault({
        groupId,
        accessToken,
        chain: String(selectedToken.chain || '').toLowerCase(),
        tokenAddress: selectedToken.address,
        symbol: selectedToken.isNative ? 'NATIVE' : selectedToken.symbol,
        amount: isMax ? undefined : amount,
        isMax,
      });
      setResult(withdrawal);
      onWithdrawn?.(withdrawal);
      toast.success(
        `Sent ${withdrawal.amount.toFixed(4)} ${withdrawal.token.symbol} to your main wallet`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Vault withdrawal failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goldman-withdraw-title"
      data-testid="goldman-withdraw-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#101217] text-xs shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#eceef2]">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-[#f4c95d]/15">
                <Download className="h-4 w-4 text-[#f4c95d]" />
              </span>
              <span id="goldman-withdraw-title" className="truncate">
                Withdraw from the sack
              </span>
            </div>
            <div className="dm-mono mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#737783]">
              vault → your main wallet · nothing else, ever
            </div>
          </div>
          <button
            type="button"
            title="Close withdraw"
            onClick={handleClose}
            disabled={isSubmitting}
            className="dm-btn grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[#eceef2] disabled:cursor-default disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dm-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {result ? (
            <div className="rounded-[10px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-3 py-3">
              <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
                withdrawal sent
              </div>
              <div className="mt-2 text-[13px] font-semibold text-[#eceef2]">
                {result.amount.toFixed(6)} {result.token.symbol} →{' '}
                {result.to.slice(0, 6)}…{result.to.slice(-4)}
              </div>
              <div
                className="dm-mono mt-1.5 truncate text-[10px] font-semibold text-[#9af7c4]"
                title={result.transactionHash}
              >
                tx {result.transactionHash}
              </div>
              <div className="mt-1.5 text-[11px] font-medium text-[#9396a0]">
                Balances refresh within a minute.
              </div>
            </div>
          ) : withdrawableTokens.length === 0 ? (
            <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-3 text-[12px] font-medium text-[#9396a0]">
              The vault has no liquid tokens to withdraw. Funds deployed into
              predictions or perps need to be exited back to the vault first.
            </div>
          ) : (
            <>
              <div>
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  token
                </div>
                <div className="mt-1.5 max-h-[180px] space-y-1.5 overflow-y-auto">
                  {withdrawableTokens.map((token) => {
                    const key = tokenKey(token);
                    const selected = selectedToken
                      ? tokenKey(selectedToken) === key
                      : false;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedKey(key);
                          setIsMax(false);
                          setAmountInput('');
                        }}
                        className={`dm-btn flex w-full items-center justify-between gap-2 rounded-[9px] border px-3 py-2 text-left ${
                          selected
                            ? 'border-[#f4c95d]/40 bg-[#f4c95d]/10'
                            : 'border-white/[0.07] bg-black/20'
                        }`}
                      >
                        <span className="dm-mono min-w-0 truncate text-[12px] font-bold text-[#eceef2]">
                          {String(token.symbol || 'TOKEN').toUpperCase()}
                          <span className="ml-1.5 text-[9px] font-semibold uppercase text-[#5a5e69]">
                            {token.chain}
                          </span>
                        </span>
                        <span className="dm-mono flex-shrink-0 text-right">
                          <span className="block text-[11px] font-semibold text-[#cdd0d7]">
                            {tokenBalance(token).toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}
                          </span>
                          <span className="block text-[9.5px] font-medium text-[#737783]">
                            {formatCompactUsd(tokenUsd(token))}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  amount
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={isMax ? balance.toString() : amountInput}
                    disabled={isMax}
                    placeholder="0.00"
                    onChange={(event) => setAmountInput(event.target.value)}
                    data-testid="goldman-withdraw-amount"
                    className="dm-mono h-10 min-w-0 flex-1 rounded-[9px] border border-white/[0.07] bg-[#0e1014] px-3 text-[14px] font-semibold text-[#eceef2] outline-none focus:border-[#f4c95d]/45 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    aria-pressed={isMax}
                    onClick={() => {
                      setIsMax((current) => !current);
                      setAmountInput('');
                    }}
                    className={`dm-btn dm-mono h-10 flex-shrink-0 rounded-[9px] border px-3 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      isMax
                        ? 'border-[#f4c95d]/40 bg-[#f4c95d]/15 text-[#f4c95d]'
                        : 'border-white/[0.07] bg-black/20 text-[#9396a0]'
                    }`}
                  >
                    Max
                  </button>
                </div>
                {selectedToken && (
                  <div className="dm-mono mt-1.5 text-[10px] font-semibold text-[#737783]">
                    available{' '}
                    {balance.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{' '}
                    {String(selectedToken.symbol || '').toUpperCase()}
                    {!isMax &&
                      Number.isFinite(amount) &&
                      amount > balance && (
                        <span className="ml-1.5 text-[#ff8585]">
                          exceeds balance
                        </span>
                      )}
                  </div>
                )}
              </div>

              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  destination
                </div>
                <div className="mt-1 text-[12px] font-semibold text-[#eceef2]">
                  Your main wallet
                </div>
                <div className="mt-0.5 text-[10.5px] font-medium text-[#737783]">
                  Resolved from your account on the server — the vault can only
                  ever withdraw back to you.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-white/[0.07] bg-[#111318] px-4 py-3.5">
          {result ? (
            <button
              type="button"
              onClick={handleClose}
              className="dm-btn dm-mono flex h-10 w-full items-center justify-center gap-1.5 rounded-[9px] border border-white/[0.07] bg-black/20 text-[11px] font-bold uppercase tracking-[0.08em] text-[#eceef2]"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              data-testid="goldman-withdraw-submit"
              className="dm-btn dm-mono flex h-10 w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#f4c95d]/35 bg-[#f4c95d]/15 text-[11px] font-bold uppercase tracking-[0.08em] text-[#f4c95d] disabled:cursor-default disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isSubmitting ? 'Sending' : 'Withdraw to main wallet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
