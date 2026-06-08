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
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full border border-black/[0.08] bg-white hover:border-black/[0.2] transition text-sm font-medium text-gray-900"
      >
        {selected?.logoURI && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.logoURI}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        )}
        {selected?.symbol || label}
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
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
    <div className="flex flex-col gap-3">
      {/* You pay */}
      <div className="rounded-xl border border-black/[0.06] bg-gray-50/60 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            You pay
          </span>
          {payToken && (
            <span className="text-[11px] text-gray-500">
              Bal:{' '}
              {balanceNum.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={payAmount}
            onChange={(e) =>
              setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))
            }
            className="bg-transparent text-2xl font-semibold text-gray-900 outline-none w-full min-w-0"
          />
          <TokenSelect
            label="Select"
            tokens={solanaTokens}
            selected={payToken}
            onSelect={setPayToken}
          />
        </div>
      </div>

      {/* Limit price */}
      <div className="rounded-xl border border-black/[0.06] bg-gray-50/60 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            Limit price ({receiveToken?.symbol || '—'} per{' '}
            {payToken?.symbol || '—'})
          </span>
          <button
            type="button"
            onClick={handleSetMarket}
            disabled={marketRate <= 0}
            className="text-[11px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Use market
          </button>
        </div>
        <input
          inputMode="decimal"
          placeholder="0.0"
          value={limitPrice}
          onChange={(e) =>
            setLimitPrice(e.target.value.replace(/[^0-9.]/g, ''))
          }
          className="bg-transparent text-2xl font-semibold text-gray-900 outline-none w-full"
        />
        {priceDiffPct !== null && (
          <p
            className={`text-[11px] mt-1 ${
              priceDiffPct >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {priceDiffPct >= 0 ? '+' : ''}
            {priceDiffPct.toFixed(2)}% vs market
          </p>
        )}
      </div>

      {/* You receive */}
      <div className="rounded-xl border border-black/[0.06] bg-gray-50/60 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            You receive
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xl font-semibold text-gray-900 truncate">
            {receiveAmount > 0
              ? receiveAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })
              : '0.0'}
          </span>
          <TokenSelect
            label="Select"
            tokens={receiveTokens}
            selected={receiveToken}
            onSelect={setReceiveToken}
          />
        </div>
      </div>

      {/* Expiry */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-gray-500 mr-0.5">Expires:</span>
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setExpirySeconds(opt.seconds)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition ${
              expirySeconds === opt.seconds
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-black/[0.08] hover:border-black/[0.2]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {exceedsBalance && (
        <p className="text-[12px] text-red-500">
          Amount exceeds your {payToken?.symbol} balance.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        title={
          !bothSolana ? 'Limit orders are Solana-only' : undefined
        }
        className="mt-1 w-full h-11 rounded-xl bg-[#b45309] hover:bg-[#a04806] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
      >
        {submitting
          ? 'Placing order…'
          : !solanaWallet?.address
            ? 'Connect a Solana wallet'
            : !bothSolana
              ? 'Limit orders are Solana-only'
              : 'Place limit order'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">
        Limit orders run on Jupiter (Solana). EVM tokens swap instantly via the
        Market tab.
      </p>
    </div>
  );
}
