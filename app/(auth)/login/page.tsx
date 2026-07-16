'use client';

import { createLoginWalletBalance } from '@/actions/createWallet';
import Loader from '@/components/loading/Loader';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import blackPlanet from '@/public/onboard/black-planet.svg';
import swopLogo from '@/public/swopLogo.png';
import {
  selectPreferredWallet,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';
import {
  PrivyLinkedAccount,
  isEthereumWalletAccount,
  isSolanaWalletAccount,
} from '@/types/privy';
import { WalletItem } from '@/types/wallet';
import {
  useCreateWallet,
  useLoginWithEmail,
  useLoginWithPasskey,
  usePrivy,
  useSignupWithPasskey,
} from '@privy-io/react-auth';
import {
  useCreateWallet as useSolanaCreateWallet,
} from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GoArrowLeft } from 'react-icons/go';
import { LuArrowRight } from 'react-icons/lu';
import { RiFingerprintLine, RiMailSendLine } from 'react-icons/ri';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { buildSwopApiUrl, getSwopApiBaseUrl } from '@/lib/api/apiBaseUrl';
import { safeLocalStorage, safeSessionStorage } from '@/lib/browserStorage';
import { apiFetch } from '@/lib/api/apiFetch';
import { isNetworkFetchError } from '@/lib/api/fetchErrors';
import {
  AI_ONBOARDING_PATH,
  requiresSwopIdCompletion,
  SWOP_ID_ONBOARDING_PATH,
} from '@/lib/onboardingStatus';
import { consumeExplicitLogoutRedirect } from '@/lib/authSession';

// Login flow states
enum LoginFlow {
  EMAIL_INPUT = 'email_input',
  OTP_INPUT = 'otp_input',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

const USER_CACHE_KEY = 'swop:user-cache';
const USER_CACHE_VERSION = 3;

// Wallet creation status
interface WalletCreationStatus {
  ethereum: boolean;
  solana: boolean;
  inProgress: boolean;
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';

  const maybeError = error as {
    code?: unknown;
    data?: { code?: unknown };
    privyErrorCode?: unknown;
  };

  const code = maybeError.privyErrorCode ?? maybeError.code ?? maybeError.data?.code;
  return typeof code === 'string' ? code : '';
}

function formatEmailCodeError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unable to send a verification code.';
  const code = getErrorCode(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('rate') || normalized.includes('too many')) {
    return 'Too many code requests. Wait a minute, then try again.';
  }

  if (code === 'disallowed_login_method') {
    return 'Email login is disabled for this Privy app or client. Enable Email in Privy Authentication settings.';
  }

  if (code === 'allowlist_rejected') {
    return 'This app URL is not in Privy allowed origins. Add the current origin to the Privy app and web client.';
  }

  if (code === 'missing_or_invalid_privy_app_id') {
    return 'Privy rejected the app ID. Check the deployed NEXT_PUBLIC_PRIVY_APP_ID value.';
  }

  if (code === 'invalid_data') {
    return message;
  }

  if (
    normalized.includes('origin') ||
    normalized.includes('domain') ||
    normalized.includes('allowed origin')
  ) {
    return 'This app URL is not in Privy allowed origins. Check the Privy app and web client settings.';
  }

  if (normalized.includes('email')) {
    return message;
  }

  return 'Could not send the email code. Please try again.';
}

function formatPasskeyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Passkey authentication failed.';
  const code = getErrorCode(error);
  const normalized = message.toLowerCase();

  if (code === 'disallowed_login_method' || code === 'passkey_not_allowed') {
    return 'Passkey login is disabled for this Privy app or client. Enable Passkey in Privy Authentication settings.';
  }

  if (
    normalized.includes('origin') ||
    normalized.includes('domain') ||
    normalized.includes('allowed origin')
  ) {
    return 'This app URL is not in Privy allowed origins. Add the current origin to the Privy app and web client.';
  }

  if (
    normalized.includes('not supported') ||
    normalized.includes('webauthn') ||
    normalized.includes('publickeycredential')
  ) {
    return 'This browser or device does not support passkeys here. Try email login instead.';
  }

  if (
    normalized.includes('cancel') ||
    normalized.includes('abort') ||
    normalized.includes('notallowed')
  ) {
    return 'Passkey prompt was canceled. Try again or use email login.';
  }

  return message || 'Passkey authentication failed. Try email login instead.';
}

