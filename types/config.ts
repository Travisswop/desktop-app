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
  SEPOLIA: {
    id: 11155111,
    network: 'eth-sepolia',
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY,
  },
} as const;

export const CHAINS = {
  ETHEREUM: {
    transactionApiUrl: 'https://api.etherscan.io',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL,
    nativeToken: {
      uuid: 'ethereum', // CoinGecko ID for Ethereum
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
    type: 'evm',
  },
  POLYGON: {
    transactionApiUrl: 'https://api.polygonscan.com',
    accessToken: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
    nativeToken: {
      uuid: 'matic-network', // CoinGecko ID for Polygon
      symbol: 'POL',
      name: 'Polygon',
      decimals: 18,
    },
    type: 'evm',
  },
  BASE: {
    transactionApiUrl: 'https://api.basescan.org',
    accessToken: process.env.NEXT_PUBLIC_BASESCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    nativeToken: {
      uuid: 'ethereum', // CoinGecko ID for ETH (Base uses ETH)
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
    type: 'evm',
  },
  SEPOLIA: {
    transactionApiUrl: 'https://api-sepolia.etherscan.io',
    accessToken: process.env.NEXT_PUBLIC_SEPOLIA_ETHERSCAN_API_KEY_TOKEN,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL,
    nativeToken: {
      uuid: 'ethereum', // CoinGecko ID for ETH (testnet)
      symbol: 'ETH',
      name: 'Ethereum (Sepolia)',
      decimals: 18,
    },
    type: 'evm',
  },
  SOLANA: {
    transactionApiUrl: '',
    accessToken: undefined,
    alchemyUrl: process.env.NEXT_PUBLIC_ALCHEMY_SOLANA_URL,
    nativeToken: {
      uuid: 'solana', // CoinGecko ID for Solana
      symbol: 'SOL',
      name: 'SOLANA',
      decimals: 9,
      color: '#66F9A1',
    },
    type: 'solana',
  },
} as const;
