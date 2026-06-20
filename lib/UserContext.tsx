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
import { apiFetch } from '@/lib/api/apiFetch';
import {
  AI_ONBOARDING_PATH,
  requiresSwopIdCompletion,
  SWOP_ID_ONBOARDING_PATH,
} from '@/lib/onboardingStatus';
import { safeLocalStorage } from '@/lib/browserStorage';
import { markExplicitLogoutRedirect } from '@/lib/authSession';

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
  connections?: {
    followers?: any[];
    following?: any[];
    childConnection?: any[];
    parentConnection?: any[];
    followerCount?: number;
    followingCount?: number;
    totalFollowers?: number;
  } | any[];
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
// When we already have cached user data to fall back to, abort a slow refresh
// quickly and keep showing the cache. On initial login there is nothing to fall
// back to, so we must wait long enough for the backend to actually respond — the
// /api/v2/desktop/user endpoint regularly takes 5-9s on a cold hit, and aborting
// early leaves the user permanently null. See git blame for the auth null-user bug.
const USER_FETCH_TIMEOUT_MS = 5000;
const USER_FETCH_INITIAL_TIMEOUT_MS = 25000;

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

function normalizeWalletAddress(address?: string | null) {
  return address?.trim().toLowerCase() || '';
}

function walletAddressesMatch(
  left?: string | null,
  right?: string | null,
) {
  return (
    Boolean(left && right) &&
    normalizeWalletAddress(left) === normalizeWalletAddress(right)
  );
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

// Cookies the app sets via js-cookie (non-httpOnly). httpOnly cookies are
// invisible to js-cookie and must be cleared server-side via /api/auth/logout.
const CLIENT_AUTH_COOKIE_NAMES = [
  'user-id',
  'access-token',
  'privy-token',
  'privy-id-token',
  'privy-refresh-token',
  'privy-session',
];

const LOGOUT_LOCAL_STORAGE_KEYS = ['polymarket_trading_session'];
const LOGOUT_LOCAL_STORAGE_PREFIXES = ['polymarket_trading_session_'];

function clearLogoutScopedLocalStorage() {
  for (const key of LOGOUT_LOCAL_STORAGE_KEYS) {
    safeLocalStorage.removeItem(key);
  }

  for (const key of safeLocalStorage.keys()) {
    if (LOGOUT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      safeLocalStorage.removeItem(key);
    }
  }
}

function clearStoredUserContext() {
  safeLocalStorage.removeItem(USER_CACHE_KEY);
  clearLogoutScopedLocalStorage();

  for (const name of CLIENT_AUTH_COOKIE_NAMES) {
    Cookies.remove(name);
    Cookies.remove(name, { path: '/' });
  }
}

// Server-side cookie clear. This is the only way to remove httpOnly auth
// cookies (e.g. the `access-token` written by /api/auth/refresh-token), which
// otherwise survive logout and keep the middleware + server-rendered feed
// treating the user as logged in.
async function clearServerAuthCookies() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Failed to clear server auth cookies:', error);
  }
}

function hasStoredSwopBackendSession() {
  return Boolean(Cookies.get('user-id') && Cookies.get('access-token'));
}

function readCachedUserContext(): CachedUserContext | null {
  try {
    const rawCache = safeLocalStorage.getItem(USER_CACHE_KEY);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache) as CachedUserContext;
    if (
      cache.cacheVersion !== USER_CACHE_VERSION ||
      !cache.user ||
      normalizeEmail(cache.email || cache.user.email) !==
        normalizeEmail(cache.user.email) ||
      Date.now() - cache.cachedAt > USER_CACHE_MAX_AGE_MS
    ) {
      safeLocalStorage.removeItem(USER_CACHE_KEY);
      return null;
    }

    return cache;
  } catch (error) {
    console.warn('Failed to read cached user context:', error);
    safeLocalStorage.removeItem(USER_CACHE_KEY);
    return null;
  }
}

function cachedUserBelongsToPrivySession(
  cache: CachedUserContext | null,
  privyUser: any,
): cache is CachedUserContext {
  if (!cache?.user) return false;
  return (
    !cache.user.privyId ||
    !privyUser?.id ||
    cache.user.privyId === privyUser.id
  );
}

