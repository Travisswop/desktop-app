'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import ProductsScreen, {
  type ProductRow,
} from '@/components/mint/ProductsScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal, ModalBody, ModalContent } from '@nextui-org/react';

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
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductRow | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

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

  const handleArchive = useCallback((product: ProductRow) => {
    setArchiveTarget(product);
    setArchiveError(null);
  }, []);

  const confirmArchive = useCallback(
    async () => {
      if (!accessToken || !archiveTarget) return;

      setArchivingId(archiveTarget.id);
      setArchiveError(null);
      try {
        const response = await fetch(
          `${API}/api/v2/desktop/nft/template/${archiveTarget.id}/archive`,
          {
            method: 'PATCH',
            headers: { authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.state !== 'success') {
          throw new Error(data?.message || `archive ${response.status}`);
        }
        setRows((prev) => prev.filter((row) => row.id !== archiveTarget.id));
        setArchiveTarget(null);
      } catch (err) {
        console.error(err);
        setArchiveError('Failed to archive product. Please try again.');
      } finally {
        setArchivingId(null);
      }
    },
    [accessToken, archiveTarget]
  );

  const closeArchiveModal = useCallback(() => {
    if (archivingId) return;
    setArchiveTarget(null);
    setArchiveError(null);
  }, [archivingId]);

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
    <>
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
            onArchive={handleArchive}
            archivingId={archivingId}
          />
        </div>
      </div>
    </main>
      <ArchiveConfirmModal
        product={archiveTarget}
        isArchiving={Boolean(archivingId)}
        error={archiveError}
        onClose={closeArchiveModal}
        onConfirm={confirmArchive}
      />
    </>
  );
}

function ArchiveConfirmModal({
  product,
  isArchiving,
  error,
  onClose,
  onConfirm,
}: {
  product: ProductRow | null;
  isArchiving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      size="md"
      isOpen={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      backdrop="blur"
      aria-labelledby="archive-product-title"
    >
      <ModalContent>
        <ModalBody className="py-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2
                id="archive-product-title"
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0a0a0c',
                }}
              >
                Archive product?
              </h2>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#6e6e76',
                }}
              >
                {product
                  ? `"${product.name}" will be hidden from your products list.`
                  : ''}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.16)',
                  color: '#b91c1c',
                  fontSize: 12.5,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isArchiving}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: '#fff',
                  color: '#0a0a0c',
                  border: '1px solid rgba(0,0,0,0.06)',
                  cursor: isArchiving ? 'not-allowed' : 'pointer',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isArchiving}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: '#b91c1c',
                  color: '#fff',
                  border: 0,
                  cursor: isArchiving ? 'not-allowed' : 'pointer',
                  fontSize: 12.5,
                  fontWeight: 700,
                  opacity: isArchiving ? 0.7 : 1,
                }}
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
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
