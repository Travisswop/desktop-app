"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Copy,
  Edit3,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  QrCode,
  ReceiptText,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { useUser } from "@/lib/UserContext";

const ink = "#0a0a0c";
const muted = "#6e6e76";
const hair = "rgba(0,0,0,0.06)";
const hair2 = "rgba(0,0,0,0.04)";
const positive = "#19a974";
const positiveSoft = "rgba(25,169,116,0.10)";
const negative = "#e5484d";
const negativeSoft = "rgba(229,72,77,0.08)";
const amber = "#d97706";

type Tile = {
  label: string;
  value: string;
  sub: string;
  href: string;
  swatch: string;
  icon: LucideIcon;
  accent?: string;
};

type OrderStatus = "Paid" | "Pending" | "Refunded";

type Order = {
  id: string;
  customer: string;
  product: string;
  amount: number;
  chain: "USDC" | "SOL";
  status: OrderStatus;
  when: string;
};

type ProductStatus = "live" | "low" | "draft";

type Product = {
  name: string;
  price: number;
  sales: number;
  status: ProductStatus;
  glyph: string;
  swatch: string;
};

const moduleTiles: Tile[] = [
  {
    label: "Products",
    value: "15",
    sub: "2 drafts",
    href: "/products",
    swatch: "#F2E0DC",
    icon: Package,
  },
  {
    label: "Orders",
    value: "284",
    sub: "5 today",
    href: "/dashboard/order",
    swatch: "#E8DFD0",
    icon: ReceiptText,
  },
  {
    label: "Checkout",
    value: "$3.1k",
    sub: "this week",
    href: "/wallet",
    swatch: "#D7EAD9",
    icon: ShoppingBag,
    accent: amber,
  },
  {
    label: "Leads",
    value: "48",
    sub: "9 hot",
    href: "/dashboard/analytics",
    swatch: "#F4E1E1",
    icon: Users,
  },
  {
    label: "Analytics",
    value: "1,157",
    sub: "taps - 7d",
    href: "/dashboard/analytics",
    swatch: "#D6E4F2",
    icon: BarChart3,
  },
  {
    label: "Rewards",
    value: "131",
    sub: "+5 wk",
    href: "/subscription",
    swatch: "#FBE7C6",
    icon: Sparkles,
  },
  {
    label: "Blinks",
    value: "13",
    sub: "4 active",
    href: "/wallet",
    swatch: "#DCE7E2",
    icon: Link2,
  },
  {
    label: "Messages",
    value: "8",
    sub: "3 unread",
    href: "/dashboard/chat",
    swatch: "#EAE2F4",
    icon: MessageSquare,
  },
];

const recentOrders: Order[] = [
  {
    id: "#10248",
    customer: "Marcus Reid",
    product: "Coaching - 60 min",
    amount: 220,
    chain: "USDC",
    status: "Paid",
    when: "2m",
  },
  {
    id: "#10247",
    customer: "Sana Patel",
    product: "Pro Membership",
    amount: 49,
    chain: "USDC",
    status: "Paid",
    when: "14m",
  },
  {
    id: "#10246",
    customer: "Eli Brennan",
    product: "eBook - Pitch Deck",
    amount: 18,
    chain: "SOL",
    status: "Paid",
    when: "38m",
  },
  {
    id: "#10245",
    customer: "Yui Tanaka",
    product: "Workshop - May 12",
    amount: 95,
    chain: "USDC",
    status: "Pending",
    when: "1h",
  },
  {
    id: "#10244",
    customer: "Drew Calloway",
    product: "Coaching - 30 min",
    amount: 120,
    chain: "USDC",
    status: "Refunded",
    when: "2h",
  },
];

const topProducts: Product[] = [
  {
    name: "Coaching - 60 min",
    price: 220,
    sales: 38,
    status: "live",
    glyph: "C",
    swatch: "#F2E0DC",
  },
  {
    name: "Pro Membership",
    price: 49,
    sales: 124,
    status: "live",
    glyph: "P",
    swatch: "#D6E4F2",
  },
  {
    name: "The Pitch Deck",
    price: 18,
    sales: 211,
    status: "live",
    glyph: "D",
    swatch: "#EAE2F4",
  },
  {
    name: "Workshop - May 12",
    price: 95,
    sales: 17,
    status: "low",
    glyph: "W",
    swatch: "#FBE7C6",
  },
  {
    name: "Brand Audit - Async",
    price: 380,
    sales: 0,
    status: "draft",
    glyph: "A",
    swatch: "#D7EAD9",
  },
];

