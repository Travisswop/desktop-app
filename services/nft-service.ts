import {
  NFT,
  NFTCollectionGroup,
  AssociatedToken,
  NFTMintData,
  NFTMetadata,
  AlchemyNftData,
} from '@/types/nft';
import { APIUtils } from '@/utils/api';
import logger from '../utils/logger';

interface MetaplexAsset {
  id: string;
  content?: {
    metadata?: {
      name?: string;
      description?: string;
      symbol?: string;
    };
    files?: {
      uri?: string;
    }[];
    links?: {
      image?: string;
    };
  };
  interface?: {
    royalty?: {
      basis_points?: number;
    };
  };
  ownership?: {
    frozen?: boolean;
    delegated?: boolean;
  };
  supply?: {
    print_max_supply?: number;
    print_current_supply?: number;
  };
  mutable?: boolean;
  burnt?: boolean;
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

interface MoralisNFT {
  token_address: string;
  token_id: string;
  contract_type: string;
  token_uri?: string;
  metadata?: any;
  name?: string;
  symbol?: string;
  owner_of: string;
  block_number: string;
  block_number_minted: string;
  token_hash: string;
  amount?: string;
  normalized_metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: any[];
  };
}

interface MoralisResponse {
  result: MoralisNFT[];
  cursor?: string;
  page: number;
  page_size: number;
}

// Enhanced Alchemy Service with better error handling
class AlchemyServiceClass {
  static async getNFTs(
    network: string,
    apiKey: string,
    address: string
  ): Promise<NFT[]> {
    if (!apiKey) {
      logger.warn(`No Alchemy API key provided for ${network}`);
      return [];
    }

    try {
      const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner/?owner=${address}&withMetadata=true&pageSize=100`;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-KEY': apiKey,
        },
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `Alchemy API error: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as {
        ownedNfts: AlchemyNftData[];
      };

      if (!result.ownedNfts) {
        logger.warn('No ownedNfts property in Alchemy response');
        return [];
      }

      return result.ownedNfts
        .filter((nft) => nft && !nft.contract?.isSpam)
        .map((nft) => this.transformAlchemyNFT(nft, network));
    } catch (error) {
      logger.error('Error fetching NFTs from Alchemy:', error);
      throw error;
    }
  }

  static transformAlchemyNFT(
    originalNFT: AlchemyNftData,
    network: string
  ): NFT {
    const isSpecialContract =
      originalNFT.contract.address ===
      '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';

    let imageUrl = '';
    if (isSpecialContract) {
      imageUrl = originalNFT.contract.openSeaMetadata?.imageUrl || '';
    } else if (originalNFT.image) {
      imageUrl = originalNFT.image.originalUrl || '';
    }

    return {
      balance: originalNFT.balance || '1',
      contract: originalNFT.contract.address,
      name: originalNFT.name || 'Unnamed NFT',
      description: originalNFT.description || '',
      tokenId: originalNFT.tokenId,
      tokenType: originalNFT.tokenType,
      image: imageUrl,
      network,
      collection: {
        collectionName:
          originalNFT.contract.openSeaMetadata?.collectionName,
        floorPrice: originalNFT.contract.openSeaMetadata?.floorPrice,
      },
      isSpam: originalNFT.contract.isSpam || false,
    };
  }
}

// Moralis API Service (as fallback for EVM chains)
export class MoralisService {
  private static readonly BASE_URL =
    'https://deep-index.moralis.io/api/v2.2';

  static async getNFTs(
    address: string,
    chain: string = 'eth'
  ): Promise<NFT[]> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY;
      if (!apiKey) {
        throw new Error('Moralis API key not provided');
      }

