import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { ChainType } from '@/types/token';
import { WalletService, Token, WalletInput } from '@/services/wallet-service';
import { useUser } from '@/lib/UserContext';
import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

const normalizeChain = (chain: string): ChainType =>
  chain.toUpperCase() as ChainType;

type TokenWithWallet = Token & { walletAddress?: string };

type TokenSnapshot = {
  tokens: TokenWithWallet[];
  totalValue: string;
  tokenCount: number;
};

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
      const response = await apiFetch(
        buildSwopApiUrl(
          `/api/v2/desktop/user/${encodeURIComponent(normalizedEmail)}`
        ),
        {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        }
      );

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
  const { user, accessToken } = useUser();
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

  const tokenQueryEnabled = wallets.length > 0 && Boolean(authToken);

  const tokenQuery = useQuery({
    queryKey: [
      'walletTokens',
      'owner-address-batch-v1',
      walletFingerprint,
      authToken,
    ],
    queryFn: async () => {
      const hasDuplicateChains =
        new Set(wallets.map((wallet) => wallet.chain)).size !==
        wallets.length;

      if (hasDuplicateChains) {
        const walletResults = await Promise.all(
          wallets.map(async (wallet) => {
            const result = await WalletService.getWalletTokens(
              [wallet],
              authToken
            );
            return (result.tokens || []).map((token) => ({
              ...token,
              walletAddress: token.walletAddress || wallet.address,
            }));
          })
        );
        const tokens = walletResults.flat();
        const totalValue = tokens.reduce((sum, token) => {
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
          totalValue: totalValue.toFixed(2),
          tokenCount: tokens.length,
        };
      }

      const result = await WalletService.getWalletTokens(
        wallets,
        authToken
      );
      const walletAddressByChain = new Map(
        wallets.map((wallet) => [wallet.chain, wallet.address])
      );

      return {
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
      };
    },
    enabled: tokenQueryEnabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = useMemo<TokenSnapshot>(() => {
    const tokens = tokenQuery.data?.tokens || [];
    const totalValue = tokens.reduce((sum, token) => {
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
  };
};