const orderStatusStyle: Record<
  OrderStatus,
  { fg: string; bg: string }
> = {
  Paid: { fg: positive, bg: positiveSoft },
  Pending: { fg: "#c2811e", bg: "rgba(194,129,30,0.12)" },
  Refunded: { fg: negative, bg: negativeSoft },
};

const productStatusStyle: Record<
  ProductStatus,
  { fg: string; bg: string; label: string }
> = {
  live: { fg: positive, bg: positiveSoft, label: "Live" },
  low: { fg: "#b45309", bg: "rgba(217,119,6,0.12)", label: "Low - 12" },
  draft: { fg: muted, bg: "rgba(0,0,0,0.05)", label: "Draft" },
};

export default function DashboardMainContent() {
  const { user, loading } = useUser();
  const [token, setToken] = useState<"USDC" | "SOL" | "ETH">("USDC");
  const [amount, setAmount] = useState(120);

  const profile = useMemo(() => {
    const name = user?.displayName || user?.name || "Travis Herron";
    const slug =
      user?.swopensId ||
      user?.ensName ||
      user?.ens ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) ||
      "travis";
    const followers = readConnectionCount(user, "followers");
    const following = readConnectionCount(user, "following");

    return {
      name,
      initials: getInitials(name),
      swopId: slug.startsWith("$") ? slug : `$${slug}.Swop.Id`,
      publicUrl: `swop.id/${slug.replace(/^\$/, "").replace(/\.Swop\.Id$/i, "")}`,
      followers,
      following,
    };
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="-m-6 min-h-[calc(100vh-6rem)] bg-[#f4f4f2] px-4 pb-24 pt-5 font-inter text-[#0a0a0c] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
        <ProfileHero profile={profile} />

        <SectionHead title="Manage" caption="Tap any tile to dive in" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {moduleTiles.map((tile) => (
            <DashboardTile key={tile.label} tile={tile} />
          ))}
        </div>

        <SectionHead
          title="Today"
          caption="May 5 - last 24 hours"
          action={
            <Pill>
              <Clock3 className="h-3.5 w-3.5" />
              24h
            </Pill>
          }
        />
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <SalesSnapshot />
          <ViewsSnapshot />
        </div>

        <SectionHead
          title="In-person checkout"
          caption="Crypto - USDC on Solana"
          action={<WalletReady />}
        />
        <CryptoCheckout
          amount={amount}
          onAmountChange={setAmount}
          token={token}
          onTokenChange={setToken}
        />

        <OrdersCard />
        <ProductsCard />
      </div>
    </div>
  );
}

