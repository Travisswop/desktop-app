'use client';

import { useUser } from '@/lib/UserContext';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Box,
  Copy,
  Edit3,
  MessageSquare,
  MoreHorizontal,
  Package,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserPlus,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Avatar,
  Card,
  Chip,
  DeliveryPill,
  Mono,
  T_swatch,
  Tag,
  cardShadow,
  hair,
  hair2,
  ink,
  mono,
  muted,
  muted2,
  posGreen,
  posGreenSoft,
  surface,
} from '@/components/mint/design-system';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';

/* ------------------------------------------------------------------------
   Types & API helpers
   ------------------------------------------------------------------------ */
interface NFTTemplate {
  _id: string;
  name: string;
  image: string;
  price: number;
  mintLimit?: number;
  nftType: string;
  category?: 'physical' | 'digital';
}

interface OrderRow {
  _id: string;
  orderId: string;
  counterparty: string;
  counterpartyAvatar: string;
  item: string;
  price: number;
  date: string;
  delivery: string;
  chain: 'USDC' | 'SOL';
}

interface SummaryTotals {
  units: number;
  revenue: number;
  orders: number;
  templates: number;
}

interface DashboardAnalytics {
  last30DaysMicrositeTaps: number;
  lifetimeMicrositeTaps: number;
  last30DaysConnections: number;
  last30DaysLeads: number;
}

interface DashboardResponse {
  products: NFTTemplate[];
  orders: { rows: OrderRow[] };
  summary: { totals: SummaryTotals };
  analytics: DashboardAnalytics;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const accent = '#d97706';

const formatMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

const getProfileImageSrc = (profilePic?: string | null) => {
  const rawProfilePic = String(profilePic ?? '').trim();
  if (!rawProfilePic) return '';

  if (/^\d+$/.test(rawProfilePic)) {
    return `/images/user_avator/${rawProfilePic}@3x.png`;
  }

  return sanitizeNextImageSrc(rawProfilePic);
};

const asCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return null;
};

const firstCount = (...values: unknown[]) => {
  for (const value of values) {
    const count = asCount(value);
    if (count !== null) return count;
  }

  return 0;
};

const formatSwopEnsName = (value?: string | null) => {
  const clean = String(value ?? '').trim();
  if (!clean || clean === 'swop.id') return null;

  return clean.toLowerCase().endsWith('.swop.id')
    ? clean
    : `${clean.replace(/^\$/, '')}.swop.id`;
};

/* ------------------------------------------------------------------------
   Main component
   ------------------------------------------------------------------------ */
