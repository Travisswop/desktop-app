import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';
import { MarketData, TokenData } from '@/types/token';

const COIN_RANKING_API_KEY =
  process.env.NEXT_PUBLIC_COIN_RANKING_API_KEY;

// Constants
const CHAINS = {
  ETHEREUM: {
    id: 1,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL,
    nativeToken: {
      uuid: 'razxDUgYGNAdQ',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
  },
  POLYGON: {
    id: 137,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
    nativeToken: {
      uuid: 'iDZ0tG-wI',
      symbol: 'POL',
      name: 'Polygon',
      decimals: 18,
    },
  },
  BASE: {
    id: 8453,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    nativeToken: {
      uuid: 'razxDUgYGNAdQ', // ETH on Base
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
  },
} as const;

// API fetchers
const fetchers = {
  async tokenBalances(chain: keyof typeof CHAINS, address: string) {
    const response = await fetch(CHAINS[chain].alchemyUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [address],
        id: 42,
      }),
    });
    const { result } = await response.json();
    return (
      result.tokenBalances?.filter(
        (token: { tokenBalance: string }) =>
          BigInt(token.tokenBalance) > 0
      ) || []
    );
  },

  async marketData(address: string) {
    const response = await fetch(
      `https://api.coinranking.com/v2/coins?contractAddresses[]=${address}`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );
    const result = await response.json();
    return result.data.coins[0];
  },

  async marketDataByUUID(uuid: string) {
    const response = await fetch(
      `https://api.coinranking.com/v2/coins?uuids[]=${uuid}`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );
    const result = await response.json();
    return result.data.coins[0];
  },

  async timeSeriesData(uuid: string, period: string = '1h') {
    const response = await fetch(
      `https://api.coinranking.com/v2/coin/${uuid}/history?timePeriod=${period}`,
      {
        headers: {
          'x-access-token': COIN_RANKING_API_KEY || '',
        },
      }
    );
    const result = await response.json();
    return result.data;
  },
};

// Custom hook for token contract interactions
const tokenContract = (
  address: string,
  provider?: ethers.JsonRpcProvider
) => {
  const contract =
    provider &&
    new ethers.Contract(
      address,
      [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)',
      ],
      provider
    );

  return {
    async getTokenDetails(walletAddress: string) {
      if (!contract) return null;

      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol(),
        contract.name(),
      ]);

      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
        name,
      };
    },
  };
};

// Main hook for fetching token data across multiple chains
export const useMultiChainTokenData = (
  walletAddress?: string,
  chains: (keyof typeof CHAINS)[] = ['ETHEREUM']
) => {
  const providers = chains.reduce(
    (acc, chain) => ({
      ...acc,
      [chain]: new ethers.JsonRpcProvider(CHAINS[chain].alchemyUrl),
    }),
    {} as Record<string, ethers.JsonRpcProvider>
  );

  // Fetch token balances for each chain
  const chainQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['tokenBalances', chain, walletAddress],
      queryFn: () => fetchers.tokenBalances(chain, walletAddress!),
      enabled: !!walletAddress,
    })),
  });

  // Process token data for each chain
  const tokenQueries = useQueries({
    queries: chainQueries.flatMap((query, chainIndex) => {
      const chain = chains[chainIndex];
      const tokens = query.data || [];

      return tokens.map((token: { contractAddress: string }) => ({
        queryKey: [
          'tokenDetails',
          chain,
          token.contractAddress,
          walletAddress,
        ],
        queryFn: async () => {
          const contract = tokenContract(
            token.contractAddress,
            providers[chain]
          );
          const details = await contract.getTokenDetails(
            walletAddress!
          );
          const marketData: MarketData = await fetchers.marketData(
            token.contractAddress
          );

          if (!marketData) {
            return null;
          }

          const timeSeriesData = await fetchers.timeSeriesData(
            marketData.uuid
          );

          if (!timeSeriesData) {
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
            .filter(Boolean);

          return {
            ...details,
            chain,
            logoURI: `/assets/crypto-icons/${details?.symbol}.png`,
            marketData: {
              ...marketData,
              change: parseFloat(change),
              sparkline: sparklineData,
            },
            timeSeriesData: {
              '1H': sparklineData,
              '1D': [],
              '1W': [],
              '1M': [],
              '1Y': [],
            },
            address: token.contractAddress,
          };
        },
        enabled: !!query.data,
      }));
    }),
  });

  // Fetch native token data for each chain
  const nativeTokenQueries = useQueries({
    queries: chains.map((chain) => ({
      queryKey: ['nativeToken', chain, walletAddress],
      queryFn: async () => {
        const provider = providers[chain];
        const balance = await provider.getBalance(walletAddress!);
        const nativeToken = CHAINS[chain].nativeToken;
        console.log('nativetoken', nativeToken);
        const [marketData, timeSeriesData] = await Promise.all([
          fetchers.marketDataByUUID(nativeToken.uuid),
          fetchers.timeSeriesData(nativeToken.uuid),
        ]);

        if (!timeSeriesData) {
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
          .filter(Boolean);

        return {
          ...nativeToken,
          balance: ethers.formatUnits(balance, nativeToken.decimals),
          logoURI: `/assets/crypto-icons/${nativeToken.symbol}.png`,
          marketData: {
            ...marketData,
            change: parseFloat(change),
            sparkline: sparklineData,
          },
          timeSeriesData: {
            '1H': sparklineData,
            '1D': [],
            '1W': [],
            '1M': [],
            '1Y': [],
          },
          chain,
        };
      },
      enabled: !!walletAddress,
    })),
  });

  // Combine and format all token data
  const allTokens = [...nativeTokenQueries, ...tokenQueries]
    .filter((query) => query.data)
    .map((query) => query.data as TokenData);

  const isLoading =
    chainQueries.some((query) => query.isLoading) ||
    tokenQueries.some((query) => query.isLoading) ||
    nativeTokenQueries.some((query) => query.isLoading);

  const error =
    chainQueries.find((query) => query.error)?.error ||
    tokenQueries.find((query) => query.error)?.error ||
    nativeTokenQueries.find((query) => query.error)?.error;

  return {
    tokens: allTokens,
    loading: isLoading,
    error,
    refetch: () => {
      chainQueries.forEach((query) => query.refetch());
      tokenQueries.forEach((query) => query.refetch());
      nativeTokenQueries.forEach((query) => query.refetch());
    },
  };
};
