'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  useWallets as useSolanaWallets,
  useSignTransaction,
} from '@privy-io/react-auth/solana';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import {
  cancelTriggerOrder,
  executeTriggerOrder,
  getTriggerOrders,
} from '@/actions/jupiterTrigger';

const getSolanaRpcUrl = () =>
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  'https://api.mainnet-beta.solana.com';

const shortMint = (mint: string) =>
  mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : '';

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Parse a Jupiter order timestamp (unix seconds, unix ms, or ISO) to ms.
const orderTimeMs = (order: any): number => {
  const raw =
    order?.updatedAt ?? order?.createdAt ?? order?.openTx ?? order?.time;
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
};

const timeAgo = (ms: number): string => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

interface OpenLimitOrdersProps {
  tokens: any[];
  // bumping this number triggers a refetch (e.g. after a new order is placed)
  reloadKey?: number;
  onChanged?: () => void;
  solWalletAddress?: string;
  evmWalletAddress?: string;
  chains?: any[];
}

export default function OpenLimitOrders({
  tokens,
  reloadKey = 0,
  onChanged,
  solWalletAddress = '',
  evmWalletAddress = '',
  chains = ['SOLANA'],
}: OpenLimitOrdersProps) {
  const { toast } = useToast();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const solanaWallet = solanaWallets?.[0];

  // Recent market swaps (Jupiter / LiFi) across the user's chains.
  const { transactions: chainTxs } = useMultiChainTransactionData(
    solWalletAddress || solanaWallet?.address || '',
    evmWalletAddress,
    chains as any,
    { limit: 50, offset: 0 },
  );

  const recentSwaps = useMemo(
    () =>
      (chainTxs || []).filter((tx: any) => tx?.isSwapped && tx?.swapped),
    [chainTxs],
  );

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'history'>('history');

  // Lookup table: mint -> token meta (symbol/logo).
  const tokenByMint = useMemo(() => {
    const map = new Map<string, any>();
    (tokens || []).forEach((t) => {
      const mint = t.address || (t.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' : '');
      if (mint) map.set(mint, t);
    });
    return map;
  }, [tokens]);

  const meta = (mint: string) => tokenByMint.get(mint);
  const symbolOf = (mint: string) => meta(mint)?.symbol || shortMint(mint);

  // Lookup table: SYMBOL -> logo (for swap rows, which reference by symbol).
  const logoBySymbol = useMemo(() => {
    const map = new Map<string, string>();
    (tokens || []).forEach((t) => {
      const sym = t.symbol?.toUpperCase?.();
      const logo = t.logoURI || t.marketData?.iconUrl;
      if (sym && logo && !map.has(sym)) map.set(sym, logo);
    });
    return map;
  }, [tokens]);

  const fetchOrders = useCallback(async () => {
    if (!solanaWallet?.address) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getTriggerOrders({
        user: solanaWallet.address,
        orderStatus: view,
      });
      if (res.success) {
        setOrders(res.data.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [solanaWallet?.address, view]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, reloadKey]);

  const orderKeyOf = (order: any) =>
    order.orderKey || order.publicKey || order.order || order.account || '';

  const handleCancel = async (order: any) => {
    const key = orderKeyOf(order);
    if (!solanaWallet?.address || !key) return;
    setCancelling(key);
    try {
      const cancelRes = await cancelTriggerOrder({
        maker: solanaWallet.address,
        order: key,
      });
      if (!cancelRes.success) {
        toast({
          title: cancelRes.error || 'Failed to cancel order',
          variant: 'destructive',
        });
        return;
      }

      const connection = new Connection(getSolanaRpcUrl(), {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60_000,
      });
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(cancelRes.data.transaction, 'base64'),
      );
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.message.recentBlockhash = blockhash;

      const { signedTransaction } = await signTransaction({
        transaction: new Uint8Array(transaction.serialize()),
        wallet: solanaWallet,
      });

      const execRes = await executeTriggerOrder({
        signedTransaction: Buffer.from(signedTransaction).toString('base64'),
        requestId: cancelRes.data.requestId,
      });

      if (!execRes.success) {
        toast({
          title: execRes.error || 'Failed to cancel order',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Limit order cancelled' });
      setOrders((prev) => prev.filter((o) => orderKeyOf(o) !== key));
      onChanged?.();
    } catch (error: any) {
      console.error('[OpenLimitOrders] cancel error:', error);
      toast({
        title: error?.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    } finally {
      setCancelling(null);
    }
  };

  const renderOrder = (order: any) => {
    const key = orderKeyOf(order);
    const inMint = order.inputMint;
    const outMint = order.outputMint;

    const making = num(order.makingAmount ?? order.rawMakingAmount);
    const taking = num(order.takingAmount ?? order.rawTakingAmount);
    const remaining = num(
      order.remainingMakingAmount ?? order.rawRemainingMakingAmount,
    );
    const filledPct =
      making > 0 ? Math.min(100, Math.max(0, ((making - remaining) / making) * 100)) : 0;
    const price = making > 0 ? taking / making : 0;

    return (
      <div
        key={key}
        className="rounded-xl border border-black/[0.06] p-3 flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {meta(outMint)?.logoURI && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta(outMint).logoURI}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Sell {symbolOf(inMint)} for {symbolOf(outMint)}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                Limit {price > 0
                  ? price.toLocaleString(undefined, { maximumFractionDigits: 6 })
                  : '—'}{' '}
                {symbolOf(outMint)}/{symbolOf(inMint)}
              </p>
            </div>
          </div>
          {view === 'active' ? (
            <button
              type="button"
              onClick={() => handleCancel(order)}
              disabled={cancelling === key}
              className="text-[12px] font-medium text-red-500 hover:text-red-600 disabled:opacity-50 flex items-center gap-1"
            >
              {cancelling === key && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              Cancel
            </button>
          ) : (
            order.status && (
              <span className="text-[11px] font-medium text-gray-400 capitalize whitespace-nowrap">
                {String(order.status).toLowerCase()}
              </span>
            )
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>
            {making.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            {symbolOf(inMint)}
          </span>
          <span>{filledPct.toFixed(0)}% filled</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${filledPct}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSwap = (tx: any) => {
    const from = tx.swapped?.from || {};
    const to = tx.swapped?.to || {};
    const ts = num(tx.timeStamp) * 1000;
    const logo =
      to.logo ||
      logoBySymbol.get(String(to.symbol || '').toUpperCase()) ||
      tx.tokenLogo;
    const fromVal = num(from.value);
    const toVal = num(to.value);
    return (
      <div
        key={tx.hash || `${tx.timeStamp}-${from.symbol}-${to.symbol}`}
        className="rounded-xl border border-black/[0.06] p-3 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-6 h-6 rounded-full" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Swapped {from.symbol} → {to.symbol}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {timeAgo(ts)}
              {tx.network ? ` · ${String(tx.network).toLowerCase()}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <p className="text-[12px] font-medium text-emerald-600">
            +{toVal.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            {to.symbol}
          </p>
          <p className="text-[11px] text-gray-400">
            −{fromVal.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            {from.symbol}
          </p>
        </div>
      </div>
    );
  };

  // Recent view = limit-order history + market swaps, newest first.
  const historyItems = useMemo(() => {
    const orderItems = orders.map((o) => ({
      kind: 'order' as const,
      ts: orderTimeMs(o),
      data: o,
    }));
    const swapItems = recentSwaps.map((tx: any) => ({
      kind: 'swap' as const,
      ts: num(tx.timeStamp) * 1000,
      data: tx,
    }));
    return [...orderItems, ...swapItems].sort((a, b) => b.ts - a.ts);
  }, [orders, recentSwaps]);

  const count = view === 'active' ? orders.length : historyItems.length;

  const listClassName = 'min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100">
          {([
            ['active', 'Open'],
            ['history', 'Recent'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`px-3 py-1 text-[12px] font-medium rounded-md transition ${
                view === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {value === view && count > 0 && (
                <span className="ml-1.5 text-gray-400">{count}</span>
              )}
            </button>
          ))}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      {!solanaWallet?.address ? (
        <p className="text-[12px] text-gray-500 py-6 text-center">
          Connect a Solana wallet to view limit orders.
        </p>
      ) : view === 'active' ? (
        orders.length === 0 && !loading ? (
          <p className="text-[12px] text-gray-500 py-6 text-center">
            No open limit orders.
          </p>
        ) : (
          <div className={listClassName}>
            <div className="flex flex-col gap-2">
              {orders.map(renderOrder)}
            </div>
          </div>
        )
      ) : historyItems.length === 0 && !loading ? (
        <p className="text-[12px] text-gray-500 py-6 text-center">
          No recent swaps or orders.
        </p>
      ) : (
        <div className={listClassName}>
          <div className="flex flex-col gap-2">
            {historyItems.map((item) =>
              item.kind === 'order'
                ? renderOrder(item.data)
                : renderSwap(item.data),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