function ProfileHero({
  profile,
}: {
  profile: {
    name: string;
    initials: string;
    swopId: string;
    publicUrl: string;
    followers: number;
    following: number;
  };
}) {
  return (
    <Card className="p-[22px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-[18px]">
          <div className="relative shrink-0">
            <Avatar size="lg">{profile.initials}</Avatar>
            <Link
              href="/edit-profile"
              aria-label="Edit profile"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#0a0a0c] text-white transition-transform active:scale-95"
            >
              <Edit3 className="h-3 w-3" />
            </Link>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[22px] font-semibold leading-tight tracking-[-0.03em]">
              {profile.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Mono className="text-[12.5px] text-[#6e6e76]">
                {profile.swopId}
              </Mono>
              <span className="h-[3px] w-[3px] rounded-full bg-[#a1a1a8]" />
              <Mono className="text-[12.5px] text-[#6e6e76]">
                {profile.publicUrl}
              </Mono>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 lg:gap-7 lg:border-l lg:border-[rgba(0,0,0,0.06)] lg:pl-6">
          <StatCount label="Followers" value={profile.followers} />
          <StatCount label="Following" value={profile.following} />
          <div className="flex gap-1.5">
            <Pill asChild active>
              <Link href="/smartsite">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Link>
            </Pill>
            <Pill asChild>
              <Link href="/dashboard/qr-code">
                <QrCode className="h-3.5 w-3.5" />
                QR
              </Link>
            </Pill>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DashboardTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;

  return (
    <Link
      href={tile.href}
      className="group flex min-h-[132px] flex-col justify-between rounded-[18px] border border-[rgba(0,0,0,0.06)] bg-white p-4 text-[#0a0a0c] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(10,10,12,0.04),0_16px_34px_-18px_rgba(10,10,12,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ background: tile.swatch }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </div>
        <Mono className="text-[26px] font-semibold leading-none tracking-[-0.04em]">
          {tile.value}
        </Mono>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[-0.01em]">
          {tile.label}
        </div>
        <div
          className="mt-0.5 text-[11.5px] font-medium"
          style={{ color: tile.accent || muted }}
        >
          {tile.sub}
        </div>
      </div>
    </Link>
  );
}

function SalesSnapshot() {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Tag>Gross volume</Tag>
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <div className="text-[38px] font-semibold leading-none tracking-[-0.04em]">
              $1,284
            </div>
            <Delta value="+18.4%" />
          </div>
          <div className="mt-1.5 text-xs text-[#6e6e76]">
            vs $1,084 yesterday - 12 orders
          </div>
        </div>
        <div className="flex gap-1.5 sm:flex-col sm:items-end">
          <Pill active>Today</Pill>
          <Pill>7d</Pill>
        </div>
      </div>
      <Sparkline className="mt-4 h-[68px]" color={amber} />
      <div className="mt-3.5 grid grid-cols-3 border-t border-[rgba(0,0,0,0.06)] pt-3.5">
        <SmallMetric label="Online" value="$924" detail="- 9" />
        <SmallMetric
          label="In-person"
          value="$360"
          detail="- 3"
          accent={amber}
          bordered
        />
        <SmallMetric label="Avg order" value="$107" bordered />
      </div>
    </Card>
  );
}

function ViewsSnapshot() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Tag>Profile views</Tag>
          <div className="mt-1.5 flex items-baseline gap-2">
            <div className="text-[38px] font-semibold leading-none tracking-[-0.04em]">
              432
            </div>
            <Delta value="+9.2%" />
          </div>
        </div>
        <Sparkline className="h-9 w-[120px]" color={ink} />
      </div>
      <div className="mt-4 border-t border-[rgba(0,0,0,0.06)] pt-3.5">
        <SourceRow label="Profile link" value="218" pct={50} />
        <SourceRow label="QR - in-person" value="94" pct={22} accent={amber} />
        <SourceRow label="Blinks" value="68" pct={16} />
        <SourceRow label="Direct" value="52" pct={12} />
      </div>
    </Card>
  );
}

