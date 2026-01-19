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
  created_at?: string;
  updated_at?: string;
  mint_timestamp?: number;
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
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  static async getNFTs(ownerAddress: string): Promise<NFT[]> {
    logger.info(
      `🔍 Starting Solana NFT fetch for address: ${ownerAddress}`
    );

    // Try multiple providers in order
    const providers = [
      () => this.getNFTsFromQuickNode(ownerAddress),
      () => this.getNFTsFromHelius(ownerAddress),
    ];

    for (const [index, provider] of providers.entries()) {
      const providerName = index === 0 ? 'QuickNode' : 'Helius';
      logger.info(
        `📡 Attempting to fetch NFTs from ${providerName} (provider ${
          index + 1
        })`
      );

      try {
        const startTime = Date.now();
        const nfts = await provider();
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (nfts && nfts.length > 0) {
          logger.info(
            `✅ Successfully fetched ${nfts.length} NFTs from ${providerName} in ${duration}ms`
          );

          // Sort NFTs by creation date (most recent first)
          const sortedNFTs = this.sortNFTsByDate(nfts);

          // Log recent NFTs (last 10)
          this.logRecentNFTs(sortedNFTs);

          return sortedNFTs;
        } else {
          logger.warn(`⚠️ ${providerName} returned no NFTs`);
        }
      } catch (error) {
        logger.error(`❌ ${providerName} failed:`, error);
        continue;
      }
    }

    logger.error('❌ All Solana NFT providers failed');
    return [];
  }

  private static sortNFTsByDate(nfts: NFT[]): NFT[] {
    logger.info(`🔄 Sorting ${nfts.length} NFTs by creation date...`);

    return nfts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      // Sort by most recent first
      return dateB - dateA;
    });
  }

  private static logRecentNFTs(nfts: NFT[]): void {
    const recentCount = Math.min(10, nfts.length);
    logger.info(`📊 Recent NFTs (last ${recentCount}):`);

    nfts.slice(0, recentCount).forEach((nft, index) => {
      const date = nft.createdAt
        ? new Date(nft.createdAt).toISOString()
        : 'Unknown date';
      logger.info(
        `  ${index + 1}. ${nft.name} (${
          nft.tokenId
        }) - Created: ${date}`
      );
    });

    if (nfts.length > recentCount) {
      logger.info(`  ... and ${nfts.length - recentCount} more NFTs`);
    }
  }

  private static async getNFTsFromHelius(
    ownerAddress: string
  ): Promise<NFT[]> {
    logger.info(
      `🌐 Fetching NFTs from Helius for address: ${ownerAddress}`
    );

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

      logger.info(`📤 Sending Helius request with limit: 1000`);

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
      logger.info(`📥 Helius returned ${assets.length} assets`);

      const transformedNFTs = this.transformMetaplexNFTs(assets);
      logger.info(
        `🔄 Transformed ${transformedNFTs.length} NFTs from Helius`
      );

      return transformedNFTs;
    } catch (error) {
      logger.error(
        '❌ Error fetching Solana NFTs from Helius:',
        error
      );
      throw error;
    }
  }

  private static async getNFTsFromQuickNode(
    ownerAddress: string
  ): Promise<NFT[]> {
    logger.info(
      `🌐 Fetching NFTs from QuickNode for address: ${ownerAddress}`
    );

    try {
      let allNFTs: NFT[] = [];
      let page = 1;

      let hasMoreResults = true;
      const limit = 1000; // Increased to match Helius
      const maxPages = 10; // Safety limit to prevent infinite loops

      logger.info(
        `📋 Starting paginated fetch with limit: ${limit}, max pages: ${maxPages}`
      );

      while (hasMoreResults && page <= maxPages) {
        const pageStartTime = Date.now();

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

          // Extract creation timestamp
          const createdAt =
            asset.created_at ||
            (asset.mint_timestamp
              ? new Date(asset.mint_timestamp * 1000).toISOString()
              : undefined);

          return {
            contract: asset.id,
            description: asset.content?.metadata?.description || '',
            name: asset.content?.metadata?.name || 'Unnamed NFT',
            image: imageUrl,
            network: 'solana',
            tokenId: asset.id,
            tokenType: asset.interface || 'DAS Asset',
            balance: '1',
            createdAt: createdAt,
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
          `✅ QuickNode page ${page}: Fetched ${assets.length} NFTs. Total so far: ${allNFTs.length}/${total}`
        );

        // Check if we need to fetch more pages
        if (assets.length === 0) {
          // No more assets to fetch
          hasMoreResults = false;
          logger.info(
            `🏁 QuickNode: No more assets found on page ${page}`
          );
        } else if (assets.length < limit) {
          // If we got fewer items than the limit, we've reached the end
          hasMoreResults = false;
          logger.info(
            `🏁 QuickNode: Reached end of results (${assets.length} < ${limit})`
          );
        } else if (total > 0 && allNFTs.length >= total) {
          // If we've reached the total and total is known, we're done
          hasMoreResults = false;
          logger.info(
            `🏁 QuickNode: Reached total count (${allNFTs.length}/${total})`
          );
        } else {
          // Continue to next page
          page++;
          logger.info(`➡️ QuickNode: Continuing to page ${page}`);
        }

        // Add a small delay to avoid rate limiting
        if (hasMoreResults) {
          logger.info(
            `⏳ QuickNode: Waiting 100ms before next page...`
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return allNFTs;
    } catch (error) {
      logger.error(
        '❌ Error fetching Solana NFTs from QuickNode:',
        error
      );
      throw error;
    }
  }

  private static transformMetaplexNFTs(
    assets: MetaplexAsset[]
  ): NFT[] {
    logger.info(
      `🔄 Transforming ${assets.length} Metaplex assets to NFTs`
    );

    const mappedNFTs = assets.map((asset) => {
      const imageUrl =
        asset.content?.files?.[0]?.uri ||
        asset.content?.links?.image ||
        asset.content?.json_uri;

      // Extract creation timestamp
      const createdAt =
        asset.created_at ||
        (asset.mint_timestamp
          ? new Date(asset.mint_timestamp * 1000).toISOString()
          : undefined);

      return {
        contract: asset.id,
        description: asset.content?.metadata?.description || '',
        name: asset.content?.metadata?.name || 'Unnamed NFT',
        image: imageUrl || '',
        network: 'solana',
        tokenId: asset.id,
        tokenType: 'Metaplex NFT',
        balance: '1',
        createdAt: createdAt,
        isSpam: false,
      };
    });

    logger.info(
      `✅ Transformed ${mappedNFTs.length} Metaplex assets`
    );
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

// Utility functions for NFT analysis
export class NFTAnalysisUtils {
  static analyzeNFTs(nfts: NFT[]): {
    totalCount: number;
    recentNFTs: NFT[];
    oldestNFTs: NFT[];
    collections: Map<string, number>;
    creationDateRange: {
      earliest: string | null;
      latest: string | null;
    };
  } {
    logger.info(`📊 Analyzing ${nfts.length} NFTs...`);

    // Filter NFTs with creation dates
    const nftsWithDates = nfts.filter((nft) => nft.createdAt);
    const nftsWithoutDates = nfts.filter((nft) => !nft.createdAt);

    logger.info(
      `📅 NFTs with creation dates: ${nftsWithDates.length}`
    );
    logger.info(
      `❓ NFTs without creation dates: ${nftsWithoutDates.length}`
    );

    // Sort by creation date
    const sortedByDate = nftsWithDates.sort((a, b) => {
      const dateA = new Date(a.createdAt!).getTime();
      const dateB = new Date(b.createdAt!).getTime();
      return dateB - dateA; // Most recent first
    });

    // Get recent NFTs (last 10)
    const recentNFTs = sortedByDate.slice(0, 10);

    // Get oldest NFTs (first 10 after reverse sort)
    const oldestNFTs = sortedByDate.slice(-10).reverse();

    // Analyze collections
    const collections = new Map<string, number>();
    nfts.forEach((nft) => {
      const collectionName =
        nft.collection?.collectionName || 'Unknown Collection';
      collections.set(
        collectionName,
        (collections.get(collectionName) || 0) + 1
      );
    });

    // Get creation date range
    const dates = nftsWithDates.map(
      (nft) => new Date(nft.createdAt!)
    );
    const earliest =
      dates.length > 0
        ? new Date(
            Math.min(...dates.map((d) => d.getTime()))
          ).toISOString()
        : null;
    const latest =
      dates.length > 0
        ? new Date(
            Math.max(...dates.map((d) => d.getTime()))
          ).toISOString()
        : null;

    const analysis = {
      totalCount: nfts.length,
      recentNFTs,
      oldestNFTs,
      collections,
      creationDateRange: { earliest, latest },
    };

    // Log analysis results
    logger.info(`📈 NFT Analysis Results:`);
    logger.info(`  Total NFTs: ${analysis.totalCount}`);
    logger.info(
      `  Date range: ${analysis.creationDateRange.earliest} to ${analysis.creationDateRange.latest}`
    );
    logger.info(`  Collections found: ${analysis.collections.size}`);

    // Log top collections
    const topCollections = Array.from(analysis.collections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    logger.info(`  Top collections:`);
    topCollections.forEach(([name, count], index) => {
      logger.info(`    ${index + 1}. ${name}: ${count} NFTs`);
    });

    return analysis;
  }

  static getNFTsByDateRange(
    nfts: NFT[],
    startDate: Date,
    endDate: Date
  ): NFT[] {
    return nfts.filter((nft) => {
      if (!nft.createdAt) return false;
      const nftDate = new Date(nft.createdAt);
      return nftDate >= startDate && nftDate <= endDate;
    });
  }

  static getNFTsFromLastDays(nfts: NFT[], days: number): NFT[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.getNFTsByDateRange(nfts, cutoffDate, new Date());
  }

  static logNFTTimeline(nfts: NFT[]): void {
    const nftsWithDates = nfts
      .filter((nft) => nft.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt!).getTime();
        const dateB = new Date(b.createdAt!).getTime();
        return dateA - dateB; // Chronological order
      });

    logger.info(
      `📅 NFT Timeline (${nftsWithDates.length} NFTs with dates):`
    );

    // Group by month for better visualization
    const monthlyGroups = new Map<string, NFT[]>();

    nftsWithDates.forEach((nft) => {
      const date = new Date(nft.createdAt!);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(nft);
    });

    // Log monthly breakdown
    Array.from(monthlyGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, monthNFTs]) => {
        logger.info(`  ${month}: ${monthNFTs.length} NFTs`);

        // Log a few examples from each month
        monthNFTs.slice(0, 3).forEach((nft) => {
          const date = new Date(nft.createdAt!)
            .toISOString()
            .split('T')[0];
          logger.info(`    - ${nft.name} (${date})`);
        });

        if (monthNFTs.length > 3) {
          logger.info(`    ... and ${monthNFTs.length - 3} more`);
        }
      });
  }
}