function formatLoginProcessingError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Login failed';

  if (message.toLowerCase().includes('failed to fetch')) {
    const apiBaseUrl = getSwopApiBaseUrl();
    if (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')) {
      return 'Swop backend is not reachable. Make sure the local backend is running on port 4000, then try again.';
    }

    return `Swop backend is not reachable at ${apiBaseUrl}. Check the backend deployment and CORS settings, then try again.`;
  }

  return message;
}

async function fetchBackendUserAuth({
  apiPath,
  userEmail,
  privyId,
  privyToken,
}: {
  apiPath: string;
  userEmail: string | null;
  privyId: string | null;
  privyToken: string | null;
}) {
  // The Privy access token lets the backend bind the minted session to this
  // account (swop-app-backend middlewares/privyBinding). Forward it on both the
  // direct call and the same-origin proxy fallback.
  const privyHeaders: Record<string, string> = privyToken
    ? { 'x-privy-token': privyToken }
    : {};

  try {
    return await apiFetch(buildSwopApiUrl(apiPath), {
      headers: privyHeaders,
    });
  } catch (error) {
    if (!isNetworkFetchError(error) || typeof window === 'undefined') {
      throw error;
    }

    logger.warn(
      'Direct backend user lookup failed; retrying through same-origin route',
      {
        apiBaseUrl: getSwopApiBaseUrl(),
        message: error instanceof Error ? error.message : String(error),
      },
    );

    return fetch('/api/auth/backend-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...privyHeaders,
      },
      body: JSON.stringify({
        email: userEmail,
        privyId,
      }),
    });
  }
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

function clearStaleSwopAuthStorage() {
  safeLocalStorage.removeItem(USER_CACHE_KEY);
  safeLocalStorage.removeItem('swop:last-authenticated-at');

  Cookies.remove('user-id');
  Cookies.remove('access-token');
  Cookies.remove('user-id', { path: '/' });
  Cookies.remove('access-token', { path: '/' });
}

function persistBackendUserAuth(user: any, token?: string | null) {
  const userId = user?._id?.toString();
  if (!userId) return;

  Cookies.set('user-id', userId, getAuthCookieOptions());
  if (token) {
    Cookies.set('access-token', token, getAuthCookieOptions());
  }

  safeLocalStorage.setItem('swop:last-authenticated-at', String(Date.now()));
  safeLocalStorage.setItem(
    USER_CACHE_KEY,
    JSON.stringify({
      user,
      accessToken: token || null,
      cachedAt: Date.now(),
      email: user.email || '',
      cacheVersion: USER_CACHE_VERSION,
    }),
  );
}

function readCachedBackendUserAuth(privyUser: any) {
  try {
    const rawCache = safeLocalStorage.getItem(USER_CACHE_KEY);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache);
    const cachedUser = cache?.user;
    if (!cachedUser?._id) return null;
    if (
      cachedUser.privyId &&
      privyUser?.id &&
      cachedUser.privyId !== privyUser.id
    ) {
      return null;
    }

    return {
      user: cachedUser,
      token: cache.accessToken || null,
    };
  } catch {
    return null;
  }
}

function clearPrivyBrowserSession() {
  clearStaleSwopAuthStorage();

  if (typeof window !== 'undefined') {
    for (const storage of [safeLocalStorage, safeSessionStorage]) {
      const keys = storage.keys();

      for (const key of keys) {
        if (key.toLowerCase().includes('privy')) {
          storage.removeItem(key);
        }
      }
    }
  }

  const privyCookieNames = [
    'privy-token',
    'privy-id-token',
    'privy-refresh-token',
    'privy-session',
  ];

  for (const cookieName of privyCookieNames) {
    Cookies.remove(cookieName);
    Cookies.remove(cookieName, { path: '/' });
  }
}

