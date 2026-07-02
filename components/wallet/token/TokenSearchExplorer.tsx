'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { fetchTokensFromLiFi } from '@/actions/lifiForTokenSwap';
import { fetchOndoGlobalMarketsTokens } from '@/actions/ondoGlobalMarketsTokens';
import { readTokenChange24h, readTokenPrice } from '@/lib/wallet/tokenMarketQuoteEnrichment';
import type { ChainType, TokenData } from '@/types/token';

import TokenImage from './token-image';

type ExplorerCategory = 'stock' | 'crypto' | 'stable' | 'commodity';
type ExplorerChainId =
  | 'all'
  | '1151111081099710'
  | '1'
  | '137'
  | '8453'
  | '42161';

type ExplorerToken = {
  id?: string;
  address?: string | null;
  symbol?: string;
  name?: string;
  decimals?: number | string;
  chain?: string;
  chainId?: number | string;
  network?: string;
  logoURI?: string;
  icon?: string;
  logo?: string;
  image?: string;
  balance?: number | string;
  value?: number;
  isNative?: boolean;
  isVerified?: boolean;
  tags?: string[];
  marketData?: {
    id?: string;
    price?: number | string;
    currentPrice?: number | string;
    priceChange24h?: number | string;
    priceChangePercentage24h?: number | string;
    change?: number | string;
    change24h?: number | string;
    image?: string;
    iconUrl?: string;
    volume24h?: number;
    marketCap?: number;
  } | null;
  priceUSD?: number | string;
  usdPrice?: number | string;
  price?: number | string;
  priceChange24h?: number | string;
  priceChangePercentage24h?: number | string;
  change24h?: number | string;
  change?: number | string;
};

type ExplorerBucket = {
  network: string;
  tokens: ExplorerToken[];
};

type ExplorerProps = {
  tokens: TokenData[];
  loading: boolean;
  error: Error | null;
  onSelectToken: (token: TokenData) => void;
  onClose: () => void;
};

const SOLANA_CHAIN_ID = '1151111081099710';
const NATIVE_EVM_ADDRESS = '0x0000000000000000000000000000000000000000';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 450;
const RESULT_LIMIT = 120;

const CHAIN_FILTERS: { id: ExplorerChainId; label: string; short: string }[] = [
  { id: 'all', label: 'All chains', short: 'All' },
  { id: SOLANA_CHAIN_ID, label: 'Solana', short: 'Solana' },
  { id: '1', label: 'Ethereum', short: 'Ethereum' },
  { id: '137', label: 'Polygon', short: 'Polygon' },
  { id: '8453', label: 'Base', short: 'Base' },
  { id: '42161', label: 'Arbitrum', short: 'Arbitrum' },
];

const CATEGORY_TABS: { id: ExplorerCategory; label: string }[] = [
  { id: 'stock', label: 'Stocks' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'stable', label: 'Stables' },
  { id: 'commodity', label: 'Commodities' },
];

const CHAIN_TYPE_BY_ID: Record<string, ChainType> = {
  [SOLANA_CHAIN_ID]: 'SOLANA',
  '1': 'ETHEREUM',
  '137': 'POLYGON',
  '8453': 'BASE',
  '42161': 'ARBITRUM',
};

const NETWORK_BY_CHAIN_ID: Record<string, string> = {
  [SOLANA_CHAIN_ID]: 'solana',
  '1': 'ethereum',
  '137': 'polygon',
  '8453': 'base',
  '42161': 'arbitrum',
};

const CHAIN_ID_BY_NETWORK: Record<string, string> = {
  solana: SOLANA_CHAIN_ID,
  ethereum: '1',
  eth: '1',
  polygon: '137',
  matic: '137',
  pol: '137',
  base: '8453',
  arbitrum: '42161',
  arb: '42161',
};

const NETWORK_LABELS: Record<string, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  base: 'Base',
  arbitrum: 'Arbitrum',
};

const NETWORK_ORDER = ['solana', 'ethereum', 'polygon', 'base', 'arbitrum'];

