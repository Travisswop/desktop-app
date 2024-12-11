import { useQueries } from '@tanstack/react-query';
import { ChainType } from '@/types/token';
import { UseNFTResult } from '@/types/nft';
import { useMemo } from 'react';
import { CHAIN_CONFIG } from '@/types/config';
import {
  AlchemyService,
  SolanaService,
  processNFTCollections,
} from '@/services/nft-service';

export const useNFT = (
  walletAddress?: string,
  chains: ChainType[] = ['ETHEREUM']
): UseNFTResult => {
  const evmChains = chains.filter(
    (chain): chain is Exclude<ChainType, 'SOLANA'> =>
      chain !== 'SOLANA'
  );
  const hasSolana = chains.includes('SOLANA');

  const queries = useQueries({
    queries: [
      ...evmChains.map((chain) => ({
        queryKey: ['nfts', chain, walletAddress],
        queryFn: () =>
          AlchemyService.getNFTs(
            CHAIN_CONFIG[chain].network,
            CHAIN_CONFIG[chain].alchemyUrl || '',
            walletAddress!
          ),
        enabled: Boolean(walletAddress),
      })),
      ...(hasSolana
        ? [
            {
              queryKey: ['solanaNFTs', walletAddress],
              queryFn: () => SolanaService.getNFTs(walletAddress!),
              enabled: Boolean(walletAddress),
            },
          ]
        : []),
    ],
  });

  return useMemo(() => {
    const allNFTs = queries
      .flatMap((query) => query.data || [])
      .filter((nft) => Boolean(nft?.name && !nft?.isSpam));

    const { collections, standaloneNFTs } =
      processNFTCollections(allNFTs);

    return {
      nfts: allNFTs,
      collections,
      standaloneNFTs,
      loading: queries.some((query) => query.isLoading),
      error: queries.find((query) => query.error)?.error || null,
      refetch: () => queries.forEach((query) => query.refetch()),
    };
  }, [queries]);
};
