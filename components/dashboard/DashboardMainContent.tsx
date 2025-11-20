"use client";
import { useUser } from "@/lib/UserContext";
import { Skeleton } from "../ui/skeleton";
import DashboardAnalytics from "./analytics";
import { useQuery } from "@tanstack/react-query";
import { getFollowers, followersQueryKey } from "@/services/followers-service";
import PortfolioChart, { PortfolioAsset } from "./PortfolioChart";
import OrdersStats from "./OrderSummery";
import Insights from "./Insights";
import BalanceChart from "./BalanceChart";
import NavigationHub from "./NavigationTab";
import DashboardContentPreview from "./ContentPreview";
import DashboardChatPreview from "./ChatPreview";
import RewardsCardPreview from "./RewardPreview";
import TransactionsListPreview from "./TransactionPreview";
import QRCodePreview from "./QrcodePreview";
import { usePrivy, useWallets, useSolanaWallets } from "@privy-io/react-auth";
import { useMemo } from "react";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useRouter } from "next/navigation";

// Token colors mapping for consistent visual representation
const TOKEN_COLORS: Record<string, string> = {
  SOL: "#10b981",
  SWOP: "#d1fae5",
  ETH: "#047857",
  BTC: "#f59e0b",
  USDC: "#2563eb",
  USDT: "#22c55e",
  BNB: "#eab308",
  XRP: "#06b6d4",
  MATIC: "#8b5cf6",
  POL: "#8b5cf6",
  default: "#6b7280",
};

const getTokenColor = (symbol: string): string => {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.default;
};

