import { ethers } from 'ethers';
import { useQueries } from '@tanstack/react-query';
import { ChainType, EVMChain } from '@/types/token';
import { useMemo } from 'react';
import { CHAINS } from '@/types/config';
import {
  TokenAPIService,
  TokenContractService,
  SolanaService,
  processSparklineData,
} from '@/services/token-service';

// Main hook
export const useMultiChainTokenData = (
  walletAddress?: string,
  chains: ChainType[] = ['ETHEREUM']
) => {
  const evmChains = chains.filter(
    (chain): chain is EVMChain => chain !== 'SOLANA'
  );
  const hasSolana = chains.includes('SOLANA');

  // Initialize providers
  const evmProviders = useMemo(
    () =>
      evmChains.reduce(
        (acc, chain) => ({
          ...acc,
          [chain]: new ethers.JsonRpcProvider(
            CHAINS[chain].alchemyUrl
          ),
        }),
        {} as Record<EVMChain, ethers.JsonRpcProvider>
      ),
    [evmChains]
  );

  // Define queries with proper error boundaries
  const queries = useQueries({
    queries: [
      // EVM Chain Queries
      ...evmChains.map((chain) => ({
        queryKey: ['nativeToken', chain, walletAddress],
        queryFn: async () => {
          const provider = evmProviders[chain];
          const balance = await provider.getBalance(walletAddress!);

          const token = await TokenContractService.getNativeTokens(
            chain
          );

          return {
            ...token,
            balance: ethers.formatUnits(balance, 18),
          };
        },
        enabled: !!walletAddress,
      })),

      ...evmChains.map((chain) => ({
        queryKey: ['evmTokens', chain, walletAddress],
        queryFn: async () => {
          const tokens = await TokenAPIService.getTokenBalances(
            chain,
            walletAddress!
          );
          const provider = evmProviders[chain];

          return Promise.all(
            tokens.map(async (token: { contractAddress: string }) => {
              const details =
                await TokenContractService.getTokenDetails(
                  token.contractAddress,
                  walletAddress!,
                  provider
                );
              if (!details) return null;
              const marketData = await TokenAPIService.getMarketData({
                address: token.contractAddress,
              });
              if (!marketData) return null;

              const timeSeriesData =
                await TokenAPIService.getTimeSeriesData(
                  marketData.uuid
                );

              return {
                ...details,
                chain,
                address: token.contractAddress,
                marketData,
                sparklineData: processSparklineData(timeSeriesData),
              };
            })
          );
        },
        enabled: !!walletAddress,
      })),

      // Solana Query
      ...(hasSolana
        ? [
            {
              queryKey: ['solanaTokens', walletAddress],
              queryFn: async () =>
                await SolanaService.getSplTokens(walletAddress!),
              enabled: !!walletAddress,
            },
          ]
        : []),
    ],
  });

  // Process results
  const processedData = useMemo(() => {
    const allTokens = queries
      .flatMap((query) => query.data || [])
      .filter(Boolean)
      .map((token) => ({
        ...token,
        logoURI: `/assets/crypto-icons/${token.symbol}.png`,
        timeSeriesData: {
          '1H': token.sparklineData || [],
          '1D': [],
          '1W': [],
          '1M': [],
          '1Y': [],
        },
      }));

    return {
      tokens: allTokens,
      loading: queries.some((query) => query.isLoading),
      error: queries.find((query) => query.error)?.error,
      refetch: () => queries.forEach((query) => query.refetch()),
    };
  }, [queries]);

  return processedData;
};
