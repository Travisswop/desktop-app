'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import {
  Card,
  Chip,
  Mono,
  ScreenShell,
  StatRow,
  T_swatch,
  cellMuted,
  colHead,
  hair,
  hair2,
  iconBtnSm,
  ink,
  muted,
  posGreen,
  posGreenSoft,
  primaryBtn,
} from './design-system';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type ProductStatus = 'live' | 'low' | 'draft';
export type ProductType = 'Physical' | 'Digital' | 'Service';

export interface ProductRow {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  /** Total inventory (mintLimit). Backend doesn't yet track units sold. */
  stock?: number;
  /** Units sold. Optional — wire to v2 orders API later. */
  units?: number;
  /** Revenue in `currency`. Optional. */
  revenue?: number;
  currency: string;
  status: ProductStatus;
  glyph: string;
  image?: string;
}

const STATUS_STYLE: Record<
  ProductStatus,
  { bg: string; fg: string; label: string }
> = {
  live: { bg: posGreenSoft, fg: posGreen, label: 'Live' },
  low: { bg: 'rgba(217,119,6,0.12)', fg: '#b45309', label: 'Low' },
  draft: { bg: 'rgba(0,0,0,0.05)', fg: muted, label: 'Draft' },
};

type Filter = 'all' | 'physical' | 'digital' | 'service';

export interface ProductsTotals {
  units: number;
  revenue: number;
  orders: number;
  templates: number;
}

