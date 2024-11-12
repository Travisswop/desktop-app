import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { MarketData, TokenData } from '@/types/token';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];
const COIN_RANKING_API_KEY =
  process.env.NEXT_PUBLIC_COIN_RANKING_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 5; // Number of tokens to fetch in parallel
const RETRY_DELAY = 1000; // 1 second delay between retries
interface TokenCache {
  data: TokenData;
  timestamp: number;
}

// In-memory cache
const tokenCache = new Map<string, TokenCache>();

const fetchTimeSeriesData = async (uuid: string) => {
  try {
    const response = await fetch(
      `https://api.coinranking.com/v2/coin/${uuid}/history?timePeriod=1h`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw error;
    } else {
      const result = await response.json();
      console.log('🚀 ~ fetchTimeSeriesData ~ result:', result);
      return result.data;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
};

async function fetchMarketData(address: string) {
  try {
    const response = await fetch(
      `https://api.coinranking.com/v2/coins?contractAddresses[]=${address}`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );
    const { data } = await response.json();
    console.log('🚀 ~ fetchMarketData ~ result:', data);
    if (data && data.coins.length > 0) {
      return data.coins[0];
    }

    throw new Error('Data not found');
  } catch (err) {
    console.log('🚀 ~ fetchCoinMarketData ~ err:', err);
    return null;
  }
}

const fetchTokenDataByUUID = async (uuid: string) => {
  try {
    const response = await fetch(
      `https://api.coinranking.com/v2/coins?uuids[]=${uuid}`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );
    const result = await response.json();
    console.log('🚀 ~ fetchTokenDataByUUID ~ result:', result.data);
    return result.data.coins[0];
  } catch (error) {
    console.log('🚀 ~ fetchTokenDataByUUID ~ error:', error);
    return null;
  }
};

const fetchNativeTokenData = async (
  walletAddress: string,
  uuid: string,
  tokenDecimals: number,
  provider: ethers.JsonRpcProvider
): Promise<TokenData | null> => {
  try {
    const [balance, token, timeSeriesData] = await Promise.all([
      provider.getBalance(walletAddress),
      fetchTokenDataByUUID(uuid),
      fetchTimeSeriesData(uuid),
    ]);

    if (!balance && !token && !timeSeriesData) {
      console.log('🚀 ~ timeSeriesData:', timeSeriesData);
      return null;
    }

    const marketData: MarketData = token;

    const { change, history } = timeSeriesData;

    const sparklineData = history
      .map((data: { price: string | null; timestamp: number }) => {
        const price =
          data.price !== null ? parseFloat(data.price) : null;

        return price !== null
          ? { timestamp: data.timestamp, value: price }
          : null;
      })
      .filter(Boolean); // Filter out null entries

    const tokenData: TokenData = {
      name: 'Ethereum',
      symbol: marketData.symbol.toUpperCase(),
      balance: ethers.formatUnits(balance, tokenDecimals),
      decimals: tokenDecimals,
      address: walletAddress, // Using wallet address as a placeholder
      chain: 'evm',
      logoURI: `/assets/crypto-icons/${marketData.symbol.toUpperCase()}.png`,
      marketData: {
        ...marketData,
        change,
        sparkline: sparklineData,
      },
      timeSeriesData: {
        '1H': sparklineData,
        '1D': [],
        '1W': [],
        '1M': [],
        '1Y': [],
      },
    };

    return tokenData;
  } catch (err) {
    console.error('Error fetching native token data:', err);
    return null;
  }
};

export const useTokenData = (
  walletAddress: string | undefined,
  provider?: ethers.JsonRpcProvider
) => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTokenAddresses = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_ALCHEMY_API_URL) return [];
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_ALCHEMY_API_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [walletAddress],
            id: 42,
          }),
          signal: abortControllerRef.current?.signal,
        }
      );

      const { result } = await response.json();

      const filterTokens =
        result.tokenBalances
          ?.filter(
            (token: { tokenBalance: string }) =>
              BigInt(token.tokenBalance) > 0
          )
          .map(
            (token: { contractAddress: string }) =>
              token.contractAddress
          ) || [];

      console.log(
        '🚀 ~ fetchTokenAddresses ~ filterTokens:',
        filterTokens
      );

      return filterTokens;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return [];
      throw err;
    }
  }, [walletAddress]);

  const fetchTokenDetails = useCallback(
    async (
      address: string,
      contract: ethers.Contract
    ): Promise<TokenData | null> => {
      const cacheKey = `${walletAddress}-${address}`;
      const cached = tokenCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('cached data', cached.data);
        return cached.data;
      }

      try {
        const [balance, decimals, symbol, name] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
          contract.symbol(),
          contract.name(),
        ]);

        const marketData = await fetchMarketData(address);
        if (!marketData) {
          return null;
        }
        const timeSeriesData = await fetchTimeSeriesData(
          marketData.uuid
        );
        if (!timeSeriesData) {
          console.log(
            `No time series data for UUID: ${marketData.uuid}`
          );
          return null;
        }
        const { change, history } = timeSeriesData;

        const sparklineData = history
          .map(
            (data: { price: string | null; timestamp: number }) => {
              const price =
                data.price !== null ? parseFloat(data.price) : null;

              return price !== null
                ? { timestamp: data.timestamp, value: price }
                : null;
            }
          )
          .filter(Boolean); // Filter out null entries

        const tokenData: TokenData = {
          name,
          symbol,
          balance: ethers.formatUnits(balance, decimals),
          decimals,
          address,
          chain: 'evm',
          logoURI: `/assets/crypto-icons/${symbol}.png`,
          marketData: {
            ...marketData,
            change,
            sparkline: sparklineData,
          },
          timeSeriesData: {
            '1H': sparklineData,
            '1D': [],
            '1W': [],
            '1M': [],
            '1Y': [],
          },
        };

        tokenCache.set(cacheKey, {
          data: tokenData,
          timestamp: Date.now(),
        });
        return tokenData;
      } catch (err) {
        console.error(`Error fetching token ${address}:`, err);
        return null;
      }
    },
    [walletAddress]
  );

  const fetchTokensInBatches = useCallback(
    async (addresses: string[], provider: ethers.JsonRpcProvider) => {
      const tokens: TokenData[] = [];

      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((address) => {
          const contract = new ethers.Contract(
            address,
            ERC20_ABI,
            provider
          );
          return fetchTokenDetails(address, contract);
        });

        const batchResults = await Promise.all(batchPromises);
        tokens.push(
          ...batchResults.filter((t): t is TokenData => t !== null)
        );

        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < addresses.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY)
          );
        }
      }

      return tokens;
    },
    [fetchTokenDetails]
  );

  useEffect(() => {
    if (!walletAddress || !provider) return;

    const fetchTokens = async () => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const addresses = await fetchTokenAddresses();
        const tokens = await fetchTokensInBatches(
          addresses,
          provider
        );

        const nativeTokenData = await fetchNativeTokenData(
          walletAddress,
          'razxDUgYGNAdQ',
          18,
          provider
        );

        if (nativeTokenData) {
          tokens.unshift(nativeTokenData);
        }

        if (!abortControllerRef.current.signal.aborted) {
          setTokens(tokens);
        }
      } catch (err) {
        if (!abortControllerRef.current.signal.aborted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to fetch tokens')
          );
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTokens();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [
    walletAddress,
    provider,
    fetchTokenAddresses,
    fetchTokensInBatches,
  ]);

  return { tokens, loading, error };
};