function writeCachedUserContext(
  user: UserData,
  accessToken: string | null,
) {
  try {
    safeLocalStorage.setItem(
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
  // Set synchronously at the start of logout. While true, the main effect and
  // fetchUserData must not re-fetch or re-write session storage. Without this,
  // setUser(null) re-triggers the main effect while Privy is still
  // `authenticated` (privyLogout hasn't resolved yet), which re-runs
  // fetchUserData and resurrects the `swop:user-cache` localStorage plus the
  // `access-token`/`user-id` cookies that logout just cleared — leaving the
  // user able to reach protected routes after signing out.
  const isLoggingOutRef = useRef(false);
  // Mirror of the latest `user` so effects/callbacks can read it WITHOUT taking
  // `user` as a reactive dependency. `setUser` always stores a freshly-spread
  // object, so depending on `user` made `fetchUserData` (and the main effect
  // that calls it) re-run on every successful fetch — an infinite
  // setUser → re-run → setUser loop that surfaced as React #185 in the wallet
  // tree and a `/onboard?step=swop-id` RSC prefetch storm.
  const userRef = useRef(user);
  userRef.current = user;
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  // One-shot guard so the SwopID redirect pushes at most once per session even
  // if `user` changes again afterwards.
  const swopIdRedirectedRef = useRef(false);

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

  const extractPreferredWalletAddresses = useCallback(
    (privyUser: any, currentUser?: UserData | null) => {
      const linkedAccounts = (privyUser?.linkedAccounts ||
        []) as PrivyLinkedAccount[];
      const walletSelectionOptions = tradingWalletSelectionOptions();
      const storedEthereumWallet = currentUser?.ethereumWallet || '';
      const storedSolanaWallet =
        currentUser?.solanaWallet || currentUser?.solanaAddress || '';

      const selectedEthereumWallet = selectPreferredWallet(
        linkedAccounts.filter(isEthereumWalletAccount),
        storedEthereumWallet || privyUser?.wallet?.address,
        {
          ...walletSelectionOptions,
          preferredAddresses: [storedEthereumWallet],
        },
      )?.address;
      const selectedSolanaWallet = selectPreferredWallet(
        linkedAccounts.filter(isSolanaWalletAccount),
        undefined,
        {
          ...walletSelectionOptions,
          preferredAddresses: [storedSolanaWallet],
        },
      )?.address;

      const ethereumWallet =
        !storedEthereumWallet ||
        walletAddressesMatch(
          storedEthereumWallet,
          selectedEthereumWallet,
        )
          ? selectedEthereumWallet
          : undefined;
      const solanaWallet =
        !storedSolanaWallet ||
        walletAddressesMatch(storedSolanaWallet, selectedSolanaWallet)
          ? selectedSolanaWallet
          : undefined;

      return { ethereumWallet, solanaWallet };
    },
    [],
  );

  // Fetch user data from backend
  const fetchUserData = useCallback(
    async (email: string): Promise<boolean> => {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) return false;
      // Logout in progress — don't re-fetch and re-write the session we're
      // tearing down.
      if (isLoggingOutRef.current) return false;
      if (fetchInProgressRef.current) return false;
      const currentUser = userRef.current;
      if (
        lastFetchedEmailRef.current === normalizedEmail &&
        currentUser &&
        normalizeEmail(currentUser.email) === normalizedEmail &&
        (accessTokenRef.current || Cookies.get('access-token'))
      ) {
        return true;
      }

      fetchInProgressRef.current = true;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // Only abort early when we have cached data for this email to fall back
      // to. On initial login (no usable cache) we must give the slow backend
      // enough time to respond, otherwise the user is stranded as null.
      const hasCachedFallback =
        process.env.NODE_ENV !== 'development' &&
        Boolean(
          currentUser &&
            normalizeEmail(currentUser.email) === normalizedEmail &&
            (accessTokenRef.current || Cookies.get('access-token')),
        );
      const fetchTimeoutMs = hasCachedFallback
        ? USER_FETCH_TIMEOUT_MS
        : USER_FETCH_INITIAL_TIMEOUT_MS;

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, fetchTimeoutMs);

        const response = await apiFetch(
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
        const { user: rawUserData, token } = data;

        if (!rawUserData || !token) {
          throw new Error('Invalid response structure');
        }

        // The backend returns SmartSite leads under `subscriber` (singular),
        // while the app consumes them as `subscribers` (plural). Normalize
        // here so every consumer (dashboard, analytics) reads one field.
        const userData: UserData = {
          ...rawUserData,
          subscribers:
            rawUserData.subscribers ?? rawUserData.subscriber ?? [],
        };

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
          if (currentUser && normalizeEmail(currentUser.email) === normalizedEmail) {
            console.info(
              'Using cached user data after refresh timed out',
            );
          }
          return false;
        }
        if (currentUser && normalizeEmail(currentUser.email) === normalizedEmail) {
          console.info('Using cached user data after refresh failed:', err);
        } else if (userContextDebugEnabled) {
          console.debug('User data refresh failed:', err);
        }
        if (currentUser && normalizeEmail(currentUser.email) !== normalizedEmail) {
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
    // `user` is read via `userRef` so a successful fetch's setUser doesn't churn
    // this callback's identity (which previously re-fired the main effect).
    [router],
  );

  // Logout clears Swop-owned session state first so protected pages stop seeing
  // stale cookies immediately. Privy can take noticeably longer, so let that
  // cleanup finish in the background while the explicit-logout marker keeps the
  // login page from resuming the old session.
  const handleLogout = useCallback(async () => {
    try {
      markExplicitLogoutRedirect();
      // Block the main effect / fetchUserData from re-fetching and resurrecting
      // the cleared session while privyLogout() is still resolving. Released in
      // the main effect once Privy reports the user as unauthenticated.
      isLoggingOutRef.current = true;
      abortControllerRef.current?.abort();
      setUser(null);
      setAccessToken(null);
      setError(null);
      safeLocalStorage.removeItem('swop:last-authenticated-at');
      clearStoredUserContext();
      lastFetchedEmailRef.current = null;

      const privyLogoutCleanup = privyLogout()
        .catch((error) => {
          console.warn('Privy logout cleanup failed:', error);
        })
        .finally(() => {
          clearStoredUserContext();
        });

      // Strip every Swop auth cookie server-side (httpOnly included) before
      // navigation, so middleware and server-rendered routes cannot treat the
      // stale session as logged in.
      await clearServerAuthCookies();
      clearStoredUserContext();
      router.replace('/login');
      void privyLogoutCleanup;
    } catch (err) {
      console.error('Error during logout:', err);
      markExplicitLogoutRedirect();
      await clearServerAuthCookies();
      clearStoredUserContext();
      router.replace('/login');

      void privyLogout().catch((error) => {
        console.warn('Privy logout cleanup failed:', error);
      });
    }
  }, [privyLogout, router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const email = extractEmail(privyUser);
    if (email) {
      lastFetchedEmailRef.current = null;
      await fetchUserData(email);
      return;
    }

    const cachedContext = readCachedUserContext();
    if (cachedUserBelongsToPrivySession(cachedContext, privyUser)) {
      setUser(cachedContext.user);
      setAccessToken(cachedContext.accessToken);
      setError(null);
      syncStoredUserContext(cachedContext.user, cachedContext.accessToken);
    }
  }, [privyUser, extractEmail, fetchUserData]);

  // Main effect - only fetch user data when authenticated.
  // Reads the current user via `userRef` rather than the reactive `user` so a
  // successful fetch (which calls setUser with a new object) does not re-trigger
  // this effect. Its real triggers are Privy auth state + the resolved email.
  useEffect(() => {
    const currentUser = userRef.current;
    if (!ready) {
      setLoading(!currentUser);
      return;
    }

    // Not authenticated - middleware handles redirects
    if (!authenticated || !privyUser) {
      // Privy has fully logged out — the session we were tearing down is gone,
      // so it's safe to release the logout guard for the next login.
      isLoggingOutRef.current = false;

      if (hasStoredSwopBackendSession()) {
        setLoading(false);
        return;
      }

      setUser(null);
      setAccessToken(null);
      clearStoredUserContext();
      setLoading(false);
      return;
    }

    // Logout is in flight but Privy still reports the old session as
    // authenticated. Bail so we don't re-fetch and resurrect the cleared
    // cookies/cache before privyLogout() resolves.
    if (isLoggingOutRef.current) {
      return;
    }

    const email = extractEmail(privyUser);
    if (!email) {
      const cachedContext = readCachedUserContext();
      if (cachedUserBelongsToPrivySession(cachedContext, privyUser)) {
        setUser(cachedContext.user);
        setAccessToken(cachedContext.accessToken);
        syncStoredUserContext(cachedContext.user, cachedContext.accessToken);
        setLoading(false);
        return;
      }

      setUser(null);
      setAccessToken(null);
      clearStoredUserContext();
      setLoading(false);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (currentUser && normalizeEmail(currentUser.email) !== normalizedEmail) {
      setUser(null);
      setAccessToken(null);
      clearStoredUserContext();
      setLoading(true);
    }

    // Only fetch if we don't have user data for this email
    if (
      lastFetchedEmailRef.current !== normalizedEmail ||
      !currentUser ||
      normalizeEmail(currentUser.email) !== normalizedEmail
    ) {
      fetchUserData(normalizedEmail).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // `user` is intentionally read via `userRef` (not a dep) to avoid the
    // setUser → re-run → setUser loop. The effect's triggers are auth + email.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    authenticated,
    privyUser,
    extractEmail,
    fetchUserData,
  ]);

  useEffect(() => {
    if (
      loading ||
      !authenticated ||
      !user?._id ||
      !requiresSwopIdCompletion(user) ||
      typeof window === 'undefined'
    ) {
      // Requirement no longer applies — let a future incomplete session
      // redirect again.
      swopIdRedirectedRef.current = false;
      return;
    }

    if (
      window.location.pathname === '/onboard' ||
      window.location.pathname === AI_ONBOARDING_PATH ||
      window.location.pathname === '/login'
    ) {
      return;
    }

    // Push at most once per session. Without this, any further `user` change
    // re-fired router.push to the same route, flooding Next.js with RSC
    // prefetches until the browser hit ERR_INSUFFICIENT_RESOURCES.
    if (swopIdRedirectedRef.current) return;
    swopIdRedirectedRef.current = true;
    router.push(SWOP_ID_ONBOARDING_PATH);
  }, [authenticated, loading, router, user]);

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

    if (user.privyId && privyUser.id && user.privyId !== privyUser.id) {
      return;
    }

    // Local dev reads production user records through a test Privy app. Do not
    // persist or cache those test wallet addresses as identity wallets.
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const { ethereumWallet, solanaWallet } =
      extractPreferredWalletAddresses(privyUser, user);
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

    apiFetch(buildSwopApiUrl('/api/v5/wallet/sync-user-wallets'), {
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
      .then((data) => {
        const syncedEthereumWallet =
          data?.user?.ethereumWallet || ethereumWallet;
        const syncedSolanaWallet = data?.user?.solanaWallet || solanaWallet;

        setUser((currentUser) => {
          if (!currentUser) return currentUser;
          const syncedUser = {
            ...currentUser,
            ...(syncedEthereumWallet
              ? { ethereumWallet: syncedEthereumWallet }
              : {}),
            ...(syncedSolanaWallet
              ? { solanaWallet: syncedSolanaWallet }
              : {}),
            microsites: currentUser.microsites?.map((microsite) => {
              if (!microsite?.primary) return microsite;
              return {
                ...microsite,
                ...(syncedEthereumWallet
                  ? { ethAddress: syncedEthereumWallet }
                  : {}),
                ensData: {
                  ...(microsite.ensData || {}),
                  ...(syncedEthereumWallet
                    ? {
                        owner: syncedEthereumWallet,
                        ethAddress: syncedEthereumWallet,
                      }
                    : {}),
                  addresses: {
                    ...(microsite.ensData?.addresses || {}),
                    ...(syncedEthereumWallet
                      ? { 60: syncedEthereumWallet }
                      : {}),
                    ...(syncedSolanaWallet
                      ? { 501: syncedSolanaWallet }
                      : {}),
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
    user?.privyId,
    user?.ethereumWallet,
    user?.solanaWallet,
    user?.solanaAddress,
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
