import { useQueries } from "@tanstack/react-query";
import { ChainType } from "@/types/token";
import { UseNFTResult } from "@/types/nft";
import { useMemo } from "react";
import { CHAIN_CONFIG } from "@/types/config";
import {
  AlchemyService,
  SolanaService,
  processNFTCollections,
} from "@/services/nft-service";

export const useNFT = (
  solWalletAddress?: string,
  evmWalletAddress?: string,
  chains: ChainType[] = ["ETHEREUM"]
): UseNFTResult => {
  const evmChains = chains.filter(
    (chain): chain is Exclude<ChainType, "SOLANA"> => chain !== "SOLANA"
  );
  const hasSolana = chains.includes("SOLANA");

  const queries = useQueries({
    queries: [
      ...evmChains.map((chain) => ({
        queryKey: ["nfts", chain, evmWalletAddress],
        queryFn: () =>
          AlchemyService.getNFTs(
            CHAIN_CONFIG[chain].network,
            CHAIN_CONFIG[chain].alchemyUrl || "",
            evmWalletAddress!
          ),
        enabled: Boolean(evmWalletAddress),
      })),
      ...(hasSolana
        ? [
            {
              queryKey: ["solanaNFTs", solWalletAddress],
              queryFn: () => SolanaService.getNFTs(solWalletAddress!),
              enabled: Boolean(solWalletAddress),
            },
          ]
        : []),
    ],
  });

  return useMemo(() => {
    const allNFTs = queries
      .flatMap((query) => query.data || [])
      .filter((nft) => Boolean(nft?.name && !nft?.isSpam));

    const { collections, standaloneNFTs } = processNFTCollections(allNFTs);

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
