import { useQueries } from '@tanstack/react-query';
import { ChainType } from '@/types/token';
import { UseNFTResult } from '@/types/nft';
import { useMemo } from 'react';
import { EVM_CHAIN_CONFIG } from '@/types/config';
import {
  NFTService,
  processNFTCollections,
} from '@/services/nft-service';

export const useNFT = (
  solWalletAddress?: string,
  evmWalletAddress?: string,
  chains: ChainType[] = ['ETHEREUM']
): UseNFTResult => {
  const evmChains = chains.filter(
    (chain): chain is Exclude<ChainType, 'SOLANA'> =>
      chain !== 'SOLANA'
  );

  const queries = useQueries({
    queries: [
      ...evmChains.map((chain) => ({
        queryKey: ['nfts', chain, evmWalletAddress],
        queryFn: () =>
          NFTService.getNFTsForChain(
            EVM_CHAIN_CONFIG[chain as keyof typeof EVM_CHAIN_CONFIG].network,
            evmWalletAddress!,
            EVM_CHAIN_CONFIG[chain as keyof typeof EVM_CHAIN_CONFIG].apiKey
          ),
        enabled: Boolean(evmWalletAddress),
        retry: 2,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      })),
      {
        queryKey: ['solanaNFTs', solWalletAddress],
        queryFn: () =>
          NFTService.getNFTsForChain('solana', solWalletAddress!),
        enabled: Boolean(solWalletAddress),
        retry: 2,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    ],
  });

  return useMemo(() => {
    const allNFTs = queries
      .flatMap((query) => query.data || [])
      .filter((nft) =>
        Boolean(nft?.name && nft?.image && !nft?.isSpam)
      );

    const { collections, standaloneNFTs } =
      processNFTCollections(allNFTs);

    const hasErrors = queries.some((query) => query.error);
    const isLoading = queries.some((query) => query.isLoading);
    const firstError = queries.find((query) => query.error)?.error;

    return {
      nfts: allNFTs,
      collections,
      standaloneNFTs,
      loading: isLoading,
      error: hasErrors ? (firstError as Error) : null,
      refetch: () => queries.forEach((query) => query.refetch()),
    };
  }, [queries]);
};
