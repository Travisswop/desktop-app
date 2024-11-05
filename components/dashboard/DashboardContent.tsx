'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';
import ProfileHeader from './profile-header';
import CashflowChart from './cashflow-chart';

export default function DashboardContent() {
  const { user, loading, error } = useUser();
  console.log('🚀 ~ DashboardContent ~ user:', user);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <ProfileHeader
        name={user?.name || 'Your Name'}
        username={'Travis.Swop.ID'}
        location={user?.address || ''}
        followers={user?.connections.followers.length || 0}
        following={user?.connections.following.length || 0}
        messages={0}
        orders={40}
        points={31234}
        imageUrl={user?.profilePic || '/images/avatar.png'}
      />

      <CashflowChart />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
