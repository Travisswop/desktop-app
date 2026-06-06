"use client";

import Image from "next/image";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { usePrivy } from "@privy-io/react-auth";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Link2,
  Map,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  QrCode,
  ReceiptText,
  ScanLine,
  Share2,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useUser } from "@/lib/UserContext";
import isUrl from "@/lib/isUrl";
import {
  useWalletAddresses,
  useWalletData,
} from "@/components/wallet/hooks/useWalletData";
import {
  createCheckoutIntent,
  listCheckoutIntents,
  type CheckoutIntent,
} from "@/lib/checkout-api";
import {
  listMarketplaceOrders,
  listMarketplaceProducts,
  type MarketplaceOrder,
  type MarketplaceProduct,
} from "@/lib/marketplace-api";
import {
  getMarketplaceProductDisplayType,
  isInPersonCheckoutMode,
} from "@/lib/marketplace-display";

const ink = "#0a0a0c";
const muted = "#6e6e76";
const hair = "rgba(0,0,0,0.06)";
const hair2 = "rgba(0,0,0,0.04)";
const positive = "#19a974";
const positiveSoft = "rgba(25,169,116,0.10)";
const negative = "#e5484d";
const negativeSoft = "rgba(229,72,77,0.08)";
const amber = "#d97706";
const LOW_STOCK_THRESHOLD = 5;

type Tile = {
  label: string;
  value?: string;
  actionLabel?: string;
  sub: string;
  href: string;
  swatch: string;
  icon: LucideIcon;
  accent?: string;
};

type OrderStatus = "Paid" | "Pending" | "Refunded";

type Order = {
  id: string;
  detailId: string;
  customer: string;
  product: string;
  amount: number;
  chain: "USDC" | "SOL";
  status: OrderStatus;
  when: string;
  checkoutMode?: string;
};

type ProductStatus = "live" | "low" | "draft";

type Product = {
  id: string;
  name: string;
  price: number;
  sales: number;
  revenue: number;
  currency: string;
  status: ProductStatus;
  statusLabel: string;
  glyph: string;
  swatch: string;
  type: "Physical" | "Digital" | "Service";
  image?: string;
};

type ProductSalesRow = {
  productId: string;
  units: number;
  revenue: number;
  orderCount: number;
};

type SalesSummary = {
  perProduct: ProductSalesRow[];
  totals: {
    units: number;
    revenue: number;
    templates: number;
    orders: number;
  };
};

type DashboardData = {
  checkoutIntents: CheckoutIntent[];
  products: Product[];
  orders: Order[];
  summary: SalesSummary | null;
};

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
  low: { fg: "#b45309", bg: "rgba(217,119,6,0.12)", label: "Low" },
  draft: { fg: muted, bg: "rgba(0,0,0,0.05)", label: "Draft" },
};

