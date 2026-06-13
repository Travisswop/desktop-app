'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import ProductsScreen, {
  type ProductRow,
} from '@/components/mint/ProductsScreen';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listMarketplaceOrders,
  listMarketplaceProducts,
  updateMarketplaceProduct,
  type MarketplaceOrder,
  type MarketplaceProduct,
} from '@/lib/marketplace-api';
import { getMarketplaceProductDisplayType } from '@/lib/marketplace-display';

interface ProductSalesRow {
  productId: string;
  units: number;
  revenue: number;
}

interface SalesSummary {
  perProduct: ProductSalesRow[];
  totals: { units: number; revenue: number; templates: number; orders: number };
}

const CREATE_HREF = '/products/create';

export default function ProductsPage() {
  const { user, accessToken } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);

  const load = useCallback(
    async (token: string) => {
      const [productsRes, ordersRes] = await Promise.all([
        listMarketplaceProducts(token, { scope: 'mine', limit: 200 }),
        listMarketplaceOrders(token, { role: 'seller', limit: 200 }),
      ]);

      const summary = summarizeSales(ordersRes.items || []);
      const salesByProduct: Record<string, ProductSalesRow> = {};
      for (const r of summary.perProduct) {
        salesByProduct[r.productId] = r;
      }

      const mapped = (productsRes.items || [])
        .filter((item) => item.status !== 'archived')
        .map<ProductRow>((item) => mapProductRow(item, salesByProduct[item._id]));

      return { rows: mapped, summary };
    },
    []
  );

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      if (!accessToken) throw new Error('Authentication required.');
      await updateMarketplaceProduct(accessToken, productId, {
        status: 'archived',
      });
      setRows((current) => current.filter((row) => row.id !== productId));
    },
    [accessToken]
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) {
      const t = setTimeout(() => {
        if (!cancelled && !accessToken) {
          setError('Authentication required. Please log in.');
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
    load(accessToken)
      .then(({ rows: r, summary: s }) => {
        if (!cancelled) {
          setRows(r);
          setSummary(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError('Failed to load products. Please try again.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, load]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
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
            <div className="text-center py-16 text-red-600">{error}</div>
          </div>
        </div>
      </main>
    );
  }

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
          <ProductsScreen
            rows={rows}
            hideBack
            createHref={CREATE_HREF}
            kicker={kickerFor(rows)}
            totals={summary?.totals}
            onDeleteProduct={handleDeleteProduct}
          />
        </div>
      </div>
    </main>
  );
}

function kickerFor(rows: ProductRow[]): string {
  if (rows.length === 0) return 'No products yet · create your first one';
  const live = rows.filter((r) => r.status === 'live').length;
  const physical = rows.filter((r) => r.type === 'Physical').length;
  const digital = rows.filter((r) => r.type === 'Digital').length;
  const service = rows.filter((r) => r.type === 'Service').length;
  const parts: string[] = [
    `${rows.length} product${rows.length === 1 ? '' : 's'}`,
  ];
  if (live) parts.push(`${live} live`);
  parts.push(`${physical} physical`);
  parts.push(`${digital} digital`);
  if (service) parts.push(`${service} service`);
  return parts.join(' · ');
}

function mapProductRow(
  item: MarketplaceProduct,
  sales?: ProductSalesRow
): ProductRow {
  const available = item.inventory?.available;
  return {
    id: item._id,
    name: item.title,
    type: getMarketplaceProductDisplayType(item.productType),
    price: Number(item.price?.amount) || 0,
    stock: typeof available === 'number' ? available : undefined,
    units: sales?.units,
    revenue: sales?.revenue,
    currency: (item.price?.currency || 'USDC').toUpperCase(),
    status:
      item.status === 'draft'
        ? 'draft'
        : typeof available === 'number' && available <= 5
        ? 'low'
        : 'live',
    glyph: glyphFor(item.title),
    image: item.primaryImage || item.images?.[0]?.url,
  };
}

function summarizeSales(orders: MarketplaceOrder[]): SalesSummary {
  const byProduct: Record<string, ProductSalesRow> = {};
  let totalUnits = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    if (order.payment?.status !== 'completed') continue;
    for (const item of order.lineItems || []) {
      const productId = String(item.productId || '');
      if (!productId) continue;
      const quantity = Number(item.quantity) || 0;
      const revenue = Number(item.totalAmount ?? item.unitAmount * quantity) || 0;
      totalUnits += quantity;
      totalRevenue += revenue;
      byProduct[productId] = {
        productId,
        units: (byProduct[productId]?.units || 0) + quantity,
        revenue: (byProduct[productId]?.revenue || 0) + revenue,
      };
    }
  }

  return {
    perProduct: Object.values(byProduct),
    totals: {
      units: totalUnits,
      revenue: totalRevenue,
      templates: Object.keys(byProduct).length,
      orders: orders.filter((order) => order.payment?.status === 'completed').length,
    },
  };
}

function glyphFor(name: string): string {
  const palette = ['◉', '✦', '⊞', '⬢', '✶', '△', '☎', '✉'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

const LoadingSkeleton = () => (
  <main className="main-container">
    <div
      style={{
        background: '#f4f4f2',
        minHeight: '100vh',
        padding: '28px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-5 w-72 mb-6" />
        <div className="grid grid-cols-4 gap-0 mb-4">
          <Skeleton className="h-24 rounded-l-xl" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24 rounded-r-xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  </main>
);
