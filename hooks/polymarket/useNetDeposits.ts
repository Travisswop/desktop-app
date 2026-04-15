import { useQuery } from '@tanstack/react-query';
import { formatUnits, parseAbiItem } from 'viem';
import { usePolymarketWallet } from '@/providers/polymarket';
import {
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  QUERY_STALE_TIMES,
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';

type NetDeposits = {
  totalDeposited: number;
  totalWithdrawn: number;
  netDeposited: number;
  latestBlock: number;
};

type CacheShape = {
  v: number;
  deploymentBlock: number;
  lastScannedBlock: number;
  totalIn: string; // bigint string
  totalOut: string; // bigint string
};

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const EXCLUDED = new Set<string>([
  CTF_EXCHANGE_ADDRESS.toLowerCase(),
  NEG_RISK_CTF_EXCHANGE_ADDRESS.toLowerCase(),
  CTF_CONTRACT_ADDRESS.toLowerCase(),
  NEG_RISK_ADAPTER_ADDRESS.toLowerCase(),
]);

// Counterfactual Safe addresses can receive deposits before the Safe is deployed.
// Scanning from the first "code exists" block would miss those. We scan a bit
// before the deployment block to capture pre-deploy deposits without needing
// to scan the entire chain history.
const PRE_DEPLOY_LOOKBACK_BLOCKS = 500_000n;
const CACHE_VERSION = 2;

function cacheKey(safeAddress: string) {
  return `pm-net-deposits:${safeAddress.toLowerCase()}`;
}

function readCache(safeAddress: string): CacheShape | null {
  try {
    const raw = localStorage.getItem(cacheKey(safeAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (
      parsed?.v !== CACHE_VERSION ||
      typeof parsed?.deploymentBlock !== 'number' ||
      typeof parsed?.lastScannedBlock !== 'number' ||
      typeof parsed?.totalIn !== 'string' ||
      typeof parsed?.totalOut !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(safeAddress: string, cache: CacheShape) {
  try {
    localStorage.setItem(cacheKey(safeAddress), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

async function findDeploymentBlock(publicClient: any, safeAddress: `0x${string}`): Promise<number> {
  const latest = await publicClient.getBlockNumber();

  // If code exists at block 0 (unlikely), treat as 0.
  const codeAtLatest = await publicClient.getCode({ address: safeAddress });
  if (!codeAtLatest || codeAtLatest === '0x') return Number(latest);

  let low = 0n;
  let high = latest;

  // Binary search for the first block where code exists.
  while (low + 1n < high) {
    const mid = (low + high) / 2n;
    const code = await publicClient.getCode({
      address: safeAddress,
      blockNumber: mid,
    });
    if (code && code !== '0x') {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Number(high);
}

async function scanTransfers(params: {
  publicClient: any;
  safeAddress: `0x${string}`;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const { publicClient, safeAddress, fromBlock, toBlock } = params;

  const [incoming, outgoing] = await Promise.all([
    publicClient.getLogs({
      address: USDC_E_CONTRACT_ADDRESS,
      event: TRANSFER_EVENT,
      args: { to: safeAddress },
      fromBlock,
      toBlock,
    }),
    publicClient.getLogs({
      address: USDC_E_CONTRACT_ADDRESS,
      event: TRANSFER_EVENT,
      args: { from: safeAddress },
      fromBlock,
      toBlock,
    }),
  ]);

  return { incoming, outgoing };
}

export function useNetDeposits(safeAddress: string | undefined) {
  const { publicClient } = usePolymarketWallet();

  return useQuery({
    queryKey: ['polymarket-net-deposits', safeAddress],
    queryFn: async (): Promise<NetDeposits> => {
      if (!safeAddress || !publicClient) {
        return { totalDeposited: 0, totalWithdrawn: 0, netDeposited: 0, latestBlock: 0 };
      }

      const safe = safeAddress as `0x${string}`;
      const latestBlock = await publicClient.getBlockNumber();

      const cached = readCache(safe);
      const deploymentBlock = cached?.deploymentBlock ?? (await findDeploymentBlock(publicClient, safe));

      let totalIn = cached ? BigInt(cached.totalIn) : 0n;
      let totalOut = cached ? BigInt(cached.totalOut) : 0n;
      const startBlock = BigInt(deploymentBlock) > PRE_DEPLOY_LOOKBACK_BLOCKS
        ? BigInt(deploymentBlock) - PRE_DEPLOY_LOOKBACK_BLOCKS
        : 0n;
      let lastScannedBlock: bigint = cached != null
        ? BigInt(cached.lastScannedBlock)
        : startBlock > 0n ? startBlock - 1n : 0n;

      if (lastScannedBlock >= latestBlock) {
        const deposited = Number(formatUnits(totalIn, USDC_E_DECIMALS));
        const withdrawn = Number(formatUnits(totalOut, USDC_E_DECIMALS));
        return { totalDeposited: deposited, totalWithdrawn: withdrawn, netDeposited: deposited - withdrawn, latestBlock: Number(latestBlock) };
      }

      // Polygon RPC providers often limit log ranges; scan in chunks.
      const CHUNK = 50_000n;
      let from = lastScannedBlock + 1n;

      while (from <= latestBlock) {
        const to = from + CHUNK - 1n > latestBlock ? latestBlock : from + CHUNK - 1n;
        const { incoming, outgoing } = await scanTransfers({
          publicClient,
          safeAddress: safe,
          fromBlock: from,
          toBlock: to,
        });

        for (const log of incoming) {
          const fromAddr = String(log.args?.from || '').toLowerCase();
          if (!fromAddr || fromAddr === safe.toLowerCase()) continue;
          if (EXCLUDED.has(fromAddr)) continue;
          const v = log.args?.value as bigint | undefined;
          if (typeof v === 'bigint') totalIn += v;
        }

        for (const log of outgoing) {
          const toAddr = String(log.args?.to || '').toLowerCase();
          if (!toAddr || toAddr === safe.toLowerCase()) continue;
          if (EXCLUDED.has(toAddr)) continue;
          const v = log.args?.value as bigint | undefined;
          if (typeof v === 'bigint') totalOut += v;
        }

        lastScannedBlock = to;
        writeCache(safe, {
          v: CACHE_VERSION,
          deploymentBlock,
          lastScannedBlock: Number(lastScannedBlock),
          totalIn: totalIn.toString(),
          totalOut: totalOut.toString(),
        });

        from = to + 1n;
      }

      const deposited = Number(formatUnits(totalIn, USDC_E_DECIMALS));
      const withdrawn = Number(formatUnits(totalOut, USDC_E_DECIMALS));

      return { totalDeposited: deposited, totalWithdrawn: withdrawn, netDeposited: deposited - withdrawn, latestBlock: Number(latestBlock) };
    },
    enabled: !!safeAddress && !!publicClient,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchOnWindowFocus: false,
  });
}
