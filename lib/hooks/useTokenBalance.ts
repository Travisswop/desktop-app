import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';
import { Connection, PublicKey } from '@solana/web3.js';
import { MarketData, TokenData } from '@/types/token';

const COIN_RANKING_API_KEY =
  process.env.NEXT_PUBLIC_COIN_RANKING_API_KEY;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL;

let apiCall = 0;

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
  SOLANA: {
    id: 0,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL,
    nativeToken: {
      uuid: 'zNZHO_Sjf', // ETH on Base
      symbol: 'SOL',
      name: 'SOLANA',
      decimals: 9,
      color: '#66F9A1',
    },
  },
} as const;

const NATIVE_SOL_METADATA = {
  name: 'Solana',
  symbol: 'SOL',
  decimals: 9,
  color: '#66F9A1',
  uuid: 'zNZHO_Sjf',
};

// API fetchers
const fetchers = {
  async tokenBalances(chain: keyof typeof CHAINS, address: string) {
    apiCall += 1;
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
    apiCall += 1;
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
    apiCall += 1;
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
    apiCall += 1;
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

  async fetchCoinRankingUUID(address: string[]) {
    const url = `https://api.coinranking.com/v2/coins?contractAddresses[]=${address.join(
      '&contractAddresses[]='
    )}`;
    console.log('🚀 ~ fetchCoinRankingUUID ~ url:', url);
    const response = await fetch(url, {
      headers: {
        'x-access-token': COIN_RANKING_API_KEY || '',
      },
    });
    const result = await response.json();
    return result.data.coins;
  },
};

// Solana token fetchers
const solanaFetchers = {
  async getTokenMetadata(contractAddress: string) {
    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getAsset',
            id: 'my-id',
            params: { id: contractAddress },
          }),
        }
      );

      const { result } = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  },

  async getSplTokens(address: string) {
    if (!address) return [];

    try {
      const publicKey = new PublicKey(address);
      const connection = new Connection(SOLANA_RPC_URL!, 'confirmed');

      // Get SOL balance
      const balance = await connection.getBalance(publicKey);
      const formatBalance =
        balance / 10 ** NATIVE_SOL_METADATA.decimals;

      const nativeSol = CHAINS['SOLANA'].nativeToken;

      const nativeToken = {
        symbol: nativeSol.symbol,
        name: nativeSol.name,
        decimals: nativeSol.decimals,
        balance: formatBalance.toString(),
        address: 'SOL',
        chain: 'solana' as const,
        logoURI: '/assets/crypto-icons/SOL.png',
        marketData: {
          uuid: nativeSol.uuid,
          price: '0',
          change: 0,
          sparkline: [],
          color: nativeSol.color,
        },
      };

      // Get SPL tokens
      const tokenAccounts =
        await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey(
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          ),
        });

      const tokenData = tokenAccounts.value
        .map(async (token) => {
          const { info } = token.account.data.parsed;
          return {
            decimals: info.tokenAmount.decimals,
            balance: info.tokenAmount.uiAmountString,
            address: info.mint,
          };
        })
        .filter(Boolean);

      const tokens = await Promise.all(tokenData);

      const tokenAddresses = tokens.map((item) => item.address);

      const marketData = await fetchers.fetchCoinRankingUUID(
        tokenAddresses
      );

      const formatData = marketData.map((item, index) => {
        return {
          ...tokens[index],
          name: item.name,
          symbol: item.symbol,
          marketData: {
            ...item,
            uuid: item.uuid,
          },
        };
      });

      return [nativeToken, ...formatData];
    } catch (error) {
      console.error('Error fetching Solana tokens:', error);
      return [];
    }
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
  chains: ('ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA')[] = [
    'ETHEREUM',
  ]
) => {
  const evmProviders = chains
    .filter((chain) => chain !== 'SOLANA')
    .reduce(
      (acc, chain) => ({
        ...acc,
        [chain]: new ethers.JsonRpcProvider(CHAINS[chain].alchemyUrl),
      }),
      {} as Record<string, ethers.JsonRpcProvider>
    );

  const evmChains = chains.filter((chain) => chain !== 'SOLANA');
  const hasSolana = chains.includes('SOLANA');

  // Fetch EVM token balances
  const evmChainQueries = useQueries({
    queries: evmChains.map((chain) => ({
      queryKey: ['tokenBalances', chain, walletAddress],
      queryFn: () => fetchers.tokenBalances(chain, walletAddress!),
      enabled: !!walletAddress,
    })),
  });

  // Fetch Solana tokens
  const solanaTokenQuery = useQueries({
    queries: hasSolana
      ? [
          {
            queryKey: ['solanaTokens', walletAddress],
            queryFn: () =>
              solanaFetchers.getSplTokens(walletAddress!),
            enabled: !!walletAddress,
          },
        ]
      : [],
  });

  // Process EVM token data
  const evmTokenQueries = useQueries({
    queries: evmChainQueries.flatMap((query, chainIndex) => {
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
            evmProviders[chain]
          );
          const details = await contract.getTokenDetails(
            walletAddress!
          );
          const marketData: MarketData = await fetchers.marketData(
            token.contractAddress
          );

          if (!details || !marketData) return null;

          const timeSeriesData = await fetchers.timeSeriesData(
            marketData.uuid
          );

          const sparklineData = processSparklineData(timeSeriesData);

          return formatTokenData({
            ...details,
            chain,
            address: token.contractAddress,
            marketData,
            sparklineData,
          });
        },
        enabled: !!query.data,
      }));
    }),
  });

  // Fetch native token data for EVM chain
  const evmNativeTokenQueries = useQueries({
    queries: evmChains.map((chain) => ({
      queryKey: ['nativeToken', chain, walletAddress],
      queryFn: async () => {
        const provider = evmProviders[chain];
        const balance = await provider.getBalance(walletAddress!);
        const nativeToken = CHAINS[chain].nativeToken;

        const [marketData, timeSeriesData] = await Promise.all([
          fetchers.marketDataByUUID(nativeToken.uuid),
          fetchers.timeSeriesData(nativeToken.uuid),
        ]);

        const sparklineData = processSparklineData(timeSeriesData);

        return formatTokenData({
          ...nativeToken,
          balance: ethers.formatUnits(balance, nativeToken.decimals),
          chain,
          marketData,
          sparklineData,
        });
      },
      enabled: !!walletAddress,
    })),
  });

  // Solana token data with market data
  const solanaTokensWithMarketData = useQueries({
    queries: solanaTokenQuery[0]?.data
      ? solanaTokenQuery[0].data.map((token: any) => ({
          queryKey: ['solanaMarketData', token.address],
          queryFn: async () => {
            if (token.marketData.uuid) {
              const [marketData, timeSeriesData] = await Promise.all([
                fetchers.marketDataByUUID(token.marketData.uuid),
                fetchers.timeSeriesData(token.marketData.uuid),
              ]);

              const sparklineData =
                processSparklineData(timeSeriesData);

              return formatTokenData({
                ...token,
                marketData,
                sparklineData,
              });
            }
            return token;
          },
          enabled: !!token,
        }))
      : [],
  });

  const allTokens = [
    ...evmNativeTokenQueries,
    ...evmTokenQueries,
    ...solanaTokensWithMarketData,
  ]
    .filter((query) => query.data)
    .map((query) => query.data as TokenData);

  const isLoading =
    evmChainQueries.some((query) => query.isLoading) ||
    evmTokenQueries.some((query) => query.isLoading) ||
    evmNativeTokenQueries.some((query) => query.isLoading) ||
    (solanaTokenQuery[0]?.isLoading ?? false) ||
    solanaTokensWithMarketData.some((query) => query.isLoading);

  const error =
    evmChainQueries.find((query) => query.error)?.error ||
    evmTokenQueries.find((query) => query.error)?.error ||
    evmNativeTokenQueries.find((query) => query.error)?.error ||
    solanaTokenQuery[0]?.error ||
    solanaTokensWithMarketData.find((query) => query.error)?.error;

  return {
    tokens: allTokens,
    loading: isLoading,
    error,
    refetch: () => {
      evmChainQueries.forEach((query) => query.refetch());
      evmTokenQueries.forEach((query) => query.refetch());
      evmNativeTokenQueries.forEach((query) => query.refetch());
      solanaTokenQuery[0]?.refetch();
      solanaTokensWithMarketData.forEach((query) => query.refetch());
    },
  };
};

const processSparklineData = (timeSeriesData: any) => {
  if (!timeSeriesData) return [];

  const { history } = timeSeriesData;
  return history
    .map((data: { price: string | null; timestamp: number }) => {
      const price =
        data.price !== null ? parseFloat(data.price) : null;
      return price !== null
        ? { timestamp: data.timestamp, value: price }
        : null;
    })
    .filter(Boolean);
};

const formatTokenData = ({
  chain,
  address,
  symbol,
  name,
  decimals,
  balance,
  marketData,
  sparklineData,
}: any): TokenData => ({
  symbol,
  name,
  decimals,
  balance,
  address,
  chain,
  logoURI: `/assets/crypto-icons/${symbol}.png`,
  marketData: {
    ...marketData,
    change: parseFloat(marketData.change || '0'),
    sparkline: sparklineData,
  },
  timeSeriesData: {
    '1H': sparklineData,
    '1D': [],
    '1W': [],
    '1M': [],
    '1Y': [],
  },
});
