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

interface OpenLimitOrdersProps {
  tokens: any[];
  // bumping this number triggers a refetch (e.g. after a new order is placed)
  reloadKey?: number;
  onChanged?: () => void;
}

export default function OpenLimitOrders({
  tokens,
  reloadKey = 0,
  onChanged,
}: OpenLimitOrdersProps) {
  const { toast } = useToast();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const solanaWallet = solanaWallets?.[0];

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

  return (
    <div className="flex flex-col gap-3">
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
              {value === view && orders.length > 0 && (
                <span className="ml-1.5 text-gray-400">{orders.length}</span>
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
      ) : orders.length === 0 && !loading ? (
        <p className="text-[12px] text-gray-500 py-6 text-center">
          {view === 'active' ? 'No open limit orders.' : 'No recent orders.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">{orders.map(renderOrder)}</div>
      )}
    </div>
  );
}
