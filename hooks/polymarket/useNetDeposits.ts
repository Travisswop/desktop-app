import { useQuery } from '@tanstack/react-query';
import { formatUnits, parseAbiItem } from 'viem';
import { safeLocalStorage } from '@/lib/browserStorage';
import { usePolymarketWallet } from '@/providers/polymarket';
import {
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  QUERY_STALE_TIMES,
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  LEGACY_USDC_E_ADDRESS,
  COLLATERAL_ONRAMP_ADDRESS,
} from '@/constants/polymarket';

export type PolymarketCashFlowType = 'deposit' | 'withdrawal';

export type PolymarketCashFlow = {
  id: string;
  type: PolymarketCashFlowType;
  amount: number;
  timestamp?: number;
  blockNumber: number;
  transactionHash?: string;
  token: 'pUSD' | 'USDC.e';
  walletAddress: string;
  counterparty: string;
};

export type NetDeposits = {
  totalDeposited: number;
  totalWithdrawn: number;
  netDeposited: number;
  latestBlock: number;
  deposits: PolymarketCashFlow[];
  withdrawals: PolymarketCashFlow[];
};

type CacheShape = {
  v: number;
  deploymentBlock: number;
  lastScannedBlock: number;
  totalIn: string; // bigint string
  totalOut: string; // bigint string
  cashFlows: PolymarketCashFlow[];
};

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

// Addresses that represent protocol-internal transfers (trading, wrapping).
// Transfers from/to these are NOT external deposits or withdrawals.
const TRADING_EXCLUDED = new Set<string>([
  CTF_EXCHANGE_ADDRESS.toLowerCase(),
  NEG_RISK_CTF_EXCHANGE_ADDRESS.toLowerCase(),
  CTF_CONTRACT_ADDRESS.toLowerCase(),
  NEG_RISK_ADAPTER_ADDRESS.toLowerCase(),
]);

// The CollateralOnramp wraps USDC.e into pUSD.
// - pUSD received FROM this address = conversion, not a new deposit.
// - USDC.e sent TO this address = conversion, not a withdrawal.
const WRAP_CONTRACT = COLLATERAL_ONRAMP_ADDRESS.toLowerCase();

// Counterfactual Safe addresses can receive deposits before the Safe is deployed.
// Scanning from the first "code exists" block would miss those. We scan a bit
// before the deployment block to capture pre-deploy deposits without needing
// to scan the entire chain history.
const PRE_DEPLOY_LOOKBACK_BLOCKS = BigInt(500_000);
// Bumped to 4: cache row-level deposit/withdrawal history with timestamps.
const CACHE_VERSION = 4;

function cacheKey(safeAddress: string) {
  return `pm-net-deposits:${safeAddress.toLowerCase()}`;
}

