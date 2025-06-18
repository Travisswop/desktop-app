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
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

// Cookie management utilities
const COOKIE_CONFIG = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 86400, // 24 hours
};

const setCookie = (
  name: string,
  value: string,
  maxAge = COOKIE_CONFIG.maxAge
) => {
  const config = `${name}=${value}; path=${
    COOKIE_CONFIG.path
  }; max-age=${maxAge}; ${
    COOKIE_CONFIG.secure ? 'secure; ' : ''
  }samesite=${COOKIE_CONFIG.sameSite}`;
  document.cookie = config;
};

const clearCookie = (name: string) => {
  document.cookie = `${name}=; path=${
    COOKIE_CONFIG.path
  }; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${
    COOKIE_CONFIG.secure ? 'secure; ' : ''
  }samesite=${COOKIE_CONFIG.sameSite}`;
};

const clearAllAuthCookies = () => {
  const authCookies = [
    'privy-token',
    'privy-id-token',
    'privy-refresh-token',
    'access-token',
    'user-id',
  ];
  authCookies.forEach(clearCookie);
};

// Authentication states
enum AuthState {
  INITIALIZING = 'initializing',
  CHECKING_BACKEND = 'checking_backend',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error',
}

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // State management
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authState, setAuthState] = useState<AuthState>(
    AuthState.INITIALIZING
  );

  // Hooks
  const router = useRouter();
  const pathname = usePathname();
  const {
    user: privyUser,
    ready,
    logout: privyLogout,
    authenticated,
  } = usePrivy();

  // Refs for preventing race conditions
  const fetchInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedEmailRef = useRef<string | null>(null);

  // Constants
  const PUBLIC_ROUTES = useMemo(
    () => [
      '/sp',
      '/login',
      '/signup',
      '/onboard',
      '/welcome',
      '/debug-privy',
      '/guest-order',
    ],
    []
  );

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  // Helper functions
  const extractEmailFromPrivyUser = useCallback(
    (privyUser: any): string | null => {
      if (!privyUser) return null;

      return (
        privyUser.google?.email ||
        privyUser.email?.address ||
        privyUser.linkedAccounts?.find(
          (acc: any) => acc.type === 'email'
        )?.address ||
        privyUser.linkedAccounts?.find(
          (acc: any) => acc.type === 'google_oauth'
        )?.email ||
        null
      );
    },
    []
  );

  const isPublicRoute = useCallback(
    (path: string | null): boolean => {
      if (!path) return false;
      return PUBLIC_ROUTES.some((route) => path.startsWith(route));
    },
    [PUBLIC_ROUTES]
  );

  // Clear user session
  const clearUserSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setError(null);
    clearAllAuthCookies();
    lastFetchedEmailRef.current = null;
    setAuthState(AuthState.UNAUTHENTICATED);
  }, []);

  // Fetch user data from backend
  const fetchUserData = useCallback(
    async (email: string): Promise<boolean> => {
      if (!email || !API_BASE_URL) {
        console.error('Missing email or API URL');
        return false;
      }

      // Prevent concurrent requests
      if (fetchInProgressRef.current) {
        return false;
      }

      // Skip if we already fetched for this email
      if (lastFetchedEmailRef.current === email && user) {
        return true;
      }

      fetchInProgressRef.current = true;
      setAuthState(AuthState.CHECKING_BACKEND);

      try {
        // Cancel any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, 20000); // 20 second timeout

        const response = await fetch(
          `${API_BASE_URL}/api/v2/desktop/user/${email}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            signal: abortControllerRef.current.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            clearUserSession();

            // Only redirect if not already on public route
            if (!isPublicRoute(pathname)) {
              router.push('/onboard');
            }
            return false;
          }

          if (response.status === 401 || response.status === 403) {
            clearUserSession();
            await privyLogout();

            if (!isPublicRoute(pathname)) {
              router.push('/login');
            }
            return false;
          }

          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        const { user: userData, token } = data;

        if (!userData || !token) {
          throw new Error('Invalid response structure');
        }

        // Update state
        setUser(userData);
        setAccessToken(token);
        setError(null);
        setAuthState(AuthState.AUTHENTICATED);
        lastFetchedEmailRef.current = email;

        // Set cookies
        setCookie('access-token', token);
        setCookie('user-id', userData._id);

        return true;
      } catch (err) {
        console.error('Error fetching user data:', err);

        // Handle specific errors
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            return false;
          }
          setError(err);
        } else {
          setError(new Error('Unknown error occurred'));
        }

        // Only clear session on actual errors, not on public routes
        if (!isPublicRoute(pathname)) {
          clearUserSession();
        }

        return false;
      } finally {
        fetchInProgressRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [
      API_BASE_URL,
      user,
      router,
      pathname,
      isPublicRoute,
      clearUserSession,
      privyLogout,
    ]
  );

  // Logout function
  const handleLogout = useCallback(async () => {
    try {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      clearUserSession();
      await privyLogout();
      router.push('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      // Force clear even if logout fails
      clearUserSession();
      router.push('/login');
    }
  }, [clearUserSession, privyLogout, router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const email = extractEmailFromPrivyUser(privyUser);
    if (email) {
      lastFetchedEmailRef.current = null; // Reset to force refetch
      await fetchUserData(email);
    }
  }, [privyUser, extractEmailFromPrivyUser, fetchUserData]);

  // Main authentication effect
  useEffect(() => {
    const handleAuthentication = async () => {
      // Wait for Privy to be ready
      if (!ready) {
        setLoading(true);
        return;
      }

      // Check if user is authenticated with Privy
      if (!authenticated || !privyUser) {
        clearUserSession();
        setLoading(false);
        if (!isPublicRoute(pathname)) {
          router.push('/login');
        }
        return;
      }

      // Extract email from Privy user
      const email = extractEmailFromPrivyUser(privyUser);
      if (!email) {
        setError(new Error('No email found in account'));
        setLoading(false);
        if (!isPublicRoute(pathname)) {
          router.push('/onboard');
        }
        return;
      }

      // Check if we need to fetch user data
      if (lastFetchedEmailRef.current !== email || !user) {
        const success = await fetchUserData(email);

        if (success) {
          setAuthState(AuthState.AUTHENTICATED);
        }
      }

      setLoading(false);
    };

    handleAuthentication();
  }, [
    ready,
    authenticated,
    privyUser,
    pathname,
    isPublicRoute,
    extractEmailFromPrivyUser,
    fetchUserData,
    clearUserSession,
    router,
    user,
  ]);

  // Session validation effect
  useEffect(() => {
    // Validate session consistency
    if (ready && user && !privyUser) {
      clearUserSession();

      if (!isPublicRoute(pathname)) {
        router.push('/login');
      }
    }
  }, [
    ready,
    user,
    privyUser,
    clearUserSession,
    pathname,
    isPublicRoute,
    router,
  ]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      error,
      refreshUser,
      logout: handleLogout,
      isAuthenticated:
        authState === AuthState.AUTHENTICATED && !!user,
      primaryMicrosite: user?.primaryMicrosite,
    }),
    [
      user,
      accessToken,
      loading,
      error,
      refreshUser,
      handleLogout,
      authState,
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
