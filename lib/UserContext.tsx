'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

interface UserContextType {
  user: UserData | null;
  primaryMicrosite?: string;
  accessToken: string | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  clearCache: () => void;
  handleLogout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  accessToken: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
  clearCache: () => {},
  handleLogout: async () => {},
});

const clearAllCookies = () => {
  const cookies = [
    'privy-token',
    'privy-id-token',
    'privy-refresh-token',
    'privy-session',
    'access-token',
    'user-id',
  ];

  cookies.forEach((cookie) => {
    document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict`;
  });
};

const getCookie = (name: string): string | null => {
  const match = document.cookie.match(
    new RegExp(`(^| )${name}=([^;]+)`)
  );
  return match ? match[2] : null;
};

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: privyUser, ready, logout } = usePrivy();
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_COOLDOWN = 10000; // 10 seconds minimum between fetches

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

  const handleLogout = useCallback(async () => {
    try {
      clearAllCookies();
      setUser(null);
      setAccessToken(null);
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect to login even if logout fails
      window.location.href = '/login';
    }
  }, [logout, router]);

  const fetchUserData = useCallback(
    async (userEmail: string, force = false) => {
      if (!userEmail) return;

      // Respect the cooldown period unless forced
      const now = Date.now();
      if (!force && now - lastFetchTime < FETCH_COOLDOWN) {
        return;
      }

      setLastFetchTime(now);

      // See if we already have a token in cookies
      const existingToken = getCookie('access-token');
      if (existingToken && !force) {
        setAccessToken(existingToken);
      }

      // More comprehensive list of excluded routes
      const excludedRoutes = [
        '/onboard',
        '/login',
        '/signup',
        '/welcome',
      ];

      // Skip fetch for excluded routes
      if (
        excludedRoutes.some((route) => pathname.startsWith(route))
      ) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout (reduced from 120)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${userEmail}`,
          {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              // Include existing token if available
              ...(existingToken
                ? { Authorization: `Bearer ${existingToken}` }
                : {}),
            },
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('Fetch user data response:', {
            status: response.status,
            statusText: response.statusText,
            currentPathname: pathname,
          });

          if (response.status === 404) {
            // User not found, redirect to login
            router.push('/login');
            return;
          }

          if (response.status === 401 || response.status === 403) {
            // Authentication error, go to login
            await handleLogout();
            return;
          }

          throw new Error(
            `Failed to fetch user data: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data || !data.user || !data.token) {
          throw new Error('Invalid response data');
        }

        const { user: userData, token } = data;

        setUser(userData);
        setAccessToken(token);

        // Set cookies with explicit expiration and security flags
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days

        document.cookie = `access-token=${token}; path=/; expires=${expires.toUTCString()}; secure; samesite=strict`;
        document.cookie = `user-id=${
          userData._id
        }; path=/; expires=${expires.toUTCString()}; secure; samesite=strict`;

        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);

        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.error('Request timed out');
          }

          setError(err);
        } else {
          setError(new Error('Unknown error occurred'));
        }

        // Only clear user data if this is a forced refresh or serious error
        if (
          force ||
          (err instanceof Error && err.name !== 'AbortError')
        ) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [router, pathname, lastFetchTime, handleLogout]
  );

  useEffect(() => {
    // Wait until Privy is ready
    if (!ready) return;

    // Check for existing token first
    const existingToken = getCookie('access-token');
    const userId = getCookie('user-id');

    if (existingToken && userId) {
      // We have existing auth, set it immediately to prevent flicker
      setAccessToken(existingToken);
      setLoading(false);
    }

    // Then try to get updated data
    if (email) {
      fetchUserData(email);
    } else {
      setLoading(false);
    }
  }, [ready, email, fetchUserData]);

  // Handle pathway changes - check auth state
  useEffect(() => {
    // If we have an email but no user, and we're on a route that requires auth
    const authRequiredRoutes = [
      '/',
      '/feed',
      '/smartsite',
      '/qrcode',
      '/wallet',
      '/analytics',
      '/mint',
      '/order',
      '/content',
    ];
    const isProtectedRoute = authRequiredRoutes.some(
      (route) =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    const isAuthRoute = ['/login', '/onboard'].includes(pathname);

    if (
      ready &&
      email &&
      !user &&
      !loading &&
      isProtectedRoute &&
      !isAuthRoute
    ) {
      // Force refresh user data
      fetchUserData(email, true);
    }
  }, [pathname, user, email, ready, loading, fetchUserData]);

  const contextValue = useMemo(
    () => ({
      user,
      primaryMicrosite: user?.primaryMicrosite,
      loading,
      error,
      refreshUser: () => fetchUserData(email || '', true),
      clearCache: () => {
        setUser(null);
        setAccessToken(null);
        clearAllCookies();
      },
      handleLogout,
      accessToken,
    }),
    [
      user,
      loading,
      error,
      fetchUserData,
      email,
      accessToken,
      handleLogout,
    ]
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
