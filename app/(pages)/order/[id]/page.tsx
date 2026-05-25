'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { useUser } from '@/lib/UserContext';
import OrderDetailScreen, {
  type OrderDetail,
} from '@/components/order/OrderDetailScreen';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  params: Promise<{ id: string }>;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user, accessToken } = useUser();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (orderId: string, token: string) => {
      const res = await fetch(`${API}/api/v2/desktop/orders/${orderId}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`order ${res.status}`);
      const { data } = (await res.json()) as { data: OrderDetail };
      return data;
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
    load(id, accessToken)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError('Failed to load order.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, accessToken, load]);

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
          ) : order ? (
            <OrderDetailScreen order={order} backHref="/order" />
          ) : (
            <div className="text-center py-16 text-gray-500">
              Order not found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-5 w-96" />
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64 rounded-2xl" />
    <Skeleton className="h-40 rounded-2xl" />
  </div>
);