const OLD_APP_TOKEN_CATEGORY_IDS: Record<ExplorerCategory, readonly string[]> = {
  stock: [
    'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
    'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ',
    'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1',
    'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',
    'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ',
    'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
    'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
    'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu',
    'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
    'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw',
    'XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg',
    'PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx',
    'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
    'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB',
    'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu',
    'Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy',
    'XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2',
    'XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe',
    'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX',
    'Xs6B6zawENwAbWVi7w92rjazLuAr5Az59qgWKcNb45x',
    'XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb',
    'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL',
    'XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc',
    'Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH',
    'XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL',
    'XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ',
    'XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV',
    'XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p',
    'PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S',
    'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP',
    'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua',
  ],
  crypto: [
    WSOL_MINT,
    'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
    'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
    'CrAr4RRJMBVwRsZtT62pEhfA9H5utymC2mVx8e7FreP2',
    '98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g',
    'GbbesPbaYh5uiAZSYNXTc7w9jty1rpg3P9L4JeN4LkKc',
    '3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG',
    '9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa',
    NATIVE_EVM_ADDRESS,
  ],
  stable: [
    'Crn4x1Y2HUKko7ox2EZMT6N2t2ZyH7eKtwkBGVnhEq1g',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  ],
  commodity: [
    'AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P',
    'GoLDppdjB1vDTPSGxyMJFqdnj134yH6Prg9eqsGDiw6A',
    'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re',
    '7C56WnJ94iEP7YeH2iKiYpvsS5zkcpP9rJBBEBoUGdzj',
    'C3VLBJB2FhEb47s1WEgroyn3BnSYXaezqtBuu5WNmUGw',
    'EtTQ2QRyf33bd6B2uk7nm1nkinrdGKza66EGdjEY4s7o',
    'AEv6xLECJ2KKmwFGX85mHb9S2c2BQE7dqE5midyrXHBb',
    '9eS6ZsnqNJGGKWq8LqZ95YJLZ219oDuJ1qjsLoKcQkmQ',
  ],
};

const CATEGORY_ADDRESS_SETS: Record<ExplorerCategory, Set<string>> =
  Object.fromEntries(
    Object.entries(OLD_APP_TOKEN_CATEGORY_IDS).map(([category, ids]) => [
      category,
      new Set(ids.map((id) => id.toLowerCase())),
    ]),
  ) as Record<ExplorerCategory, Set<string>>;

const DEFAULT_SOLANA_MINTS = Array.from(
  new Set(Object.values(OLD_APP_TOKEN_CATEGORY_IDS).flat()),
).filter((mint) => !mint.startsWith('0x'));

const FALLBACK_TOKENS: ExplorerToken[] = [
  {
    symbol: 'pUSD',
    name: 'Polymarket USD',
    address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
    decimals: 6,
    chain: 'POLYGON',
    chainId: '137',
    network: 'polygon',
    logoURI: '/images/polymarket-logo.png',
    isVerified: true,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: NATIVE_EVM_ADDRESS,
    decimals: 18,
    chain: 'ETHEREUM',
    chainId: '1',
    network: 'ethereum',
    isNative: true,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chain: 'ETHEREUM',
    chainId: '1',
    network: 'ethereum',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    chain: 'BASE',
    chainId: '8453',
    network: 'base',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    chain: 'ARBITRUM',
    chainId: '42161',
    network: 'arbitrum',
  },
];

const lifiTokenCache = new Map<string, { tokens: ExplorerToken[]; ts: number }>();
let defaultSolanaCache: { tokens: ExplorerToken[]; ts: number } | null = null;

