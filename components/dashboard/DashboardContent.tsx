"use client";
import { useUser } from "@/lib/UserContext";
import { Skeleton } from "../ui/skeleton";
import ProfileHeader from "./profile-header";
// import CashflowChart from "./cashflow-chart";
import DashboardAnalytics from "./analytics";
import WalletBalanceChart from "./walletBalanceChart";
// import CashflowChart from "./walletBalanceChart";
// import TestChart from "./test-chart";

export default function DashboardContent() {
  const { user, loading, error } = useUser();
  console.log("🚀 ~ DashboardContent ~ user:", user);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  return (
    <div className="">
      <ProfileHeader />

      {/* CashflowChart */}
      <WalletBalanceChart />

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
