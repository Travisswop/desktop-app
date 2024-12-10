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
}

interface UserContextType {
  user: UserData | null;
  accessToken: string | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  clearCache: () => void;
}

const UserContext = createContext<UserContextType>({
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
  const router = useRouter();
  const { user: privyUser, ready, logout } = usePrivy(); // Added logout
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  const fetchUserData = useCallback(
    async (userEmail: string) => {
      if (!userEmail) return;

      // More comprehensive list of excluded routes
      const excludedRoutes = [
        '/onboard',
        '/login',
        '/signup',
        '/welcome',
        // Add any other signup/onboarding routes
      ];

      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 10 seconds timeout

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${userEmail}`,
          {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          // More detailed logging
          console.error('Fetch user data response:', {
            status: response.status,
            statusText: response.statusText,
            currentPathname: pathname,
          });

          // Only handle redirection for specific error codes
          if (response.status === 401 || response.status === 403) {
            // Clear user session and redirect to login
            clearAllCookies();
            await logout(); // Add logout from Privy
            router.push('/login');
            return;
          }

          // For other non-excluded routes, throw an error
          if (
            !excludedRoutes.some((route) =>
              pathname.startsWith(route)
            )
          ) {
            throw new Error(
              `Failed to fetch user data: ${response.statusText}`
            );
          }
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
          !excludedRoutes.some((route) => pathname.startsWith(route))
        ) {
          setError(
            err instanceof Error ? err : new Error('Unknown error')
          );
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [router, pathname, logout] // Add logout to dependencies
  );

  useEffect(() => {
    if (ready) {
      if (email) {
        fetchUserData(email);
      } else {
        setLoading(false);
      }
    }
  }, [ready, email, fetchUserData]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshUser: () => fetchUserData(email || ''),
      clearCache: () => {
        setUser(null);
        setAccessToken(null);
        clearAllCookies();
        logout(); // Add logout when clearing cache
      },
      accessToken,
    }),
    [user, loading, error, fetchUserData, email, accessToken, logout]
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