export default function DashboardMainContent() {
  const { user, loading, error, accessToken } = useUser();
  const { wallets: ethWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const router = useRouter();

  console.log("user", user);

  // Get wallet addresses
  const solWalletAddress = useMemo(() => {
    return solanaWallets?.find(
      (w) =>
        w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [solanaWallets]);

  const evmWalletAddress = useMemo(() => {
    return ethWallets?.find(
      (w) =>
        w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [ethWallets]);

  // Fetch token data
  const {
    tokens,
    loading: tokenLoading,
  } = useMultiChainTokenData(solWalletAddress, evmWalletAddress, [
    "SOLANA",
    "ETHEREUM",
    "POLYGON",
    "BASE",
  ]);

  // Fetch followers with pagination (page 1, limit 20)
  const {
    data: followersData,
    isLoading: followersLoading,
    error: followersError,
  } = useQuery({
    queryKey: followersQueryKey(user?._id || "", 1, 20),
    queryFn: () =>
      getFollowers({
        userId: user!._id,
        page: 1,
        limit: 20,
        accessToken: accessToken || undefined,
      }),
    enabled: !!user?._id, // Only fetch when user ID is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  // Log followers data for debugging
  if (followersData) {
    console.log("Followers data:", {
      total: followersData.data.totalFollowers,
      source: followersData.data.source,
      count: followersData.data.followers.length,
      pagination: followersData.data.pagination,
      followers: followersData.data.followers,
    });
  }

  if (followersError) {
    console.error("Error fetching followers:", followersError);
  }

  // Transform tokens into portfolio assets
  const portfolioData = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return {
        assets: [],
        totalBalance: "0.00",
      };
    }

    // Calculate token values and filter out zero balances
    const assetsWithValue = tokens
      .map((token) => {
        const balance = parseFloat(token.balance || "0");
        const price = parseFloat(token.marketData?.price || "0");
        const value = balance * price;

        return {
          name: token.symbol,
          value: value,
          color: getTokenColor(token.symbol),
          amount: `${balance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })} ${token.symbol}`,
        };
      })
      .filter((asset) => asset.value > 0) // Only include tokens with positive value
      .sort((a, b) => b.value - a.value); // Sort by value descending

    // Calculate total balance
    const total = assetsWithValue.reduce(
      (sum, asset) => sum + asset.value,
      0
    );

    // Take top 5 tokens and group rest as "Others"
    const topAssets = assetsWithValue.slice(0, 5);
    const otherAssets = assetsWithValue.slice(5);

    const assets: PortfolioAsset[] = [...topAssets];

    if (otherAssets.length > 0) {
      const othersValue = otherAssets.reduce(
        (sum, asset) => sum + asset.value,
        0
      );
      assets.push({
        name: "Others",
        value: othersValue,
        color: "#94a3b8",
        amount: `${otherAssets.length} tokens`,
      });
    }

    return {
      assets,
      totalBalance: total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [tokens]);

  const handleViewPortfolio = () => {
    console.log("Navigate to full portfolio view");
    // router.push('/portfolio/details');
  };

  const handleViewClick = () => {
    console.log("View orders clicked");
    // router.push('/orders');
  };
  const handleViewInsightsClick = () => {
    console.log("View insights clicked");
    // router.push('/orders');
  };

  const customTransactions = [
    {
      id: "1",
      userName: "HawkTuah",
      userImage: "https://i.pravatar.cc/150?img=12",
      status: "transition",
      walletAddress: "0x3rf....56hgj",
      date: "Jun 22, 2021",
      timestamp: "1/2/23 12:22PM",
      amount: "582.38",
      cryptoAmount: "82.78SOL",
    },
    {
      id: "2",
      userName: "HawkTuah",
      userImage: "https://i.pravatar.cc/150?img=12",
      status: "transition",
      walletAddress: "0x3rf....56hgj",
      date: "Jun 22, 2021",
      timestamp: "1/2/23 12:22PM",
      amount: "582.38",
      cryptoAmount: "82.78SOL",
    },
    {
      id: "3",
      userName: "CryptoWhale",
      userImage: "https://i.pravatar.cc/150?img=8",
      status: "completed",
      walletAddress: "0x7ab....92def",
      date: "Jun 21, 2021",
      timestamp: "1/1/23 10:15AM",
      amount: "1,250.00",
      cryptoAmount: "156.25SOL",
    },
  ];

  return (
    <div className="space-y-4">
      {/* <ProfileHeader /> */}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* CashflowChart */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-white rounded-xl">
            {/* <WalletBalanceChart /> */}
            <BalanceChart currency="$" />
          </div>
          <div className="bg-white p-5 rounded-xl">
            <Insights
              totalTaps={{
                value: user ? user?.tap.length : 0,
                period: "All Time",
                trend: 24,
              }}
              leads={{
                value: user ? user?.subscribers.length : 0,
                period: "30 days",
                trend: 24,
              }}
              connections={{
                value: user ? user?.connectionIds.length : 0,
                period: "All Time",
                trend: 24,
              }}
              onViewClick={handleViewInsightsClick}
            />
          </div>
        </div>
        <div className="flex-1  rounded-lg flex flex-col gap-3">
          <div className="bg-white flex-1 rounded-xl">
            {tokenLoading ? (
              <PortfolioChartSkeleton />
            ) : portfolioData.assets.length > 0 ? (
              <PortfolioChart
                assets={portfolioData.assets}
                balance={`$${portfolioData.totalBalance}`}
                title="Portfolio"
                viewAction={() => router.push("/wallet")}
              />
            ) : (
              <PortfolioEmptyState />
            )}
          </div>
          <div className="bg-white flex-1 rounded-xl">
            {/* <OrdersStats
              totalMints={1827}
              totalRevenue={1002.33}
              inEscrow={200.34}
              closedOrders={20}
              openOrders={10}
              disputes={0}
            /> */}
            <OrdersStats />
          </div>
        </div>
      </div>

      <NavigationHub />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white p-5 rounded-xl">
          {/* Chat Preview Section */}
          <DashboardChatPreview />
        </div>
        <div className="flex-1 bg-white p-5 rounded-xl">
          <DashboardContentPreview />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white p-5 rounded-xl">
          <TransactionsListPreview transactions={customTransactions} />
        </div>
        <div className="flex-1 bg-white p-5 rounded-xl">
          <RewardsCardPreview />
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl w-full sm:w-[80%] lg:w-1/3">
        <QRCodePreview />
      </div>

      {/* <TestChart /> */}
      {/* <DashboardAnalytics data={user} /> */}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="">
      {/* Profile Header Skeleton */}
      <ProfileHeaderSkeleton />

      {/* Cashflow Chart Skeleton */}
      <div className="my-6 p-6 bg-white rounded-xl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Analytics Skeleton */}
      <AnalyticsSkeleton />
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Avatar and Info */}
        <div className="flex flex-col items-center md:items-start gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="text-center md:text-left">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Social Stats */}
        <div className="flex gap-8">
          <div className="text-center">
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-4 ml-0 md:ml-auto">
          <div className="min-w-[160px]">
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="min-w-[160px]">
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="min-w-[160px]">
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 bg-white rounded-xl p-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Recent Leads */}
          <div>
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Card Skeleton */}
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>

          {/* QR Code Skeleton */}
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioChartSkeleton() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="pt-6">
        <div className="flex items-center justify-center gap-8">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioEmptyState() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-lg font-semibold">Portfolio</h2>
      </div>
      <div className="pt-6 pb-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">No tokens found</p>
        <p className="text-sm text-gray-500">
          Connect your wallet to view your portfolio.
        </p>
      </div>
    </div>
  );
}