export default function DashboardMainContent() {
  const {
    user,
    accessToken,
    loading,
    primaryMicrositeProfilePic,
  } = useUser();
  const {
    user: privyUser,
    ready: privyReady,
    authenticated,
  } = usePrivy();
  const walletData = useWalletData(authenticated, privyReady, privyUser, user);
  const { solWalletAddress } = useWalletAddresses(walletData);
  const [amount, setAmount] = useState(120);
  const [checkoutIntent, setCheckoutIntent] =
    useState<CheckoutIntent | null>(null);
  const [checkoutCreating, setCheckoutCreating] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<
    "idle" | "copied" | "error"
  >("idle");
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    checkoutIntents: [],
    products: [],
    orders: [],
    summary: null,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const primarySmartsite = useMemo(() => getPrimarySmartsite(user), [user]);
  const primarySmartsiteId =
    getRecordId(primarySmartsite) || getRecordId(user?.primaryMicrosite);

  const profile = useMemo(() => {
    const name = user?.displayName || user?.name || "Travis Herron";
    const normalizedSwopId =
      [
        primarySmartsite?.ens,
        user?.swopensId,
        user?.ensName,
        user?.ens,
      ]
        .map(normalizeSwopIdSlug)
        .find(Boolean) ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) ||
      "swop";
    const followers = readConnectionCount(user, "followers");
    const following = readConnectionCount(user, "following");

    return {
      name,
      avatarSrc: resolveSmartsiteAvatar(
        primarySmartsite?.profilePic ?? primaryMicrositeProfilePic,
      ),
      editHref: primarySmartsiteId
        ? `/smartsite/profile/${primarySmartsiteId}`
        : "/smartsite",
      initials: getInitials(name),
      swopId: formatSwopIdDisplay(normalizedSwopId),
      publicUrl: `swop.id/${normalizedSwopId}`,
      followers,
      following,
    };
  }, [primaryMicrositeProfilePic, primarySmartsite, primarySmartsiteId, user]);

  const checkoutAddress = useMemo(() => {
    return (
      solWalletAddress ||
      user?.solanaAddress ||
      user?.solanaWallet ||
      ""
    );
  }, [solWalletAddress, user]);

  const loadDashboardData = useCallback(async (tokenValue: string) => {
    const [productsRes, ordersRes, checkoutIntents] = await Promise.all([
      listMarketplaceProducts(tokenValue, {
        scope: "mine",
        limit: 200,
      }),
      listMarketplaceOrders(tokenValue, {
        role: "seller",
        limit: 200,
      }),
      listCheckoutIntents(tokenValue).catch((error) => {
        console.error("Failed to load dashboard checkout intents:", error);
        return [] as CheckoutIntent[];
      }),
    ]);

    const summary = summarizeMarketplaceOrders(ordersRes.items || []);
    const salesByProduct: Record<string, ProductSalesRow> = {};
    for (const row of summary.perProduct) {
      salesByProduct[row.productId] = row;
    }

    return {
      checkoutIntents,
      products: (productsRes.items || [])
        .map((item) => mapDashboardProduct(item, salesByProduct[item._id]))
        .sort(
          (a, b) =>
            b.sales - a.sales ||
            b.revenue - a.revenue ||
            a.name.localeCompare(b.name),
        ),
      orders: (ordersRes.items || []).map(mapDashboardOrder).slice(0, 5),
      summary,
    } satisfies DashboardData;
  }, []);

  useEffect(() => {
    setCheckoutIntent(null);
    setCheckoutError(null);
    setCopyState("idle");
  }, [checkoutAddress]);

  useEffect(() => {
    let cancelled = false;
    if (!user?._id || !accessToken) {
      setDashboardLoading(false);
      setDashboardError(null);
      return () => {
        cancelled = true;
      };
    }

    setDashboardLoading(true);
    setDashboardError(null);
    loadDashboardData(accessToken)
      .then((nextData) => {
        if (!cancelled) {
          setDashboardData(nextData);
          setDashboardLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard commerce data:", err);
        if (!cancelled) {
          setDashboardData({
            checkoutIntents: [],
            products: [],
            orders: [],
            summary: null,
          });
          setDashboardError("Commerce data could not be loaded.");
          setDashboardLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, loadDashboardData, user?._id]);

  const moduleTiles = useMemo(
    () =>
      buildModuleTiles({
        checkoutIntents: dashboardData.checkoutIntents,
        products: dashboardData.products,
        orders: dashboardData.orders,
        summary: dashboardData.summary,
        loading: dashboardLoading,
        profileStats: {
          followers: profile.followers,
          following: profile.following,
        },
      }),
    [dashboardData, dashboardLoading, profile.followers, profile.following],
  );

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch (err) {
      console.error("Failed to copy dashboard checkout value:", err);
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }, []);

  const handleAmountChange = useCallback((nextAmount: number) => {
    setAmount(nextAmount);
    setCheckoutIntent(null);
    setCheckoutError(null);
    setCopyState("idle");
  }, []);

  const handleGenerateCheckout = useCallback(async () => {
    const normalizedAmount = Number(amount.toFixed(2));

    if (!accessToken) {
      setCheckoutError("Sign in to create a Swop Pay request.");
      return;
    }

    if (!checkoutAddress) {
      setCheckoutError("Add a Solana settlement wallet before creating checkout.");
      return;
    }

    if (normalizedAmount <= 0) {
      setCheckoutError("Checkout amount must be greater than $0.");
      return;
    }

    setCheckoutCreating(true);
    setCheckoutError(null);
    setCopyState("idle");

    try {
      const checkoutBaseUrl =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const intent = await createCheckoutIntent(
        {
          amount: normalizedAmount,
          checkoutBaseUrl,
          description: `QR checkout - ${profile.name}`,
          merchantCurrency: "USDC",
          merchantWalletAddress: checkoutAddress,
        },
        accessToken,
      );
      setCheckoutIntent(intent);
    } catch (err) {
      console.error("Failed to create dashboard checkout intent:", err);
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout could not be created.",
      );
    } finally {
      setCheckoutCreating(false);
    }
  }, [accessToken, amount, checkoutAddress, profile.name]);

  const handleCopyProduct = useCallback(
    (product: Product) => {
      const publicUrl = profile.publicUrl.startsWith("http")
        ? profile.publicUrl
        : `https://${profile.publicUrl}`;
      const value = product.id
        ? `${publicUrl}?product=${encodeURIComponent(product.id)}`
        : publicUrl;
      void handleCopy(value);
    },
    [handleCopy, profile.publicUrl],
  );

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
          title="Sales"
          caption="Connected commerce activity - last 30 days"
          action={
            <Pill active>
              <Clock3 className="h-3.5 w-3.5" />
              30d
            </Pill>
          }
        />
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <SalesSnapshot
            orders={dashboardData.orders}
            summary={dashboardData.summary}
          />
          <ProfileActivitySnapshot
            followers={profile.followers}
            following={profile.following}
          />
        </div>

        <SectionHead
          title="QR checkout"
          caption="Create a Swop Pay QR or link"
          action={<WalletReady ready={Boolean(checkoutAddress)} />}
        />
        <CryptoCheckout
          amount={amount}
          checkoutError={checkoutError}
          checkoutIntent={checkoutIntent}
          creating={checkoutCreating}
          onAmountChange={handleAmountChange}
          address={checkoutAddress}
          copyState={copyState}
          onCopy={handleCopy}
          onGenerate={handleGenerateCheckout}
        />

        <OrdersCard
          error={dashboardError}
          loading={dashboardLoading}
          orders={dashboardData.orders}
          totalOrders={dashboardData.summary?.totals.orders}
        />
        <ProductsCard
          error={dashboardError}
          loading={dashboardLoading}
          onShareProduct={handleCopyProduct}
          products={dashboardData.products}
        />
      </div>
    </div>
  );
}

