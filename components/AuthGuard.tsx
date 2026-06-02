'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const AUTH_CACHE_KEY = 'swop:last-authenticated-at';
const AUTH_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hasRecentAuthenticatedSession() {
  if (typeof window === 'undefined') return false;

  const cachedAt = Number(window.localStorage.getItem(AUTH_CACHE_KEY));
  return (
    Number.isFinite(cachedAt) &&
    Date.now() - cachedAt < AUTH_CACHE_MAX_AGE_MS
  );
}

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [hasCachedSession, setHasCachedSession] = useState(false);

  useEffect(() => {
    setHasCachedSession(hasRecentAuthenticatedSession());
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (authenticated) {
      window.localStorage.setItem(AUTH_CACHE_KEY, String(Date.now()));
      setHasCachedSession(true);
      return;
    }

    window.localStorage.removeItem(AUTH_CACHE_KEY);
    setHasCachedSession(false);
    router.replace('/login');
  }, [ready, authenticated, router]);

  useEffect(() => {
    const handleOnline = () => {
      if (authenticated) {
        window.localStorage.setItem(AUTH_CACHE_KEY, String(Date.now()));
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [authenticated]);

  if (!ready && hasCachedSession) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
