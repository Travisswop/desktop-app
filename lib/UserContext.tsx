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
import {
  selectPreferredWallet,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';
import {
  PrivyLinkedAccount,
  isEthereumWalletAccount,
  isSolanaWalletAccount,
} from '@/types/privy';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

const userContextDebugEnabled =
  process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true';

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
  ens?: string;
  primaryMicrosite?: string;
  swopensId?: string;
  solanaAddress?: string;
  solanaWallet?: string;
  user_id?: string;
  privyId?: string;
  ethAddress?: string;
  ethereumWallet?: string;
  displayName?: string;
  subscription?: {
    planNickname?: string;
    status?: string;
    currentPeriodEnd?: string | number | Date;
    [key: string]: unknown;
  };
  referralCode?: string;
  connections?: any[];

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

const USER_CACHE_KEY = 'swop:user-cache';
const USER_CACHE_VERSION = 3;
const USER_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const USER_FETCH_TIMEOUT_MS = 5000;

type CachedUserContext = {
  user: UserData;
  accessToken: string | null;
  cachedAt: number;
  email?: string;
  cacheVersion?: number;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || '';
}

function getAuthCookieOptions() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure:
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:',
  };
}

function clearStoredUserContext() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_CACHE_KEY);
  }

  Cookies.remove('user-id');
  Cookies.remove('access-token');
  Cookies.remove('user-id', { path: '/' });
  Cookies.remove('access-token', { path: '/' });
}

function readCachedUserContext(): CachedUserContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawCache = window.localStorage.getItem(USER_CACHE_KEY);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache) as CachedUserContext;
    if (
      cache.cacheVersion !== USER_CACHE_VERSION ||
      !cache.user ||
      normalizeEmail(cache.email || cache.user.email) !==
        normalizeEmail(cache.user.email) ||
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
      JSON.stringify({
        user,
        accessToken,
        cachedAt: Date.now(),
        email: normalizeEmail(user.email),
        cacheVersion: USER_CACHE_VERSION,
      }),
    );
  } catch (error) {
    console.warn('Failed to cache user context:', error);
  }
}

