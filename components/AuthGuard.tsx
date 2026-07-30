'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { safeLocalStorage } from '@/lib/browserStorage';

const AUTH_CACHE_KEY = 'swop:last-authenticated-at';
const AUTH_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hasSwopBackendSession() {
  return Boolean(Cookies.get('user-id') && Cookies.get('access-token'));
}

function hasRecentAuthenticatedSession() {
  if (hasSwopBackendSession()) return true;

  const cachedAt = Number(safeLocalStorage.getItem(AUTH_CACHE_KEY));
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
      safeLocalStorage.setItem(AUTH_CACHE_KEY, String(Date.now()));
      setHasCachedSession(true);
      return;
    }

    // Privy is the source of truth once it has initialised. The Swop backend
    // cookies used to count as a session here, but they never expire on their
    // own — so a user returning after their Privy session lapsed kept the
    // cookies, skipped this redirect, and then hit `if (!authenticated) return
    // null` below: a permanently blank page with no route back to /login.
    // Clear the stale session and send them to log in again.
    safeLocalStorage.removeItem(AUTH_CACHE_KEY);
    setHasCachedSession(false);
    Cookies.remove('access-token');
    Cookies.remove('user-id');
    router.replace('/login');
  }, [ready, authenticated, router]);

  useEffect(() => {
    const handleOnline = () => {
      if (authenticated) {
        safeLocalStorage.setItem(AUTH_CACHE_KEY, String(Date.now()));
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
