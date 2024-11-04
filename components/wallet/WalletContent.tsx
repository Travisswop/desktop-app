'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';
import ProfileHeader from './profile-header';
import CashflowChart from './cashflow-chart';
import MessageBox from './message-interface';
import Tokens from './token-list';
import NFTSlider from './nft-list';
import TransactionList from './transaction-list';

export default function WalletContent() {
  const { user, loading, error } = useUser();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }
  return (
    <div className="p-8">
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

      <div className="grid grid-cols-2 gap-4 my-6">
        <CashflowChart />
        <MessageBox />
      </div>
      <div className="grid grid-cols-2 gap-4 my-6">
        <Tokens />
        <div>
          <NFTSlider />
          <TransactionList />
        </div>
      </div>
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
