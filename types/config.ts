export const EVM_CHAIN_CONFIG = {
  ETHEREUM: {
    id: 1,
    network: 'eth-mainnet',
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ETH_API_KEY,
  },
  POLYGON: {
    id: 137,
    network: 'polygon-mainnet',
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY,
  },
  BASE: {
    id: 8453,
    network: 'base-mainnet',
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_BASE_API_KEY,
  }
} as const;

export const CHAINS = {
  ETHEREUM: {
    chainId: 1,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL,
    nativeToken: {
      uuid: 'ethereum', // CoinGecko ID for Ethereum
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
    type: 'evm',
  },
  POLYGON: {
    chainId: 137,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
    nativeToken: {
      uuid: 'matic-network', // CoinGecko ID for Polygon
      symbol: 'POL',
      name: 'Polygon',
      decimals: 18,
    },
    type: 'evm',
  },
  BASE: {
    chainId: 8453,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    nativeToken: {
      uuid: 'ethereum', // CoinGecko ID for ETH (Base uses ETH)
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
    type: 'evm',
  },
  SOLANA: {
    transactionApiUrl: '',
    accessToken: undefined,
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
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