function CryptoCheckout({
  amount,
  onAmountChange,
  token,
  onTokenChange,
}: {
  amount: number;
  onAmountChange: (amount: number) => void;
  token: "USDC" | "SOL" | "ETH";
  onTokenChange: (token: "USDC" | "SOL" | "ETH") => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        <div className="border-b border-[rgba(0,0,0,0.06)] p-[22px] lg:border-b-0 lg:border-r">
          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tag>Charge</Tag>
            <div className="flex w-fit gap-1 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-[#f4f4f2] p-[3px]">
              {(["USDC", "SOL", "ETH"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onTokenChange(item)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[11.5px] font-semibold transition"
                  style={{
                    background: item === token ? "#fff" : "transparent",
                    boxShadow:
                      item === token
                        ? "0 1px 2px rgba(10,10,12,0.04),0 8px 28px -12px rgba(10,10,12,0.10)"
                        : "none",
                  }}
                >
                  {item === "USDC" ? <UsdcGlyph size={14} /> : null}
                  {item === "SOL" ? <SolGlyph size={14} /> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-1.5 border-b-2 border-[#0a0a0c] py-3.5">
            <span className="text-[30px] font-semibold tracking-[-0.04em] text-[#6e6e76]">
              $
            </span>
            <span className="text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums">
              {amount}
            </span>
            <span className="text-[56px] font-semibold leading-none tracking-[-0.05em] text-[#a1a1a8] tabular-nums">
              .00
            </span>
            <Mono className="ml-2 pb-2 text-sm text-[#6e6e76]">{token}</Mono>
          </div>

          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Mono className="text-xs text-[#6e6e76]">
              approx {amount.toFixed(2)} {token} - 0.00 fees
            </Mono>
            <Pill>
              For:
              <span className="font-semibold">Coaching - 60 min</span>
            </Pill>
          </div>

          <div className="mt-[18px] grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[25, 50, 100, 120].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAmountChange(preset)}
                className="h-11 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white text-sm font-semibold tracking-[-0.01em] transition hover:bg-[#f8f8f6]"
                style={{
                  background: preset === amount ? "#f4f4f2" : "#fff",
                }}
              >
                ${preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] text-sm font-semibold tracking-[-0.01em] text-white transition active:scale-[0.99]"
          >
            <QrCode className="h-4 w-4" />
            Generate QR - request payment
          </button>
        </div>

        <div className="flex flex-col items-center gap-3.5 bg-[#fafaf8] p-[22px]">
          <div className="flex w-full items-center gap-2">
            <Tag>Scan to pay</Tag>
            <Mono className="text-[11px] text-[#6e6e76]">
              - Phantom - Solflare - Backpack
            </Mono>
          </div>
          <FakeQr />
          <div className="flex w-full items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
            <SolGlyph size={14} />
            <Mono className="min-w-0 flex-1 truncate text-[11.5px]">
              7xKXt...3Q9Tr
            </Mono>
            <button
              type="button"
              aria-label="Copy wallet address"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#6e6e76] transition hover:bg-[#f4f4f2]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid w-full grid-cols-2 gap-1.5">
            <Pill className="justify-center">Tap-to-pay</Pill>
            <Pill className="justify-center">Send link</Pill>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OrdersCard() {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader
        title="Recent orders"
        caption="Last 24 hours - 12 settled"
        action={
          <Pill asChild>
            <Link href="/dashboard/order">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Pill>
        }
      />
      <div>
        {recentOrders.map((order, index) => (
          <OrderRow
            key={order.id}
            order={order}
            withBorder={index < recentOrders.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

function ProductsCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">
            Products
          </div>
          <div className="mt-0.5 text-[11.5px] text-[#6e6e76]">
            15 products - 12 live - 2 drafts - 1 low stock
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill active>All</Pill>
          <Pill className="hidden sm:inline-flex">Physical Product</Pill>
          <Pill className="hidden sm:inline-flex">Digital Product</Pill>
          <div className="mx-1 hidden h-5 w-px bg-[rgba(0,0,0,0.06)] sm:block" />
          <Link
            href="/products/create"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0a0a0c] px-3 text-xs font-semibold text-white transition active:scale-95"
          >
            <span className="text-sm leading-none">+</span>
            New product
          </Link>
        </div>
      </div>
      <div>
        {topProducts.map((product, index) => (
          <ProductRow
            key={product.name}
            product={product}
            withBorder={index < topProducts.length - 1}
          />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.04)] px-5 py-3">
        <div className="text-[11.5px] text-[#6e6e76]">
          Showing 5 of 15 products
        </div>
        <Pill asChild>
          <Link href="/products">
            Manage all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Pill>
      </div>
    </Card>
  );
}

function OrderRow({
  order,
  withBorder,
}: {
  order: Order;
  withBorder: boolean;
}) {
  const status = orderStatusStyle[order.status];

  return (
    <div
      className="grid grid-cols-[1.25fr_auto_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[1.35fr_1.45fr_1fr_0.5fr]"
      style={{ borderBottom: withBorder ? `1px solid ${hair2}` : "none" }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar>{getInitials(order.customer)}</Avatar>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-[-0.01em]">
            {order.customer}
          </div>
          <Mono className="text-[10.5px] text-[#6e6e76]">{order.id}</Mono>
        </div>
      </div>
      <div className="hidden truncate text-[12.5px] text-[#6e6e76] sm:block">
        {order.product}
      </div>
      <div className="flex items-center gap-1.5">
        {order.chain === "USDC" ? <UsdcGlyph size={14} /> : <SolGlyph size={14} />}
        <Mono className="text-[13px] font-semibold">${order.amount}</Mono>
        <StatusPill fg={status.fg} bg={status.bg}>
          {order.status}
        </StatusPill>
      </div>
      <Mono className="text-right text-[11px] text-[#6e6e76]">
        {order.when}
      </Mono>
    </div>
  );
}

function ProductRow({
  product,
  withBorder,
}: {
  product: Product;
  withBorder: boolean;
}) {
  const status = productStatusStyle[product.status];

  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
      style={{ borderBottom: withBorder ? `1px solid ${hair2}` : "none" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] text-sm font-semibold"
          style={{ background: product.swatch }}
        >
          {product.glyph}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-[-0.01em]">
            {product.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusPill fg={status.fg} bg={status.bg}>
              {status.label}
            </StatusPill>
            <Mono className="text-[11px] text-[#6e6e76]">
              {product.sales} sold
            </Mono>
          </div>
        </div>
      </div>
      <Mono className="text-[13px] font-semibold">${product.price}</Mono>
      <IconButton label="Edit product" className="hidden sm:flex">
        <Pencil className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Share product" className="hidden sm:flex">
        <Share2 className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="More product actions" className="hidden sm:flex">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

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
    <div className="mt-1 flex items-end justify-between gap-4">
      <div>
        <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#0a0a0c]">
          {title}
        </div>
        {caption ? (
          <div className="mt-0.5 text-[13px] tracking-[-0.01em] text-[#6e6e76]">
            {caption}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold tracking-[-0.02em]">
          {title}
        </div>
        <div className="mt-0.5 text-[11.5px] text-[#6e6e76]">{caption}</div>
      </div>
      {action}
    </div>
  );
}

function Pill({
  children,
  active = false,
  className = "",
  asChild = false,
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  asChild?: boolean;
}) {
  const classes = `inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold tracking-[-0.01em] transition ${className}`;
  const style = active
    ? { backgroundColor: ink, borderColor: ink, color: "#fff" }
    : { backgroundColor: "#fff", borderColor: hair, color: ink };

  if (asChild) {
    return (
      <span className={classes} style={style}>
        {children}
      </span>
    );
  }

  return (
    <button type="button" className={classes} style={style}>
      {children}
    </button>
  );
}

function Avatar({
  children,
  size = "sm",
}: {
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#dfe6ef] font-semibold tracking-[-0.01em] ${
        size === "lg" ? "h-16 w-16 text-2xl" : "h-7 w-7 text-[11px]"
      }`}
    >
      {children}
    </div>
  );
}

function Mono({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`font-mono tracking-[-0.02em] tabular-nums ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6e6e76]">
      {children}
    </div>
  );
}

function Delta({ value }: { value: string }) {
  const isPositive = !value.startsWith("-");

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
      style={{
        color: isPositive ? positive : negative,
        backgroundColor: isPositive ? positiveSoft : negativeSoft,
      }}
    >
      <span className="text-[9px]">{isPositive ? "▲" : "▼"}</span>
      {value}
    </span>
  );
}

function StatCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[64px] text-center">
      <div className="text-2xl font-semibold leading-none tracking-[-0.03em]">
        {formatCount(value)}
      </div>
      <Tag>{label}</Tag>
    </div>
  );
}

function SmallMetric({
  label,
  value,
  detail,
  accent,
  bordered,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={bordered ? "border-l border-[rgba(0,0,0,0.06)] pl-3.5" : ""}
    >
      <Tag>{label}</Tag>
      <div className="mt-1">
        <Mono
          className="text-[15px] font-semibold"
          style={{ color: accent || ink } as React.CSSProperties}
        >
          {value}
        </Mono>
        {detail ? (
          <span className="ml-1 text-[11px] text-[#6e6e76]">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}

function SourceRow({
  label,
  value,
  pct,
  accent,
}: {
  label: string;
  value: string;
  pct: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="min-w-0 flex-1 text-[12.5px] font-semibold tracking-[-0.01em]">
        {label}
      </div>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-[#f2f2f0]">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: accent || ink }}
        />
      </div>
      <Mono className="min-w-9 text-right text-[12.5px] font-semibold">
        {value}
      </Mono>
    </div>
  );
}

function WalletReady() {
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6e6e76] sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[#19a974] shadow-[0_0_0_3px_rgba(25,169,116,0.10)]" />
      Wallet ready
    </span>
  );
}

function Sparkline({
  className = "",
  color,
}: {
  className?: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8 L150,40 L0,40 Z"
        fill={`url(#spark-${color.replace("#", "")})`}
      />
      <path
        d="M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FakeQr() {
  const cells = useMemo(() => {
    const size = 21;
    let seed = 0xb0b;
    const pattern: boolean[] = [];
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        pattern.push(rand() > 0.55);
      }
    }

    const clearArea = (cx: number, cy: number) => {
      for (let y = cy; y < cy + 7; y += 1) {
        for (let x = cx; x < cx + 7; x += 1) {
          pattern[y * size + x] = false;
        }
      }
    };

    clearArea(0, 0);
    clearArea(size - 7, 0);
    clearArea(0, size - 7);
    return pattern;
  }, []);

  return (
    <div className="relative h-[186px] w-[186px] rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white p-2 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <svg width="170" height="170" viewBox="0 0 21 21" aria-hidden="true">
        {cells.map((on, index) =>
          on ? (
            <rect
              key={index}
              x={(index % 21) + 0.1}
              y={Math.floor(index / 21) + 0.1}
              width="0.8"
              height="0.8"
              rx="0.15"
              fill={ink}
            />
          ) : null,
        )}
        {[
          [0, 0],
          [14, 0],
          [0, 14],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" rx="1" fill={ink} />
            <rect
              x={x + 1}
              y={y + 1}
              width="5"
              height="5"
              rx="0.6"
              fill="#fff"
            />
            <rect
              x={x + 2}
              y={y + 2}
              width="3"
              height="3"
              rx="0.3"
              fill={ink}
            />
          </g>
        ))}
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[10px] bg-white p-1">
        <UsdcGlyph size={28} />
      </div>
    </div>
  );
}

function StatusPill({
  children,
  fg,
  bg,
}: {
  children: React.ReactNode;
  fg: string;
  bg: string;
}) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.04em]"
      style={{ color: fg, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#0a0a0c] transition hover:bg-[#f4f4f2] ${className}`}
    >
      {children}
    </button>
  );
}

function UsdcGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#2775CA" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Inter, sans-serif"
        fontSize="11"
        fontWeight="700"
      >
        $
      </text>
      <circle
        cx="12"
        cy="12"
        r="7.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function SolGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="dashboard-sol-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#0a0a0c" />
      <path d="M7 8.5h9.4l-1.6 1.6H5.4z" fill="url(#dashboard-sol-g)" />
      <path d="M5.4 13.7h9.4l1.6 1.6H7z" fill="url(#dashboard-sol-g)" />
      <path d="M7 11.1h9.4l-1.6 1.6H5.4z" fill="url(#dashboard-sol-g)" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="-m-6 min-h-[calc(100vh-6rem)] bg-[#f4f4f2] px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
        <div className="h-[110px] animate-pulse rounded-[22px] bg-white" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[132px] animate-pulse rounded-[18px] bg-white"
            />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[210px] animate-pulse rounded-[22px] bg-white" />
          <div className="h-[210px] animate-pulse rounded-[22px] bg-white" />
        </div>
        <div className="h-[360px] animate-pulse rounded-[22px] bg-white" />
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readConnectionCount(
  user: ReturnType<typeof useUser>["user"],
  key: "followers" | "following",
) {
  if (!user) return key === "followers" ? 909 : 51;

  const directValue = user[key];
  if (typeof directValue === "number") return directValue;

  const nested = (user as any)?.connections?.[key];
  if (Array.isArray(nested)) return nested.length;
  if (typeof nested === "number") return nested;

  return key === "followers" ? 909 : 51;
}

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return value.toLocaleString();
}
