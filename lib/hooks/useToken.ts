import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { ChainType } from '@/types/token';
import {
  WalletService,
  Token,
  WalletInput,
  WalletTokenFetchIssue,
  WalletTokensResponse,
} from '@/services/wallet-service';
import { useUser } from '@/lib/UserContext';
import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { isNetworkFetchError } from '@/lib/api/fetchErrors';

const normalizeChain = (chain: string): ChainType =>
  chain.toUpperCase() as ChainType;

type TokenWithWallet = Token & { walletAddress?: string };

type TokenSnapshot = {
  tokens: TokenWithWallet[];
  totalValue: string;
  tokenCount: number;
  degraded?: boolean;
  errors?: WalletTokenFetchIssue[];
  failedWalletCount?: number;
  fetchedWalletCount?: number;
};

type RetryableWalletTokenError = Error & { retryable?: boolean };

const createRetryableWalletTokenError = (): RetryableWalletTokenError => {
  const error = new Error(
    'Wallet token RPC providers temporarily unavailable'
  ) as RetryableWalletTokenError;
  error.retryable = true;
  return error;
};

const shouldRetryEmptyWalletResult = (result: WalletTokensResponse) =>
  Boolean(result.degraded && (result.tokens || []).length === 0);

const throwIfEmptyDegraded = (result: WalletTokensResponse) => {
  if (shouldRetryEmptyWalletResult(result)) {
    throw createRetryableWalletTokenError();
  }
};

const isAuthError = (error: unknown) =>
  error instanceof Error && /\b(401|403)\b/.test(error.message);

const isRetryableWalletTokenError = (
  error: unknown
): error is RetryableWalletTokenError =>
  error instanceof Error &&
  Boolean((error as RetryableWalletTokenError).retryable);

const backendTokenCache = new Map<string, string>();
const backendTokenRequests = new Map<string, Promise<string | null>>();

async function fetchBackendAccessToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const cachedToken = backendTokenCache.get(normalizedEmail);
  if (cachedToken) return cachedToken;

  const existingRequest = backendTokenRequests.get(normalizedEmail);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const apiPath = `/api/v2/desktop/user/${encodeURIComponent(
        normalizedEmail
      )}`;
      let response: Response;

      try {
        response = await apiFetch(buildSwopApiUrl(apiPath), {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
      } catch (error) {
        if (!isNetworkFetchError(error) || controller.signal.aborted) {
          throw error;
        }

        response = await fetch('/api/auth/backend-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail }),
          cache: 'no-store',
          signal: controller.signal,
        });
      }

      if (!response.ok) return null;

      const data = await response.json().catch(() => null);
      const token = typeof data?.token === 'string' ? data.token : null;

      if (token) {
        backendTokenCache.set(normalizedEmail, token);
      }

      return token;
    } finally {
      clearTimeout(timeoutId);
      backendTokenRequests.delete(normalizedEmail);
    }
  })();

  backendTokenRequests.set(normalizedEmail, request);
  return request;
}

/**
 * Simplified useMultiChainTokenData Hook
 *
 * Fetches all tokens (native + ERC-20/SPL) from the unified backend API.
 * No frontend logic for handling different token types - backend does everything.
 */
