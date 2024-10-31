'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuth(props: P) {
    const { authenticated, ready } = usePrivy();
    const router = useRouter();

    useEffect(() => {
      if (ready && !authenticated) {
        router.push('/login');
      }
    }, [authenticated, ready, router]);

    if (!ready) {
      return <LoginSkeleton />;
    }

    if (!authenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

function LoginSkeleton() {
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