function syncStoredUserContext(user: UserData, accessToken: string | null) {
  const previousUserId = Cookies.get('user-id');
  const previousAccessToken = Cookies.get('access-token');
  const nextUserId = user._id?.toString();

  writeCachedUserContext(user, accessToken);

  if (nextUserId) {
    Cookies.set('user-id', nextUserId, getAuthCookieOptions());
  }

  if (accessToken) {
    Cookies.set('access-token', accessToken, getAuthCookieOptions());
  }

  return (
    previousUserId !== nextUserId ||
    (Boolean(accessToken) && previousAccessToken !== accessToken)
  );
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
  const lastSyncedWalletsRef = useRef<string | null>(null);

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

  const extractPreferredWalletAddresses = useCallback((privyUser: any) => {
    const linkedAccounts = (privyUser?.linkedAccounts ||
      []) as PrivyLinkedAccount[];
    const walletSelectionOptions = tradingWalletSelectionOptions();
    const ethereumWallet = selectPreferredWallet(
      linkedAccounts.filter(isEthereumWalletAccount),
      privyUser?.wallet?.address,
      walletSelectionOptions,
    )?.address;
    const solanaWallet = selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
      undefined,
      walletSelectionOptions,
    )?.address;

    return { ethereumWallet, solanaWallet };
  }, []);

  // Fetch user data from backend
  const fetchUserData = useCallback(
    async (email: string): Promise<boolean> => {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) return false;
      if (fetchInProgressRef.current) return false;
      if (
        lastFetchedEmailRef.current === normalizedEmail &&
        user &&
        normalizeEmail(user.email) === normalizedEmail
      ) {
        return true;
      }

      fetchInProgressRef.current = true;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, USER_FETCH_TIMEOUT_MS);

        const response = await fetch(
          buildSwopApiUrl(
            `/api/v2/desktop/user/${encodeURIComponent(normalizedEmail)}`,
          ),
          {
            headers: { 'Content-Type': 'application/json' },
            signal: abortControllerRef.current.signal,
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            setUser(null);
            setAccessToken(null);
            clearStoredUserContext();
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
        lastFetchedEmailRef.current = normalizedEmail;
        const authStorageChanged = syncStoredUserContext(userData, token);

        if (
          authStorageChanged &&
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login'
        ) {
          router.refresh();
        }

        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          if (user && normalizeEmail(user.email) === normalizedEmail) {
            console.info(
              'Using cached user data after refresh timed out',
            );
          }
          return false;
        }
        if (user && normalizeEmail(user.email) === normalizedEmail) {
          console.info('Using cached user data after refresh failed:', err);
        } else if (userContextDebugEnabled) {
          console.debug('User data refresh failed:', err);
        }
        if (user && normalizeEmail(user.email) !== normalizedEmail) {
          setUser(null);
          setAccessToken(null);
          clearStoredUserContext();
        }
        setError(
          err instanceof Error ? err : new Error('Unknown error'),
        );
        return false;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        fetchInProgressRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [router, user],
  );

  // Logout - just handle Privy logout, middleware handles redirects
  const handleLogout = useCallback(async () => {
    try {
      abortControllerRef.current?.abort();
      setUser(null);
      setAccessToken(null);
      setError(null);
      window.localStorage.removeItem('swop:last-authenticated-at');
      clearStoredUserContext();
      lastFetchedEmailRef.current = null;
      await privyLogout();
      router.push('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      clearStoredUserContext();
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
      clearStoredUserContext();
      setLoading(false);
      return;
    }

    const email = extractEmail(privyUser);
    if (!email) {
      setUser(null);
      setAccessToken(null);
      clearStoredUserContext();
      setLoading(false);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (user && normalizeEmail(user.email) !== normalizedEmail) {
      setUser(null);
      setAccessToken(null);
      clearStoredUserContext();
      setLoading(true);
    }

    // Only fetch if we don't have user data for this email
    if (
      lastFetchedEmailRef.current !== normalizedEmail ||
      !user ||
      normalizeEmail(user.email) !== normalizedEmail
    ) {
      fetchUserData(normalizedEmail).finally(() => setLoading(false));
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

  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !privyUser ||
      !user?._id ||
      !accessToken
    ) {
      return;
    }

    const { ethereumWallet, solanaWallet } =
      extractPreferredWalletAddresses(privyUser);
    if (!ethereumWallet && !solanaWallet) return;

    const syncKey = `${user._id}:${ethereumWallet || ''}:${
      solanaWallet || ''
    }`;
    const profileAlreadySynced =
      (!ethereumWallet ||
        user.ethereumWallet?.toLowerCase() ===
          ethereumWallet.toLowerCase()) &&
      (!solanaWallet || user.solanaWallet === solanaWallet);

    if (lastSyncedWalletsRef.current === syncKey && profileAlreadySynced) {
      return;
    }

    lastSyncedWalletsRef.current = syncKey;

    fetch(buildSwopApiUrl('/api/v5/wallet/sync-user-wallets'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ethereumWallet, solanaWallet }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        setUser((currentUser) => {
          if (!currentUser) return currentUser;
          const syncedUser = {
            ...currentUser,
            ...(ethereumWallet ? { ethereumWallet } : {}),
            ...(solanaWallet ? { solanaWallet } : {}),
            microsites: currentUser.microsites?.map((microsite) => {
              if (!microsite?.primary) return microsite;
              return {
                ...microsite,
                ...(ethereumWallet ? { ethAddress: ethereumWallet } : {}),
                ensData: {
                  ...(microsite.ensData || {}),
                  ...(ethereumWallet
                    ? { owner: ethereumWallet, ethAddress: ethereumWallet }
                    : {}),
                  addresses: {
                    ...(microsite.ensData?.addresses || {}),
                    ...(ethereumWallet ? { 60: ethereumWallet } : {}),
                    ...(solanaWallet ? { 501: solanaWallet } : {}),
                  },
                },
              };
            }),
          };
          writeCachedUserContext(syncedUser, accessToken);
          return syncedUser;
        });
      })
      .catch((err) => {
        lastSyncedWalletsRef.current = null;
        if (userContextDebugEnabled) {
          console.debug('Wallet address sync failed:', err);
        }
      });
  }, [
    ready,
    authenticated,
    privyUser,
    user?._id,
    user?.ethereumWallet,
    user?.solanaWallet,
    accessToken,
    extractPreferredWalletAddresses,
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
