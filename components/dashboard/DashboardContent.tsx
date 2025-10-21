'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';
import ProfileHeader from './profile-header';
// import CashflowChart from "./cashflow-chart";
import DashboardAnalytics from './analytics';
import WalletBalanceChart from './walletBalanceChart';
import { useQuery } from '@tanstack/react-query';
import { getFollowers, followersQueryKey } from '@/services/followers-service';
// import CashflowChart from "./walletBalanceChart";
// import TestChart from "./test-chart";

export default function DashboardContent() {
  const { user, loading, error, accessToken } = useUser();

  // Fetch followers with pagination (page 1, limit 20)
  const {
    data: followersData,
    isLoading: followersLoading,
    error: followersError,
  } = useQuery({
    queryKey: followersQueryKey(user?._id || '', 1, 20),
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
    console.log('Followers data:', {
      total: followersData.data.totalFollowers,
      source: followersData.data.source,
      count: followersData.data.followers.length,
      pagination: followersData.data.pagination,
    });
  }

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  return (
    <div className="">
      <ProfileHeader />

      {/* CashflowChart */}
      <WalletBalanceChart />

      {/* Followers Section */}
      {followersLoading ? (
        <div className="my-6 p-6 bg-white rounded-xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : followersData && followersData.data.totalFollowers > 0 ? (
        <div className="my-6 p-6 bg-white rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Followers ({followersData.data.totalFollowers})
            </h2>
            {followersData.data.source && (
              <span className="text-sm text-gray-500 capitalize">
                Source: {followersData.data.source}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {followersData.data.followers.slice(0, 8).map((follower) => (
              <div
                key={follower.account._id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow"
              >
                <img
                  src={follower.account.profilePic || '/default-avatar.png'}
                  alt={follower.account.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {follower.account.name}
                  </p>
                  {follower.account.username && (
                    <p className="text-xs text-gray-500 truncate">
                      @{follower.account.username}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {followersData.data.pagination.totalPages > 1 && (
            <div className="mt-4 text-center">
              <button className="text-sm text-blue-600 hover:underline">
                View all {followersData.data.totalFollowers} followers
              </button>
            </div>
          )}
        </div>
      ) : null}

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
