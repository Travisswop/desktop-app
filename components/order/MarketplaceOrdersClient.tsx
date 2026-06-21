'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/UserContext';
import {
  listMarketplaceOrders,
  type MarketplaceOrder,
  type MarketplaceParty,
} from '@/lib/marketplace-api';

import OrdersScreen, {
  type OrderRow,
  type OrderTab,
  type OrderTotals,
} from './OrdersScreen';

const TAB_TO_ROLE: Record<OrderTab, 'all' | 'seller' | 'buyer'> = {
  Payments: 'seller',
  Sold: 'seller',
  Purchases: 'buyer',
};

export default function MarketplaceOrdersClient() {
  const { user, accessToken } = useUser();
  const [tab, setTab] = useState<OrderTab>('Payments');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [totals, setTotals] = useState<OrderTotals | undefined>();
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (currentTab: OrderTab, token: string, currentUserId: string) => {
      const role = TAB_TO_ROLE[currentTab];
      const list = await listMarketplaceOrders(token, { role, limit: 200 });
      const marketplaceOrders = list.items || [];
      const rows = marketplaceOrders.map((order) =>
        mapMarketplaceOrderRow(order, currentTab, currentUserId)
      );

      let parsedTotals: OrderTotals | undefined;
      if (role === 'seller') {
        parsedTotals = summarizeSellerOrders(marketplaceOrders);
      }

      return { rows, totals: parsedTotals };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) {
      const timer = setTimeout(() => {
        if (!cancelled && !accessToken) {
          setError('Authentication required.');
          setLoading(false);
        }
      }, 5000);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    // First successful load shows the full-page skeleton; subsequent tab
    // switches keep the screen mounted and show in-table skeleton rows.
    if (hasLoadedRef.current) {
      setIsFetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    load(tab, accessToken, user._id)
      .then(({ rows: nextRows, totals: nextTotals }) => {
        if (!cancelled) {
          setRows(nextRows);
          setTotals(nextTotals);
          setLoading(false);
          setIsFetching(false);
          hasLoadedRef.current = true;
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError('Failed to load orders.');
          setLoading(false);
          setIsFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, user, accessToken, load]);

  return (
    <main className="main-container">
      <div
        style={{
          background: '#f4f4f2',
          minHeight: 'calc(100vh - 3rem)',
          margin: '-24px',
          padding: '28px 24px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-16 text-red-600">{error}</div>
          ) : (
            <OrdersScreen
              tab={tab}
              onTabChange={setTab}
              rows={rows}
              totals={totals}
              isFetching={isFetching}
              backHref="/dashboard"
            />
          )}
        </div>
      </div>
    </main>
  );
}

function mapMarketplaceOrderRow(
  order: MarketplaceOrder,
  tab: OrderTab,
  currentUserId: string
): OrderRow {
  const role = resolveRole(order, tab, currentUserId);
  const counterparty = role === 'buyer' ? order.merchant : order.buyer;
  const orderId = order.orderId || order._id;

  return {
    id: shortReference(order),
    orderId,
    counterparty: partyName(counterparty),
    counterpartyAvatar: initials(counterparty),
    item: lineItemTitle(order),
    price: Number(order.financial?.totalCost) || 0,
    date: formatDate(order.createdAt || order.updatedAt || ''),
    delivery: deliveryLabel(order, tab, role),
    chain:
      String(order.financial?.currency || order.payment?.currency || 'USDC')
        .toUpperCase() === 'SOL'
        ? 'SOL'
        : 'USDC',
    role,
    _id: order._id || orderId,
    checkoutMode: order.checkoutMode,
  };
}

function resolveRole(
  order: MarketplaceOrder,
  tab: OrderTab,
  currentUserId: string
): 'buyer' | 'seller' {
  if (tab === 'Purchases') return 'buyer';
  if (tab === 'Payments' || tab === 'Sold') return 'seller';
  return String(order.buyer?.id || '') === String(currentUserId)
    ? 'buyer'
    : 'seller';
}

function shortReference(order: MarketplaceOrder) {
  const reference = order.publicReference || order.orderId || order._id || '';
  if (reference.startsWith('swop_')) return reference.replace('swop_', '#');
  if (reference.startsWith('mkt_order_')) return `#${reference.slice(-8)}`;
  return reference ? `#${reference.slice(-10)}` : '#order';
}

function partyName(party?: MarketplaceParty | null) {
  return (
    party?.name ||
    party?.email ||
    shortWallet(party?.wallet?.address) ||
    'Unknown'
  );
}

function initials(party?: MarketplaceParty | null) {
  const name = partyName(party);
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function shortWallet(address?: string) {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function lineItemTitle(order: MarketplaceOrder) {
  const items = order.lineItems || [];
  const first = items[0]?.productSnapshot?.title || 'Marketplace item';
  if (items.length <= 1) return first;
  return `${first} + ${items.length - 1} more`;
}

function deliveryLabel(
  order: MarketplaceOrder,
  tab: OrderTab,
  role: 'buyer' | 'seller'
) {
  if (order.payment?.status === 'refunded') return 'Refunded';
  if (
    order.payment?.status === 'cancelled' ||
    order.status === 'cancelled' ||
    order.status === 'failed' ||
    order.settlement?.status === 'failed'
  ) {
    return 'Cancel';
  }

  if (tab === 'Payments') {
    if (order.settlement?.status === 'released') return 'Settled';
    if (order.payment?.status === 'completed') return 'Pending';
    return 'Pending';
  }

  if (order.fulfillment?.status === 'receipt_confirmed') {
    return role === 'buyer' ? 'Delivered' : 'Complete';
  }
  if (order.settlement?.status === 'released' || order.status === 'completed') {
    return role === 'buyer' ? 'Delivered' : 'Complete';
  }

  switch (order.fulfillment?.status) {
    case 'delivered':
      return 'Delivered';
    case 'shipped':
    case 'out_for_delivery':
      return 'In transit';
    case 'processing':
    case 'pending':
      return 'Processing';
    case 'not_required':
      return order.payment?.status === 'completed' ? 'Complete' : 'Pending';
    default:
      return order.payment?.status === 'completed' ? 'Processing' : 'Pending';
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function summarizeSellerOrders(orders: MarketplaceOrder[]): OrderTotals {
  const completed = orders.filter(
    (order) => order.payment?.status === 'completed'
  );
  return {
    units: completed.reduce(
      (total, order) =>
        total +
        (order.lineItems || []).reduce(
          (lineTotal, item) => lineTotal + (Number(item.quantity) || 0),
          0
        ),
      0
    ),
    revenue: completed.reduce(
      (total, order) => total + (Number(order.financial?.totalCost) || 0),
      0
    ),
    orders: completed.length,
  };
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-9 w-44" />
    </div>
    <Skeleton className="h-5 w-72" />
    <Skeleton className="h-10 w-64" />
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-96 rounded-2xl" />
  </div>
);