export const useMultiChainTokenData = (
  solWalletAddress?: string,
  evmWalletAddress?: string | string[],
  chains: ChainType[] = ['ETHEREUM']
) => {
  const { user, accessToken, loading: userLoading } = useUser();
  const [cookieAccessToken, setCookieAccessToken] = useState<string | null>(
    null
  );
  const [fallbackAccessToken, setFallbackAccessToken] = useState<
    string | null
  >(null);
  const authToken =
    accessToken || cookieAccessToken || fallbackAccessToken || '';
  const userEmail = user?.email || '';

  useEffect(() => {
    setCookieAccessToken(Cookies.get('access-token') || null);
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    if (accessToken || cookieAccessToken) {
      setFallbackAccessToken(null);
      return () => {
        cancelled = true;
      };
    }

    if (!userEmail) {
      setFallbackAccessToken(null);
      return () => {
        cancelled = true;
      };
    }

    fetchBackendAccessToken(userEmail)
      .then((token) => {
        if (!cancelled) setFallbackAccessToken(token);
      })
      .catch(() => {
        if (!cancelled) setFallbackAccessToken(null);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, cookieAccessToken, userEmail]);

  // Build wallet list based on provided addresses and chains
  const wallets: WalletInput[] = [];
  const evmWalletAddresses = Array.from(
    new Set(
      (Array.isArray(evmWalletAddress)
        ? evmWalletAddress
        : [evmWalletAddress]
      )
        .filter((address): address is string => Boolean(address))
        .map((address) => address.trim())
        .filter(Boolean)
    )
  );

  if (evmWalletAddresses.length) {
    // Add requested EVM chains
    const evmChains = chains.filter((chain) => chain !== 'SOLANA');
    evmWalletAddresses.forEach((address) => {
      for (const chain of evmChains) {
        wallets.push({
          address,
          chain: chain.toLowerCase() as
            | 'ethereum'
            | 'polygon'
            | 'base'
            | 'arbitrum',
        });
      }
    });
  }

  if (solWalletAddress && chains.includes('SOLANA')) {
    wallets.push({
      address: solWalletAddress,
      chain: 'solana' as const,
    });
  }
  const walletFingerprint = wallets
    .map((wallet) => `${wallet.chain}:${wallet.address}`)
    .sort()
    .join('|');

  const canUseSessionCookieProxy =
    typeof window !== 'undefined' && (userLoading || Boolean(user));
  const tokenQueryEnabled =
    wallets.length > 0 && Boolean(authToken || canUseSessionCookieProxy);

  const tokenQuery = useQuery<TokenSnapshot>({
    queryKey: [
      'walletTokens',
      'owner-address-batch-v2',
      walletFingerprint,
      authToken || 'session-cookie',
    ],
    queryFn: async () => {
      const hasDuplicateChains =
        new Set(wallets.map((wallet) => wallet.chain)).size !==
        wallets.length;

      if (hasDuplicateChains) {
        const walletResponses = await Promise.all(
          wallets.map(async (wallet) => {
            const result = await WalletService.getWalletTokens(
              [wallet],
              authToken || undefined
            );
            return { wallet, result };
          })
        );
        const tokens = walletResponses.flatMap(({ wallet, result }) =>
          (result.tokens || []).map((token) => ({
            ...token,
            walletAddress: token.walletAddress || wallet.address,
          }))
        );
        const errors = walletResponses.flatMap(
          ({ result }) => result.errors || []
        );
        const totalValue = tokens.reduce((sum, token) => {
          const explicitValue = Number(token.value || 0);
          if (Number.isFinite(explicitValue) && explicitValue > 0) {
            return sum + explicitValue;
          }
          const price = Number(token.marketData?.price || 0);
          const balance = Number(token.balance || 0);
          return sum + price * balance;
        }, 0);

        const combinedResult: WalletTokensResponse & {
          tokens: TokenWithWallet[];
        } = {
          tokens,
          totalValue: totalValue.toFixed(2),
          tokenCount: tokens.length,
          degraded: walletResponses.some(({ result }) => result.degraded),
          errors,
          failedWalletCount: new Set(
            errors.map(
              (error) =>
                `${error.chain || 'unknown'}:${String(
                  error.address || ''
                ).toLowerCase()}`
            )
          ).size,
          fetchedWalletCount: walletResponses.length,
        };
        throwIfEmptyDegraded(combinedResult);
        return combinedResult;
      }

      const result = await WalletService.getWalletTokens(
        wallets,
        authToken || undefined
      );
      const walletAddressByChain = new Map(
        wallets.map((wallet) => [wallet.chain, wallet.address])
      );

      const normalizedResult: WalletTokensResponse & {
        tokens: TokenWithWallet[];
      } = {
        tokens: (result.tokens || []).map((token) => ({
          ...token,
          walletAddress:
            token.walletAddress ||
            walletAddressByChain.get(
              token.chain as WalletInput['chain']
            ),
        })),
        totalValue: result.totalValue,
        tokenCount: result.tokenCount,
        degraded: result.degraded,
        errors: result.errors,
        failedWalletCount: result.failedWalletCount,
        fetchedWalletCount: result.fetchedWalletCount,
      };
      throwIfEmptyDegraded(normalizedResult);
      return normalizedResult;
    },
    enabled: tokenQueryEnabled,
    retry: (failureCount, error) => {
      if (isAuthError(error)) return false;
      if (isRetryableWalletTokenError(error)) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const data = useMemo<TokenSnapshot>(() => {
    const tokens: TokenWithWallet[] = tokenQuery.data?.tokens || [];
    const totalValue = tokens.reduce((sum: number, token: TokenWithWallet) => {
      const explicitValue = Number(token.value || 0);
      if (Number.isFinite(explicitValue) && explicitValue > 0) {
        return sum + explicitValue;
      }
      const price = Number(token.marketData?.price || 0);
      const balance = Number(token.balance || 0);
      return sum + price * balance;
    }, 0);

    return {
      tokens,
      totalValue: tokenQuery.data?.totalValue || totalValue.toFixed(2),
      tokenCount: tokenQuery.data?.tokenCount ?? tokens.length,
      degraded: tokenQuery.data?.degraded,
      errors: tokenQuery.data?.errors,
      failedWalletCount: tokenQuery.data?.failedWalletCount,
      fetchedWalletCount: tokenQuery.data?.fetchedWalletCount,
    };
  }, [tokenQuery.data]);

  const isLoading =
    tokenQueryEnabled &&
    data.tokens.length === 0 &&
    (tokenQuery.isLoading || tokenQuery.isFetching);
  const error = tokenQuery.error ?? null;
  const refetch = useCallback(
    () => tokenQuery.refetch(),
    [tokenQuery]
  );

  // Transform tokens to include logoURI and timeSeriesData for backward compatibility
  // Note: Tokens are already sorted by value on the backend
  const tokens = (data?.tokens || []).map((token: Token) => ({
    ...token,
    chain: normalizeChain(token.chain),
    logoURI:
      token.logoURI || `/assets/crypto-icons/${token.symbol}.png`,
    // Add empty time series data structure for components that expect it
    timeSeriesData: {
      '1H': [],
      '1D': [],
      '1W': [],
      '1M': [],
      '1Y': [],
    },
    // Map marketData to match expected format
    marketData: token.marketData
      ? {
          ...token.marketData,
          change: token.marketData.priceChange24h?.toString() || '0',
        }
      : null,
  }));

  return {
    tokens,
    loading: isLoading,
    error,
    refetch,
    totalValue: data?.totalValue || '0',
    tokenCount: data?.tokenCount || 0,
    degraded: data?.degraded || false,
    tokenErrors: data?.errors || [],
  };
};