      const url = `${this.BASE_URL}/${address}/nft?chain=${chain}&format=decimal&media_items=false&normalizeMetadata=true&limit=100`;
      const options = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-Key': apiKey,
        },
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `Moralis API error: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as MoralisResponse;

      return result.result.map((nft) =>
        this.transformMoralisNFT(nft, chain)
      );
    } catch (error) {
      logger.error('Error fetching NFTs from Moralis:', error);
      throw error;
    }
  }

  private static transformMoralisNFT(
    nft: MoralisNFT,
    network: string
  ): NFT {
    const metadata = nft.normalized_metadata || nft.metadata;

    return {
      balance: nft.amount || '1',
      contract: nft.token_address,
      name: metadata?.name || nft.name || 'Unnamed NFT',
      description: metadata?.description || '',
      tokenId: nft.token_id,
      tokenType: nft.contract_type,
      image: metadata?.image || '',
      network,
      collection: {
        collectionName: nft.name || nft.symbol,
      },
      isSpam: false,
    };
  }
}

// Enhanced Solana NFT Service with multiple providers
class SolanaNFTServiceClass {
  private static readonly HELIUS_API_ENDPOINT =
    'https://mainnet.helius-rpc.com';
  private static readonly QUICKNODE_API_ENDPOINT =
    'https://solana-mainnet.core.chainstack.com';

  static async getNFTs(ownerAddress: string): Promise<NFT[]> {
    // Try multiple providers in order
    const providers = [
      () => this.getNFTsFromHelius(ownerAddress),
      () => this.getNFTsFromQuickNode(ownerAddress),
    ];

    for (const provider of providers) {
      try {
        const nfts = await provider();
        if (nfts && nfts.length > 0) {
          return nfts;
        }
      } catch (error) {
        logger.warn(
          'Solana NFT provider failed, trying next:',
          error
        );
        continue;
      }
    }

    logger.error('All Solana NFT providers failed');
    return [];
  }

  private static async getNFTsFromHelius(
    ownerAddress: string
  ): Promise<NFT[]> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      if (!apiKey) {
        throw new Error('Helius API key not provided');
      }

      const requestBody = {
        jsonrpc: '2.0',
        id: 'swop-get-assets-by-owner',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
          },
        },
      };

      const response = await fetch(
        `${this.HELIUS_API_ENDPOINT}/?api-key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      const data = (await response.json()) as MetaplexResponse;

      if (data.error) {
        throw new Error(
          `Helius API error: ${JSON.stringify(data.error)}`
        );
      }

      const assets = data.result?.items || [];
      return this.transformMetaplexNFTs(assets);
    } catch (error) {
      logger.error('Error fetching Solana NFTs from Helius:', error);
      throw error;
    }
  }

  private static async getNFTsFromQuickNode(
    ownerAddress: string
  ): Promise<NFT[]> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_QUICKNODE_API_KEY;
      if (!apiKey) {
        throw new Error('QuickNode API key not provided');
      }

      const requestBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'qn_fetchNFTs',
        params: {
          wallet: ownerAddress,
          omitFields: ['provenance', 'traits'],
          page: 1,
          perPage: 40,
        },
      };

      const response = await fetch(
        `${this.QUICKNODE_API_ENDPOINT}/${apiKey}/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(
          `QuickNode API error: ${JSON.stringify(data.error)}`
        );
      }

      return (
        data.result?.assets?.map((asset: any) => ({
          contract: asset.mintAddress,
          description: asset.description || '',
          name: asset.name || 'Unnamed NFT',
          image: asset.imageUrl || '',
          network: 'solana',
          tokenId: asset.mintAddress,
          tokenType: 'SPL Token',
          balance: '1',
          isSpam: false,
        })) || []
      );
    } catch (error) {
      logger.error(
        'Error fetching Solana NFTs from QuickNode:',
        error
      );
      throw error;
    }
  }

  private static transformMetaplexNFTs(
    assets: MetaplexAsset[]
  ): NFT[] {
    return assets
      .filter((asset) => asset && !asset.burnt)
      .map((asset) => {
        const imageUrl =
          asset.content?.files?.[0]?.uri ||
          asset.content?.links?.image;

        return {
          contract: asset.id,
          description: asset.content?.metadata?.description || '',
          name: asset.content?.metadata?.name || 'Unnamed NFT',
          image: imageUrl || '',
          network: 'solana',
          tokenId: asset.id,
          tokenType: 'Metaplex NFT',
          balance: '1',
          isSpam: false,
        };
      })
      .filter((nft) => !!nft.image && !!nft.name);
  }
}

// Enhanced main NFT service with fallback mechanisms
export class NFTService {
  static async getNFTsForChain(
    network: string,
    address: string,
    apiKey?: string
  ): Promise<NFT[]> {
    if (network === 'solana') {
      return SolanaNFTServiceClass.getNFTs(address);
    }

    // For EVM chains, try multiple providers in order
    const providers = [
      () =>
        AlchemyServiceClass.getNFTs(network, apiKey || '', address),
      () =>
        MoralisService.getNFTs(
          address,
          this.mapNetworkToMoralis(network)
        ),
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const nfts = await provider();
        if (nfts && nfts.length >= 0) {
          // Accept empty arrays as valid responses
          return nfts;
        }
      } catch (error) {
        logger.warn(
          `NFT provider failed for ${network}, trying next:`,
          error
        );
        lastError = error as Error;
        continue;
      }
    }

    logger.error(
      `All NFT providers failed for ${network}:`,
      lastError
    );
    throw (
      lastError || new Error(`Failed to fetch NFTs for ${network}`)
    );
  }

  private static mapNetworkToMoralis(network: string): string {
    const networkMap: Record<string, string> = {
      'eth-mainnet': 'eth',
      'polygon-mainnet': 'polygon',
      'base-mainnet': 'base',
    };
    return networkMap[network] || 'eth';
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
          acc.standaloneNFTs.push(nft);
        }
      }

      return acc;
    },
    { collections: [], standaloneNFTs: [] }
  );
};

// Export for backward compatibility
export const AlchemyService = AlchemyServiceClass;
export const SolanaNFTService = SolanaNFTServiceClass;
