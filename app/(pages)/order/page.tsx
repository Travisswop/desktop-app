'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/lib/UserContext';
import OrdersScreen, {
  type OrderRow,
  type OrderTab,
  type OrderTotals,
} from '@/components/order/OrdersScreen';
import { Skeleton } from '@/components/ui/skeleton';

const API = process.env.NEXT_PUBLIC_API_URL;

const TAB_TO_ROLE: Record<OrderTab, 'all' | 'seller' | 'buyer'> = {
  Payments: 'seller',
  Sold: 'seller',
  Purchases: 'buyer',
};

export default function OrdersPage() {
  const { user, accessToken } = useUser();
  const [tab, setTab] = useState<OrderTab>('Payments');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [totals, setTotals] = useState<OrderTotals | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (currentTab: OrderTab, token: string) => {
      const role = TAB_TO_ROLE[currentTab];
      const params = new URLSearchParams({
        role,
        tab: currentTab.toLowerCase(),
        since: '30d',
      });
      const listRes = await fetch(
        `${API}/api/v2/desktop/orders/listByUser?${params.toString()}`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      if (!listRes.ok) {
        throw new Error(`list ${listRes.status}`);
      }
      const list = (await listRes.json()) as {
        data: { rows: OrderRow[]; total: number };
      };

      let parsedTotals: OrderTotals | undefined;
      if (role === 'seller') {
        const sumRes = await fetch(
          `${API}/api/v2/desktop/orders/summaryByUser?since=30d`,
          { headers: { authorization: `Bearer ${token}` } }
        );
        if (sumRes.ok) {
          const sum = (await sumRes.json()) as {
            data: { totals: { units: number; revenue: number; orders: number } };
          };
          parsedTotals = {
            units: sum.data.totals.units,
            revenue: sum.data.totals.revenue,
            orders: sum.data.totals.orders,
          };
        }
      }

      return { rows: list.data.rows, totals: parsedTotals };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) {
      const t = setTimeout(() => {
        if (!cancelled && !accessToken) {
          setError('Authentication required.');
          setLoading(false);
        }
      }, 5000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    setLoading(true);
    setError(null);
    load(tab, accessToken)
      .then(({ rows: r, totals: t }) => {
        if (!cancelled) {
          setRows(r);
          setTotals(t);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError('Failed to load orders.');
          setLoading(false);
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
          minHeight: '100vh',
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
            />
          )}
        </div>
      </div>
    </main>
  );
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
