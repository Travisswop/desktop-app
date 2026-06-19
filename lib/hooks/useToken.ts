import { useQuery } from '@tanstack/react-query';
import { ChainType } from '@/types/token';
import {
  WalletService,
  Token,
  WalletInput,
} from '@/services/wallet-service';
import { useUser } from '@/lib/UserContext';

const normalizeChain = (chain: string): ChainType =>
  chain.toUpperCase() as ChainType;

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
  const { accessToken } = useUser();

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

  // Single query to fetch all tokens
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'walletTokens',
      'owner-address-v3',
      solWalletAddress,
      evmWalletAddresses,
      chains,
      accessToken,
    ],
    queryFn: async () => {
      if (wallets.length === 0) {
        return { tokens: [], totalValue: '0', tokenCount: 0 };
      }

      // Fetch per wallet so each returned token keeps the signer/source
      // address. The backend currently returns merged token rows without
      // walletAddress, which makes payment flows ambiguous with multiple
      // wallets connected.
      const walletResults = await Promise.all(
        wallets.map(async (wallet) => {
          const result = await WalletService.getWalletTokens(
            [wallet],
            accessToken || undefined
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
    },
    enabled: wallets.length > 0 && !!accessToken,
    staleTime: 60000, // 60 seconds - match refetchInterval to prevent excessive calls
    refetchInterval: 60000, // Refetch every minute
  });

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
