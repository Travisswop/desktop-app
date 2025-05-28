'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export interface UserData {
  _id: string;
  address?: string;
  apt?: string;
  bio?: string;
  countryCode?: string;
  countryFlag?: string;
  dob?: string;
  email: string;
  isPremiumUser?: boolean;
  mobileNo?: string;
  name: string;
  profilePic?: string;
  microsites?: any[];
  subscribers: any[];
  followers: number;
  following: number;
  ensName?: string;
  primaryMicrosite?: string;
}

export interface UserContextType {
  user: UserData | null;
  primaryMicrosite?: string;
  accessToken: string | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  clearCache: () => void;
}

const UserContext = createContext<any>({
  user: null,
  accessToken: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
  clearCache: () => {},
});

const clearAllCookies = () => {
  const cookies = [
    'privy-token',
    'privy-id-token',
    'privy-refresh-token',
    'access-token',
    'user-id',
  ];

  cookies.forEach((cookie) => {
    document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict`;
  });
};

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  console.log('🚀 ~ pathname:', pathname);
  const router = useRouter();
  const { user: privyUser, ready, logout } = usePrivy();
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Add refs to track fetch state and prevent infinite loops
  const isFetchingRef = useRef(false);
  const lastFetchedEmailRef = useRef<string | null>(null);

  // Memoize email extraction to prevent re-renders
  const email = useMemo(() => {
    if (!privyUser) return null;
    return (
      privyUser.google?.email ||
      privyUser.email?.address ||
      privyUser.linkedAccounts?.find(
        (account) => account.type === 'email'
      )?.address ||
      privyUser.linkedAccounts?.find(
        (account) => account.type === 'google_oauth'
      )?.email
    );
  }, [privyUser]);

  // Memoize excluded routes to prevent re-creation
  const excludedRoutes = useMemo(
    () => [
      '/onboard',
      '/login',
      '/signup',
      '/welcome',
      '/debug-privy',
    ],
    []
  );

  const fetchUserData = useCallback(
    async (userEmail: string) => {
      if (isFetchingRef.current || !userEmail) {
        return;
      }

      isFetchingRef.current = true;
      lastFetchedEmailRef.current = userEmail;
      setLoading(true);

      // Set a timeout for the fetch request
      const timeoutId = setTimeout(() => {
        isFetchingRef.current = false;
        setLoading(false);
      }, 10000); // 10 seconds timeout

      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const abortTimeoutId = setTimeout(
          () => controller.abort(),
          8000
        );

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${userEmail}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(abortTimeoutId);
        clearTimeout(timeoutId);

        if (!response.ok) {
          // More detailed logging
          console.error('Fetch user data response:', {
            status: response.status,
            statusText: response.statusText,
            currentPathname: pathname,
          });

          if (response.status === 404) {
            // Only redirect to onboard if not already on onboard or login page
            if (pathname !== '/onboard' && pathname !== '/login') {
              router.push('/onboard');
            }
            return;
          }

          // Handle session expiration (401/403)
          if (response.status === 401 || response.status === 403) {
            console.log(
              'Session expired, clearing user data and redirecting to login'
            );
            // Clear user session and redirect to login
            clearAllCookies();
            setUser(null);
            setAccessToken(null);
            await logout();
            // Only redirect if not on onboard page to prevent conflicts
            if (pathname !== '/onboard') {
              router.push('/login');
            }
            return;
          }

          // For other non-excluded routes, throw an error
          if (
            pathname &&
            !excludedRoutes.some((route) =>
              pathname.startsWith(route)
            )
          ) {
            throw new Error(
              `Failed to fetch user data: ${response.statusText}`
            );
          }

          // For excluded routes with non-404 errors, just return without throwing
          return;
        }

        const data = await response.json();

        const { user: userData, token } = data;

        if (!userData || !token) {
          throw new Error('Invalid response data');
        }

        setUser(userData);
        setAccessToken(token);

        // More secure cookie setting
        document.cookie = `access-token=${token}; path=/; secure; samesite=strict; max-age=86400`;
        document.cookie = `user-id=${userData._id}; path=/; secure; samesite=strict; max-age=86400`;

        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);

        // More granular error handling
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.error('Request timed out');
          }
        }

        // Only set error state if not on an excluded route
        if (
          pathname &&
          !excludedRoutes.some((route) => pathname.startsWith(route))
        ) {
          setError(
            err instanceof Error ? err : new Error('Unknown error')
          );
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [router, pathname, logout, excludedRoutes]
  );

  // Memoize clearCache function to prevent re-renders
  const clearCache = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearAllCookies();
    lastFetchedEmailRef.current = null;
    logout();
  }, [logout]);

  // Memoize refreshUser function to prevent re-renders
  const refreshUser = useCallback(async () => {
    if (email) {
      lastFetchedEmailRef.current = null; // Reset to allow refetch
      await fetchUserData(email);
    }
  }, [fetchUserData, email]);

  useEffect(() => {
    if (ready) {
      // Skip fetching user data if on debug-privy page
      if (pathname && pathname.includes('/debug-privy')) {
        setLoading(false);
        return;
      }

      // Skip fetching user data if on onboard page to prevent redirect loops
      if (pathname === '/onboard') {
        console.log(
          'Skipping user data fetch on onboard page to prevent redirect loops'
        );
        setLoading(false);
        return;
      }

      if (email && email !== lastFetchedEmailRef.current) {
        console.log(
          'Fetching user data for email:',
          email,
          'on pathname:',
          pathname
        );
        fetchUserData(email);
      } else if (!email) {
        // If no email but we had a user before, the session might have expired
        if (user) {
          console.log(
            'No email found but user exists, session may have expired'
          );
          setUser(null);
          setAccessToken(null);
          clearAllCookies();
          lastFetchedEmailRef.current = null;
          // Only redirect if not on excluded routes
          if (
            pathname &&
            !excludedRoutes.some((route) =>
              pathname.startsWith(route)
            )
          ) {
            router.push('/login');
          }
        }
        setLoading(false);
      }
    }
  }, [
    ready,
    email,
    fetchUserData,
    user,
    pathname,
    router,
    excludedRoutes,
  ]);

  // Add session validation effect
  useEffect(() => {
    // Check if user data exists but privyUser doesn't - this indicates session mismatch
    if (ready && user && !privyUser) {
      console.log(
        'User data exists but Privy user is null, clearing session'
      );
      setUser(null);
      setAccessToken(null);
      clearAllCookies();
      lastFetchedEmailRef.current = null;
      if (
        pathname &&
        !excludedRoutes.some((route) => pathname.startsWith(route))
      ) {
        router.push('/login');
      }
    }
  }, [ready, user, privyUser, pathname, router, excludedRoutes]);

  // Memoize context value with stable references
  const contextValue = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshUser,
      clearCache,
      accessToken,
    }),
    [user, loading, error, refreshUser, clearCache, accessToken]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
