export type ChainType = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

export interface NFT {
  name: string;
  image: string;
  contract: string;
  description: string;
  balance?: string;
  symbol?: string;
  tokenId?: string;
  tokenType?: string;
  collection?: NFTCollection;
  isSpam?: boolean;
  network?: string;
}

export interface AlchemyNftData {
  name: string;
  description: string;
  tokenId: string;
  tokenType: string;
  balance: string;
  contract: {
    address: string;
    openSeaMetadata: {
      imageUrl: string;
      collectionName: string;
      floorPrice?: number;
    };
    isSpam: boolean;
  };
  image: {
    originalUrl: string;
  };
}

export interface AssociatedToken {
  associatedTokenAddress: string;
  mint: string;
  name: string;
  symbol: string;
}

interface MetaplexMetadata {
  metadataUri: string;
  updateAuthority: string;
  sellerFeeBasisPoints: number;
  primarySaleHappened: number;
  isMutable: boolean;
  masterEdition: boolean;
}

export interface NFTMintData {
  mint: string;
  standard: string;
  name: string;
  symbol: string;
  metaplex: MetaplexMetadata;
}

export interface NFTMetadata {
  name: string;
  image: string;
  description: string;
}

export interface NFTCollection {
  collectionName?: string;
  floorPrice?: number;
  openSeaVerificationStatus?: string;
}

export interface NFTCollectionGroup {
  collection: NFTCollection;
  nfts: NFT[];
}

export interface UseNFTResult {
  nfts: NFT[];
  collections: NFTCollectionGroup[];
  standaloneNFTs: NFT[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
