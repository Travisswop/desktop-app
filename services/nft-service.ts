import {
  NFT,
  NFTCollectionGroup,
  AssociatedToken,
  NFTMintData,
  NFTMetadata,
  AlchemyNftData,
} from '@/types/nft';
import { APIUtils } from '@/utils/api';

interface MetaplexAsset {
  id: string; // Use the asset ID as the 'contract' or identifier
  content?: {
    metadata?: {
      name?: string;
      description?: string;
      symbol?: string; // Potentially useful
    };
    files?: {
      uri?: string; // Assuming the first file URI is the image
    }[];
    links?: {
      // Check if image might be in links
      image?: string;
    };
  };
}
interface MetaplexResponse {
  result?: {
    items?: MetaplexAsset[];
    total?: number;
    limit?: number;
    page?: number;
  };
  error?: any;
  jsonrpc: string;
  id: number | string;
}

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
        this.transformAlchemyNFT(nft, network)
      );
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  }

  static transformAlchemyNFT(
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

export class SolanaNFTService {
  private static readonly API_ENDPOINT =
    process.env.NEXT_PUBLIC_DAS_API_URL ||
    process.env.NEXT_PUBLIC_HELIUS_API_URL!;

  static async getNFTs(ownerAddress: string): Promise<NFT[]> {
    try {
      const requestBody = {
        jsonrpc: '2.0',
        id: 'swop-get-assets-by-owner',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress,
          page: 1,
          limit: 1000,
        },
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      };

      const response = (await APIUtils.fetchWithRetry(
        this.API_ENDPOINT,
        options
      )) as MetaplexResponse;

      if (response.error) {
        console.error(
          'Error fetching Solana NFTs from DAS API:',
          response.error
        );
        return [];
      }

      const assets = response.result?.items || [];

      // Transform the assets into the NFT format
      return this.transformMetaplexNFTs(assets);
    } catch (error) {
      console.error('Error fetching Solana NFTs:', error);
      return [];
    }
  }

  private static transformMetaplexNFTs(
    assets: MetaplexAsset[]
  ): NFT[] {
    return assets
      .map((asset) => {
        // Try to extract the image URL from different possible locations
        const imageUrl =
          asset.content?.files?.[0]?.uri ||
          asset.content?.links?.image;

        return {
          contract: asset.id,
          description: asset.content?.metadata?.description || '',
          name: asset.content?.metadata?.name || 'Unnamed NFT',
          image: imageUrl || '',
          network: 'solana',

          // collection: { ... }

          tokenId: asset.id, // Metaplex DAS uses a single ID for the asset
          tokenType: 'Metaplex NFT',
          balance: '1', // Assuming non-fungible means balance is 1
          isSpam: false,
        };
      })
      .filter((nft) => !!nft.image);
  }
}

export const processNFTCollections = (
  nfts: NFT[]
): {
  collections: NFTCollectionGroup[];
  standaloneNFTs: NFT[];
} => {
  return nfts.reduce<{
    collections: NFTCollectionGroup[];
    standaloneNFTs: NFT[];
  }>(
    (acc, nft) => {
      // Use optional chaining for potentially undefined collection
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
        // Ensure collection exists before accessing properties
        if (nft.collection) {
          acc.collections.push({
            collection: {
              collectionName: nft.collection.collectionName,
              floorPrice: nft.collection.floorPrice,
              openSeaVerificationStatus:
                nft.collection.openSeaVerificationStatus,
            },
            nfts: [nft],
          });
        } else {
          // Handle case where collection might be unexpectedly undefined
          acc.standaloneNFTs.push(nft);
        }
      }

      return acc;
    },
    { collections: [], standaloneNFTs: [] }
  );
};
