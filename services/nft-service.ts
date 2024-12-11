import {
  NFT,
  NFTCollectionGroup,
  AssociatedToken,
  NFTMintData,
  NFTMetadata,
  AlchemyNftData,
} from '@/types/nft';
import { APIUtils } from '@/utils/api';

export class AlchemyService {
  static async getNFTs(
    network: string,
    apiKey: string,
    address: string
  ): Promise<NFT[]> {
    try {
      const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner/?owner=${address}&withMetadata=true&pageSize=100`;
      const options = {
        method: 'GET',
        headers: { accept: 'application/json' },
      };
      const result = (await APIUtils.fetchWithRetry(
        url,
        options
      )) as { ownedNfts: AlchemyNftData[] };

      return result.ownedNfts.map((nft) =>
        this.transformNFT(nft, network)
      );
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  }

  static transformNFT(
    originalNFT: AlchemyNftData,
    network: string
  ): NFT {
    const isSpecialContract =
      originalNFT.contract.address ===
      '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';

    return {
      balance: originalNFT.balance,
      contract: originalNFT.contract.address,
      name: originalNFT.name,
      description: originalNFT.description,
      tokenId: originalNFT.tokenId,
      tokenType: originalNFT.tokenType,
      image: isSpecialContract
        ? originalNFT.contract.openSeaMetadata.imageUrl
        : originalNFT?.image.originalUrl,
      network,
      collection: {
        collectionName:
          originalNFT.contract.openSeaMetadata.collectionName,
        floorPrice: originalNFT.contract.openSeaMetadata.floorPrice,
      },
      isSpam: originalNFT.contract.isSpam,
    };
  }
}

export class SolanaService {
  private static readonly API_KEY =
    process.env.NEXT_PUBLIC_MORALIS_API_KEY || '';

  static async getNFTs(address: string): Promise<NFT[]> {
    try {
      const tokens = (await this.fetchAssociatedTokens(
        address
      )) as AssociatedToken[];
      if (!tokens.length) return [];

      const metadata = await this.fetchNFTMetadata(tokens);
      const nftData = await this.fetchNFTData(
        metadata as NFTMintData[]
      );

      return this.transformNFTs(
        nftData as NFTMetadata[],
        metadata as NFTMintData[]
      );
    } catch (error) {
      console.error('Error fetching Solana NFTs:', error);
      return [];
    }
  }

  private static async fetchAssociatedTokens(address: string) {
    const url = `https://solana-gateway.moralis.io/account/mainnet/${address}/nft`;
    return APIUtils.fetchWithRetry(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.API_KEY,
      },
    });
  }

  private static async fetchNFTMetadata(tokens: AssociatedToken[]) {
    const metadataPromises = tokens.map((token) =>
      APIUtils.fetchWithRetry(
        `https://solana-gateway.moralis.io/nft/mainnet/${token.mint}/metadata`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.API_KEY,
          },
        }
      )
    );

    return Promise.all(metadataPromises);
  }

  private static async fetchNFTData(metadata: NFTMintData[]) {
    const dataPromises = metadata.map((nft) =>
      APIUtils.fetchWithRetry(nft.metaplex.metadataUri, {})
    );

    return Promise.all(dataPromises);
  }

  private static transformNFTs(
    nftData: NFTMetadata[],
    metadata: NFTMintData[]
  ): NFT[] {
    return nftData.map((nft, index) => ({
      contract: metadata[index].mint,
      description: nft.description,
      name: nft.name,
      image: nft.image,
      network: 'solana',
    }));
  }
}

export const processNFTCollections = (nfts: NFT[]): {
  collections: NFTCollectionGroup[];
  standaloneNFTs: NFT[];
} => {
  return nfts.reduce<{
    collections: NFTCollectionGroup[];
    standaloneNFTs: NFT[];
  }>(
    (acc, nft) => {
      if (!nft.collection?.collectionName) {
        acc.standaloneNFTs.push(nft);
        return acc;
      }

      const existingCollection = acc.collections.find(
        (item) =>
          item.collection.collectionName ===
          nft.collection?.collectionName
      );

      if (existingCollection) {
        existingCollection.nfts.push(nft);
      } else {
        acc.collections.push({
          collection: {
            collectionName: nft.collection.collectionName,
            floorPrice: nft.collection.floorPrice,
            openSeaVerificationStatus:
              nft.collection.openSeaVerificationStatus,
          },
          nfts: [nft],
        });
      }

      return acc;
    },
    { collections: [], standaloneNFTs: [] }
  );
};
