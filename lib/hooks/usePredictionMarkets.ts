/**
 * React Query Hooks for Prediction Markets
 *
 * Server state management for prediction markets data.
 * Uses React Query for caching, refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Connection } from '@solana/web3.js';
import { useUser } from '@/lib/UserContext';
import DFlowService from '@/services/prediction-markets/dflow-service';
import {
  Market,
  MarketDetails,
  MarketFilters,
  Quote,
  TradeParams,
  Position,
  PortfolioSummary,
  MarketTransaction,
  PaginatedResponse,
} from '@/types/prediction-markets';

/**
 * Hook to fetch markets with filters
 */
export const useMarkets = (filters?: MarketFilters, enabled: boolean = true) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'markets', filters],
    queryFn: async () => {
      return await DFlowService.getMarkets(filters, accessToken || undefined);
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch trending markets
 */
export const useTrendingMarkets = (limit: number = 10) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'trending', limit],
    queryFn: async () => {
      return await DFlowService.getTrendingMarkets(limit, accessToken || undefined);
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

/**
 * Hook to fetch market details by ID
 */
export const useMarketDetails = (marketId: string | null, enabled: boolean = true) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'market', marketId],
    queryFn: async () => {
      if (!marketId) throw new Error('Market ID is required');
      return await DFlowService.getMarketById(marketId, accessToken || undefined);
    },
    enabled: enabled && !!marketId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch user positions
 */
export const useUserPositions = (walletAddress?: string, enabled: boolean = true) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'positions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      return await DFlowService.getUserPositions(walletAddress, accessToken || undefined);
    },
    enabled: enabled && !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch portfolio summary
 */
export const usePortfolioSummary = (walletAddress?: string, enabled: boolean = true) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'portfolio', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return {
          totalPositions: 0,
          activePositions: 0,
          totalValue: 0,
          totalCostBasis: 0,
          totalUnrealizedPnL: 0,
          totalUnrealizedPnLPercent: 0,
          redeemablePositions: 0,
          redeemableAmount: 0,
        } as PortfolioSummary;
      }
      return await DFlowService.getPortfolioSummary(walletAddress, accessToken || undefined);
    },
    enabled: enabled && !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch transaction history
 */
export const useTransactionHistory = (
  walletAddress?: string,
  limit: number = 50,
  offset: number = 0,
  enabled: boolean = true
) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: [
      'predictionMarkets',
      'transactions',
      walletAddress,
      limit,
      offset,
    ],
    queryFn: async () => {
      if (!walletAddress) {
        return {
          items: [],
          total: 0,
          limit,
          offset,
          hasMore: false,
        } as PaginatedResponse<MarketTransaction>;
      }
      return await DFlowService.getTransactionHistory(
        walletAddress,
        limit,
        offset,
        accessToken || undefined
      );
    },
    enabled: enabled && !!walletAddress,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to get quote for a trade
 */
export const useGetQuote = () => {
  const { accessToken } = useUser();

  return useMutation({
    mutationFn: async ({
      marketId,
      outcomeId,
      amount,
      side,
    }: {
      marketId: string;
      outcomeId: string;
      amount: number;
      side: 'buy' | 'sell';
    }) => {
      return await DFlowService.getQuote(
        marketId,
        outcomeId,
        amount,
        side,
        accessToken || undefined
      );
    },
  });
};

/**
 * Hook to execute a trade
 */
export const useExecuteTrade = () => {
  const { accessToken } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tradeParams,
      wallet,
      connection,
    }: {
      tradeParams: TradeParams;
      wallet: any;
      connection: Connection;
    }) => {
      return await DFlowService.executeTrade(
        tradeParams,
        wallet,
        connection,
        accessToken || undefined
      );
    },
    onSuccess: (_signature, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'positions', variables.tradeParams.walletAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'portfolio', variables.tradeParams.walletAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'market', variables.tradeParams.marketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'transactions', variables.tradeParams.walletAddress],
      });
    },
  });
};

/**
 * Hook to redeem a position
 */
export const useRedeemPosition = () => {
  const { accessToken } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      positionId,
      walletAddress,
      wallet,
      connection,
    }: {
      positionId: string;
      walletAddress: string;
      wallet: any;
      connection: Connection;
    }) => {
      return await DFlowService.redeemPosition(
        positionId,
        walletAddress,
        wallet,
        connection,
        accessToken || undefined
      );
    },
    onSuccess: (_signature, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'positions', variables.walletAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'portfolio', variables.walletAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ['predictionMarkets', 'transactions', variables.walletAddress],
      });
    },
  });
};

/**
 * Hook to search markets
 */
export const useSearchMarkets = (query: string, enabled: boolean = true) => {
  const { accessToken } = useUser();

  return useQuery({
    queryKey: ['predictionMarkets', 'search', query, accessToken],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return [];
      return await DFlowService.searchMarkets(query, 20, accessToken || undefined);
    },
    enabled: enabled && !!query && query.trim().length >= 2 && !!accessToken,
    staleTime: 60000, // 1 minute
  });
};