export default function ProductsScreen({
  rows,
  backHref,
  createHref,
  kicker,
  hideBack,
  eyebrow,
  totals,
  onDeleteProduct,
}: {
  rows: ProductRow[];
  backHref?: string;
  createHref: string;
  kicker?: string;
  hideBack?: boolean;
  eyebrow?: string;
  /**
   * Aggregated totals from /api/v2/desktop/orders/summaryByUser. When
   * present, the StatRow surfaces real revenue/units instead of an em-dash.
   */
  totals?: ProductsTotals;
  onDeleteProduct?: (productId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      physical: rows.filter((r) => r.type === 'Physical').length,
      digital: rows.filter((r) => r.type === 'Digital').length,
      service: rows.filter((r) => r.type === 'Service').length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(
      (r) => r.type.toLowerCase() === filter
    );
  }, [rows, filter]);

  const toggleMenu = (productId: string) => {
    setActionError(null);
    setConfirmingDeleteId(null);
    setOpenMenuId((current) => (current === productId ? null : productId));
  };

  const requestDelete = (productId: string) => {
    setActionError(null);
    setConfirmingDeleteId(productId);
  };

  const cancelDelete = () => {
    setActionError(null);
    setConfirmingDeleteId(null);
  };

  const confirmDelete = async (productId: string) => {
    if (!onDeleteProduct) return;
    setDeletingId(productId);
    setActionError(null);
    try {
      await onDeleteProduct(productId);
      setOpenMenuId(null);
      setConfirmingDeleteId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete product.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const totalRevenue =
      totals?.revenue ?? rows.reduce((acc, r) => acc + (r.revenue ?? 0), 0);
    const totalUnits =
      totals?.units ?? rows.reduce((acc, r) => acc + (r.units ?? 0), 0);
    const avgPrice = total
      ? Math.round(rows.reduce((a, r) => a + (r.price || 0), 0) / total)
      : 0;
    const liveCount = rows.filter((r) => r.status === 'live').length;
    return {
      total,
      totalRevenue,
      totalUnits,
      avgPrice,
      liveCount,
    };
  }, [rows, totals]);

  return (
    <ScreenShell
      onBack={backHref ? () => router.push(backHref) : undefined}
      hideBack={hideBack}
      title="Products"
      eyebrow={eyebrow ?? 'Dashboard'}
      kicker={kicker}
      action={
        <Link href={createHref} style={{ textDecoration: 'none' }}>
          <button type="button" style={primaryBtn}>
            <span style={{ fontSize: 14, marginTop: -1 }}>+</span> New product
          </button>
        </Link>
      }
    >
      <StatRow
        items={[
          {
            label: 'Total products',
            value: stats.total.toString(),
            sub: `${stats.liveCount} active`,
          },
          {
            label: 'Revenue · 30d',
            value: stats.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : '—',
            sub: stats.totalRevenue ? undefined : 'no sales yet',
          },
          {
            label: 'Units sold · 30d',
            value: stats.totalUnits ? stats.totalUnits.toLocaleString() : '—',
            sub: stats.totalUnits ? undefined : 'no sales yet',
          },
          {
            label: 'Avg. price',
            value: stats.total ? `$${stats.avgPrice}` : '—',
            sub: 'across active',
          },
        ]}
      />

      <Card pad={0} style={{ overflow: 'visible' }}>
        {/* Filter / sort row */}
        <div
          style={{
            padding: '14px 20px 12px',
            borderBottom: `1px solid ${hair}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip size="sm" active={filter === 'all'} onClick={() => setFilter('all')}>
              All · {counts.all}
            </Chip>
            <Chip
              size="sm"
              active={filter === 'physical'}
              onClick={() => setFilter('physical')}
            >
              Physical · {counts.physical}
            </Chip>
            <Chip
              size="sm"
              active={filter === 'digital'}
              onClick={() => setFilter('digital')}
            >
              Digital · {counts.digital}
            </Chip>
            <Chip
              size="sm"
              active={filter === 'service'}
              onClick={() => setFilter('service')}
            >
              Service · {counts.service}
            </Chip>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip size="sm">Sort: Best selling</Chip>
            <Chip size="sm">Filter</Chip>
          </div>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 2fr) 0.7fr 0.7fr 0.7fr 0.8fr 0.4fr',
            padding: '10px 20px',
            borderBottom: `1px solid ${hair}`,
            ...colHead,
          }}
        >
          <div>Product</div>
          <div>Type</div>
          <div>Price</div>
          <div>Stock</div>
          <div>Revenue</div>
          <div />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: muted,
              fontSize: 13,
            }}
          >
            No products match this filter.
          </div>
        ) : (
          filtered.map((p, i) => {
            const status = STATUS_STYLE[p.status];
            return (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(0, 2fr) 0.7fr 0.7fr 0.7fr 0.8fr 0.4fr',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  borderBottom:
                    i < filtered.length - 1 ? `1px solid ${hair2}` : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: T_swatch.products,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      color: ink,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={36}
                        height={36}
                        style={{ objectFit: 'cover', width: 36, height: 36 }}
                      />
                    ) : (
                      <span>{p.glyph}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/products/edit/${p.id}`)}
                      title={`Edit ${p.name}`}
                      style={{
                        all: 'unset',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: -0.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        maxWidth: '100%',
                        color: ink,
                        cursor: 'pointer',
                      }}
                    >
                      {p.name}
                    </button>
                    <div style={{ marginTop: 3 }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: status.fg,
                          background: status.bg,
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          letterSpacing: 0.4,
                          textTransform: 'uppercase',
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={cellMuted}>{p.type}</div>
                <Mono size={13} weight={600}>
                  ${p.price}
                </Mono>
                <Mono size={13}>{p.stock ?? '—'}</Mono>
                <Mono size={13} weight={600}>
                  {p.revenue ? `$${p.revenue.toLocaleString()}` : '—'}
                </Mono>
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    style={iconBtnSm}
                    aria-label={`More actions for ${p.name}`}
                    aria-expanded={openMenuId === p.id}
                    onClick={() => toggleMenu(p.id)}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  <div style={{ position: 'relative' }}>
                    {openMenuId === p.id ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 6,
                          zIndex: 20,
                          width: confirmingDeleteId === p.id ? 230 : 174,
                          border: `1px solid ${hair}`,
                          borderRadius: 10,
                          background: '#fff',
                          boxShadow:
                            '0 14px 38px rgba(10,10,12,0.14), 0 2px 8px rgba(10,10,12,0.08)',
                          padding: 6,
                          textAlign: 'left',
                        }}
                      >
                        {confirmingDeleteId === p.id ? (
                          <div style={{ padding: 8 }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 650,
                                color: ink,
                                marginBottom: 4,
                              }}
                            >
                              Delete product?
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: muted,
                                lineHeight: 1.45,
                                marginBottom: 10,
                              }}
                            >
                              This removes it from checkout and your public
                              product list.
                            </div>
                            {actionError ? (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: '#b91c1c',
                                  marginBottom: 10,
                                }}
                              >
                                {actionError}
                              </div>
                            ) : null}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                onClick={cancelDelete}
                                disabled={deletingId === p.id}
                                style={{
                                  flex: 1,
                                  height: 32,
                                  borderRadius: 8,
                                  border: `1px solid ${hair}`,
                                  background: '#fff',
                                  color: ink,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: 'inherit',
                                  cursor:
                                    deletingId === p.id
                                      ? 'not-allowed'
                                      : 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void confirmDelete(p.id);
                                }}
                                disabled={deletingId === p.id}
                                style={{
                                  flex: 1,
                                  height: 32,
                                  borderRadius: 8,
                                  border: 0,
                                  background: '#b91c1c',
                                  color: '#fff',
                                  fontSize: 12,
                                  fontWeight: 650,
                                  fontFamily: 'inherit',
                                  cursor:
                                    deletingId === p.id
                                      ? 'not-allowed'
                                      : 'pointer',
                                  opacity: deletingId === p.id ? 0.65 : 1,
                                }}
                              >
                                {deletingId === p.id ? 'Deleting' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                router.push(`/products/edit/${p.id}`);
                              }}
                              style={{
                                width: '100%',
                                minHeight: 36,
                                border: 0,
                                borderRadius: 8,
                                background: 'transparent',
                                color: ink,
                                fontSize: 12.5,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                padding: '8px 10px',
                              }}
                            >
                              <Pencil size={14} />
                              Edit product
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(p.id)}
                              disabled={!onDeleteProduct}
                              style={{
                                width: '100%',
                                minHeight: 36,
                                border: 0,
                                borderRadius: 8,
                                background: 'transparent',
                                color: '#b91c1c',
                                fontSize: 12.5,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: onDeleteProduct
                                  ? 'pointer'
                                  : 'not-allowed',
                                padding: '8px 10px',
                              }}
                            >
                              <Trash2 size={14} />
                              Delete product
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                width: '100%',
                                minHeight: 32,
                                border: 0,
                                borderRadius: 8,
                                background: 'transparent',
                                color: muted,
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                padding: '7px 10px',
                              }}
                            >
                              <X size={14} />
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </ScreenShell>
  );
}
