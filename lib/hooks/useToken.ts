import { useQuery } from '@tanstack/react-query';
import { ChainType } from '@/types/token';
import {
  WalletService,
  Token,
  WalletInput,
} from '@/services/wallet-service';
import { useUser } from '@/lib/UserContext';

/**
 * Simplified useMultiChainTokenData Hook
 *
 * Fetches all tokens (native + ERC-20/SPL) from the unified backend API.
 * No frontend logic for handling different token types - backend does everything.
 */
export const useMultiChainTokenData = (
  solWalletAddress?: string,
  evmWalletAddress?: string,
  chains: ChainType[] = ['ETHEREUM']
) => {
  const { accessToken } = useUser();

  // Build wallet list based on provided addresses and chains
  const wallets: WalletInput[] = [];

  if (evmWalletAddress) {
    // Add requested EVM chains
    const evmChains = chains.filter((chain) => chain !== 'SOLANA');
    for (const chain of evmChains) {
      wallets.push({
        address: evmWalletAddress,
        chain: chain.toLowerCase() as 'ethereum' | 'polygon' | 'base',
      });
    }
  }

  if (solWalletAddress && chains.includes('SOLANA')) {
    wallets.push({
      address: solWalletAddress,
      chain: 'solana' as const,
    });
  }

  // Single query to fetch all tokens
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'walletTokens',
      solWalletAddress,
      evmWalletAddress,
      chains,
      accessToken,
    ],
    queryFn: async () => {
      if (wallets.length === 0) {
        return { tokens: [], totalValue: '0', tokenCount: 0 };
      }

      // Use access token from UserContext for authentication
      return await WalletService.getWalletTokens(
        wallets,
        accessToken || undefined
      );
    },
    enabled: wallets.length > 0 && !!accessToken,
    staleTime: 60000, // 60 seconds - match refetchInterval to prevent excessive calls
    refetchInterval: 60000, // Refetch every minute
  });

  // Transform tokens to include logoURI and timeSeriesData for backward compatibility
  // Note: Tokens are already sorted by value on the backend
  const tokens = (data?.tokens || []).map((token: Token) => ({
    ...token,
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
