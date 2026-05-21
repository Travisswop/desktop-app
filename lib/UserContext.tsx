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
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Cookies from 'js-cookie';
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
  swopensId?: string;
  solanaAddress?: string;
  user_id?: string;
  privyId?: string;
  ethAddress?: string;
  displayName?: string;

  // Bot-related fields
  isBot?: boolean;
  botType?: 'crypto' | 'ai' | 'trading' | 'defi' | 'nft' | 'custom';
  botCapabilities?: Array<
    | 'price_check'
    | 'swap_tokens'
    | 'send_crypto'
    | 'check_balance'
    | 'transaction_history'
    | 'portfolio_analysis'
    | 'defi_yields'
    | 'nft_floor_prices'
    | 'market_analysis'
    | 'trading_signals'
    | 'gas_tracker'
    | 'bridge_tokens'
  >;
  botMetadata?: {
    version?: string;
    provider?: string;
    apiEndpoint?: string;
    supportedNetworks?: string[];
    maxTransactionAmount?: number;
    permissions?: string[];
  };

  // User preferences
  preferences?: {
    language?: string;
    currency?: string;
    notifications?: boolean;
    privacy?: {
      showOnlineStatus?: boolean;
      allowBotInteractions?: boolean;
    };
  };

  // Crypto-related fields
  walletConnections?: Array<{
    network: string;
    address: string;
    isActive: boolean;
    lastUsed: Date;
  }>;

  // Social features
  reputation?: number;
  verificationStatus?:
    | 'unverified'
    | 'email_verified'
    | 'wallet_verified'
    | 'kyc_verified';
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
  primaryMicrositeProfilePic: string | null;
}

const UserContext = createContext<UserContextType | null>(null);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const USER_CACHE_KEY = 'swop:user-cache';
const USER_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CachedUserContext = {
  user: UserData;
  accessToken: string | null;
  cachedAt: number;
};

function readCachedUserContext(): CachedUserContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawCache = window.localStorage.getItem(USER_CACHE_KEY);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache) as CachedUserContext;
    if (
      !cache.user ||
      Date.now() - cache.cachedAt > USER_CACHE_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }

    return cache;
  } catch (error) {
    console.warn('Failed to read cached user context:', error);
    window.localStorage.removeItem(USER_CACHE_KEY);
    return null;
  }
}

function writeCachedUserContext(
  user: UserData,
  accessToken: string | null,
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      USER_CACHE_KEY,
      JSON.stringify({ user, accessToken, cachedAt: Date.now() }),
    );
  } catch (error) {
    console.warn('Failed to cache user context:', error);
  }
}

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialCacheRef = useRef<
    CachedUserContext | null | undefined
  >(undefined);
  if (initialCacheRef.current === undefined) {
    initialCacheRef.current = readCachedUserContext();
  }

  const [user, setUser] = useState<UserData | null>(
    () => initialCacheRef.current?.user ?? null,
  );
  const [accessToken, setAccessToken] = useState<string | null>(
    () => initialCacheRef.current?.accessToken ?? null,
  );
  const [loading, setLoading] = useState(
    () => initialCacheRef.current === null,
  );
  const [error, setError] = useState<Error | null>(null);

  const router = useRouter();
  const {
    user: privyUser,
    ready,
    logout: privyLogout,
    authenticated,
  } = usePrivy();

  const fetchInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedEmailRef = useRef<string | null>(null);

  // Extract email from Privy user
  const extractEmail = useCallback(
    (privyUser: any): string | null => {
      if (!privyUser) return null;
      return (
        privyUser.google?.email ||
        privyUser.email?.address ||
        privyUser.linkedAccounts?.find(
          (acc: any) => acc.type === 'email',
        )?.address ||
        privyUser.linkedAccounts?.find(
          (acc: any) => acc.type === 'google_oauth',
        )?.email ||
        null
      );
    },
    [],
  );

  // Fetch user data from backend
  const fetchUserData = useCallback(
    async (email: string): Promise<boolean> => {
      if (!email || !API_BASE_URL) return false;
      if (fetchInProgressRef.current) return false;
      if (lastFetchedEmailRef.current === email && user) return true;

      fetchInProgressRef.current = true;

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `${API_BASE_URL}/api/v2/desktop/user/${email}`,
          {
            headers: { 'Content-Type': 'application/json' },
            signal: abortControllerRef.current.signal,
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            setUser(null);
            setAccessToken(null);
            return false;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const { user: userData, token } = data;

        if (!userData || !token) {
          throw new Error('Invalid response structure');
        }

        setUser(userData);
        setAccessToken(token);
        setError(null);
        lastFetchedEmailRef.current = email;
        writeCachedUserContext(userData, token);

        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return false;
        }
        console.error('Error fetching user data:', err);
        setError(
          err instanceof Error ? err : new Error('Unknown error'),
        );
        return false;
      } finally {
        fetchInProgressRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [user],
  );

  // Logout - just handle Privy logout, middleware handles redirects
  const handleLogout = useCallback(async () => {
    try {
      abortControllerRef.current?.abort();
      setUser(null);
      setAccessToken(null);
      setError(null);
      window.localStorage.removeItem(USER_CACHE_KEY);
      window.localStorage.removeItem('swop:last-authenticated-at');
      lastFetchedEmailRef.current = null;
      await privyLogout();
      router.push('/login');
      Cookies.remove('user-id');
      Cookies.remove('access-token');
    } catch (err) {
      console.error('Error during logout:', err);
      Cookies.remove('user-id');
      Cookies.remove('access-token');
      router.push('/login');
    }
  }, [privyLogout, router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const email = extractEmail(privyUser);
    if (email) {
      lastFetchedEmailRef.current = null;
      await fetchUserData(email);
    }
  }, [privyUser, extractEmail, fetchUserData]);

  // Main effect - only fetch user data when authenticated
  useEffect(() => {
    if (!ready) {
      setLoading(!user);
      return;
    }

    // Not authenticated - middleware handles redirects
    if (!authenticated || !privyUser) {
      setUser(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    const email = extractEmail(privyUser);
    if (!email) {
      setLoading(false);
      return;
    }

    // Only fetch if we don't have user data for this email
    if (lastFetchedEmailRef.current !== email || !user) {
      fetchUserData(email).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [
    ready,
    authenticated,
    privyUser,
    extractEmail,
    fetchUserData,
    user,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const primaryMicrositeData = useMemo(
    () => user?.microsites?.find((m) => m.primary === true) ?? null,
    [user?.microsites],
  );

  const contextValue = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      error,
      refreshUser,
      logout: handleLogout,
      isAuthenticated: authenticated && !!user,
      primaryMicrosite: user?.primaryMicrosite,
      primaryMicrositeProfilePic:
        primaryMicrositeData?.profilePic ?? null,
    }),
    [
      user,
      accessToken,
      loading,
      error,
      refreshUser,
      handleLogout,
      authenticated,
      primaryMicrositeData,
    ],
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
