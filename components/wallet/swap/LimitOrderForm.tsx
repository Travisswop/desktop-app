'use client';

import { useMemo, useState } from 'react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  useWallets as useSolanaWallets,
  useSignTransaction,
} from '@privy-io/react-auth/solana';
import { ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  decimalAmountToRawUnits,
  normalizeTokenDecimals,
} from '@/lib/wallet/swapAmounts';
import {
  createTriggerOrder,
  executeTriggerOrder,
} from '@/actions/jupiterTrigger';

const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const getSolanaRpcUrl = () =>
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  'https://api.mainnet-beta.solana.com';

const isSolanaToken = (token: any) =>
  token?.chain?.toUpperCase?.() === 'SOLANA';

const getMint = (token: any) => {
  if (!token) return '';
  if (token.address) return token.address;
  if (token.symbol?.toUpperCase?.() === 'SOL') return WRAPPED_SOL_MINT;
  return '';
};

const getPriceUsd = (token: any) => {
  const raw = token?.marketData?.price;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const EXPIRY_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: 'No expiry', seconds: null },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86_400 },
  { label: '7 days', seconds: 604_800 },
  { label: '30 days', seconds: 2_592_000 },
];

interface TokenSelectProps {
  label: string;
  tokens: any[];
  selected: any;
  onSelect: (token: any) => void;
}