function ProfileHero({
  profile,
}: {
  profile: {
    name: string;
    avatarSrc: string;
    editHref: string;
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
            <Avatar
              alt={`${profile.name} profile picture`}
              size="lg"
              src={profile.avatarSrc}
            >
              {profile.initials}
            </Avatar>
            <Link
              href={profile.editHref}
              aria-label="Edit SmartSite profile"
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
        {tile.actionLabel ? (
          <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-3 text-xs font-semibold leading-none tracking-normal text-[#0a0a0c] transition group-hover:bg-[#f4f4f2]">
            {tile.actionLabel}
            <ArrowRight className="h-3 w-3 shrink-0" />
          </span>
        ) : (
          <Mono className="text-[26px] font-semibold leading-none tracking-[-0.04em]">
            {tile.value}
          </Mono>
        )}
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

function SalesSnapshot({
  orders,
  summary,
}: {
  orders: Order[];
  summary: SalesSummary | null;
}) {
  const revenue =
    summary?.totals.revenue ??
    orders.reduce((total, order) => total + order.amount, 0);
  const orderCount = summary?.totals.orders ?? orders.length;
  const unitCount = summary?.totals.units ?? orderCount;
  const settled = orders.filter((order) => order.status === "Paid").length;
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Tag>Gross volume</Tag>
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <div className="text-[38px] font-semibold leading-none tracking-[-0.04em]">
              {formatCurrency(revenue)}
            </div>
            <StatusPill fg={positive} bg={positiveSoft}>
              30d
            </StatusPill>
          </div>
          <div className="mt-1.5 text-xs text-[#6e6e76]">
            {orderCount
              ? `${orderCount.toLocaleString()} orders - ${settled} recent settled`
              : "No connected orders yet"}
          </div>
        </div>
        <div className="flex gap-1.5 sm:flex-col sm:items-end">
          <Pill active>30d</Pill>
          <Pill>7d</Pill>
        </div>
      </div>
      <Sparkline className="mt-4 h-[68px]" color={amber} />
      <div className="mt-3.5 grid grid-cols-3 border-t border-[rgba(0,0,0,0.06)] pt-3.5">
        <SmallMetric
          label="Orders"
          value={orderCount.toLocaleString()}
          detail="30d"
        />
        <SmallMetric
          label="Units"
          value={unitCount.toLocaleString()}
          detail="sold"
          accent={amber}
          bordered
        />
        <SmallMetric label="Avg order" value={formatCurrency(avgOrder)} bordered />
      </div>
    </Card>
  );
}

function ProfileActivitySnapshot({
  followers,
  following,
}: {
  followers: number;
  following: number;
}) {
  const totalConnections = followers + following;
  const followerPct =
    totalConnections > 0 ? Math.round((followers / totalConnections) * 100) : 0;
  const followingPct =
    totalConnections > 0 ? Math.round((following / totalConnections) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Tag>Profile activity</Tag>
          <div className="mt-1.5 flex items-baseline gap-2">
            <div className="text-[38px] font-semibold leading-none tracking-[-0.04em]">
              {formatCount(totalConnections)}
            </div>
            <StatusPill fg={positive} bg={positiveSoft}>
              live
            </StatusPill>
          </div>
          <div className="mt-1.5 text-xs text-[#6e6e76]">
            Followers and following from your profile
          </div>
        </div>
        <Sparkline className="h-9 w-[120px]" color={ink} />
      </div>
      <div className="mt-4 border-t border-[rgba(0,0,0,0.06)] pt-3.5">
        <SourceRow
          label="Followers"
          value={formatCount(followers)}
          pct={followerPct}
        />
        <SourceRow
          label="Following"
          value={formatCount(following)}
          pct={followingPct}
          accent={amber}
        />
      </div>
    </Card>
  );
}

function CryptoCheckout({
  amount,
  onAmountChange,
  checkoutError,
  checkoutIntent,
  creating,
  address,
  copyState,
  onCopy,
  onGenerate,
}: {
  amount: number;
  onAmountChange: (amount: number) => void;
  checkoutError: string | null;
  checkoutIntent: CheckoutIntent | null;
  creating: boolean;
  address: string;
  copyState: "idle" | "copied" | "error";
  onCopy: (value: string) => void;
  onGenerate: () => void;
}) {
  const checkoutUrl = checkoutIntent?.checkoutUrl || "";
  const hasAddress = Boolean(address);
  const canCreate = hasAddress && amount > 0 && !creating;
  const requestStatus = checkoutIntent
    ? checkoutIntent.status.replace(/_/g, " ")
    : "Not created";
  const amountNote = checkoutIntent
    ? `${checkoutIntent.intentId} - ${formatCurrency(
        checkoutIntent.amount.value,
      )} ${checkoutIntent.amount.currency}`
    : "Swop app scan or checkout link";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid min-w-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0 border-b border-[rgba(0,0,0,0.06)] p-[22px] lg:border-b-0 lg:border-r">
          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tag>Swop Pay request</Tag>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill active>
                <UsdcGlyph size={14} />
                Receive USDC
              </Pill>
              <Pill asChild>
                <Link href="/dashboard/checkout">
                  Builder
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Pill>
            </div>
          </div>

          <div className="flex min-w-0 items-end gap-1.5 border-b-2 border-[#0a0a0c] py-3.5">
            <span className="shrink-0 text-[30px] font-semibold tracking-[-0.04em] text-[#6e6e76]">
              $
            </span>
            <input
              aria-label="Checkout amount"
              className="min-w-0 flex-1 bg-transparent text-[48px] font-semibold leading-none tracking-[-0.05em] tabular-nums outline-none sm:w-[min(52vw,220px)] sm:flex-none sm:text-[56px]"
              inputMode="decimal"
              min="0"
              step="1"
              type="number"
              value={amount}
              onChange={(event) => {
                const next = Number(event.target.value);
                onAmountChange(Number.isFinite(next) ? Math.max(0, next) : 0);
              }}
            />
            <span className="hidden shrink-0 text-[56px] font-semibold leading-none tracking-[-0.05em] text-[#a1a1a8] tabular-nums sm:inline">
              .00
            </span>
            <Mono className="hidden shrink-0 pb-2 text-sm text-[#6e6e76] sm:ml-2 sm:inline">
              USDC
            </Mono>
          </div>

          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Mono className="text-xs text-[#6e6e76]">
              {amountNote}
            </Mono>
            <Pill>
              {hasAddress ? "Settlement ready" : "Connect wallet"}
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
            aria-busy={creating}
            disabled={!canCreate}
            onClick={onGenerate}
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] text-sm font-semibold tracking-[-0.01em] text-white transition active:scale-[0.99]"
            style={{
              opacity: canCreate ? 1 : 0.45,
              cursor: canCreate ? "pointer" : "not-allowed",
            }}
          >
            <QrCode className="h-4 w-4" />
            {creating
              ? "Creating checkout..."
              : hasAddress
                ? (
                  <>
                    <span className="hidden sm:inline">
                      Create Swop Pay request
                    </span>
                    <span className="sm:hidden">Create request</span>
                  </>
                )
                : (
                  <>
                    <span className="hidden sm:inline">
                      Connect wallet to create QR
                    </span>
                    <span className="sm:hidden">Connect wallet</span>
                  </>
                )}
          </button>
          {checkoutError ? (
            <div className="mt-3 rounded-xl border border-[rgba(229,72,77,0.16)] bg-[rgba(229,72,77,0.06)] px-3 py-2 text-[12px] font-medium text-[#b4232a]">
              {checkoutError}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 bg-[#fafaf8] p-[18px] sm:p-[22px]">
          <div className="flex w-full items-start justify-between gap-3">
            <div>
              <Tag>Customer payment</Tag>
              <div className="mt-1 text-[12.5px] font-medium text-[#6e6e76]">
                Swop app or checkout link
              </div>
            </div>
            <StatusPill
              fg={checkoutIntent ? positive : muted}
              bg={checkoutIntent ? positiveSoft : "rgba(0,0,0,0.05)"}
            >
              {requestStatus}
            </StatusPill>
          </div>

          <div className="grid gap-3 sm:grid-cols-[210px_1fr] lg:grid-cols-1 xl:grid-cols-[210px_1fr]">
            <div className="flex min-h-[210px] items-center justify-center rounded-[18px] border border-[rgba(0,0,0,0.08)] bg-white p-3">
              {hasAddress && checkoutUrl ? (
                <QRCodeSVG
                  value={checkoutUrl}
                  size={176}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="flex h-full min-h-[176px] w-full flex-col items-center justify-center rounded-[14px] bg-[#f4f4f2] text-center">
                  <QrCode className="h-8 w-8 text-[#a1a1a8]" />
                  <div className="mt-2 max-w-[140px] text-[12px] font-semibold text-[#6e6e76]">
                    {hasAddress ? "Create request" : "Connect wallet"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-2">
              <div className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.06)] pb-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#0a0a0c] shadow-[0_1px_2px_rgba(10,10,12,0.04)]">
                  <ScanLine className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold tracking-[-0.01em]">
                    Scan in Swop app
                  </div>
                  <Mono className="text-[11px] text-[#6e6e76]">
                    QR opens Swop Pay
                  </Mono>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.06)] py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#0a0a0c] shadow-[0_1px_2px_rgba(10,10,12,0.04)]">
                  <Wallet className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold tracking-[-0.01em]">
                    Open checkout link
                  </div>
                  <Mono className="text-[11px] text-[#6e6e76]">
                    Customer selects wallet
                  </Mono>
                </div>
              </div>
              <div className="pt-1">
                <Mono className="block truncate text-[11px] text-[#6e6e76]">
                  {checkoutUrl || "Create a request to get a shareable link"}
                </Mono>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-3 py-2.5">
            <SolGlyph size={14} />
            <UsdcGlyph size={14} />
            <Mono className="min-w-0 flex-1 truncate text-[11.5px]">
              {hasAddress
                ? `Payout wallet ${shortAddress(address)}`
                : "No payout wallet found"}
            </Mono>
            <button
              type="button"
              aria-label="Copy payout wallet address"
              disabled={!hasAddress}
              onClick={() => onCopy(address)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#6e6e76] transition hover:bg-[#f4f4f2]"
              style={{
                opacity: hasAddress ? 1 : 0.4,
                cursor: hasAddress ? "pointer" : "not-allowed",
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!checkoutUrl}
              onClick={() => {
                if (checkoutUrl) window.location.href = checkoutUrl;
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white text-[12.5px] font-semibold transition hover:bg-[#f4f4f2] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open link
            </button>
            <button
              type="button"
              disabled={!checkoutUrl}
              onClick={() => onCopy(checkoutUrl)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] text-[12.5px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyState === "copied"
                ? "Copied"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OrdersCard({
  error,
  loading,
  orders,
  totalOrders,
}: {
  error: string | null;
  loading: boolean;
  orders: Order[];
  totalOrders?: number;
}) {
  const caption = loading
    ? "Loading connected orders"
    : error
      ? "Orders could not be loaded"
      : `${totalOrders ?? orders.length} payments - last 30 days`;

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader
        title="Recent orders"
        caption={caption}
        action={
          <Pill asChild>
            <Link href="/order">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Pill>
        }
      />
      <div>
        {loading ? (
          <CardLoadingRows count={4} />
        ) : error ? (
          <CardEmptyState
            actionHref="/order"
            actionLabel="Open orders"
            title="Unable to load orders"
          />
        ) : orders.length ? (
          orders.map((order, index) => (
            <OrderRow
              key={order.detailId || order.id}
              order={order}
              withBorder={index < orders.length - 1}
            />
          ))
        ) : (
          <CardEmptyState
            actionHref="/products/create"
            actionLabel="Create product"
            title="No orders yet"
          />
        )}
      </div>
    </Card>
  );
}

function ProductsCard({
  error,
  loading,
  onShareProduct,
  products,
}: {
  error: string | null;
  loading: boolean;
  onShareProduct: (product: Product) => void;
  products: Product[];
}) {
  const live = products.filter((product) => product.status === "live").length;
  const low = products.filter((product) => product.status === "low").length;
  const draft = products.filter((product) => product.status === "draft").length;
  const physical = products.filter((product) => product.type === "Physical").length;
  const digital = products.filter((product) => product.type === "Digital").length;
  const service = products.filter((product) => product.type === "Service").length;
  const caption = loading
    ? "Loading connected products"
    : error
      ? "Products could not be loaded"
      : `${products.length} products - ${live} live - ${draft} drafts - ${low} low stock`;
  const visibleProducts = products.slice(0, 5);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">
            Products
          </div>
          <div className="mt-0.5 text-[11.5px] text-[#6e6e76]">
            {caption}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill active>All</Pill>
          <Pill className="hidden sm:inline-flex">
            Physical - {physical}
          </Pill>
          <Pill className="hidden sm:inline-flex">
            Digital - {digital}
          </Pill>
          {service > 0 && (
            <Pill className="hidden sm:inline-flex">
              Service - {service}
            </Pill>
          )}
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
        {loading ? (
          <CardLoadingRows count={5} />
        ) : error ? (
          <CardEmptyState
            actionHref="/products"
            actionLabel="Open products"
            title="Unable to load products"
          />
        ) : visibleProducts.length ? (
          visibleProducts.map((product, index) => (
            <ProductRow
              key={product.id}
              onShareProduct={onShareProduct}
              product={product}
              withBorder={index < visibleProducts.length - 1}
            />
          ))
        ) : (
          <CardEmptyState
            actionHref="/products/create"
            actionLabel="New product"
            title="No products yet"
          />
        )}
      </div>
      <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.04)] px-5 py-3">
        <div className="text-[11.5px] text-[#6e6e76]">
          Showing {visibleProducts.length} of {products.length} products
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

function CardLoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[1.35fr_1.45fr_1fr_0.5fr]"
          style={{
            borderBottom:
              index < count - 1 ? `1px solid ${hair2}` : "none",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-full bg-[#f1f1ef]" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-[#f1f1ef]" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-[#f1f1ef]" />
            </div>
          </div>
          <div className="hidden h-3 w-36 animate-pulse rounded bg-[#f1f1ef] sm:block" />
          <div className="h-3 w-20 animate-pulse rounded bg-[#f1f1ef]" />
          <div className="hidden h-3 w-10 animate-pulse rounded bg-[#f1f1ef] sm:block" />
        </div>
      ))}
    </>
  );
}

function CardEmptyState({
  actionHref,
  actionLabel,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <div className="text-[13px] font-semibold text-[#6e6e76]">{title}</div>
      <Pill asChild>
        <Link href={actionHref}>
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Pill>
    </div>
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
  const isInPerson = isInPersonCheckoutMode(order.checkoutMode);
  const href = order.detailId
    ? `/order/${encodeURIComponent(order.detailId)}?tab=payments`
    : "/order";

  return (
    <Link
      href={href}
      className="grid grid-cols-[1.25fr_auto_auto] items-center gap-3 px-5 py-3.5 text-[#0a0a0c] no-underline transition hover:bg-[#fafaf8] sm:grid-cols-[1.35fr_1.45fr_1fr_0.5fr]"
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
      <div className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-[#6e6e76] sm:flex">
        <span className="truncate">{order.product}</span>
        {isInPerson && (
          <StatusPill fg={muted} bg="rgba(0,0,0,0.05)">
            In-person
          </StatusPill>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {order.chain === "USDC" ? <UsdcGlyph size={14} /> : <SolGlyph size={14} />}
        <Mono className="text-[13px] font-semibold">
          {formatCurrency(order.amount)}
        </Mono>
        <StatusPill fg={status.fg} bg={status.bg}>
          {order.status}
        </StatusPill>
      </div>
      <Mono className="text-right text-[11px] text-[#6e6e76]">
        {order.when}
      </Mono>
    </Link>
  );
}

function ProductRow({
  onShareProduct,
  product,
  withBorder,
}: {
  onShareProduct: (product: Product) => void;
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
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] text-sm font-semibold"
          style={{ background: product.swatch }}
        >
          {product.image ? (
            <Image
              alt={product.name}
              height={38}
              src={product.image}
              style={{ height: 38, objectFit: "cover", width: 38 }}
              width={38}
            />
          ) : (
            product.glyph
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-[-0.01em]">
            {product.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusPill fg={status.fg} bg={status.bg}>
              {product.statusLabel || status.label}
            </StatusPill>
            <Mono className="text-[11px] text-[#6e6e76]">
              {product.sales} sold
            </Mono>
          </div>
        </div>
      </div>
      <Mono className="text-[13px] font-semibold">
        {formatCurrency(product.price)}
      </Mono>
      <Link
        href="/products"
        aria-label="Manage product"
        className="hidden h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#0a0a0c] transition hover:bg-[#f4f4f2] sm:flex"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      <IconButton
        label="Share product"
        className="hidden sm:flex"
        onClick={() => onShareProduct(product)}
      >
        <Share2 className="h-3.5 w-3.5" />
      </IconButton>
      <Link
        href="/products"
        aria-label="More product actions"
        className="hidden h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[#0a0a0c] transition hover:bg-[#f4f4f2] sm:flex"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Link>
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
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  asChild?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const classes = `inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold leading-none tracking-normal transition [&_svg]:shrink-0 ${className}`;
  const style = active
    ? { backgroundColor: ink, borderColor: ink, color: "#fff" }
    : { backgroundColor: "#fff", borderColor: hair, color: ink };
  const buttonStyle = disabled
    ? { ...style, cursor: "not-allowed", opacity: 0.45 }
    : style;

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      style?: React.CSSProperties;
    }>;

    return cloneElement(child, {
      className: `${classes} ${child.props.className ?? ""}`.trim(),
      style: { ...child.props.style, ...style },
    });
  }

  if (asChild) {
    return (
      <span className={classes} style={style}>
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={buttonStyle}
    >
      {children}
    </button>
  );
}

function Avatar({
  alt = "Avatar",
  children,
  size = "sm",
  src,
}: {
  alt?: string;
  children: React.ReactNode;
  size?: "sm" | "lg";
  src?: string;
}) {
  const pixelSize = size === "lg" ? 64 : 28;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe6ef] font-semibold tracking-[-0.01em] ${
        size === "lg" ? "h-16 w-16 text-2xl" : "h-7 w-7 text-[11px]"
      }`}
    >
      {src ? (
        <Image
          alt={alt}
          className="h-full w-full object-cover"
          height={pixelSize}
          src={src}
          width={pixelSize}
        />
      ) : (
        children
      )}
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

function WalletReady({ ready }: { ready: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#6e6e76] sm:inline-flex">
      <span
        className="h-1.5 w-1.5 rounded-full shadow-[0_0_0_3px_rgba(25,169,116,0.10)]"
        style={{ backgroundColor: ready ? positive : amber }}
      />
      {ready ? "Wallet ready" : "Connect wallet"}
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
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
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

function formatSwopIdDisplay(slug: string) {
  const normalized = normalizeSwopIdSlug(slug);

  const handle = normalized || "swop";
  const displayHandle = handle
    .split(/([._-])/)
    .map(formatSwopIdPart)
    .join("");

  return `${displayHandle}.Swop.ID`;
}

function normalizeSwopIdSlug(value?: string | null) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^\$/, "");

  if (/^swop\.id$/i.test(cleaned)) return "";

  const normalized = cleaned.replace(/\.swop\.id$/i, "");

  return /^swop$/i.test(normalized) ? "" : normalized;
}

function formatSwopIdPart(part: string) {
  if (!/^[a-z0-9]+$/i.test(part)) return part;
  if (part.toLowerCase() === "astrobot") return "AstroBot";

  return part.charAt(0).toUpperCase() + part.slice(1);
}

function getPrimarySmartsite(user: ReturnType<typeof useUser>["user"]) {
  if (!user?.microsites?.length) return null;

  const primaryId = getRecordId(user.primaryMicrosite);
  return (
    user.microsites.find((microsite: any) => {
      const micrositeId = getRecordId(microsite);
      return primaryId && micrositeId === primaryId;
    }) ??
    user.microsites.find((microsite: any) => microsite?.primary === true) ??
    user.microsites[0] ??
    null
  );
}

function getRecordId(record: unknown) {
  if (typeof record === "string") return record;
  if (!record || typeof record !== "object") return "";

  const maybeRecord = record as { _id?: unknown; id?: unknown };
  if (typeof maybeRecord._id === "string") return maybeRecord._id;
  if (typeof maybeRecord.id === "string") return maybeRecord.id;

  return "";
}

function resolveSmartsiteAvatar(profilePic: unknown) {
  const value =
    typeof profilePic === "number"
      ? String(profilePic)
      : typeof profilePic === "string"
        ? profilePic.trim()
        : "";

  if (!value) return "";
  if (value.startsWith("/") || isUrl(value)) return value;

  return `/images/user_avator/${value}@3x.png`;
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

function buildModuleTiles({
  checkoutIntents,
  loading,
  orders,
  products,
  profileStats,
  summary,
}: DashboardData & {
  loading: boolean;
  profileStats: { followers: number; following: number };
}): Tile[] {
  const live = products.filter((product) => product.status === "live").length;
  const draft = products.filter((product) => product.status === "draft").length;
  const low = products.filter((product) => product.status === "low").length;
  const orderCount = summary?.totals.orders ?? orders.length;
  const checkoutVolume = checkoutIntents.reduce(
    (total, intent) =>
      total + toFiniteNumber(intent.fees?.merchantReceivesAmount ?? intent.amount.value),
    0,
  );
  const activeCheckoutCount = checkoutIntents.filter((intent) =>
    ["active", "pending_payment"].includes(intent.status),
  ).length;

  const loadingValue = loading ? "..." : undefined;

  return [
    {
      label: "Products",
      value: loadingValue ?? products.length.toLocaleString(),
      sub: loading
        ? "syncing"
        : `${live} live${draft ? ` - ${draft} drafts` : ""}${low ? ` - ${low} low` : ""}`,
      href: "/products",
      swatch: "#F2E0DC",
      icon: Package,
    },
    {
      label: "Orders",
      value: loadingValue ?? orderCount.toLocaleString(),
      sub: loading ? "syncing" : `${orders.length} recent payments`,
      href: "/order",
      swatch: "#E8DFD0",
      icon: ReceiptText,
    },
    {
      label: "Checkout",
      value: loadingValue ?? formatCompactCurrency(checkoutVolume),
      sub: loading
        ? "syncing"
        : checkoutIntents.length
          ? `${activeCheckoutCount} active - ${checkoutIntents.length} recent`
          : "QR ready",
      href: "/dashboard/checkout",
      swatch: "#D7EAD9",
      icon: ShoppingBag,
      accent: amber,
    },
    {
      label: "Leads",
      value: loadingValue ?? formatCount(profileStats.followers),
      sub: "followers",
      href: "/dashboard/analytics",
      swatch: "#F4E1E1",
      icon: Users,
    },
    {
      label: "Analytics",
      actionLabel: "View",
      sub: "taps and visits",
      href: "/dashboard/analytics",
      swatch: "#D6E4F2",
      icon: BarChart3,
    },
    {
      label: "Map",
      actionLabel: "Open",
      sub: "live connections",
      href: "/?tab=map",
      swatch: "#DCEAF7",
      icon: Map,
    },
    {
      label: "Blinks",
      actionLabel: "Open",
      sub: "wallet tools",
      href: "/wallet#blinks",
      swatch: "#DCE7E2",
      icon: Link2,
    },
    {
      label: "Messages",
      actionLabel: "Chat",
      sub: "Astro ready",
      href: "/dashboard/chat?astro=1",
      swatch: "#EAE2F4",
      icon: MessageSquare,
    },
  ];
}

function mapDashboardProduct(
  item: MarketplaceProduct,
  sales?: ProductSalesRow,
): Product {
  const name = item.title || "Untitled product";
  const stock = Number(item.inventory?.available);
  const status = getProductStatus(item);

  return {
    id: item._id || `product-${slugify(name)}`,
    name,
    type: getMarketplaceProductDisplayType(item.productType),
    price: toFiniteNumber(item.price?.amount),
    sales: toFiniteNumber(sales?.units),
    revenue: toFiniteNumber(sales?.revenue),
    currency: (item.price?.currency || "USDC").toUpperCase(),
    status,
    statusLabel: getProductStatusLabel(status, stock),
    glyph: getProductGlyph(name),
    swatch: swatchFor(name),
    image: item.primaryImage || item.images?.[0]?.url || undefined,
  };
}

function mapDashboardOrder(row: MarketplaceOrder): Order {
  return {
    id: row.publicReference || row.orderId || shortAddress(row._id),
    detailId: row._id || row.orderId,
    customer: row.buyer?.name || row.buyer?.email || "Customer",
    product: getMarketplaceOrderTitle(row),
    amount: toFiniteNumber(row.financial?.totalCost),
    chain:
      String(row.financial?.currency || row.payment?.currency || "USDC").toUpperCase() ===
      "SOL"
        ? "SOL"
        : "USDC",
    status: getOrderStatus(getMarketplaceOrderDelivery(row)),
    when: formatRelativeTime(row.createdAt || row.updatedAt || ""),
    checkoutMode: row.checkoutMode,
  };
}

function getProductStatus(item: MarketplaceProduct): ProductStatus {
  const rawStatus = String(item.status ?? "").toLowerCase();
  if (rawStatus.includes("draft")) {
    return "draft";
  }

  const stock = Number(item.inventory?.available);
  if (Number.isFinite(stock) && stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
    return "low";
  }

  return "live";
}

function getProductStatusLabel(status: ProductStatus, stock: number) {
  if (status === "low" && Number.isFinite(stock)) {
    return `Low - ${stock}`;
  }

  return productStatusStyle[status].label;
}

function getOrderStatus(delivery: string): OrderStatus {
  const normalized = delivery.toLowerCase();
  if (normalized.includes("refund") || normalized.includes("cancel")) {
    return "Refunded";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("transit")
  ) {
    return "Pending";
  }

  return "Paid";
}

function summarizeMarketplaceOrders(orders: MarketplaceOrder[]): SalesSummary {
  const perProduct: Record<string, ProductSalesRow> = {};
  let units = 0;
  let revenue = 0;

  for (const order of orders) {
    if (order.payment?.status !== "completed") continue;
    revenue += toFiniteNumber(order.financial?.totalCost);
    for (const item of order.lineItems || []) {
      const productId = String(item.productId || "");
      if (!productId) continue;
      const quantity = toFiniteNumber(item.quantity);
      const itemRevenue = toFiniteNumber(
        item.totalAmount ?? item.unitAmount * quantity,
      );
      units += quantity;
      perProduct[productId] = {
        productId,
        units: (perProduct[productId]?.units || 0) + quantity,
        revenue: (perProduct[productId]?.revenue || 0) + itemRevenue,
        orderCount: (perProduct[productId]?.orderCount || 0) + 1,
      };
    }
  }

  return {
    perProduct: Object.values(perProduct),
    totals: {
      units,
      revenue,
      templates: Object.keys(perProduct).length,
      orders: orders.filter((order) => order.payment?.status === "completed").length,
    },
  };
}

function getMarketplaceOrderTitle(order: MarketplaceOrder) {
  const items = order.lineItems || [];
  const first = items[0]?.productSnapshot?.title || "Order";
  return items.length > 1 ? `${first} + ${items.length - 1} more` : first;
}

function getMarketplaceOrderDelivery(order: MarketplaceOrder) {
  if (order.payment?.status === "refunded") return "Refunded";
  if (
    order.payment?.status === "cancelled" ||
    order.status === "cancelled" ||
    order.status === "failed" ||
    order.settlement?.status === "failed"
  ) {
    return "Cancel";
  }
  if (order.settlement?.status === "released" || order.status === "completed") {
    return "Paid";
  }
  if (["shipped", "out_for_delivery"].includes(order.fulfillment?.status || "")) {
    return "In transit";
  }
  if (order.payment?.status === "completed") return "Processing";
  return "Pending";
}

function toFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: number) {
  const numeric = toFiniteNumber(value);
  const hasCents = Math.abs(numeric % 1) > 0.001;
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: hasCents ? 2 : 0,
    minimumFractionDigits: hasCents ? 2 : 0,
    style: "currency",
  }).format(numeric);
}

function formatCompactCurrency(value: number) {
  const numeric = toFiniteNumber(value);
  if (numeric >= 1000000) {
    return `$${(numeric / 1000000).toFixed(1)}m`;
  }
  if (numeric >= 1000) {
    return `$${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}k`;
  }

  return formatCurrency(numeric);
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "now";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function shortAddress(address: string) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function getProductGlyph(name: string) {
  return name.match(/[a-z0-9]/i)?.[0]?.toUpperCase() ?? "P";
}

function swatchFor(value: string) {
  const palette = [
    "#F2E0DC",
    "#D6E4F2",
    "#EAE2F4",
    "#FBE7C6",
    "#D7EAD9",
    "#E8DFD0",
  ];
  return palette[hashString(value) % palette.length];
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "product"
  );
}
