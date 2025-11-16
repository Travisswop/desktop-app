"use client";
import { useUser } from "@/lib/UserContext";
import { Skeleton } from "../ui/skeleton";
import ProfileHeader from "./profile-header";
import DashboardAnalytics from "./analytics";
import WalletBalanceChart from "./walletBalanceChart";
import { useQuery } from "@tanstack/react-query";
import { getFollowers, followersQueryKey } from "@/services/followers-service";
import PortfolioChart from "./PortfolioChart";
import OrdersStats from "./OrderSummery";
import Insights from "./Insights";
import BalanceChart from "./BalanceChart";
import NavigationHub from "./NavigationTab";

export default function DashboardMainContent() {
  const { user, loading, error, accessToken } = useUser();

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

  const assets = [
    { name: "ETH", value: 12500, color: "#22c55e", amount: "5.2 ETH" },
    { name: "SOL", value: 9800, color: "#166534", amount: "450 SOL" },
    { name: "SWOP", value: 6004.59, color: "#bbf7d0", amount: "12.5K SWOP" },
  ];

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

  const balanceData = [
    { time: "00:00", value: 12394 },
    { time: "02:00", value: 13200 },
    { time: "04:00", value: 14800 },
    { time: "06:00", value: 16500 },
    { time: "08:00", value: 18200 },
    { time: "10:00", value: 19800 },
    { time: "12:00", value: 20893 },
    { time: "14:00", value: 22100 },
    { time: "16:00", value: 23400 },
    { time: "18:00", value: 24800 },
    { time: "20:00", value: 26200 },
    { time: "22:00", value: 27500 },
    { time: "24:00", value: 28304.59 },
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
                value: 34,
                period: "30 days",
                trend: 24,
              }}
              leads={{
                value: 34,
                period: "30 days",
                trend: 24,
              }}
              connections={{
                value: 34,
                period: "30 days",
                trend: 24,
              }}
              onViewClick={handleViewInsightsClick}
            />
          </div>
        </div>
        <div className="flex-1  rounded-lg flex flex-col gap-3">
          <div className="bg-white flex-1 rounded-xl">
            <PortfolioChart
              assets={assets}
              balance="$28,30.59"
              title="Portfolio"
              viewAction={handleViewPortfolio}
            />
          </div>
          <div className="bg-white flex-1 rounded-xl">
            <OrdersStats
              totalMints={1827}
              totalRevenue={1002.33}
              inEscrow={200.34}
              closedOrders={20}
              openOrders={10}
              disputes={0}
              onViewClick={handleViewClick}
            />
          </div>
        </div>
      </div>

      <NavigationHub />

      {/* <TestChart /> */}
      <DashboardAnalytics data={user} />
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
