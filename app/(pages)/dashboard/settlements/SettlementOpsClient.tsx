'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { useUser } from '@/lib/UserContext';
import {
  listMarketplaceOrders,
  retryMarketplaceReceipt,
  type MarketplaceOrder,
} from '@/lib/marketplace-api';

type TabId =
  | 'needs_action'
  | 'held'
  | 'release_pending'
  | 'released'
  | 'failed_receipts'
  | 'all';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'held', label: 'Held' },
  { id: 'release_pending', label: 'Release pending' },
  { id: 'released', label: 'Released' },
  { id: 'failed_receipts', label: 'Failed receipts' },
  { id: 'all', label: 'All' },
];

type SettlementStats = {
  held: number;
  releasePending: number;
  released: number;
  failedReceipts: number;
};

const emptyStats: SettlementStats = {
  held: 0,
  releasePending: 0,
  released: 0,
  failedReceipts: 0,
};

export default function SettlementOpsClient() {
  const { user, accessToken } = useUser();
  const [activeTab, setActiveTab] = useState<TabId>('needs_action');
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [stats, setStats] = useState<SettlementStats>(emptyStats);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const load = useCallback(
    async (tab: TabId, token: string) => {
      setLoading(true);
      setError(null);
      try {
        const focusedPromise =
          tab === 'all'
            ? listMarketplaceOrders(token, { role: 'seller', limit: 200 })
            : fetchTabOrders(token, tab);
        const statsPromise = fetchSettlementStats(token);

        const [statsResult, focusedResult] = await Promise.all([
          statsPromise,
          focusedPromise,
        ]);

        setStats(statsResult);
        setOrders(focusedResult.items || []);
      } catch (loadError) {
        console.error('Failed to load marketplace settlements:', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load settlements.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user?._id || !accessToken) {
      setLoading(false);
      setError('Authentication required.');
      return;
    }
    load(activeTab, accessToken);
  }, [accessToken, activeTab, load, user?._id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const haystack = [
        order.publicReference,
        order.orderId,
        order.buyer?.name,
        order.buyer?.email,
        order.buyer?.wallet?.address,
        order.settlement?.status,
        order.receipt?.status,
        order.lineItems?.map((item) => item.productSnapshot?.title).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, search]);

  const handleRetryReceipt = async (order: MarketplaceOrder) => {
    if (!accessToken) return;
    const orderKey = order._id || order.orderId;
    const wasReceiptFailed = order.receipt?.status === 'failed';
    setRetryingOrderId(orderKey);
    try {
      const result = await retryMarketplaceReceipt(accessToken, orderKey);
      replaceOrder(result.order, setOrders);
      if (wasReceiptFailed && result.order.receipt?.status !== 'failed') {
        setStats((current) => ({
          ...current,
          failedReceipts: Math.max(0, current.failedReceipts - 1),
        }));
      }
      toast.success(
        result.alreadyMinted ? 'Receipt already minted' : 'Receipt retry complete'
      );
    } catch (retryError) {
      toast.error(
        retryError instanceof Error
          ? retryError.message
          : 'Receipt retry failed'
      );
    } finally {
      setRetryingOrderId(null);
    }
  };

  return (
    <main className="main-container">
      <div className="min-h-screen bg-[#f4f4f2] px-4 pb-28 pt-7 text-[#101114] sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <header className="flex flex-col gap-4 rounded-lg border border-[#e6e9ef] bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#e2e6ed] bg-[#fbfcfd] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#626b7a]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Settlement Ops
              </div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Settlements
              </h1>
              <p className="mt-1 text-sm font-medium text-[#646b78]">
                Merchant payouts, escrow holds, manual release states, and
                receipt mint health.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => accessToken && load(activeTab, accessToken)}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] shadow-sm transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
              <Link
                href="/order"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#101114] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24262b]"
              >
                Orders
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Held"
              value={stats.held}
              detail="Escrow waiting on receipt"
              tone="amber"
              icon={Clock3}
            />
            <StatCard
              label="Release pending"
              value={stats.releasePending}
              detail="Manual settlement queue"
              tone="blue"
              icon={Truck}
            />
            <StatCard
              label="Released"
              value={stats.released}
              detail="Merchant payout complete"
              tone="green"
              icon={CheckCircle2}
            />
            <StatCard
              label="Failed receipts"
              value={stats.failedReceipts}
              detail="Retry or investigate minting"
              tone="red"
              icon={AlertTriangle}
            />
          </section>

          <section className="overflow-hidden rounded-lg border border-[#e6e9ef] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#edf0f3] bg-[#fbfcfd] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${
                        active
                          ? 'border-[#101114] bg-[#101114] text-white'
                          : 'border-[#dfe4eb] bg-white text-[#4f5867] hover:border-[#c8d0dc]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders"
                  className="h-10 w-full rounded-md border border-[#dfe4eb] bg-white pl-9 pr-3 text-sm font-medium text-[#101114] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#101114] focus:ring-2 focus:ring-[#101114]/10"
                />
              </div>
            </div>

            {error ? (
              <div className="m-5 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] p-4 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : loading ? (
              <LoadingRows />
            ) : filtered.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1060px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#edf0f3] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#737b8c]">
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Settlement</th>
                      <th className="px-4 py-3">Receipt</th>
                      <th className="px-4 py-3">Release</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => (
                      <SettlementRow
                        key={order._id || order.orderId}
                        order={order}
                        retrying={retryingOrderId === (order._id || order.orderId)}
                        onRetryReceipt={handleRetryReceipt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

async function fetchTabOrders(token: string, tab: TabId) {
  if (tab === 'needs_action') {
    const [settlementResult, receiptResult] = await Promise.all([
      listMarketplaceOrders(token, {
        role: 'seller',
        settlementStatus: 'held,release_pending,failed',
        limit: 200,
      }),
      listMarketplaceOrders(token, {
        role: 'seller',
        receiptStatus: 'failed',
        limit: 200,
      }),
    ]);
    return {
      ...settlementResult,
      items: dedupeOrders([
        ...(settlementResult.items || []),
        ...(receiptResult.items || []),
      ]),
    };
  }

  if (tab === 'failed_receipts') {
    return listMarketplaceOrders(token, {
      role: 'seller',
      receiptStatus: 'failed',
      limit: 200,
    });
  }

  return listMarketplaceOrders(token, {
    role: 'seller',
    settlementStatus: tab,
    limit: 200,
  });
}

async function fetchSettlementStats(token: string): Promise<SettlementStats> {
  const [held, releasePending, released, failedReceipts] = await Promise.all([
    countOrders(token, { settlementStatus: 'held' }),
    countOrders(token, { settlementStatus: 'release_pending' }),
    countOrders(token, { settlementStatus: 'released' }),
    countOrders(token, { receiptStatus: 'failed' }),
  ]);

  return {
    held,
    releasePending,
    released,
    failedReceipts,
  };
}

async function countOrders(
  token: string,
  params: {
    settlementStatus?: string;
    receiptStatus?: string;
  }
) {
  const result = await listMarketplaceOrders(token, {
    role: 'seller',
    limit: 1,
    ...params,
  });
  return Number.isFinite(result.total) ? result.total : result.items?.length || 0;
}

function SettlementRow({
  order,
  retrying,
  onRetryReceipt,
}: {
  order: MarketplaceOrder;
  retrying: boolean;
  onRetryReceipt: (order: MarketplaceOrder) => void;
}) {
  const orderKey = order._id || order.orderId;
  const receiptFailed = order.receipt?.status === 'failed';

  return (
    <tr className="border-b border-[#edf0f3] align-top last:border-0">
      <td className="px-4 py-4">
        <Link
          href={`/order/${encodeURIComponent(orderKey)}?tab=payments`}
          className="font-mono text-xs font-semibold text-[#101114] underline-offset-2 hover:underline"
        >
          {shortReference(order)}
        </Link>
        <p className="mt-1 max-w-[220px] truncate text-xs font-medium text-[#737b8c]">
          {lineItemTitle(order)}
        </p>
        <p className="mt-1 text-[11px] font-medium text-[#8b93a3]">
          {formatDate(order.createdAt)}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-[#303642]">
          {order.buyer?.name || order.buyer?.email || 'Customer'}
        </p>
        <p className="mt-1 font-mono text-xs text-[#737b8c]">
          {shortValue(order.buyer?.wallet?.address)}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="font-mono text-sm font-semibold">
          {money(order.settlement?.merchantReceivesAmount, order.financial?.currency)}
        </p>
        <p className="mt-1 text-xs text-[#737b8c]">
          Gross {money(order.financial?.totalCost, order.financial?.currency)}
        </p>
      </td>
      <td className="px-4 py-4">
        <StatusPill kind="settlement" status={order.settlement?.status} />
        <p className="mt-2 text-xs font-medium text-[#737b8c]">
          {humanize(order.settlement?.policy || 'direct')}
        </p>
        <p className="mt-1 text-xs text-[#8b93a3]">
          {order.settlement?.mode || 'mode pending'}
        </p>
      </td>
      <td className="px-4 py-4">
        <StatusPill kind="receipt" status={order.receipt?.status} />
        <p className="mt-2 font-mono text-xs text-[#737b8c]">
          {shortValue(order.receipt?.mintAddress || order.receipt?.txHash)}
        </p>
        {order.receipt?.error ? (
          <p className="mt-1 max-w-[180px] truncate text-xs text-[#b42318]">
            {order.receipt.error}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <p className="max-w-[220px] text-xs font-medium text-[#303642]">
          {releaseCopy(order)}
        </p>
        <p className="mt-1 font-mono text-xs text-[#737b8c]">
          {shortValue(order.settlement?.txHash)}
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          {receiptFailed ? (
            <button
              type="button"
              onClick={() => onRetryReceipt(order)}
              disabled={retrying}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-xs font-semibold text-[#303642] transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Retry
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyOrderId(order)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe4eb] bg-white text-[#4f5867] transition hover:bg-[#f7f8fa]"
            title="Copy order id"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <Link
            href={`/order/${encodeURIComponent(orderKey)}?tab=payments`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#101114] text-white transition hover:bg-[#24262b]"
            title="View order"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'amber' | 'blue' | 'green' | 'red';
  icon: LucideIcon;
}) {
  const toneClass = {
    amber: 'bg-[#fff8e6] text-[#8a5a00] border-[#f1d8a7]',
    blue: 'bg-[#eef4ff] text-[#1d4ed8] border-[#c8d7ff]',
    green: 'bg-[#effaf3] text-[#166534] border-[#bfe8cf]',
    red: 'bg-[#fff5f5] text-[#b42318] border-[#ffd0d0]',
  }[tone];

  return (
    <div className="rounded-lg border border-[#e6e9ef] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#737b8c]">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {value.toLocaleString()}
          </p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md border ${toneClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-[#737b8c]">{detail}</p>
    </div>
  );
}

function StatusPill({
  status,
  kind,
}: {
  status?: string;
  kind: 'settlement' | 'receipt';
}) {
  const normalized = String(status || 'pending').toLowerCase();
  const tone = statusTone(normalized, kind);
  const Icon =
    normalized === 'released' || normalized === 'minted'
      ? CheckCircle2
      : normalized === 'failed'
        ? XCircle
        : normalized === 'held' || normalized === 'release_pending'
          ? AlertTriangle
          : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {humanize(normalized)}
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-md bg-[#f1f4f8]"
        />
      ))}
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: TabId }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#f1f4f8] text-[#626b7a]">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#303642]">
        No {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} orders
      </p>
      <p className="mt-1 max-w-sm text-xs font-medium text-[#858d9b]">
        Settlement records will appear here after marketplace payments complete.
      </p>
    </div>
  );
}

function dedupeOrders(orders: MarketplaceOrder[]) {
  const seen = new Set<string>();
  return orders.filter((order) => {
    const key = order._id || order.orderId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function replaceOrder(
  updated: MarketplaceOrder,
  setRows: Dispatch<SetStateAction<MarketplaceOrder[]>>
) {
  setRows((rows) => {
    const key = updated._id || updated.orderId;
    return rows.map((row) => (row._id || row.orderId) === key ? updated : row);
  });
}

function statusTone(status: string, kind: 'settlement' | 'receipt') {
  if (status === 'released' || status === 'minted') {
    return 'border-[#bfe8cf] bg-[#effaf3] text-[#166534]';
  }
  if (status === 'failed') {
    return 'border-[#ffd0d0] bg-[#fff5f5] text-[#b42318]';
  }
  if (status === 'held' || status === 'release_pending') {
    return 'border-[#f1d8a7] bg-[#fff8e6] text-[#8a5a00]';
  }
  if (kind === 'receipt' && status === 'minting') {
    return 'border-[#c8d7ff] bg-[#eef4ff] text-[#1d4ed8]';
  }
  return 'border-[#e5e7eb] bg-[#f4f5f7] text-[#5d6673]';
}

function lineItemTitle(order: MarketplaceOrder) {
  const items = order.lineItems || [];
  const first = items[0]?.productSnapshot?.title || 'Marketplace order';
  return items.length > 1 ? `${first} + ${items.length - 1} more` : first;
}

function shortReference(order: MarketplaceOrder) {
  const reference = order.publicReference || order.orderId || order._id || '';
  if (reference.startsWith('swop_')) return reference.replace('swop_', '#');
  if (reference.startsWith('mkt_order_')) return `#${reference.slice(-8)}`;
  return reference ? `#${reference.slice(-10)}` : '#order';
}

function money(value?: number, currency = 'USDC') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `0.00 ${currency || 'USDC'}`;
  return `${numeric.toFixed(2)} ${(currency || 'USDC').toUpperCase()}`;
}

function humanize(value?: string) {
  return String(value || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortValue(value?: string | null) {
  if (!value) return 'pending';
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function formatDate(value?: string) {
  if (!value) return 'pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'pending';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function releaseCopy(order: MarketplaceOrder) {
  if (order.settlement?.error) return order.settlement.error;
  if (order.settlement?.releaseReason) {
    return humanize(order.settlement.releaseReason);
  }
  if (order.settlement?.status === 'held') {
    return order.fulfillment?.receiptConfirmedAt
      ? 'Receipt confirmed'
      : 'Waiting for buyer receipt confirmation';
  }
  if (order.settlement?.status === 'release_pending') {
    return 'Manual release required';
  }
  if (order.settlement?.status === 'released') {
    return order.settlement.releasedAt
      ? `Released ${formatDate(order.settlement.releasedAt)}`
      : 'Released';
  }
  return 'Pending payment completion';
}

function copyOrderId(order: MarketplaceOrder) {
  const value = order.orderId || order._id;
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success('Order ID copied'))
    .catch(() => toast.error('Could not copy order ID'));
}
