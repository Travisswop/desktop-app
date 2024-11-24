export const CHAIN_CONFIG = {
  ETHEREUM: {
    id: 1,
    network: 'eth-mainnet',
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_ETH_API_KEY,
  },
  POLYGON: {
    id: 137,
    network: 'polygon-mainnet',
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY,
  },
  BASE: {
    id: 8453,
    network: 'base-mainnet',
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_API_KEY,
  },
} as const;