export default function DashboardMainContent() {
  const { user, accessToken } = useUser();
  const [products, setProducts] = useState<NFTTemplate[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [totals, setTotals] = useState<SummaryTotals | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  const load = useCallback(async (token: string) => {
    const dashboardRes = await fetch(
      `${API}/api/v2/desktop/dashboard/main?since=30d&orderLimit=5`,
      {
        headers: { authorization: `Bearer ${token}` },
      }
    );

    if (!dashboardRes.ok) {
      throw new Error(`Dashboard API failed: ${dashboardRes.status}`);
    }

    const dashboardData = ((await dashboardRes.json()) as {
      data: DashboardResponse;
    }).data;
    const productsData = dashboardData.products || [];
    const ordersData = dashboardData.orders?.rows || [];
    const summaryData = dashboardData.summary?.totals || null;
    const analyticsData = dashboardData.analytics || null;

    return { productsData, ordersData, summaryData, analyticsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) return;
    load(accessToken)
      .then(({ productsData, ordersData, summaryData, analyticsData }) => {
        if (cancelled) return;
        setProducts(productsData);
        setOrders(ordersData);
        setTotals(summaryData);
        setAnalytics(analyticsData);
      })
      .catch((err) => console.error('Dashboard load failed:', err));
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, load]);

  const tileCounts = useMemo(
    () => ({
      products: products.length,
      productDrafts: 0,
      orders: totals?.orders ?? orders.length,
      ordersToday: orders.filter((o) =>
        isToday(parseDate(o.date))
      ).length,
      checkoutWeek: totals?.revenue ?? 0,
      leads: user?.subscribers?.length ?? 0,
    }),
    [products, orders, totals, user?.subscribers?.length]
  );

  return (
    <div
      style={{
        background: '#f4f4f2',
        // Negate the parent layout's p-6 (24px) so the canvas reaches the
        // edges, then re-apply our own padding.
        margin: -24,
        padding: '28px 24px',
        minHeight: 'calc(100vh - 60px)',
        fontFamily: 'var(--font-inter), -apple-system, sans-serif',
        color: ink,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <ProfileHero />

        <SectionHead title="Manage" caption="Tap any tile to dive in" />
        <ManageBento counts={tileCounts} />

        <SectionHead
          title="Today"
          caption="Last 24 hours"
          action={<Chip size="sm">24h</Chip>}
        />
        <TodaySnapshot totals={totals} analytics={analytics} />

        <SectionHead
          title="In-person checkout"
          caption="Crypto · USDC on Solana"
          action={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: muted,
                fontFamily: mono,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: posGreen,
                  boxShadow: `0 0 0 3px ${posGreenSoft}`,
                }}
              />
              Wallet ready
            </span>
          }
        />
        <InPersonCheckout />

        <RecentOrders orders={orders} />
        <ProductsManager products={products} />
        <RecentLeads />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------
   Section heading
   ------------------------------------------------------------------------ */
function SectionHead({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginTop: 4,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.6,
            color: ink,
          }}
        >
          {title}
        </div>
        {caption && (
          <div
            style={{
              fontSize: 13,
              color: muted,
              marginTop: 2,
              letterSpacing: -0.1,
            }}
          >
            {caption}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------------
   1. Profile hero
   ------------------------------------------------------------------------ */
function ProfileHero() {
  const { user } = useUser();
  if (!user) return null;

  const userStats = user as typeof user & { totalConnection?: unknown };
  const initials = (user.name || 'You')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const primaryMicrosite =
    user.microsites?.find?.((item) => item?.primary) ?? null;
  const ensName = formatSwopEnsName(user.ensName || primaryMicrosite?.ens);
  const swopId = formatSwopEnsName(user.swopensId) || ensName;
  const followersCount = firstCount(
    user.connections?.totalFollowers ??
      user.connections?.followerCount,
    user.connections?.followers,
    user.followers
  );
  const followingCount = firstCount(
    user.connections?.followingCount,
    user.connections?.following,
    user.following,
    userStats.totalConnection
  );
  const profileImageSrc = getProfileImageSrc(user.profilePic);

  return (
    <Card pad={22}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          {profileImageSrc ? (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#dfe6ef',
              }}
            >
              <Image
                src={profileImageSrc}
                alt={user.name}
                width={64}
                height={64}
                style={{ objectFit: 'cover', width: 64, height: 64 }}
              />
            </div>
          ) : (
            <Avatar size={64} bg="#dfe6ef">
              {initials}
            </Avatar>
          )}
          <button
            type="button"
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              background: ink,
              color: '#fff',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Edit profile"
          >
            <Edit3 size={11} />
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}
          >
            {user.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
              flexWrap: 'wrap',
            }}
          >
            {swopId && (
              <Mono size={12.5} color={muted} weight={500}>
                Swop ID: {swopId}
              </Mono>
            )}
            {swopId && ensName && ensName !== swopId && (
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 2,
                  background: muted2,
                }}
              />
            )}
            {ensName && ensName !== swopId && (
              <Mono size={12.5} color={muted} weight={500}>
                ENS: {ensName}
              </Mono>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 28,
            paddingLeft: 24,
            borderLeft: `1px solid ${hair}`,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}
            >
              {followersCount.toLocaleString()}
            </div>
            <Tag>Follow</Tag>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}
            >
              {followingCount.toLocaleString()}
            </div>
            <Tag>Following</Tag>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <Chip active size="sm">
            <Share2 size={13} /> Share
          </Chip>
          <Link href="/qr-code" style={{ textDecoration: 'none' }}>
            <Chip size="sm">
              <QrCode size={13} /> QR
            </Chip>
          </Link>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------------
   2. Manage bento — 4×2 KPI tiles
   ------------------------------------------------------------------------ */
function ManageBento({
  counts,
}: {
  counts: {
    products: number;
    productDrafts: number;
    orders: number;
    ordersToday: number;
    checkoutWeek: number;
    leads: number;
  };
}) {
  const tiles = [
    {
      key: 'products',
      label: 'Products',
      value: counts.products.toString(),
      sub: counts.productDrafts ? `${counts.productDrafts} drafts` : 'active',
      swatch: T_swatch.products,
      icon: <Package size={18} />,
      href: '/products',
    },
    {
      key: 'orders',
      label: 'Orders',
      value: counts.orders.toString(),
      sub: counts.ordersToday ? `${counts.ordersToday} today` : 'none today',
      swatch: T_swatch.orders,
      icon: <ShoppingBag size={18} />,
      href: '/dashboard/order',
    },
    {
      key: 'checkout',
      label: 'Checkout',
      value: formatMoney(counts.checkoutWeek),
      sub: 'this week',
      swatch: T_swatch.checkout,
      icon: <Wallet size={18} />,
      href: '#',
      accent,
    },
    {
      key: 'leads',
      label: 'Leads',
      value: counts.leads.toString(),
      sub: counts.leads === 1 ? 'captured lead' : 'captured leads',
      swatch: T_swatch.leads,
      icon: <UserPlus size={18} />,
      href: '/dashboard/analytics',
    },
    {
      key: 'analytics',
      label: 'Analytics',
      value: '',
      sub: 'view insights',
      swatch: T_swatch.analytics,
      icon: <Sparkles size={18} />,
      href: '/dashboard/analytics',
      ctaText: 'Open',
    },
    {
      key: 'rewards',
      label: 'Rewards',
      value: '—',
      sub: 'coming soon',
      swatch: T_swatch.rewards,
      icon: <Trophy size={18} />,
      href: '#',
    },
    {
      key: 'blinks',
      label: 'Blinks',
      value: '',
      sub: 'wallet section',
      swatch: T_swatch.blinks,
      icon: <Zap size={18} />,
      href: '/wallet#blinks',
      ctaText: 'Open',
    },
    {
      key: 'messages',
      label: 'Messages',
      value: '',
      sub: 'open chat',
      swatch: T_swatch.messages,
      icon: <MessageSquare size={18} />,
      href: '/dashboard/chat',
      ctaText: 'Chat',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
      }}
    >
      {tiles.map(({ key, ...rest }) => (
        <DashTile key={key} {...rest} />
      ))}
    </div>
  );
}

