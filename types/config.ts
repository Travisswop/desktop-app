// A single Alchemy API key is shared across every EVM network — one key works
// for all of them on the same Alchemy account. The env file therefore only
// stores this key; per-chain RPC URLs are derived from it plus the network's
// Alchemy subdomain via `buildAlchemyRpcUrl` / `ALCHEMY_RPC_URLS` below.
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const buildAlchemyRpcUrl = (
  network: string
): string | undefined =>
  ALCHEMY_API_KEY
    ? `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : undefined;

// Pre-built Alchemy RPC URLs per network, derived from the shared key.
export const ALCHEMY_RPC_URLS = {
  ETHEREUM: buildAlchemyRpcUrl('eth-mainnet'),
  POLYGON: buildAlchemyRpcUrl('polygon-mainnet'),
  BASE: buildAlchemyRpcUrl('base-mainnet'),
  ARBITRUM: buildAlchemyRpcUrl('arb-mainnet'),
  SEPOLIA: buildAlchemyRpcUrl('eth-sepolia'),
} as const;

export const EVM_CHAIN_CONFIG = {
  ETHEREUM: {
    id: 1,
    network: 'eth-mainnet',
    apiKey: ALCHEMY_API_KEY,
  },
  POLYGON: {
    id: 137,
    network: 'polygon-mainnet',
    apiKey: ALCHEMY_API_KEY,
  },
  BASE: {
    id: 8453,
    network: 'base-mainnet',
    apiKey: ALCHEMY_API_KEY,
  },
  ARBITRUM: {
    id: 42161,
    network: 'arb-mainnet',
    apiKey: ALCHEMY_API_KEY,
  },
  SEPOLIA: {
    id: 11155111,
    network: 'eth-sepolia',
    apiKey: ALCHEMY_API_KEY,
  },
} as const;

export const CHAINS = {
  ETHEREUM: {
    chainId: 1,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: ALCHEMY_RPC_URLS.ETHEREUM,
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
    rpcUrl: ALCHEMY_RPC_URLS.POLYGON,
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
    rpcUrl: ALCHEMY_RPC_URLS.BASE,
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
  ARBITRUM: {
    chainId: 42161,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: ALCHEMY_RPC_URLS.ARBITRUM,
    nativeToken: {
      uuid: 'ethereum', // Arbitrum uses ETH as native gas token
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    },
    type: 'evm',
  },
  SEPOLIA: {
    chainId: 11155111,
    transactionApiUrl: 'https://api.etherscan.io/v2',
    accessToken: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY_TOKEN,
    rpcUrl: ALCHEMY_RPC_URLS.SEPOLIA || ALCHEMY_RPC_URLS.ETHEREUM,
    nativeToken: {
      uuid: 'ethereum',
      symbol: 'ETH',
      name: 'Sepolia ETH',
      decimals: 18,
    },
    type: 'evm',
  },
} as const;
