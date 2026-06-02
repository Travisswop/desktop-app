'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
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
  chain: 'USDC' | 'SOL';
  role: 'buyer' | 'seller';
  _id: string;
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
}: {
  tab: OrderTab;
  onTabChange: (next: OrderTab) => void;
  rows: OrderRow[];
  totals?: OrderTotals;
}) {
  const router = useRouter();

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
    const avg = orders > 0 ? Math.round(revenue / orders) : 0;

    if (tab === 'Payments') {
      return [
        { l: 'Volume · 30d', v: `$${revenue.toLocaleString()}`, em: true, mono: true },
        { l: 'Settled', v: settled.toString(), em: true, mono: true },
        { l: 'Pending', v: pending.toString(), mono: true },
        { l: 'Refunded', v: refunded.toString(), mono: true },
        { l: 'Avg payment', v: `$${avg}` },
        { l: 'Disputes', v: '0' },
      ];
    }
    if (tab === 'Sold') {
      return [
        { l: 'Total Mints', v: (totals?.units ?? 0).toLocaleString(), em: true, mono: true },
        { l: 'Gross Sales', v: `$${revenue.toLocaleString()}`, em: true, mono: true },
        { l: '$ in Escrow', v: '$0', mono: true },
        { l: 'Open Orders', v: pending.toString() },
        { l: 'Closed Orders', v: settled.toString() },
        { l: 'Disputes', v: '0' },
      ];
    }
    return [
      { l: 'Spend · 30d', v: `$${revenue.toLocaleString()}`, em: true, mono: true },
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
      hideBack
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
      <Card pad={0}>
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
              onClick={() => router.push(`/order/${o._id}?tab=${tab.toLowerCase()}`)}
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
              <div style={{ fontSize: 13, color: ink }}>{o.item}</div>
              <Mono size={13}>${o.price.toFixed(2)}</Mono>
              <div style={{ fontSize: 12.5, color: muted }}>{o.date}</div>
              <div>
                <DeliveryPill status={o.delivery} />
              </div>
            </div>
          ))
        )}
      </Card>
    </ScreenShell>
  );
}