function DashTile({
  label,
  value,
  sub,
  swatch,
  icon,
  href,
  accent: tileAccent,
  ctaText,
}: {
  label: string;
  value?: string;
  sub: string;
  swatch: string;
  icon: React.ReactNode;
  href: string;
  accent?: string;
  ctaText?: string;
}) {
  const inner = (
    <div
      style={{
        background: surface,
        border: `1px solid ${hair}`,
        borderRadius: 18,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        textDecoration: 'none',
        color: ink,
        boxShadow: cardShadow,
        transition: 'transform .12s, box-shadow .12s',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: swatch,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ink,
          }}
        >
          {icon}
        </div>
        {ctaText ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 9px',
              borderRadius: 999,
              border: `1px solid ${hair}`,
              background: '#fff',
              color: ink,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {ctaText}
            <ArrowRight size={12} />
          </span>
        ) : (
          <Mono size={26} weight={600} style={{ letterSpacing: -1 }}>
            {value}
          </Mono>
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: tileAccent || muted,
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );

  if (href === '#') return inner;
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------------
   3. Today snapshot — gross volume + profile views
   ------------------------------------------------------------------------ */
function TodaySnapshot({
  totals,
  analytics,
}: {
  totals: SummaryTotals | null;
  analytics: DashboardAnalytics | null;
}) {
  const revenue = totals?.revenue ?? 0;
  const orders = totals?.orders ?? 0;
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;
  const profileViews30d = analytics?.last30DaysMicrositeTaps ?? 0;
  const lifetimeProfileViews = analytics?.lifetimeMicrositeTaps ?? 0;
  const profileViewsBase = Math.max(
    profileViews30d,
    analytics?.last30DaysConnections ?? 0,
    analytics?.last30DaysLeads ?? 0,
    1
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 12,
      }}
    >
      <Card pad={20}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Tag>Gross volume</Tag>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 600,
                  letterSpacing: -1.4,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ${revenue.toLocaleString()}
              </div>
            </div>
            <div
              style={{ fontSize: 12, color: muted, marginTop: 6 }}
            >
              {orders} orders · last 30d
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              alignItems: 'flex-end',
            }}
          >
            <Chip size="sm" active>
              30d
            </Chip>
          </div>
        </div>
        <Sparkline color={accent} trend="up" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${hair}`,
          }}
        >
          <div>
            <Tag>Orders</Tag>
            <div style={{ marginTop: 4 }}>
              <Mono size={15} weight={600}>
                {orders}
              </Mono>
            </div>
          </div>
          <div style={{ borderLeft: `1px solid ${hair}`, paddingLeft: 14 }}>
            <Tag>Units</Tag>
            <div style={{ marginTop: 4 }}>
              <Mono size={15} weight={600} color={accent}>
                {totals?.units ?? 0}
              </Mono>
            </div>
          </div>
          <div style={{ borderLeft: `1px solid ${hair}`, paddingLeft: 14 }}>
            <Tag>Avg order</Tag>
            <div style={{ marginTop: 4 }}>
              <Mono size={15} weight={600}>
                ${avgOrder}
              </Mono>
            </div>
          </div>
        </div>
      </Card>

      <Card pad={20}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Tag>Profile views</Tag>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 600,
                  letterSpacing: -1.4,
                  lineHeight: 1,
                }}
              >
                {profileViews30d.toLocaleString()}
              </div>
            </div>
            <div
              style={{ fontSize: 12, color: muted, marginTop: 6 }}
            >
              {lifetimeProfileViews.toLocaleString()} lifetime visits
            </div>
          </div>
          <Sparkline color={ink} trend="up" width={120} height={36} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${hair}`,
          }}
        >
          <SourceRow
            label="Page visits · 30d"
            value={profileViews30d.toLocaleString()}
            pct={(profileViews30d / profileViewsBase) * 100}
          />
          <SourceRow
            label="Followers · 30d"
            value={(analytics?.last30DaysConnections ?? 0).toLocaleString()}
            pct={
              ((analytics?.last30DaysConnections ?? 0) / profileViewsBase) *
              100
            }
            tone={accent}
          />
          <SourceRow
            label="Leads · 30d"
            value={(analytics?.last30DaysLeads ?? 0).toLocaleString()}
            pct={((analytics?.last30DaysLeads ?? 0) / profileViewsBase) * 100}
          />
          <SourceRow
            label="Lifetime visits"
            value={lifetimeProfileViews.toLocaleString()}
            pct={100}
          />
        </div>
      </Card>
    </div>
  );
}

