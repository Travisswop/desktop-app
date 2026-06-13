import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  toCoinType,
  type Address,
} from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

type PublicEnsResolution = {
  address: Address;
  ensName: string;
  chainSpecific: boolean;
};

const CACHE_DURATION_MS = 5 * 60 * 1000;
const CCIP_GATEWAYS = ['https://ccip.ens.xyz'];
const MAINNET_ENS_RPC_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL ||
  'https://ethereum-rpc.publicnode.com';

const publicEnsClient = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_ENS_RPC_URL),
});

const ensCache = new Map<
  string,
  { value: PublicEnsResolution | null; timestamp: number }
>();

const EVM_CHAIN_IDS: Record<string, number> = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  ARBITRUM: 42161,
  SEPOLIA: 11155111,
};

function normalizeNetwork(value?: string | number | null) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.includes('ARB') || normalized === '42161') {
    return 'ARBITRUM';
  }
  if (normalized.includes('BASE') || normalized === '8453') {
    return 'BASE';
  }
  if (
    normalized.includes('POLYGON') ||
    normalized.includes('MATIC') ||
    normalized === '137'
  ) {
    return 'POLYGON';
  }
  if (normalized.includes('SEPOLIA') || normalized === '11155111') {
    return 'SEPOLIA';
  }
  return 'ETHEREUM';
}

function cacheKey(name: string, network?: string | number | null) {
  return `${normalizeNetwork(network)}:${name.toLowerCase()}`;
}

export function looksLikePublicEnsName(value?: string | null) {
  const trimmed = String(value || '')
    .trim()
    .replace(/^@/, '');
  if (!trimmed) return false;
  if (!trimmed.includes('.')) return false;
  if (trimmed.toLowerCase().endsWith('.swop.id')) return false;
  if (isAddress(trimmed)) return false;
  return /^[^\s/]+$/.test(trimmed);
}

export async function resolvePublicEnsName(
  value: string,
  network?: string | number | null,
): Promise<PublicEnsResolution | null> {
  const rawName = value.trim().replace(/^@/, '');
  if (!looksLikePublicEnsName(rawName)) return null;

  let ensName = '';
  try {
    ensName = normalize(rawName);
  } catch {
    return null;
  }

  const key = cacheKey(ensName, network);
  const cached = ensCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.value;
  }

  const chainId = EVM_CHAIN_IDS[normalizeNetwork(network)];
  const coinTypes =
    chainId && chainId !== 1 && chainId !== 11155111
      ? [toCoinType(chainId), undefined]
      : [undefined];

  for (const coinType of coinTypes) {
    const address = await publicEnsClient
      .getEnsAddress({
        name: ensName,
        gatewayUrls: CCIP_GATEWAYS,
        ...(coinType ? { coinType } : {}),
      })
      .catch(() => null);

    if (address) {
      const value = {
        address: getAddress(address),
        ensName,
        chainSpecific: Boolean(coinType),
      };
      ensCache.set(key, { value, timestamp: Date.now() });
      return value;
    }
  }

  ensCache.set(key, { value: null, timestamp: Date.now() });
  return null;
}