function TokenSelect({ label, tokens, selected, onSelect }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[7px] pl-[7px] pr-3 py-[7px] rounded-full bg-white border border-black/[0.06] hover:bg-gray-50 transition-colors flex-shrink-0"
      >
        {selected?.logoURI ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.logoURI}
            alt=""
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#dfe6ef] flex items-center justify-center text-[9px] font-bold text-[#0a0a0c]">
            {selected?.symbol?.slice(0, 3) || '—'}
          </div>
        )}
        <span className="text-[12.5px] font-semibold">
          {selected?.symbol || label}
        </span>
        <ChevronDown className="w-3 h-3 text-[#6e6e76]" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-56 max-h-72 overflow-y-auto bg-white border border-black/[0.08] rounded-xl shadow-lg py-1">
            {tokens.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">
                No Solana tokens found
              </p>
            )}
            {tokens.map((t) => (
              <button
                key={getMint(t) || t.symbol}
                type="button"
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition"
              >
                {t.logoURI && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logoURI}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">
                    {t.symbol}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {t.name}
                  </span>
                </span>
                {t.balance && (
                  <span className="text-[11px] text-gray-500">
                    {Number(t.balance).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface LimitOrderFormProps {
  tokens: any[];
  onOrderCreated?: () => void;
}

export default function LimitOrderForm({
  tokens,
  onOrderCreated,
}: LimitOrderFormProps) {
  const { toast } = useToast();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  const solanaWallet = solanaWallets?.[0];

  // Solana tokens the user holds (for the "pay" side).
  const solanaTokens = useMemo(
    () => (tokens || []).filter(isSolanaToken),
    [tokens],
  );

  // Receive options: held Solana tokens plus USDC/SOL fallbacks.
  const receiveTokens = useMemo(() => {
    const list = [...solanaTokens];
    const hasMint = (mint: string) =>
      list.some((t) => getMint(t) === mint);
    if (!hasMint(USDC_MINT)) {
      list.push({
        name: 'USD Coin',
        symbol: 'USDC',
        address: USDC_MINT,
        decimals: 6,
        chain: 'SOLANA',
        logoURI:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        marketData: { price: '1' },
      });
    }
    return list;
  }, [solanaTokens]);

  const [payToken, setPayToken] = useState<any>(solanaTokens[0] || null);
  const [receiveToken, setReceiveToken] = useState<any>(
    receiveTokens.find((t) => getMint(t) === USDC_MINT) || null,
  );
  const [payAmount, setPayAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [expirySeconds, setExpirySeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const marketRate = useMemo(() => {
    const payUsd = getPriceUsd(payToken);
    const recvUsd = getPriceUsd(receiveToken);
    if (payUsd > 0 && recvUsd > 0) return payUsd / recvUsd;
    return 0;
  }, [payToken, receiveToken]);

  const receiveAmount = useMemo(() => {
    const amt = parseFloat(payAmount);
    const price = parseFloat(limitPrice);
    if (!Number.isFinite(amt) || !Number.isFinite(price)) return 0;
    return amt * price;
  }, [payAmount, limitPrice]);

  const priceDiffPct = useMemo(() => {
    const price = parseFloat(limitPrice);
    if (!Number.isFinite(price) || marketRate <= 0) return null;
    return ((price - marketRate) / marketRate) * 100;
  }, [limitPrice, marketRate]);

  const bothSolana =
    isSolanaToken(payToken) && isSolanaToken(receiveToken);

  const balanceNum = Number(payToken?.balance || 0);
  const exceedsBalance =
    payToken && Number(payAmount) > 0 && Number(payAmount) > balanceNum;

  const canSubmit =
    bothSolana &&
    !!solanaWallet?.address &&
    !!payToken &&
    !!receiveToken &&
    getMint(payToken) !== getMint(receiveToken) &&
    Number(payAmount) > 0 &&
    Number(limitPrice) > 0 &&
    receiveAmount > 0 &&
    !exceedsBalance &&
    !submitting;

  const handleSetMarket = () => {
    if (marketRate > 0) setLimitPrice(String(Number(marketRate.toPrecision(6))));
  };

  // ── Pay-amount dial ──────────────────────────────────────────────
  const payPct =
    balanceNum > 0
      ? Math.min(100, Math.max(0, (Number(payAmount) / balanceNum) * 100))
      : 0;

  const setPayPct = (pct: number) => {
    if (balanceNum <= 0) return;
    const decimals = normalizeTokenDecimals(payToken?.decimals, 9);
    const amt = (balanceNum * pct) / 100;
    setPayAmount(String(Number(amt.toFixed(Math.min(decimals, 9)))));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !solanaWallet) return;
    setSubmitting(true);
    try {
      const payDecimals = normalizeTokenDecimals(payToken.decimals, 9);
      const recvDecimals = normalizeTokenDecimals(receiveToken.decimals, 6);

      const makingAmount = decimalAmountToRawUnits(payAmount, payDecimals);
      const takingDecimal = receiveAmount.toFixed(recvDecimals);
      const takingAmount = decimalAmountToRawUnits(takingDecimal, recvDecimals);

      if (!makingAmount || makingAmount <= 0n || !takingAmount || takingAmount <= 0n) {
        toast({
          title: 'Enter a valid amount and price',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const expiredAt =
        expirySeconds !== null
          ? String(Math.floor(Date.now() / 1000) + expirySeconds)
          : undefined;

      const createRes = await createTriggerOrder({
        inputMint: getMint(payToken),
        outputMint: getMint(receiveToken),
        maker: solanaWallet.address,
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
        expiredAt,
      });

      if (!createRes.success) {
        toast({
          title: createRes.error || 'Failed to create limit order',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const { transaction: txB64, requestId } = createRes.data;

      const connection = new Connection(getSolanaRpcUrl(), {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60_000,
      });
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(txB64, 'base64'),
      );
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.message.recentBlockhash = blockhash;

      const { signedTransaction } = await signTransaction({
        transaction: new Uint8Array(transaction.serialize()),
        wallet: solanaWallet,
      });

      const execRes = await executeTriggerOrder({
        signedTransaction: Buffer.from(signedTransaction).toString('base64'),
        requestId,
      });

      if (!execRes.success) {
        toast({
          title: execRes.error || 'Failed to submit limit order',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      toast({
        title: 'Limit order placed',
        description: `Sell ${payAmount} ${payToken.symbol} for ${receiveToken.symbol} at ${limitPrice}`,
      });
      setPayAmount('');
      setLimitPrice('');
      onOrderCreated?.();
    } catch (error: any) {
      console.error('[LimitOrderForm] submit error:', error);
      toast({
        title: error?.message || 'Limit order failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header — Tag + subtitle, matching the Market tab */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold tracking-[1.4px] uppercase font-mono px-2 py-1 rounded-md bg-[#fafafa] border border-black/[0.06] text-[#0a0a0c]">
            Limit
          </span>
          <span className="text-[11.5px] text-[#6e6e76] -tracking-[0.05px]">
            Set a price and fill on Jupiter
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* ── Pay card ── */}
        <div className="p-4 pb-[18px] rounded-2xl bg-[#fafafa] border border-black/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76]">
              You pay
            </span>
            <span
              className={`text-[10.5px] font-mono ${
                exceedsBalance ? 'text-red-500' : 'text-[#6e6e76]'
              }`}
            >
              Bal ·{' '}
              {payToken
                ? `${balanceNum.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })} ${payToken.symbol}`
                : '0'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2.5">
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) =>
                setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))
              }
              className="bg-transparent border-none text-[32px] font-semibold w-full min-w-0 p-0 leading-none -tracking-[1px] font-mono text-[#0a0a0c] outline-none"
            />
            <TokenSelect
              label="Select"
              tokens={solanaTokens}
              selected={payToken}
              onSelect={setPayToken}
            />
          </div>

          {/* Dial — drag to set the amount you pay */}
          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(payPct)}
              onChange={(e) => setPayPct(Number(e.target.value))}
              disabled={balanceNum <= 0}
              aria-label="Amount to pay"
              className="limit-dial w-full h-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: `linear-gradient(to right, #0a0a0c 0%, #0a0a0c ${payPct}%, #e5e7eb ${payPct}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex gap-2 mt-3">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPayPct(pct)}
                  disabled={balanceNum <= 0}
                  className="px-3 py-1.5 text-[11px] font-medium bg-white border border-black/[0.06] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  {pct === 100 ? 'Max' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Limit price card ── */}
        <div className="p-4 pb-[18px] rounded-2xl bg-[#fafafa] border border-black/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76]">
              Limit price · {receiveToken?.symbol || '—'}/
              {payToken?.symbol || '—'}
            </span>
            <button
              type="button"
              onClick={handleSetMarket}
              disabled={marketRate <= 0}
              className="text-[10.5px] font-mono font-semibold text-[#0a0a0c] hover:text-black disabled:opacity-40"
            >
              Use market
            </button>
          </div>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={limitPrice}
            onChange={(e) =>
              setLimitPrice(e.target.value.replace(/[^0-9.]/g, ''))
            }
            className="bg-transparent border-none text-[32px] font-semibold w-full p-0 mt-2.5 leading-none -tracking-[1px] font-mono text-[#0a0a0c] outline-none"
          />
          {priceDiffPct !== null && (
            <div
              className={`text-[11.5px] font-mono mt-[5px] ${
                priceDiffPct >= 0 ? 'text-[#19a974]' : 'text-[#e5484d]'
              }`}
            >
              {priceDiffPct >= 0 ? '+' : ''}
              {priceDiffPct.toFixed(2)}% vs market
            </div>
          )}
        </div>

        {/* ── Receive card ── */}
        <div className="p-4 pb-[18px] rounded-2xl bg-[#fafafa] border border-black/[0.06]">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76]">
              You receive
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2.5">
            <div className="text-[32px] font-semibold leading-none -tracking-[1px] font-mono text-[#0a0a0c] truncate">
              {receiveAmount > 0
                ? receiveAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })
                : '0.00'}
            </div>
            <TokenSelect
              label="Select"
              tokens={receiveTokens}
              selected={receiveToken}
              onSelect={setReceiveToken}
            />
          </div>
        </div>
      </div>

      {/* Expiry */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76] mr-0.5">
          Expires
        </span>
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setExpirySeconds(opt.seconds)}
            className={`h-7 px-2.5 rounded-lg text-[11px] font-medium border transition-colors ${
              expirySeconds === opt.seconds
                ? 'bg-[#0a0a0c] text-white border-[#0a0a0c]'
                : 'bg-white text-[#6e6e76] border-black/[0.06] hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {exceedsBalance && (
        <p className="text-[11.5px] font-mono text-red-500 mt-2">
          Amount exceeds your {payToken?.symbol} balance.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        title={!bothSolana ? 'Limit orders are Solana-only' : undefined}
        className="mt-4 w-full py-3.5 rounded-xl bg-[#0a0a0c] hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold -tracking-[0.1px] transition-colors"
      >
        {submitting
          ? 'Placing order…'
          : !solanaWallet?.address
            ? 'Connect a Solana wallet'
            : !bothSolana
              ? 'Limit orders are Solana-only'
              : Number(payAmount) <= 0 || Number(limitPrice) <= 0
                ? 'Enter amount'
                : 'Place limit order'}
      </button>
      <p className="text-[10.5px] font-mono text-[#6e6e76] text-center mt-2">
        Limit orders run on Jupiter (Solana). EVM tokens swap instantly via the
        Market tab.
      </p>

      <style jsx>{`
        .limit-dial {
          -webkit-appearance: none;
          appearance: none;
          border-radius: 9999px;
          outline: none;
        }
        .limit-dial::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid rgba(10, 10, 12, 0.12);
          box-shadow: 0 1px 2px rgba(10, 10, 12, 0.12),
            0 4px 12px -4px rgba(10, 10, 12, 0.2);
          cursor: pointer;
        }
        .limit-dial::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid rgba(10, 10, 12, 0.12);
          box-shadow: 0 1px 2px rgba(10, 10, 12, 0.12),
            0 4px 12px -4px rgba(10, 10, 12, 0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