function Sparkline({
  color = posGreen,
  trend = 'up',
  width = '100%',
  height = 68,
}: {
  color?: string;
  trend?: 'up' | 'down';
  width?: number | string;
  height?: number;
}) {
  const path =
    trend === 'up'
      ? 'M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8'
      : 'M0,8 C20,14 35,10 50,18 C70,24 85,18 100,24 C120,30 135,26 150,32';
  const idSafe = color.replace('#', '');
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      style={{
        width,
        height,
        display: 'block',
        marginTop: 16,
      }}
    >
      <defs>
        <linearGradient id={`sg-${idSafe}-${trend}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L150,40 L0,40 Z`}
        fill={`url(#sg-${idSafe}-${trend})`}
      />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SourceRow({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: 12.5,
          fontWeight: 550,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 80,
          height: 4,
          background: '#f2f2f0',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: tone || ink,
          }}
        />
      </div>
      <Mono
        size={12.5}
        weight={600}
        style={{ minWidth: 36, textAlign: 'right' }}
      >
        {value}
      </Mono>
    </div>
  );
}

/* ------------------------------------------------------------------------
   4. In-person checkout
   ------------------------------------------------------------------------ */
function InPersonCheckout() {
  return (
    <Card pad={0}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
        }}
      >
        <div style={{ padding: 22, borderRight: `1px solid ${hair}` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <Tag>Charge</Tag>
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: 3,
                background: '#f4f4f2',
                borderRadius: 10,
                border: `1px solid ${hair}`,
              }}
            >
              {['USDC', 'SOL', 'ETH'].map((t, i) => (
                <button
                  key={t}
                  type="button"
                  style={{
                    padding: '5px 10px',
                    border: 0,
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: i === 0 ? '#fff' : 'transparent',
                    color: ink,
                    cursor: 'pointer',
                    boxShadow: i === 0 ? cardShadow : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              padding: '14px 0',
              borderBottom: `2px solid ${ink}`,
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: muted,
                letterSpacing: -1,
              }}
            >
              $
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: -2.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              0
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: -2.5,
                color: muted2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              .00
            </span>
            <span
              style={{
                fontSize: 14,
                color: muted,
                marginLeft: 8,
                paddingBottom: 8,
                fontFamily: mono,
              }}
            >
              USDC
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <Mono size={12} color={muted} weight={500}>
              ≈ 0.00 USDC · 0.00 fees
            </Mono>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginTop: 18,
            }}
          >
            {['$25', '$50', '$100', 'Custom'].map((v) => (
              <button
                key={v}
                type="button"
                style={{
                  padding: '11px 0',
                  background: '#fff',
                  border: `1px solid ${hair}`,
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: ink,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: -0.2,
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            style={{
              width: '100%',
              marginTop: 12,
              padding: 14,
              background: ink,
              color: '#fff',
              border: 0,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              letterSpacing: -0.2,
            }}
          >
            <QrCode size={16} />
            Generate QR · request payment
          </button>
        </div>

        <div
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            background: '#fafaf8',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Tag>Scan to pay</Tag>
            <Mono size={11} color={muted} weight={500}>
              · Phantom · Solflare · Backpack
            </Mono>
          </div>
          <FakeQR size={170} />
          <div
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#fff',
              border: `1px solid ${hair}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Mono
              size={11.5}
              color={ink}
              weight={500}
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Wallet not connected
            </Mono>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 0,
                padding: 4,
                color: muted,
                cursor: 'pointer',
                display: 'flex',
              }}
              aria-label="Copy"
            >
              <Copy size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <Chip size="sm" style={{ flex: 1, justifyContent: 'center' }}>
              Tap-to-pay (NFC)
            </Chip>
            <Chip size="sm" style={{ flex: 1, justifyContent: 'center' }}>
              Send link
            </Chip>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FakeQR({ size = 170 }: { size?: number }) {
  // Deterministic 21x21 grid with three finder squares.
  const N = 21;
  let s = 0xb0b;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const cells: boolean[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) cells.push(rand() > 0.55);
  const clear = (cx: number, cy: number) => {
    for (let y = cy; y < cy + 7; y++)
      for (let x = cx; x < cx + 7; x++) cells[y * N + x] = false;
  };
  clear(0, 0);
  clear(N - 7, 0);
  clear(0, N - 7);

  return (
    <div
      style={{
        width: size + 16,
        height: size + 16,
        padding: 8,
        background: '#fff',
        borderRadius: 14,
        border: `1px solid ${hair}`,
        boxShadow: cardShadow,
        position: 'relative',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`}>
        {cells.map((on, i) =>
          on ? (
            <rect
              key={i}
              x={(i % N) + 0.1}
              y={Math.floor(i / N) + 0.1}
              width="0.8"
              height="0.8"
              rx="0.15"
              fill={ink}
            />
          ) : null
        )}
        {[
          [0, 0],
          [N - 7, 0],
          [0, N - 7],
        ].map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            <rect x={fx} y={fy} width="7" height="7" rx="1" fill={ink} />
            <rect
              x={fx + 1}
              y={fy + 1}
              width="5"
              height="5"
              rx="0.6"
              fill="#fff"
            />
            <rect
              x={fx + 2}
              y={fy + 2}
              width="3"
              height="3"
              rx="0.3"
              fill={ink}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------------
   5. Recent orders
   ------------------------------------------------------------------------ */
function RecentOrders({ orders }: { orders: OrderRow[] }) {
  return (
    <Card pad={0}>
      <div
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${hair}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            Recent orders
          </div>
          <div
            style={{ fontSize: 11.5, color: muted, marginTop: 2 }}
          >
            {orders.length === 0
              ? 'No orders yet'
              : `${orders.length} most recent`}
          </div>
        </div>
        <Link href="/dashboard/order" style={{ textDecoration: 'none' }}>
          <Chip size="sm">
            View all
            <ArrowRight size={12} />
          </Chip>
        </Link>
      </div>
      {orders.length === 0 ? (
        <div
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            color: muted,
            fontSize: 13,
          }}
        >
          Once you start selling, recent orders appear here.
        </div>
      ) : (
        <div>
          {orders.map((o, i) => (
            <Link
              key={o._id}
              href={`/dashboard/order/${o.orderId}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 1fr 0.7fr',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderBottom:
                    i < orders.length - 1
                      ? `1px solid ${hair2}`
                      : 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <Avatar size={28} bg="#eaeaea">
                    {o.counterpartyAvatar}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: -0.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.counterparty}
                    </div>
                    <Mono size={10.5} color={muted}>
                      #{o.orderId}
                    </Mono>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.item}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Mono size={13} weight={600}>
                    ${o.price.toFixed(2)}
                  </Mono>
                  <DeliveryPill status={o.delivery} />
                </div>
                <Mono
                  size={11}
                  color={muted}
                  style={{ textAlign: 'right' }}
                >
                  {o.date}
                </Mono>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------------
   6. Products manager
   ------------------------------------------------------------------------ */
function ProductsManager({ products }: { products: NFTTemplate[] }) {
  const top = products.slice(0, 5);

  return (
    <Card pad={0}>
      <div
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${hair}`,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            Products
          </div>
          <div
            style={{ fontSize: 11.5, color: muted, marginTop: 2 }}
          >
            {products.length === 0
              ? 'No products yet'
              : `${products.length} total · ${products.filter(
                  (p) => p.category === 'physical'
                ).length} physical · ${products.filter(
                  (p) => p.category === 'digital'
                ).length} digital`}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <Chip size="sm" active>
            All
          </Chip>
          <Chip size="sm">Physical</Chip>
          <Chip size="sm">Digital</Chip>
          <div
            style={{
              width: 1,
              height: 20,
              background: hair,
              margin: '0 4px',
            }}
          />
          <Link
            href="/products/create"
            style={{ textDecoration: 'none' }}
          >
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 999,
                background: ink,
                color: '#fff',
                border: 0,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, marginTop: -1 }}>
                +
              </span>{' '}
              New product
            </button>
          </Link>
        </div>
      </div>
      {top.length === 0 ? (
        <div
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            color: muted,
            fontSize: 13,
          }}
        >
          You have no products yet.{' '}
          <Link
            href="/products/create"
            style={{ color: ink, textDecoration: 'underline' }}
          >
            Create your first
          </Link>
          .
        </div>
      ) : (
        <div>
          {top.map((p, i) => (
            <div
              key={p._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                alignItems: 'center',
                gap: 14,
                padding: '12px 20px',
                borderBottom:
                  i < top.length - 1 ? `1px solid ${hair2}` : 'none',
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
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: T_swatch.products,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={38}
                      height={38}
                      style={{
                        objectFit: 'cover',
                        width: 38,
                        height: 38,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <Box size={18} color={ink} />
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: -0.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: posGreen,
                        background: posGreenSoft,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: mono,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Live
                    </span>
                    <Mono size={11} color={muted}>
                      {p.category === 'physical' ? 'Physical' : 'Digital'}
                    </Mono>
                  </div>
                </div>
              </div>
              <Mono size={13} weight={600}>
                ${p.price}
              </Mono>
              <button type="button" style={iconBtn} aria-label="Share">
                <Share2 size={14} />
              </button>
              <button
                type="button"
                style={{ ...iconBtn, color: muted }}
                aria-label="More"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          ))}
          <div
            style={{
              padding: '12px 20px',
              borderTop: `1px solid ${hair2}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 11.5, color: muted }}>
              Showing {top.length} of {products.length} products
            </div>
            <Link href="/products" style={{ textDecoration: 'none' }}>
              <Chip size="sm">
                Manage all
                <ArrowRight size={12} />
              </Chip>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 7,
  background: 'transparent',
  border: '1px solid transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: ink,
  padding: 0,
};

/* ------------------------------------------------------------------------
   7. Recent leads (no backend yet — empty state)
   ------------------------------------------------------------------------ */
function RecentLeads() {
  return (
    <Card pad={0}>
      <div
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${hair}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            Recent leads
          </div>
          <div
            style={{ fontSize: 11.5, color: muted, marginTop: 2 }}
          >
            From profile, QR taps &amp; blinks
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip size="sm" active>
            All
          </Chip>
          <Chip size="sm">Hot</Chip>
          <Chip size="sm">Export CSV</Chip>
        </div>
      </div>
      <div
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          color: muted,
          fontSize: 13,
        }}
      >
        Leads will show up here as people interact with your profile.
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------------
   Date helpers
   ------------------------------------------------------------------------ */
function parseDate(s: string): Date | null {
  // The v2 listByUser endpoint formats dates as DD/MM/YYYY.
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function isToday(d: Date | null): boolean {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
