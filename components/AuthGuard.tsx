'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/login');
    }
  }, [ready, authenticated, router]);

  // While Privy is initializing, render nothing to avoid a flash
  if (!ready) return null;

  // Not authenticated – redirect is in flight, render nothing
  if (!authenticated) return null;

  return <>{children}</>;
}
