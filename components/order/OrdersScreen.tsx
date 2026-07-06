'use client';

import { useRouter } from 'next/navigation';
import { useMemo, type CSSProperties } from 'react';
import {
  Avatar,
  Card,
  DeliveryPill,
  Mono,
  ScreenShell,
  ghostBtn,
  hair,
  hair2,
  ink,
  muted,
  posGreen,
} from '@/components/mint/design-system';
import { Download } from 'lucide-react';
import { isInPersonCheckoutMode } from '@/lib/marketplace-display';
import { formatUsdAmount } from '@/lib/marketplace-api';

export type OrderTab = 'Payments' | 'Sold' | 'Purchases';

export interface OrderRow {
  id: string;
  orderId: string;
  counterparty: string;
  counterpartyAvatar: string;
  item: string;
  price: number;
  date: string;
  delivery: string;
  chain: string;
  role: 'buyer' | 'seller';
  _id: string;
  checkoutMode?: string;
}

export interface OrderTotals {
  units: number;
  revenue: number;
  orders: number;
}

export default function OrdersScreen({
  tab,
  onTabChange,
  rows,
  totals,
  getDetailHref,
  isFetching,
  backHref,
  eyebrow,
}: {
  tab: OrderTab;
  onTabChange: (next: OrderTab) => void;
  rows: OrderRow[];
  totals?: OrderTotals;
  /**
   * Builder for the per-row detail URL. Defaults to `/order/{_id}?tab={tab}`
   * so the standalone /order route works out of the box; pass a custom
   * builder from /dashboard/order (or anywhere else hosting this screen).
   */
  getDetailHref?: (row: OrderRow, tab: OrderTab) => string;
  /**
   * Subsequent-fetch indicator. The screen stays mounted; pass true while a
   * tab refetch is in flight so we can render a top progress bar + dim the
   * table without unmounting the whole tree.
   */
  isFetching?: boolean;
  /**
   * When set, renders a back button + breadcrumb routing to this href. Leave
   * undefined to hide the back affordance (root-page usage).
   */
  backHref?: string;
  /** Breadcrumb prefix shown next to the back chevron. Defaults to 'Dashboard'. */
  eyebrow?: string;
}) {
  const router = useRouter();
  const buildHref =
    getDetailHref ?? ((row, t) => `/order/${row._id}?tab=${t.toLowerCase()}`);

  const tabs: OrderTab[] = ['Payments', 'Sold', 'Purchases'];

  const headers: Record<OrderTab, string[]> = {
    Payments: ['Payment No.', 'Source', 'Reference', 'Amount', 'Date', 'Status'],
    Sold: ['Order No.', 'Customer', 'Item', 'Price', 'Order Date', 'Delivery Status'],
    Purchases: ['Purchase No.', 'Vendor', 'Item', 'Spend', 'Purchase Date', 'Shipment'],
  };

  const overviewLabel: Record<OrderTab, string> = {
    Payments: 'Payments Overview',
    Sold: 'Sales Overview',
    Purchases: 'Purchases Overview',
  };

  const overview = useMemo(() => {
    const revenue = totals?.revenue ?? rows.reduce((a, r) => a + (r.price || 0), 0);
    const orders = totals?.orders ?? rows.length;
    const settled = rows.filter((r) =>
      ['Complete', 'Settled', 'Delivered'].includes(r.delivery)
    ).length;
    const pending = rows.filter((r) =>
      ['Pending', 'Processing', 'In transit'].includes(r.delivery)
    ).length;
    const refunded = rows.filter((r) =>
      ['Refunded', 'Cancel'].includes(r.delivery)
    ).length;
    const avg = orders > 0 ? revenue / orders : 0;

    if (tab === 'Payments') {
      return [
        { l: 'Volume · 30d', v: `$${formatUsdAmount(revenue)}`, em: true, mono: true },
        { l: 'Settled', v: settled.toString(), em: true, mono: true },
        { l: 'Pending', v: pending.toString(), mono: true },
        { l: 'Refunded', v: refunded.toString(), mono: true },
        { l: 'Avg payment', v: `$${formatUsdAmount(avg)}` },
        { l: 'Disputes', v: '0' },
      ];
    }
    if (tab === 'Sold') {
      return [
        { l: 'Units sold', v: (totals?.units ?? 0).toLocaleString(), em: true, mono: true },
        { l: 'Gross Sales', v: `$${formatUsdAmount(revenue)}`, em: true, mono: true },
        { l: '$ in Escrow', v: '$0', mono: true },
        { l: 'Open Orders', v: pending.toString() },
        { l: 'Closed Orders', v: settled.toString() },
        { l: 'Disputes', v: '0' },
      ];
    }
    return [
      { l: 'Spend · 30d', v: `$${formatUsdAmount(revenue)}`, em: true, mono: true },
      {
        l: 'Active vendors',
        v: new Set(rows.map((r) => r.counterparty)).size.toString(),
        em: true,
        mono: true,
      },
      { l: 'In transit', v: rows.filter((r) => r.delivery === 'In transit').length.toString(), mono: true },
      { l: 'Processing', v: rows.filter((r) => r.delivery === 'Processing').length.toString() },
      { l: 'Delivered · 30d', v: rows.filter((r) => r.delivery === 'Delivered').length.toString() },
      { l: 'Subscriptions', v: '0' },
    ];
  }, [tab, rows, totals]);

  const totalOrderValue = totals?.orders ?? rows.length;

  return (
    <ScreenShell
      hideBack={!backHref}
      onBack={backHref ? () => router.push(backHref) : undefined}
      eyebrow={eyebrow ?? 'Dashboard'}
      title="Orders"
      kicker="Manage payments, sales & purchases"
      action={
        <button type="button" style={{ ...ghostBtn, gap: 8 }}>
          <Download size={13} />
          Download Spreadsheet
        </button>
      }
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 28,
          borderBottom: `1px solid ${hair}`,
          paddingBottom: 0,
        }}
      >
        {tabs.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              style={{
                background: 'transparent',
                border: 0,
                padding: '6px 0 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? ink : muted,
                borderBottom: active ? `2px solid ${ink}` : '2px solid transparent',
                marginBottom: -1,
                fontFamily: 'inherit',
                letterSpacing: -0.1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Total + Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 14,
        }}
      >
        <Card pad={20}>
          <div style={{ fontSize: 12, color: muted, fontWeight: 500 }}>Total Order</div>
          <div style={{ marginTop: 16 }}>
            <Mono size={42} weight={600} color={posGreen} style={{ letterSpacing: -1 }}>
              {totalOrderValue.toLocaleString()}
            </Mono>
          </div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 12, color: muted, fontWeight: 500, marginBottom: 14 }}>
            {overviewLabel[tab]}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${overview.length}, 1fr)`,
              gap: 0,
            }}
          >
            {overview.map((it, i) => (
              <div
                key={it.l}
                style={{
                  paddingRight: 16,
                  borderRight:
                    i < overview.length - 1 ? `1px solid ${hair2}` : 'none',
                  paddingLeft: i === 0 ? 0 : 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: muted,
                    marginBottom: 8,
                    fontWeight: 500,
                  }}
                >
                  {it.l}
                </div>
                {it.mono ? (
                  <Mono
                    size={it.em ? 16 : 14}
                    weight={600}
                    color={it.em ? posGreen : ink}
                  >
                    {it.v}
                  </Mono>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.v}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Orders table */}
      <Card pad={0} style={{ position: 'relative' }}>
        {isFetching && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              overflow: 'hidden',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: '40%',
                height: '100%',
                background: ink,
                opacity: 0.65,
                animation: 'orders-progress 1.1s ease-in-out infinite',
              }}
            />
            <style>{`@keyframes orders-progress {
              0%   { transform: translateX(-100%); }
              50%  { transform: translateX(150%); }
              100% { transform: translateX(250%); }
            }`}</style>
          </div>
        )}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${hair}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" style={{ ...ghostBtn, padding: '8px 18px' }}>
              {tab}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...ghostBtn, padding: '6px 12px' }}>
              Filter
              <span style={{ fontSize: 10, color: muted, marginLeft: 4 }}>
                Date ▾
              </span>
            </button>
            <button type="button" style={{ ...ghostBtn, padding: '6px 12px' }}>
              <span style={{ fontSize: 11, color: muted }}>Status ▾</span>
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '0.9fr 1.4fr 1.4fr 0.7fr 0.9fr 0.9fr',
            padding: '10px 20px',
            borderBottom: `1px solid ${hair}`,
            fontSize: 11,
            color: muted,
            fontWeight: 500,
          }}
        >
          {headers[tab].map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {isFetching ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} last={i === 5} />
            ))}
          </div>
        ) : (
        <div>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: muted,
              fontSize: 13,
            }}
          >
            No {tab.toLowerCase()} to show yet.
          </div>
        ) : (
          rows.map((o, i) => (
            <div
              key={o.id}
              onClick={() => router.push(buildHref(o, tab))}
              style={{
                display: 'grid',
                gridTemplateColumns: '0.9fr 1.4fr 1.4fr 0.7fr 0.9fr 0.9fr',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                borderBottom: i < rows.length - 1 ? `1px solid ${hair2}` : 'none',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Mono size={12.5} color={ink}>
                {o.id}
              </Mono>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar size={24} bg="#eaeaea">
                  {o.counterpartyAvatar}
                </Avatar>
                <div style={{ fontSize: 13 }}>{o.counterparty}</div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: ink,
                  }}
                >
                  {o.item}
                </span>
                {isInPersonCheckoutMode(o.checkoutMode) && <CheckoutModePill />}
              </div>
              <Mono size={13}>${formatUsdAmount(o.price)}</Mono>
              <div style={{ fontSize: 12.5, color: muted }}>{o.date}</div>
              <div>
                <DeliveryPill status={o.delivery} />
              </div>
            </div>
          ))
        )}
        </div>
        )}
      </Card>
    </ScreenShell>
  );
}

function SkeletonRow({ last }: { last?: boolean }) {
  const shimmer: CSSProperties = {
    background:
      'linear-gradient(90deg, #ececec 25%, #f4f4f2 37%, #ececec 63%)',
    backgroundSize: '400% 100%',
    animation: 'orders-shimmer 1.4s ease infinite',
  };
  const bar = (width: number | string, height = 12) => (
    <div style={{ width, height, borderRadius: 6, ...shimmer }} />
  );
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.9fr 1.4fr 1.4fr 0.7fr 0.9fr 0.9fr',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderBottom: last ? 'none' : `1px solid ${hair2}`,
      }}
    >
      {bar(70)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', ...shimmer }} />
        {bar('60%')}
      </div>
      {bar('80%')}
      {bar(50)}
      {bar(64)}
      {bar(70, 20)}
      <style>{`@keyframes orders-shimmer {
        0%   { background-position: 100% 50%; }
        100% { background-position: 0 50%; }
      }`}</style>
    </div>
  );
}

function CheckoutModePill() {
  return (
    <span
      style={{
        flexShrink: 0,
        padding: '3px 7px',
        borderRadius: 5,
        background: '#f2f2f0',
        color: muted,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
      }}
    >
      In-person
    </span>
  );
}
