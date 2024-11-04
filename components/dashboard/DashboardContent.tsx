'use client';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '../ui/skeleton';

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
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Welcome to your Dashboard
      </h1>
      <p className="mb-4">
        Hello, {user?.name ? user.name : 'User'}!
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard title="Total Users" value="1,234" />
        <DashboardCard title="Active Projects" value="56" />
        <DashboardCard title="Revenue" value="$12,345" />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-3xl font-bold">{value}</p>
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