function readCache(safeAddress: string): CacheShape | null {
  try {
    const raw = safeLocalStorage.getItem(cacheKey(safeAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (
      parsed?.v !== CACHE_VERSION ||
      typeof parsed?.deploymentBlock !== 'number' ||
      typeof parsed?.lastScannedBlock !== 'number' ||
      typeof parsed?.totalIn !== 'string' ||
      typeof parsed?.totalOut !== 'string' ||
      !Array.isArray(parsed?.cashFlows)
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
    safeLocalStorage.setItem(cacheKey(safeAddress), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function normalizeAddresses(address: string | string[] | undefined): string[] {
  const addresses = Array.isArray(address) ? address : address ? [address] : [];
  return Array.from(
    new Map(
      addresses
        .filter(Boolean)
        .map((walletAddress) => [walletAddress.toLowerCase(), walletAddress]),
    ).values(),
  );
}

function sortCashFlows(rows: PolymarketCashFlow[]): PolymarketCashFlow[] {
  return [...rows].sort((a, b) => {
    const timeDelta = (b.timestamp ?? 0) - (a.timestamp ?? 0);
    if (timeDelta !== 0) return timeDelta;
    return b.blockNumber - a.blockNumber;
  });
}

function splitCashFlows(cashFlows: PolymarketCashFlow[]) {
  return {
    deposits: sortCashFlows(
      cashFlows.filter((row) => row.type === 'deposit'),
    ),
    withdrawals: sortCashFlows(
      cashFlows.filter((row) => row.type === 'withdrawal'),
    ),
  };
}

function cashFlowFromLog(params: {
  log: any;
  type: PolymarketCashFlowType;
  token: PolymarketCashFlow['token'];
  safeAddress: string;
  counterparty: string;
}): PolymarketCashFlow | null {
  const { log, type, token, safeAddress, counterparty } = params;
  const value = log.args?.value as bigint | undefined;
  if (typeof value !== 'bigint') return null;

  const amount = Number(formatUnits(value, USDC_E_DECIMALS));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const blockNumber = Number(log.blockNumber ?? 0);
  const txHash =
    typeof log.transactionHash === 'string'
      ? log.transactionHash
      : undefined;
  const logIndex = String(log.logIndex ?? log.transactionIndex ?? '0');

  return {
    id: `${type}:${token}:${txHash ?? blockNumber}:${logIndex}:${safeAddress.toLowerCase()}`,
    type,
    amount,
    blockNumber,
    transactionHash: txHash,
    token,
    walletAddress: safeAddress,
    counterparty,
  };
}

async function hydrateCashFlowTimestamps(
  publicClient: any,
  rows: PolymarketCashFlow[],
): Promise<PolymarketCashFlow[]> {
  const missingBlocks = Array.from(
    new Set(
      rows
        .filter((row) => row.timestamp == null && row.blockNumber > 0)
        .map((row) => row.blockNumber),
    ),
  );

  if (missingBlocks.length === 0) return rows;

  const blockEntries = await Promise.allSettled(
    missingBlocks.map(async (blockNumber) => {
      const block = await publicClient.getBlock({
        blockNumber: BigInt(blockNumber),
      });
      return [blockNumber, Number(block.timestamp)] as const;
    }),
  );

  const timestamps = new Map<number, number>();
  blockEntries.forEach((entry) => {
    if (entry.status === 'fulfilled') {
      timestamps.set(entry.value[0], entry.value[1]);
    }
  });

  return rows.map((row) =>
    row.timestamp == null && timestamps.has(row.blockNumber)
      ? { ...row, timestamp: timestamps.get(row.blockNumber) }
      : row,
  );
}

async function findDeploymentBlock(publicClient: any, safeAddress: `0x${string}`): Promise<number> {
  const latest = await publicClient.getBlockNumber();

  // If code exists at block 0 (unlikely), treat as 0.
  const codeAtLatest = await publicClient.getCode({ address: safeAddress });
  if (!codeAtLatest || codeAtLatest === '0x') return Number(latest);

  let low = BigInt(0);
  let high = latest;

  // Binary search for the first block where code exists.
  while (low + BigInt(1) < high) {
    const mid = (low + high) / BigInt(2);
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

  // Scan pUSD and legacy USDC.e in parallel (both have 6 decimals, 1:1 USD value).
  const [pusdIn, pusdOut, legacyIn, legacyOut] = await Promise.all([
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
    publicClient.getLogs({
      address: LEGACY_USDC_E_ADDRESS,
      event: TRANSFER_EVENT,
      args: { to: safeAddress },
      fromBlock,
      toBlock,
    }),
    publicClient.getLogs({
      address: LEGACY_USDC_E_ADDRESS,
      event: TRANSFER_EVENT,
      args: { from: safeAddress },
      fromBlock,
      toBlock,
    }),
  ]);

  return { pusdIn, pusdOut, legacyIn, legacyOut };
}

async function getNetDepositsForAddress(
  publicClient: any,
  safeAddress: string,
): Promise<NetDeposits> {
  const safe = safeAddress as `0x${string}`;
  const latestBlock = await publicClient.getBlockNumber();

  const cached = readCache(safe);
  const deploymentBlock =
    cached?.deploymentBlock ?? (await findDeploymentBlock(publicClient, safe));

  let totalIn = cached ? BigInt(cached.totalIn) : BigInt(0);
  let totalOut = cached ? BigInt(cached.totalOut) : BigInt(0);
  let cashFlows = cached?.cashFlows ?? [];
  const startBlock =
    BigInt(deploymentBlock) > PRE_DEPLOY_LOOKBACK_BLOCKS
      ? BigInt(deploymentBlock) - PRE_DEPLOY_LOOKBACK_BLOCKS
      : BigInt(0);
  let lastScannedBlock: bigint =
    cached != null
      ? BigInt(cached.lastScannedBlock)
      : startBlock > BigInt(0)
        ? startBlock - BigInt(1)
        : BigInt(0);

  if (lastScannedBlock >= latestBlock) {
    const deposited = Number(formatUnits(totalIn, USDC_E_DECIMALS));
    const withdrawn = Number(formatUnits(totalOut, USDC_E_DECIMALS));
    const { deposits, withdrawals } = splitCashFlows(cashFlows);
    return {
      totalDeposited: deposited,
      totalWithdrawn: withdrawn,
      netDeposited: deposited - withdrawn,
      latestBlock: Number(latestBlock),
      deposits,
      withdrawals,
    };
  }

  // Polygon RPC providers often limit log ranges; scan in chunks.
  const CHUNK = BigInt(50_000);
  let from = lastScannedBlock + BigInt(1);

  while (from <= latestBlock) {
    const to =
      from + CHUNK - BigInt(1) > latestBlock
        ? latestBlock
        : from + CHUNK - BigInt(1);
    const { pusdIn, pusdOut, legacyIn, legacyOut } = await scanTransfers({
      publicClient,
      safeAddress: safe,
      fromBlock: from,
      toBlock: to,
    });

    const safeAddr = safe.toLowerCase();

    // pUSD incoming: exclude trading contracts + wrap contract (conversion, not deposit)
    const newCashFlows: PolymarketCashFlow[] = [];
    for (const log of pusdIn) {
      const fromAddr = String(log.args?.from || '').toLowerCase();
      if (!fromAddr || fromAddr === safeAddr) continue;
      if (TRADING_EXCLUDED.has(fromAddr) || fromAddr === WRAP_CONTRACT) continue;
      const v = log.args?.value as bigint | undefined;
      if (typeof v === 'bigint') {
        totalIn += v;
        const row = cashFlowFromLog({
          log,
          type: 'deposit',
          token: 'pUSD',
          safeAddress: safe,
          counterparty: fromAddr,
        });
        if (row) newCashFlows.push(row);
      }
    }

    // pUSD outgoing: exclude trading contracts (bets, not withdrawals)
    for (const log of pusdOut) {
      const toAddr = String(log.args?.to || '').toLowerCase();
      if (!toAddr || toAddr === safeAddr) continue;
      if (TRADING_EXCLUDED.has(toAddr)) continue;
      const v = log.args?.value as bigint | undefined;
      if (typeof v === 'bigint') {
        totalOut += v;
        const row = cashFlowFromLog({
          log,
          type: 'withdrawal',
          token: 'pUSD',
          safeAddress: safe,
          counterparty: toAddr,
        });
        if (row) newCashFlows.push(row);
      }
    }

    // Legacy USDC.e incoming: exclude trading contracts
    for (const log of legacyIn) {
      const fromAddr = String(log.args?.from || '').toLowerCase();
      if (!fromAddr || fromAddr === safeAddr) continue;
      if (TRADING_EXCLUDED.has(fromAddr)) continue;
      const v = log.args?.value as bigint | undefined;
      if (typeof v === 'bigint') {
        totalIn += v;
        const row = cashFlowFromLog({
          log,
          type: 'deposit',
          token: 'USDC.e',
          safeAddress: safe,
          counterparty: fromAddr,
        });
        if (row) newCashFlows.push(row);
      }
    }

    // Legacy USDC.e outgoing: exclude trading contracts + wrap contract (conversion, not withdrawal)
    for (const log of legacyOut) {
      const toAddr = String(log.args?.to || '').toLowerCase();
      if (!toAddr || toAddr === safeAddr) continue;
      if (TRADING_EXCLUDED.has(toAddr) || toAddr === WRAP_CONTRACT) continue;
      const v = log.args?.value as bigint | undefined;
      if (typeof v === 'bigint') {
        totalOut += v;
        const row = cashFlowFromLog({
          log,
          type: 'withdrawal',
          token: 'USDC.e',
          safeAddress: safe,
          counterparty: toAddr,
        });
        if (row) newCashFlows.push(row);
      }
    }

    if (newCashFlows.length > 0) {
      cashFlows = await hydrateCashFlowTimestamps(publicClient, [
        ...cashFlows,
        ...newCashFlows,
      ]);
    }

    lastScannedBlock = to;
    writeCache(safe, {
      v: CACHE_VERSION,
      deploymentBlock,
      lastScannedBlock: Number(lastScannedBlock),
      totalIn: totalIn.toString(),
      totalOut: totalOut.toString(),
      cashFlows,
    });

    from = to + BigInt(1);
  }

  const deposited = Number(formatUnits(totalIn, USDC_E_DECIMALS));
  const withdrawn = Number(formatUnits(totalOut, USDC_E_DECIMALS));
  const { deposits, withdrawals } = splitCashFlows(cashFlows);

  return {
    totalDeposited: deposited,
    totalWithdrawn: withdrawn,
    netDeposited: deposited - withdrawn,
    latestBlock: Number(latestBlock),
    deposits,
    withdrawals,
  };
}

export function useNetDeposits(safeAddress: string | string[] | undefined) {
  const { publicClient } = usePolymarketWallet();
  const safeAddresses = normalizeAddresses(safeAddress);

  return useQuery({
    queryKey: ['polymarket-net-deposits', safeAddresses],
    queryFn: async (): Promise<NetDeposits> => {
      if (!safeAddresses.length || !publicClient) {
        return {
          totalDeposited: 0,
          totalWithdrawn: 0,
          netDeposited: 0,
          latestBlock: 0,
          deposits: [],
          withdrawals: [],
        };
      }

      const deposits = await Promise.all(
        safeAddresses.map((address) =>
          getNetDepositsForAddress(publicClient, address),
        ),
      );

      const totalDeposited = deposits.reduce(
        (sum, deposit) => sum + deposit.totalDeposited,
        0,
      );
      const totalWithdrawn = deposits.reduce(
        (sum, deposit) => sum + deposit.totalWithdrawn,
        0,
      );
      const latestBlock = deposits.reduce(
        (latest, deposit) => Math.max(latest, deposit.latestBlock),
        0,
      );
      const depositRows = sortCashFlows(
        deposits.flatMap((deposit) => deposit.deposits),
      );
      const withdrawalRows = sortCashFlows(
        deposits.flatMap((deposit) => deposit.withdrawals),
      );

      return {
        totalDeposited,
        totalWithdrawn,
        netDeposited: totalDeposited - totalWithdrawn,
        latestBlock,
        deposits: depositRows,
        withdrawals: withdrawalRows,
      };
    },
    enabled: safeAddresses.length > 0 && !!publicClient,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchOnWindowFocus: false,
  });
}