const emptyTimeSeries: TokenData['timeSeriesData'] = {
  '1H': [],
  '1D': [],
  '1W': [],
  '1M': [],
  '1Y': [],
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTokenChainId(token: ExplorerToken): string {
  if (token.chainId !== undefined && token.chainId !== null) {
    return String(token.chainId);
  }

  const chain = String(token.chain || token.network || '').trim().toLowerCase();
  return CHAIN_ID_BY_NETWORK[chain] || '';
}

function getTokenNetwork(token: ExplorerToken) {
  const chainId = getTokenChainId(token);
  if (NETWORK_BY_CHAIN_ID[chainId]) return NETWORK_BY_CHAIN_ID[chainId];
  const normalized = String(token.network || token.chain || '').trim().toLowerCase();
  return CHAIN_ID_BY_NETWORK[normalized] ? normalized : 'ethereum';
}

function getTokenIdentifier(token: ExplorerToken) {
  return String(token.address || token.id || '').trim();
}

function getTokenIdentityKey(token: ExplorerToken) {
  const chainId = getTokenChainId(token);
  const identifier = getTokenIdentifier(token).toLowerCase();
  const symbol = String(token.symbol || '').trim().toLowerCase();
  return [chainId, identifier || symbol, token.decimals ?? ''].join('|');
}

function getTokenImage(token: ExplorerToken) {
  return (
    token.logoURI ||
    token.icon ||
    token.logo ||
    token.image ||
    token.marketData?.image ||
    token.marketData?.iconUrl ||
    ''
  );
}

function normalizeJupiterToken(raw: Record<string, unknown>): ExplorerToken | null {
  const address = String(raw.id || raw.address || raw.mint || '').trim();
  const symbol = String(raw.symbol || '').trim();
  if (!address || !symbol) return null;

  return {
    id: address,
    address,
    symbol,
    name: String(raw.name || symbol),
    decimals: toNumber(raw.decimals, 9),
    chain: 'SOLANA',
    chainId: SOLANA_CHAIN_ID,
    network: 'solana',
    logoURI: String(raw.icon || raw.logoURI || ''),
    price: raw.usdPrice as number | string | undefined,
    usdPrice: raw.usdPrice as number | string | undefined,
    priceChange24h: (raw.stats24h as { priceChange?: unknown } | undefined)
      ?.priceChange as number | string | undefined,
    isNative: address === WSOL_MINT || symbol.toUpperCase() === 'SOL',
    isVerified: raw.isVerified === true,
  };
}

async function fetchJupiterTokens(query: string, signal: AbortSignal) {
  const response = await fetch(
    `https://datapi.jup.ag/v1/assets/search?query=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!response.ok) return [];
  const data = (await response.json().catch(() => [])) as Record<string, unknown>[];
  return data
    .map(normalizeJupiterToken)
    .filter((token): token is ExplorerToken => Boolean(token));
}

async function fetchDefaultSolanaTokens(signal: AbortSignal) {
  if (
    defaultSolanaCache &&
    Date.now() - defaultSolanaCache.ts < CATALOG_CACHE_TTL_MS
  ) {
    return defaultSolanaCache.tokens;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < DEFAULT_SOLANA_MINTS.length; i += 15) {
    chunks.push(DEFAULT_SOLANA_MINTS.slice(i, i + 15));
  }

  const results = await Promise.all(
    chunks.map((chunk) => fetchJupiterTokens(chunk.join(', '), signal).catch(() => [])),
  );
  const tokens = mergeTokens(results.flat());
  defaultSolanaCache = { tokens, ts: Date.now() };
  return tokens;
}

async function fetchLiFiTokensCached(chainId: string) {
  const cached = lifiTokenCache.get(chainId);
  if (cached && Date.now() - cached.ts < CATALOG_CACHE_TTL_MS) {
    return cached.tokens;
  }

  const result = await fetchTokensFromLiFi(chainId, '').catch(() => []);
  const tokens = Array.isArray(result) ? (result as ExplorerToken[]) : [];
  lifiTokenCache.set(chainId, { tokens, ts: Date.now() });
  return tokens;
}

function mergeTokens(tokens: ExplorerToken[]) {
  const map = new Map<string, ExplorerToken>();

  tokens.forEach((token) => {
    const key = getTokenIdentityKey(token);
    if (!key.trim()) return;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, token);
      return;
    }

    const existingBalance = toNumber(existing.balance);
    const nextBalance = toNumber(token.balance);
    const existingValue = toNumber(existing.value);
    const nextValue = toNumber(token.value);

    map.set(key, {
      ...existing,
      ...token,
      balance:
        nextBalance > existingBalance
          ? token.balance
          : existing.balance ?? token.balance,
      value:
        nextValue > existingValue
          ? token.value
          : existing.value ?? token.value,
      logoURI: getTokenImage(token) || getTokenImage(existing),
      marketData: {
        ...(existing.marketData || {}),
        ...(token.marketData || {}),
      },
      isVerified: existing.isVerified || token.isVerified,
    });
  });

  return [...map.values()];
}

function categoryForToken(
  token: ExplorerToken,
  ondoStockAddresses: Set<string>,
): ExplorerCategory {
  const identifier = getTokenIdentifier(token).toLowerCase();
  const symbol = String(token.symbol || '').trim().toLowerCase();
  const name = String(token.name || '').trim().toLowerCase();
  const tags = (token.tags || []).map((tag) => tag.toLowerCase());

  if (
    CATEGORY_ADDRESS_SETS.stock.has(identifier) ||
    ondoStockAddresses.has(identifier) ||
    tags.some((tag) => tag.includes('stock') || tag.includes('ondo')) ||
    name.includes('prestock') ||
    name.includes('tokenized stock') ||
    (symbol.endsWith('on') && symbol !== 'usdon')
  ) {
    return 'stock';
  }

  if (
    CATEGORY_ADDRESS_SETS.stable.has(identifier) ||
    ['usdc', 'usdc.e', 'usdce', 'usdt', 'dai', 'usde', 'pyusd', 'pusd'].some(
      (stable) => symbol === stable || symbol.includes(stable),
    )
  ) {
    return 'stable';
  }

  if (
    CATEGORY_ADDRESS_SETS.commodity.has(identifier) ||
    ['xau', 'xag', 'paxg', 'gold', 'silver', 'oil', 'crude'].some(
      (commodity) => symbol.includes(commodity) || name.includes(commodity),
    )
  ) {
    return 'commodity';
  }

  return 'crypto';
}

function searchTokens(tokens: ExplorerToken[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tokens;

  return tokens.filter((token) => {
    const identifier = getTokenIdentifier(token).toLowerCase();
    return (
      identifier.includes(normalized) ||
      String(token.id || '').toLowerCase().includes(normalized) ||
      String(token.name || '').toLowerCase().includes(normalized) ||
      String(token.symbol || '').toLowerCase().includes(normalized)
    );
  });
}

function chainMatches(token: ExplorerToken, selectedChain: ExplorerChainId) {
  return selectedChain === 'all' || getTokenChainId(token) === selectedChain;
}

function sortTokens(a: ExplorerToken, b: ExplorerToken) {
  const valueDelta = toNumber(b.value) - toNumber(a.value);
  if (valueDelta !== 0) return valueDelta;

  const priceDelta = (readTokenPrice(b) ?? 0) - (readTokenPrice(a) ?? 0);
  if (priceDelta !== 0) return priceDelta;

  return String(a.symbol || a.name || '').localeCompare(
    String(b.symbol || b.name || ''),
  );
}

function getSearchRank(token: ExplorerToken, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  const symbol = String(token.symbol || '').trim().toLowerCase();
  const name = String(token.name || '').trim().toLowerCase();
  const identifier = getTokenIdentifier(token).toLowerCase();
  const id = String(token.id || '').trim().toLowerCase();

  if (symbol === normalized) return 0;
  if (name === normalized) return 1;
  if (symbol.startsWith(normalized)) return 2;
  if (name.startsWith(normalized)) return 3;
  if (identifier === normalized || id === normalized) return 4;
  return 5;
}

function sortTokensForSearch(query: string) {
  return (a: ExplorerToken, b: ExplorerToken) => {
    const rankDelta = getSearchRank(a, query) - getSearchRank(b, query);
    if (rankDelta !== 0) return rankDelta;
    return sortTokens(a, b);
  };
}

function groupByNetwork(tokens: ExplorerToken[]) {
  const grouped = new Map<string, ExplorerToken[]>();

  tokens.forEach((token) => {
    const network = getTokenNetwork(token);
    grouped.set(network, [...(grouped.get(network) || []), token]);
  });

  const ordered: ExplorerBucket[] = NETWORK_ORDER.filter((network) =>
    grouped.has(network),
  ).map((network) => ({
    network,
    tokens: grouped.get(network) || [],
  }));

  grouped.forEach((tokensForNetwork, network) => {
    if (!NETWORK_ORDER.includes(network)) {
      ordered.push({ network, tokens: tokensForNetwork });
    }
  });

  return ordered;
}

function tokenToTokenData(token: ExplorerToken): TokenData {
  const chainId = getTokenChainId(token);
  const chain = CHAIN_TYPE_BY_ID[chainId] || 'ETHEREUM';
  const symbol = String(token.symbol || '').trim() || 'TOKEN';
  const name = String(token.name || symbol).trim();
  const decimals = toNumber(token.decimals, chain === 'SOLANA' ? 9 : 18);
  const price = readTokenPrice(token) ?? 0;
  const change = readTokenChange24h(token) ?? 0;
  const balance = String(token.balance ?? '0');
  const balanceNumber = toNumber(balance);
  const isNative =
    token.isNative === true ||
    (chain === 'SOLANA' && symbol.toUpperCase() === 'SOL') ||
    (chain !== 'SOLANA' && getTokenIdentifier(token).toLowerCase() === NATIVE_EVM_ADDRESS);
  const address = isNative ? null : getTokenIdentifier(token) || null;
  const value =
    typeof token.value === 'number' && Number.isFinite(token.value)
      ? token.value
      : balanceNumber * price;
  const marketId =
    typeof token.marketData?.id === 'string' && token.marketData.id.trim()
      ? token.marketData.id.trim()
      : undefined;

  return {
    name,
    symbol,
    balance,
    decimals,
    chainId: Number(chainId) || undefined,
    address,
    logoURI: getTokenImage(token),
    chain,
    isNative,
    isMarketOnly: balanceNumber <= 0,
    value,
    marketData: {
      id: marketId,
      symbol,
      name,
      image: getTokenImage(token) || undefined,
      iconUrl: getTokenImage(token) || undefined,
      price: price ? String(price) : '0',
      change: String(change),
      priceChangePercentage24h: String(change),
      volume24h: token.marketData?.volume24h,
      marketCap: token.marketData?.marketCap,
    },
    timeSeriesData: emptyTimeSeries,
  };
}

function formatPrice(price: number | null) {
  if (!price || !Number.isFinite(price)) return '--';
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatChange(change: number | null) {
  if (change === null || !Number.isFinite(change)) return null;
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}

function TokenExplorerRow({
  token,
  onSelect,
}: {
  token: ExplorerToken;
  onSelect: (token: ExplorerToken) => void;
}) {
  const tokenData = useMemo(() => tokenToTokenData(token), [token]);
  const price = readTokenPrice(token);
  const change = readTokenChange24h(token);
  const network = getTokenNetwork(token);
  const changeText = formatChange(change);
  const positive = (change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(token)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-black/[0.05] px-5 py-3 text-left transition hover:bg-black/[0.015] sm:grid-cols-[minmax(0,1.35fr)_minmax(88px,0.45fr)_minmax(78px,0.4fr)_34px]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <TokenImage token={tokenData} width={34} height={34} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-gray-900">
            {tokenData.symbol}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
            {tokenData.name} - {NETWORK_LABELS[network] || network}
          </div>
        </div>
      </div>

      <div className="hidden text-right font-mono text-[13px] font-semibold tabular-nums text-gray-900 sm:block">
        {formatPrice(price)}
      </div>

      <div
        className={`hidden text-right font-mono text-[12px] font-semibold tabular-nums sm:block ${
          positive ? 'text-emerald-600' : 'text-red-500'
        }`}
      >
        {changeText || '--'}
      </div>

      <div className="flex justify-end">
        <span
          aria-hidden
          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/[0.06] bg-[#fafafa] text-gray-700"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

export default function TokenSearchExplorer({
  tokens,
  loading,
  error,
  onSelectToken,
  onClose,
}: ExplorerProps) {
  const [catalogTokens, setCatalogTokens] = useState<ExplorerToken[]>([]);
  const [ondoStockAddresses, setOndoStockAddresses] = useState<Set<string>>(
    () => new Set(),
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [remoteSearchTokens, setRemoteSearchTokens] = useState<ExplorerToken[]>([]);
  const [remoteSearching, setRemoteSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ExplorerCategory>('stock');
  const [activeChain, setActiveChain] = useState<ExplorerChainId>('all');

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [
          defaultSolanaTokens,
          solanaTokens,
          ethereumTokens,
          polygonTokens,
          baseTokens,
          arbitrumTokens,
          ondoTokens,
        ] = await Promise.all([
          fetchDefaultSolanaTokens(controller.signal).catch(() => []),
          fetchLiFiTokensCached(SOLANA_CHAIN_ID),
          fetchLiFiTokensCached('1'),
          fetchLiFiTokensCached('137'),
          fetchLiFiTokensCached('8453'),
          fetchLiFiTokensCached('42161'),
          fetchOndoGlobalMarketsTokens().catch(() => []),
        ]);

        if (cancelled) return;

        const nextOndoAddresses = new Set(
          ondoTokens
            .map((token) => String(token.address || token.id || '').toLowerCase())
            .filter(Boolean),
        );

        setOndoStockAddresses(nextOndoAddresses);
        setCatalogTokens(
          mergeTokens([
            ...FALLBACK_TOKENS,
            ...defaultSolanaTokens,
            ...solanaTokens,
            ...ethereumTokens,
            ...polygonTokens,
            ...baseTokens,
            ...arbitrumTokens,
            ...(ondoTokens as ExplorerToken[]),
          ]),
        );
      } catch (loadError) {
        if (cancelled) return;
        setCatalogError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load the token catalog.',
        );
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) {
      setRemoteSearchTokens([]);
      setRemoteSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRemoteSearching(true);
      try {
        const [jupiterTokens, ...lifiResults] = await Promise.all([
          fetchJupiterTokens(trimmed, controller.signal).catch(() => []),
          fetchTokensFromLiFi(SOLANA_CHAIN_ID, trimmed).catch(() => []),
          fetchTokensFromLiFi('1', trimmed).catch(() => []),
          fetchTokensFromLiFi('137', trimmed).catch(() => []),
          fetchTokensFromLiFi('8453', trimmed).catch(() => []),
          fetchTokensFromLiFi('42161', trimmed).catch(() => []),
        ]);

        if (!controller.signal.aborted) {
          setRemoteSearchTokens(
            mergeTokens([
              ...jupiterTokens,
              ...(lifiResults.flat().filter(Boolean) as ExplorerToken[]),
            ]),
          );
        }
      } finally {
        if (!controller.signal.aborted) setRemoteSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [deferredQuery]);

  const walletTokens = tokens as ExplorerToken[];

  const allTokens = useMemo(
    () => mergeTokens([...catalogTokens, ...walletTokens, ...remoteSearchTokens]),
    [catalogTokens, remoteSearchTokens, walletTokens],
  );

  const filteredTokens = useMemo(() => {
    const byQuery = searchTokens(allTokens, deferredQuery);
    return byQuery
      .filter((token) => chainMatches(token, activeChain))
      .filter((token) => categoryForToken(token, ondoStockAddresses) === activeCategory)
      .sort(sortTokensForSearch(query))
      .slice(0, RESULT_LIMIT);
  }, [
    activeCategory,
    activeChain,
    allTokens,
    deferredQuery,
    ondoStockAddresses,
    query,
  ]);

  const groupedTokens = useMemo(() => {
    if (activeChain !== 'all') return null;
    return groupByNetwork(filteredTokens);
  }, [activeChain, filteredTokens]);

  const activeLabel =
    CATEGORY_TABS.find((category) => category.id === activeCategory)?.label ||
    'Tokens';
  const busy = loading || catalogLoading || remoteSearching;

  const handleSelect = useCallback(
    (token: ExplorerToken) => {
      onSelectToken(tokenToTokenData(token));
    },
    [onSelectToken],
  );

  return (
    <div>
      <div className="border-b border-black/[0.05] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, symbol or address"
              className="h-10 w-full rounded-full border border-black/[0.08] bg-white pl-9 pr-9 text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-300"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear token search"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/[0.06] bg-white px-4 text-[13px] font-semibold text-gray-700 transition hover:border-black/[0.15]"
          >
            Done
          </button>
        </div>

        <div className="mt-4 flex gap-5 overflow-x-auto border-b border-black/[0.05]">
          {CATEGORY_TABS.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`relative h-9 shrink-0 text-[13px] font-semibold transition ${
                  active ? 'text-gray-950' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {category.label}
                {active ? (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full bg-gray-950" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          {CHAIN_FILTERS.map((chain) => {
            const active = activeChain === chain.id;
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => setActiveChain(chain.id)}
                className={`h-8 shrink-0 rounded-full border px-3 text-[12px] font-medium transition ${
                  active
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-black/[0.06] bg-white text-gray-700 hover:border-black/[0.15]'
                }`}
              >
                {chain.short}
              </button>
            );
          })}
        </div>
      </div>

      {(error || catalogError) && (
        <div className="mx-5 mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
          Some token sources could not be loaded.
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        <span>{activeLabel}</span>
        <span className="inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {filteredTokens.length} shown
        </span>
      </div>

      {filteredTokens.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-gray-500">
          {busy ? 'Loading tokens...' : 'No tokens found in this category'}
        </div>
      ) : groupedTokens ? (
        groupedTokens.map((group) => (
          <div key={group.network}>
            <div className="border-t border-black/[0.05] bg-gray-50/70 px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              {NETWORK_LABELS[group.network] || group.network}
            </div>
            {group.tokens.map((token) => (
              <TokenExplorerRow
                key={getTokenIdentityKey(token)}
                token={token}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))
      ) : (
        filteredTokens.map((token) => (
          <TokenExplorerRow
            key={getTokenIdentityKey(token)}
            token={token}
            onSelect={handleSelect}
          />
        ))
      )}
    </div>
  );
}
