import { NFT, NFTCollectionGroup, AlchemyNftData } from '@/types/nft';
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
    json_uri?: string;
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
  // Note: QuickNode endpoint requires DAS (Digital Asset Standard) API add-on
  private static readonly QUICKNODE_API_ENDPOINT =
    process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_ENDPOINT;

  static async getNFTs(ownerAddress: string): Promise<NFT[]> {
    // Try multiple providers in order
    const providers = [
      () => this.getNFTsFromQuickNode(ownerAddress),
      () => this.getNFTsFromHelius(ownerAddress),
    ];
    for (const [index, provider] of providers.entries()) {
      try {
        const nfts = await provider();

        if (nfts && nfts.length > 0) {
          logger.info(
            `Successfully fetched ${nfts.length} NFTs from provider ${
              index + 1
            }`
          );
          return nfts;
        } else {
          logger.warn(`Provider ${index + 1} returned no NFTs`);
        }
      } catch (error) {
        logger.error(`Provider ${index + 1} failed:`, error);
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

      const transformedNFTs = this.transformMetaplexNFTs(assets);

      return transformedNFTs;
    } catch (error) {
      logger.error('Error fetching Solana NFTs from Helius:', error);
      throw error;
    }
  }

  private static async getNFTsFromQuickNode(
    ownerAddress: string
  ): Promise<NFT[]> {
    try {
      let allNFTs: NFT[] = [];
      let page = 1;
      let pagesFetched = 0;
      let hasMoreResults = true;
      const limit = 1000; // Increased to match Helius
      const maxPages = 10; // Safety limit to prevent infinite loops

      while (hasMoreResults && page <= maxPages) {
        const requestBody = {
          jsonrpc: '2.0',
          id: 1,
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: ownerAddress,
            limit: limit,
            page: page,
            displayOptions: {
              showFungible: false,
              showUnverifiedCollections: true,
              showCollectionMetadata: true,
            },
          },
        };

        const response = await fetch(
          `${this.QUICKNODE_API_ENDPOINT}`,
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

        const assets = data.result?.items || [];
        const total = data.result?.total || 0;

        // Log the full response structure for debugging
        logger.info(
          `QuickNode: Response structure - items: ${assets.length}, total: ${total}, page: ${data.result?.page}, limit: ${data.result?.limit}`
        );

        // Log detailed information for debugging
        logger.info(
          `QuickNode: Page ${page} - Assets: ${assets.length}, Total: ${total}, Limit: ${limit}`
        );
        logger.info(
          `QuickNode: Current total fetched: ${
            allNFTs.length
          }, Has more: ${
            assets.length === limit && assets.length > 0
          }`
        );

        // Transform the assets
        const transformedNFTs = assets.map((asset: any) => {
          // Extract image URL with proper priority
          const imageUrl =
            asset.content?.links?.image ||
            asset.content?.files?.[0]?.uri ||
            asset.content?.json_uri ||
            '';

          // Extract collection information from grouping
          const collectionInfo = asset.grouping?.find(
            (group: any) => group.group_key === 'collection'
          );

          return {
            contract: asset.id,
            description: asset.content?.metadata?.description || '',
            name: asset.content?.metadata?.name || 'Unnamed NFT',
            image: imageUrl,
            network: 'solana',
            tokenId: asset.id,
            tokenType: asset.interface || 'DAS Asset',
            balance: '1',
            collection: collectionInfo
              ? {
                  collectionName:
                    asset.content?.metadata?.symbol ||
                    'Unknown Collection',
                  collectionId: collectionInfo.group_value,
                }
              : undefined,
            isSpam: false,
            // Additional DAS-specific properties
            isCompressed: asset.compression?.compressed || false,
            owner: asset.ownership?.owner,
            creators: asset.creators || [],
            attributes: asset.content?.metadata?.attributes || [],
          };
        });

        allNFTs = allNFTs.concat(transformedNFTs);

        // Log progress
        logger.info(
          `QuickNode: Fetched page ${page}, got ${assets.length} NFTs. Total so far: ${allNFTs.length}/${total}`
        );

        // Check if we need to fetch more pages
        if (assets.length === 0) {
          // No more assets to fetch
          hasMoreResults = false;
        } else if (assets.length < limit) {
          // If we got fewer items than the limit, we've reached the end
          hasMoreResults = false;
        } else if (total > 0 && allNFTs.length >= total) {
          // If we've reached the total and total is known, we're done
          hasMoreResults = false;
        } else {
          // Continue to next page
          page++;
        }

        // Increment pages fetched counter
        pagesFetched++;

        // Add a small delay to avoid rate limiting
        if (hasMoreResults) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      logger.info(
        `QuickNode: Completed fetching. Total NFTs: ${allNFTs.length}, Pages fetched: ${pagesFetched}`
      );
      return allNFTs;
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
    const mappedNFTs = assets.map((asset) => {
      const imageUrl =
        asset.content?.files?.[0]?.uri ||
        asset.content?.links?.image ||
        asset.content?.json_uri;

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
    });

    return mappedNFTs;
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