const Login: React.FC = () => {
  // Privy hooks
  const { authenticated, ready, user, logout: privyLogout, getAccessToken } =
    usePrivy();
  const { state, sendCode, loginWithCode } = useLoginWithEmail();
  const {
    state: passkeyLoginState,
    loginWithPasskey,
  } = useLoginWithPasskey();
  const {
    state: passkeySignupState,
    signupWithPasskey,
  } = useSignupWithPasskey();
  const { createWallet: createEthereumWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } =
    useSolanaCreateWallet();

  // Custom hooks
  const router = useRouter();

  // State management
  const [loginFlow, setLoginFlow] = useState<LoginFlow>(
    LoginFlow.EMAIL_INPUT,
  );
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingPasskeyAuth, setPendingPasskeyAuth] = useState(false);
  const [privyInitTimedOut, setPrivyInitTimedOut] = useState(false);
  const [suppressSessionResume, setSuppressSessionResume] = useState<
    boolean | null
  >(null);
  const [walletStatus, setWalletStatus] =
    useState<WalletCreationStatus>({
      ethereum: false,
      solana: false,
      inProgress: false,
    });

  // OTP state
  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null),
  );

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(480); // 8 minutes = 480 seconds
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const passkeyBusy =
    pendingPasskeyAuth ||
    passkeyLoginState.status === 'generating-challenge' ||
    passkeyLoginState.status === 'awaiting-passkey' ||
    passkeyLoginState.status === 'submitting-response' ||
    passkeySignupState.status === 'generating-challenge' ||
    passkeySignupState.status === 'awaiting-passkey' ||
    passkeySignupState.status === 'submitting-response';

  // Refs for preventing race conditions
  const loginProcessingRef = useRef(false);
  const walletCreationInProgressRef = useRef(false);
  const walletCreationAttemptKeyRef = useRef<string | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const explicitLogoutCleanupAttemptedRef = useRef(false);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start timer when OTP screen is shown
  useEffect(() => {
    if (loginFlow === LoginFlow.OTP_INPUT) {
      setTimeRemaining(480);
      setCanResend(false);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loginFlow]);

  // Email validation
  const validateEmail = useCallback((email: string): string => {
    if (!email.trim()) return 'Email is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return 'Please enter a valid email address';

    return '';
  }, []);

  // Extract email from Privy user
  const extractEmailFromUser = useCallback(
    (user: any): string | null => {
      return (
        user?.google?.email ||
        user?.email?.address ||
        user?.linkedAccounts?.find((acc: any) => acc.type === 'email')
          ?.address ||
        user?.linkedAccounts?.find(
          (acc: any) => acc.type === 'google_oauth',
        )?.email ||
        null
      );
    },
    [],
  );

  // Process wallet data
  const processWalletData = useCallback((user: any): WalletItem[] => {
    if (!user?.linkedAccounts) return [];

    const linkedAccounts = user.linkedAccounts as PrivyLinkedAccount[];
    const walletSelectionOptions = tradingWalletSelectionOptions();
    const ethereumWallet = selectPreferredWallet(
      linkedAccounts.filter(isEthereumWalletAccount),
      user.wallet?.address,
      walletSelectionOptions,
    );
    const solanaWallet = selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
      undefined,
      walletSelectionOptions,
    );

    return [solanaWallet, ethereumWallet]
      .filter((account): account is NonNullable<typeof account> =>
        Boolean(account?.address),
      )
      .map((account) => ({
        address: account.address,
        isActive: true,
        isEVM: account.chainType === 'ethereum',
        walletClientType: account.walletClientType,
      }));
  }, []);

  // Create wallets
  const createPrivyWallets = useCallback(
    async (user: any) => {
      if (walletCreationInProgressRef.current) return;

      walletCreationInProgressRef.current = true;
      setWalletStatus((prev) =>
        prev.inProgress ? prev : { ...prev, inProgress: true },
      );

      try {
        const existingWallets = user?.linkedAccounts || [];
        const hasEthWallet = existingWallets.some(
          (acc: any) =>
            acc.chainType === 'ethereum' &&
            (acc.walletClientType === 'privy' ||
              acc.connectorType === 'embedded'),
        );
        const hasSolWallet = existingWallets.some(
          (acc: any) =>
            acc.chainType === 'solana' &&
            (acc.walletClientType === 'privy' ||
              acc.connectorType === 'embedded'),
        );

        if (hasEthWallet || hasSolWallet) {
          setWalletStatus((prev) => {
            const next = {
              ...prev,
              ethereum: prev.ethereum || hasEthWallet,
              solana: prev.solana || hasSolWallet,
            };

            return next.ethereum === prev.ethereum &&
              next.solana === prev.solana
              ? prev
              : next;
          });
        }

        // Add production debugging
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
          logger.log('Production wallet creation - User state:', {
            hasEthWallet,
            hasSolWallet,
            linkedAccountsCount: existingWallets.length,
            userAuthenticated: !!user,
            privyReady: ready,
          });
        }

        // Create Ethereum wallet if needed
        if (!hasEthWallet) {
          try {
            await createEthereumWallet();
            setWalletStatus((prev) =>
              prev.ethereum ? prev : { ...prev, ethereum: true },
            );
            logger.log('Ethereum wallet created successfully');
          } catch (error: any) {
            if (
              error === 'embedded_wallet_already_exists' ||
              error?.message === 'embedded_wallet_already_exists'
            ) {
              setWalletStatus((prev) =>
                prev.ethereum ? prev : { ...prev, ethereum: true },
              );
              logger.log('Ethereum wallet already exists');
            } else {
              logger.error('Ethereum wallet creation failed:', error);
              if (isProduction) {
                logger.error(
                  'Production Ethereum wallet error details:',
                  {
                    error: error?.message || error,
                    stack: error?.stack,
                    userAgent:
                      typeof window !== 'undefined'
                        ? window.navigator.userAgent
                        : 'server',
                    timestamp: new Date().toISOString(),
                  },
                );
              }
            }
          }
        }

        // Create Solana wallet if needed
        if (!hasSolWallet) {
          try {
            await createSolanaWallet();
            setWalletStatus((prev) =>
              prev.solana ? prev : { ...prev, solana: true },
            );
            logger.log('Solana wallet created successfully');
          } catch (error: any) {
            if (
              error === 'embedded_wallet_already_exists' ||
              error?.message === 'embedded_wallet_already_exists'
            ) {
              setWalletStatus((prev) =>
                prev.solana ? prev : { ...prev, solana: true },
              );
              logger.log('Solana wallet already exists');
            } else {
              logger.error('Solana wallet creation failed:', error);
              if (isProduction) {
                logger.error(
                  'Production Solana wallet error details:',
                  {
                    error: error?.message || error,
                    stack: error?.stack,
                    userAgent:
                      typeof window !== 'undefined'
                        ? window.navigator.userAgent
                        : 'server',
                    timestamp: new Date().toISOString(),
                  },
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error('Wallet creation process failed:', error);
        if (process.env.NODE_ENV === 'production') {
          logger.error('Production wallet creation process error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userAgent:
              typeof window !== 'undefined'
                ? window.navigator.userAgent
                : 'server',
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        walletCreationInProgressRef.current = false;
        setWalletStatus((prev) =>
          prev.inProgress ? { ...prev, inProgress: false } : prev,
        );
      }
    },
    [createEthereumWallet, createSolanaWallet, ready],
  );

  useEffect(() => {
    const walletCreationAttemptBase = user?.id || user?.email?.address;
    const walletCreationAttemptKey = walletCreationAttemptBase
      ? `${walletCreationAttemptBase}:${user.linkedAccounts?.length ?? 0}`
      : null;

    if (
      authenticated &&
      ready &&
      user &&
      !walletStatus.inProgress &&
      !(walletStatus.ethereum && walletStatus.solana) &&
      walletCreationAttemptKey &&
      walletCreationAttemptKeyRef.current !== walletCreationAttemptKey
    ) {
      walletCreationAttemptKeyRef.current = walletCreationAttemptKey;
      createPrivyWallets(user).catch((error) => {
        walletCreationAttemptKeyRef.current = null;
        logger.error('Wallet creation failed (post-auth):', error);
      });
    }
  }, [
    authenticated,
    ready,
    user,
    walletStatus.inProgress,
    walletStatus.ethereum,
    walletStatus.solana,
    createPrivyWallets,
  ]);

  useEffect(() => {
    if (ready) {
      setPrivyInitTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setPrivyInitTimedOut(true);
    }, 12000);

    return () => clearTimeout(timeout);
  }, [ready]);

  useEffect(() => {
    setSuppressSessionResume(consumeExplicitLogoutRedirect());
  }, []);

  useEffect(() => {
    if (
      suppressSessionResume !== true ||
      !ready ||
      !authenticated ||
      explicitLogoutCleanupAttemptedRef.current
    ) {
      return;
    }

    explicitLogoutCleanupAttemptedRef.current = true;

    void privyLogout()
      .catch((error) => {
        logger.error('Privy logout cleanup failed:', error);
      })
      .finally(() => {
        clearPrivyBrowserSession();
      });
  }, [authenticated, privyLogout, ready, suppressSessionResume]);

  useEffect(() => {
    if (suppressSessionResume !== true || !ready || authenticated) {
      return;
    }

    clearStaleSwopAuthStorage();
    setSuppressSessionResume(false);
  }, [authenticated, ready, suppressSessionResume]);

  // Handle successful login
  const handleLoginSuccess = useCallback(
    async (user: any) => {
      if (loginProcessingRef.current) return;

      loginProcessingRef.current = true;
      setLoginFlow(LoginFlow.PROCESSING);
      setLoginError(null);

      try {
        const userEmail = extractEmailFromUser(user);
        const apiPath = userEmail
          ? `/api/v2/desktop/user/${encodeURIComponent(userEmail)}`
          : user?.id
            ? `/api/v2/desktop/user/getPrivyUser/${encodeURIComponent(user.id)}`
            : null;

        if (!apiPath) {
          logger.log(
            'No email or Privy ID found on Privy account; sending user to onboarding',
          );
          router.push(AI_ONBOARDING_PATH);
          return;
        }

        const privyToken = await getAccessToken().catch(() => null);
        const response = await fetchBackendUserAuth({
          apiPath,
          userEmail,
          privyId: user?.id || null,
          privyToken,
        });

        if (!response.ok) {
          if (response.status === 404) {
            const cachedAuth = !userEmail
              ? readCachedBackendUserAuth(user)
              : null;
            if (cachedAuth) {
              logger.log(
                'Backend Privy lookup missed; using cached passkey user session',
              );
              persistBackendUserAuth(cachedAuth.user, cachedAuth.token);
              setLoginFlow(LoginFlow.SUCCESS);
              redirectTimeoutRef.current = setTimeout(() => {
                router.refresh();
                router.push('/');
              }, 500);
              return;
            }

            logger.log('User not found by Privy session, redirecting to onboard');
            router.push(AI_ONBOARDING_PATH);
            return;
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.user?._id) {
          throw new Error('Invalid user data from backend');
        }

        const shouldCompleteSwopId = requiresSwopIdCompletion(data.user);

        persistBackendUserAuth(data.user, data.token);

        const privyIdMatchesBackendUser =
          !data.user.privyId || !user?.id || data.user.privyId === user.id;

        if (privyIdMatchesBackendUser) {
          // Process wallet data for balance update
          const walletData = processWalletData(user);
          const payload = {
            userId: data.user._id,
            ethAddress: walletData.find((w) => w.isEVM)?.address,
            solanaAddress: walletData.find((w) => !w.isEVM)?.address,
          };

          // Update wallet balances (non-blocking)
          createLoginWalletBalance(payload).catch((error) => {
            logger.error('Wallet balance update failed:', error);
          });
        }

        setLoginFlow(LoginFlow.SUCCESS);

        // Redirect after short delay
        redirectTimeoutRef.current = setTimeout(() => {
          router.refresh();
          router.push(
            shouldCompleteSwopId ? SWOP_ID_ONBOARDING_PATH : '/',
          );
        }, 1500);
      } catch (error) {
        logger.error('Login processing failed:', error);
        setLoginError(formatLoginProcessingError(error));
        setLoginFlow(LoginFlow.ERROR);
      } finally {
        loginProcessingRef.current = false;
      }
    },
    [extractEmailFromUser, processWalletData, router, getAccessToken],
  );

  const handlePasskeyLogin = useCallback(async () => {
    setLoginError(null);
    setEmailError('');
    setPendingPasskeyAuth(true);

    try {
      await loginWithPasskey();
      setLoginFlow(LoginFlow.PROCESSING);
    } catch (error) {
      setPendingPasskeyAuth(false);
      setLoginError(null);
      setLoginFlow(LoginFlow.EMAIL_INPUT);
      toast.error(formatPasskeyError(error));
    }
  }, [loginWithPasskey]);

  const handlePasskeySignup = useCallback(async () => {
    setLoginError(null);
    setEmailError('');
    clearStaleSwopAuthStorage();
    setPendingPasskeyAuth(true);

    try {
      await signupWithPasskey();
      setLoginFlow(LoginFlow.PROCESSING);
    } catch (error) {
      setPendingPasskeyAuth(false);
      setLoginError(null);
      setLoginFlow(LoginFlow.EMAIL_INPUT);
      toast.error(formatPasskeyError(error));
    }
  }, [signupWithPasskey]);

  // Handle email form submission
  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const error = validateEmail(email);
      if (error) {
        setEmailError(error);
        return;
      }

      setEmailError('');
      setLoginError(null);
      clearStaleSwopAuthStorage();
      try {
        await sendCode({ email: email.trim() });
        setLoginFlow(LoginFlow.OTP_INPUT);
      } catch (sendCodeError) {
        setEmailError(formatEmailCodeError(sendCodeError));
      }
    },
    [email, validateEmail, sendCode],
  );

  // Handle resend code
  const handleSendCode = useCallback(async () => {
    if (canResend) {
      try {
        await sendCode({ email: email.trim() });
        setLoginError(null);
        setTimeRemaining(480);
        setCanResend(false);
        setOtp(new Array(otpLength).fill(''));
      } catch (sendCodeError) {
        setLoginError(formatEmailCodeError(sendCodeError));
      }
    }
  }, [email, sendCode, canResend, otpLength]);

  // OTP input handlers
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (isNaN(Number(value))) return;

      const newOtp = [...otp];
      newOtp[index] = value.substring(value.length - 1);
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < otpLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp, otpLength],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasteData = e.clipboardData
        .getData('text')
        .slice(0, otpLength)
        .split('');
      if (pasteData.some((char) => isNaN(Number(char)))) return;

      const newOtp = [
        ...pasteData,
        ...new Array(otpLength - pasteData.length).fill(''),
      ];
      setOtp(newOtp);

      // Update input values and focus
      pasteData.forEach((char, index) => {
        if (inputRefs.current[index]) {
          inputRefs.current[index]!.value = char;
        }
      });

      inputRefs.current[
        Math.min(pasteData.length, otpLength - 1)
      ]?.focus();
    },
    [otpLength],
  );

  // Process an existing Privy session when a user lands on /login directly.
  useEffect(() => {
    if (
      ready &&
      authenticated &&
      user &&
      suppressSessionResume === false &&
      loginFlow === LoginFlow.EMAIL_INPUT &&
      !loginProcessingRef.current
    ) {
      void handleLoginSuccess(user);
    }
  }, [
    ready,
    authenticated,
    user,
    suppressSessionResume,
    loginFlow,
    handleLoginSuccess,
  ]);

  // Handle OTP completion and login
  useEffect(() => {
    const isOtpComplete = otp.every((digit) => digit !== '');

    if (
      (state.status === 'awaiting-code-input' ||
        state.status === 'error') &&
      isOtpComplete &&
      !loginProcessingRef.current
    ) {
      loginWithCode({ code: otp.join('') });
    }
  }, [otp, state.status, loginWithCode]);

  useEffect(() => {
    if (
      pendingPasskeyAuth &&
      ready &&
      authenticated &&
      user &&
      // Only kick off processing from the pre-auth states. Once
      // handleLoginSuccess flips loginFlow to PROCESSING/SUCCESS, it resets
      // loginProcessingRef in its finally — without this guard a fresh Privy
      // `user` reference (e.g. from wallet creation) would re-enter the
      // handler and loop ("Maximum update depth exceeded").
      (loginFlow === LoginFlow.EMAIL_INPUT ||
        loginFlow === LoginFlow.OTP_INPUT) &&
      !loginProcessingRef.current
    ) {
      handleLoginSuccess(user).finally(() => {
        setPendingPasskeyAuth(false);
      });
    }
  }, [
    pendingPasskeyAuth,
    ready,
    authenticated,
    user,
    loginFlow,
    handleLoginSuccess,
  ]);

  // Handle successful login
  useEffect(() => {
    if (
      state.status === 'done' &&
      user &&
      // See note above: gate on the pre-auth flow states so a changing Privy
      // `user` reference can't re-trigger handleLoginSuccess in a loop.
      (loginFlow === LoginFlow.EMAIL_INPUT ||
        loginFlow === LoginFlow.OTP_INPUT) &&
      !loginProcessingRef.current
    ) {
      handleLoginSuccess(user);
    }
  }, [state.status, user, loginFlow, handleLoginSuccess]);

  // Handle login errors
  useEffect(() => {
    if (state.status === 'error') {
      setLoginError('Invalid verification code. Please try again.');
      setOtp(new Array(otpLength).fill(''));
      loginProcessingRef.current = false;
    }
  }, [state.status, otpLength]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (!ready && privyInitTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-950">
            Authentication is taking too long
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            This usually means the browser has stale auth data. Reset the local
            session and try again.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              className="h-11 flex-1 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
              onClick={() => {
                clearPrivyBrowserSession();
                window.location.reload();
              }}
            >
              Reset session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading states
  if (!ready || loginFlow === LoginFlow.PROCESSING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          {loginFlow === LoginFlow.PROCESSING
            ? 'Processing your login...'
            : 'Initializing...'}
        </p>
      </div>
    );
  }

  if (loginFlow === LoginFlow.SUCCESS) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Login successful! Redirecting to dashboard...
        </p>
      </div>
    );
  }

  // Error state
  if (loginFlow === LoginFlow.ERROR && loginError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/15 backdrop-blur-md rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-500 mb-4">
            Login Error
          </h2>
          <p className="text-gray-700 mb-6">{loginError}</p>
          <button
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            onClick={() => {
              setLoginError(null);
              setLoginFlow(LoginFlow.EMAIL_INPUT);
              setOtp(new Array(otpLength).fill(''));
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto p-8 flex justify-center items-center">
      {loginFlow === LoginFlow.EMAIL_INPUT && (
        <Card className="w-full bg-white shadow-small shadow-white rounded-3xl max-w-lg mx-auto p-10">
          <div className="flex flex-col items-center space-y-6 text-center pt-24 pb-20">
            <div className="flex items-center gap-2">
              <Image
                src={blackPlanet}
                alt="blue planet"
                className="w-16 h-auto"
                priority
              />
              <Image
                src={swopLogo}
                alt="swop logo"
                className="w-32 h-auto"
                priority
              />
            </div>

            <div className="flex w-[350px] flex-col gap-3">
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyBusy}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RiFingerprintLine size={20} />
                {passkeyBusy ? 'Check your passkey prompt...' : 'Sign in with passkey'}
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={passkeyBusy}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiFingerprintLine size={20} />
                    Create account with passkey
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Before the passkey prompt opens
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Swop will open the browser passkey setup next. The
                      browser decides which save options are available. For
                      Apple sync, use Safari or choose Apple Passwords/iCloud
                      Keychain if your browser offers it; otherwise choose the
                      password manager you use across devices.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasskeySignup}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-center text-xs leading-5 text-gray-500">
                For cross-device sign-in, save your passkey to a synced
                password manager like Apple Passwords, iCloud Keychain, or
                Google Password Manager.
              </p>
            </div>

            <div className="flex w-[350px] items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              <span>or email</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <form
              onSubmit={handleEmailSubmit}
              className="flex items-center border border-black rounded-xl overflow-hidden w-[350px]"
            >
              <div className="p-2 pl-4">
                <RiMailSendLine size={20} />
              </div>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-2 py-2 text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                disabled={state.status === 'sending-code'}
              />
              <button
                type="submit"
                disabled={state.status === 'sending-code'}
                className="bg-black text-white p-2 rounded-lg m-1 px-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <LuArrowRight className="text-gray-50" size={20} />
              </button>
            </form>

            <div className="h-6">
              {state.status === 'sending-code' && (
                <span className="text-blue-600">
                  Sending verification code...
                </span>
              )}
              {emailError && (
                <p className="text-red-500 text-sm">{emailError}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {loginFlow === LoginFlow.OTP_INPUT && (
        <div className="w-full bg-white shadow-small shadow-white rounded-3xl max-w-lg mx-auto p-10 flex flex-col items-center justify-center z-30 space-y-4">
          {/* Close & Back Buttons */}
          <div className="flex justify-between w-full text-gray-500">
            <button
              className="text-lg hover:text-gray-600 transition-colors"
              onClick={() => {
                setOtp(new Array(otpLength).fill(''));
                setLoginFlow(LoginFlow.EMAIL_INPUT);
              }}
            >
              <GoArrowLeft className="text-gray-800 " size={25} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Image
              src={blackPlanet}
              alt="blue planet"
              className="w-12 h-auto"
              priority
            />
            <Image
              src={swopLogo}
              alt="swop logo"
              className="w-28 h-auto"
              priority
            />
          </div>
          {/* Title */}
          <h2 className="font-semibold text-xl pt-6">Enter Code</h2>
          {/* OTP Input Fields */}
          <div className="flex justify-center gap-3">
            {otp.map((_, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                value={otp[index]}
                onChange={(e) =>
                  handleOtpChange(index, e.target.value)
                }
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                className="w-12 h-16 border border-gray-300 rounded-lg text-center text-xl focus:outline-none focus:border-indigo-500"
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            A one time authentication code has been <br /> sent to 
            {email}.
          </p>
          {/* Timer and Resend Code */}
          <div className="text-sm text-gray-500">
            {!canResend ? (
              <p>
                Expires in{' '}
                <span className="font-semibold text-indigo-600">
                  {formatTime(timeRemaining)}.
                </span>
                <span className="text-gray-600 font-medium ml-1">
                  Resend code
                </span>
              </p>
            ) : (
              <p>
                Didn&apos;t get an email?{' '}
                <span
                  className="text-indigo-600 cursor-pointer hover:text-indigo-700 font-medium"
                  onClick={handleSendCode}
                >
                  Resend code
                </span>
              </p>
            )}
          </div>
          {/* Error */}
          <div className="h-3">
            {state.status === 'error' && (
              <p className="text-red-400 text-sm mt-2">Invalid OTP</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
