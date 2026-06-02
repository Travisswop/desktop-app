'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import ProductsScreen, {
  type ProductRow,
} from '@/components/mint/ProductsScreen';
import { Skeleton } from '@/components/ui/skeleton';

interface NFTRecord {
  _id?: string;
  name: string;
  description?: string;
  image: string;
  price: number | string;
  currency?: string;
  mintLimit?: number;
  nftType?: string;
  category?: 'physical' | 'digital';
}

interface TemplateSalesRow {
  templateId: string;
  units: number;
  revenue: number;
  orderCount: number;
}

interface SalesSummary {
  perTemplate: TemplateSalesRow[];
  totals: { units: number; revenue: number; templates: number; orders: number };
}

const CREATE_HREF = '/products/create';
const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProductsPage() {
  const { user, accessToken } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);

  const load = useCallback(
    async (token: string) => {
      const [templatesRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/v2/desktop/nft/listByUser`, {
          method: 'GET',
          headers: { authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/v2/desktop/orders/summaryByUser?since=30d`, {
          method: 'GET',
          headers: { authorization: `Bearer ${token}` },
        }),
      ]);

      if (!templatesRes.ok) {
        throw new Error(`templates ${templatesRes.status}`);
      }

      const { data: templates } = (await templatesRes.json()) as {
        data: NFTRecord[];
      };

      const salesByTemplate: Record<string, TemplateSalesRow> = {};
      let parsedSummary: SalesSummary | null = null;
      if (summaryRes.ok) {
        const { data } = (await summaryRes.json()) as { data: SalesSummary };
        parsedSummary = data;
        for (const r of data.perTemplate) {
          salesByTemplate[r.templateId] = r;
        }
      }

      const mapped = (templates || []).map<ProductRow>((item) => {
        const sales = item._id ? salesByTemplate[item._id] : undefined;
        return {
          id: item._id ?? `${item.nftType}-${item.name}`,
          name: item.name,
          type: item.category === 'physical' ? 'Physical' : 'Digital',
          price: Number(item.price) || 0,
          stock: item.mintLimit,
          units: sales?.units,
          revenue: sales?.revenue,
          currency: (item.currency || 'usdc').toUpperCase(),
          status: 'live',
          glyph: glyphFor(item.name),
          image: item.image,
        };
      });

      return { rows: mapped, summary: parsedSummary };
    },
    []
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
  const digital = rows.length - physical;
  const parts: string[] = [
    `${rows.length} product${rows.length === 1 ? '' : 's'}`,
  ];
  if (live) parts.push(`${live} live`);
  parts.push(`${physical} physical`);
  parts.push(`${digital} digital`);
  return parts.join(' · ');
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
