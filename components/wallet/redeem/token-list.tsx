'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { RefreshCw, Copy, Gift, Check } from 'lucide-react';
import Image from 'next/image';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { usePrivy } from '@privy-io/react-auth';
import RedeemModal from '../token/redeem-modal';
import { copyTextToClipboard } from '@/lib/clipboard';

export interface RedemptionPool {
  pool_id: string;
  total_amount: number;
  remaining_amount: number;
  token_name: string;
  token_symbol: string;
  token_logo: string;
  token_mint: string;
  token_decimals: number;
  tokens_per_wallet: number;
  max_wallets?: number;
  created_at: string;
  expires_at: string | null;
  total_redemptions: number;
  total_redeemed_amount: number;
  redeemLink: string;
  wallet_address: string;
}

export function fromTokenLamports(
  lamports: string | number,
  decimals: number,
): number {
  return Number(lamports) / Math.pow(10, decimals);
}

function PoolSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-2 bg-gray-200 rounded w-36" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Gift className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">No redemption pools yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Create a pool to share tokens with others</p>
      </div>
      <Button
        size="sm"
        onClick={onCreate}
        className="mt-1 h-8 px-4 text-xs bg-black hover:bg-gray-800 text-white rounded-lg"
      >
        Create Pool
      </Button>
    </div>
  );
}

function PoolCard({ pool, onCopy, copiedId }: {
  pool: RedemptionPool;
  onCopy: (id: string, link: string) => void;
  copiedId: string | null;
}) {
  const pct = pool.total_amount > 0
    ? Math.max(0, Math.min(100, (pool.remaining_amount / pool.total_amount) * 100))
    : 0;

  const isExpired = pool.expires_at ? new Date(pool.expires_at) < new Date() : false;
  const isCopied = copiedId === pool.pool_id;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
      {/* Token logo */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        <Image
          src={sanitizeNextImageSrc(pool.token_logo)}
          alt={pool.token_symbol}
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-800 truncate">
            {pool.token_symbol}
          </span>
          {isExpired ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium shrink-0">
              Expired
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium shrink-0">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full bg-black rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">
            {pool.remaining_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{pool.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <p className="text-[10px] text-gray-400 mt-0.5">
          {pool.tokens_per_wallet.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pool.token_symbol} per wallet &middot; {pool.total_redemptions} redeemed
        </p>
      </div>

      {/* Copy action */}
      <button
        onClick={() => onCopy(pool.pool_id, pool.redeemLink)}
        title="Copy redeem link"
        className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        {isCopied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

export default function RedeemTokenList() {
  const { user } = usePrivy();
  const [pools, setPools] = useState<RedemptionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      if (!user?.id) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getRedeemPoolList/${user?.id}`,
      );
      if (response.ok) {
        const { data } = await response.json();
        const items = data.map((pool: RedemptionPool) => ({
          ...pool,
          total_amount: fromTokenLamports(pool.total_amount, pool.token_decimals),
          remaining_amount: fromTokenLamports(pool.remaining_amount, pool.token_decimals),
          tokens_per_wallet: fromTokenLamports(pool.tokens_per_wallet, pool.token_decimals),
          total_redeemed_amount: fromTokenLamports(pool.total_redeemed_amount || '0', pool.token_decimals),
          redeemLink: `https://redeem.swopme.app/${pool.pool_id}`,
        }));
        setPools(items);
      } else {
        toast.error('Failed to fetch redemption pools');
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast.error('Failed to fetch redemption pools');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchPools();
  }, [user?.id, fetchPools]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPools();
  };

  const handleCopy = async (id: string, link: string) => {
    try {
      const didCopy = await copyTextToClipboard(link);
      if (!didCopy) throw new Error('Unable to copy link');
      setCopiedId(id);
      toast.success('Link copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Redeem Pools
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black hover:bg-gray-800 text-white text-xs font-medium transition-colors"
          >
            <Gift className="w-3 h-3" />
            Create
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && <PoolSkeleton />}
        {!loading && pools.length === 0 && (
          <EmptyState onCreate={() => setOpen(true)} />
        )}
        {!loading && pools.length > 0 && (
          <div className="space-y-0.5">
            {pools.map((pool) => (
              <PoolCard
                key={pool.pool_id}
                pool={pool}
                onCopy={handleCopy}
                copiedId={copiedId}
              />
            ))}
          </div>
        )}
      </div>

      {open && (
        <RedeemModal
          mode="wallet"
          isOpen={open}
          onClose={() => {
            setOpen(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
