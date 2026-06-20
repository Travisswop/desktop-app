'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpDown,
  Info,
  Settings,
  Search,
  X,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import Image from 'next/image';
import {
  fetchTokensFromLiFi,
  getLifiQuote as fetchLifiQuote,
} from '@/actions/lifiForTokenSwap';
import { getJupiterBuild as fetchJupiterBuild } from '@/actions/jupiterSwap';
import { notifySwapFee } from '@/actions/notifySwapFee';
import {
  usePrivy,
  useSendTransaction,
  useWallets,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useSignTransaction,
} from '@privy-io/react-auth/solana';
import {
  createPublicClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  http,
} from 'viem';
import { arbitrum, base, bsc, mainnet, polygon } from 'viem/chains';
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import Cookies from 'js-cookie';
import { useNewSocketChat } from '@/lib/context/NewSocketChatContext';
import { useUser } from '@/lib/UserContext';
import { useModalStore } from '@/zustandStore/modalstore';
import {
  getWalletNotificationService,
  formatUSDValue,
} from '@/lib/utils/walletNotifications';
import {
  useSearchParams,
  useRouter,
  usePathname,
} from 'next/navigation';
import bs58 from 'bs58';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { MarketService } from '@/services/market-service';
import {
  decimalAmountToRawUnits,
  getSafeSwapInputAmount,
  normalizeTokenDecimals,
} from '@/lib/wallet/swapAmounts';
import {
  enrichTokenCategoryListsWithMarketQuotes,
  enrichTokenListWithMarketQuotes,
  readTokenChange24h,
  readTokenPrice,
  type TokenMarketQuote,
} from '@/lib/wallet/tokenMarketQuoteEnrichment';
import {
  ensureSponsoredSolanaTokenAccount,
  isNativeSolMint,
} from '@/lib/solana/sponsoredTokenAccounts';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level LiFi token cache
// Persists across component re-mounts for the lifetime of the browser tab.
// Avoids re-fetching the same token lists on every drawer open.
// ─────────────────────────────────────────────────────────────────────────────

const _lifiTokenCache = new Map<
  string,
  { tokens: any[]; ts: number }
>();
const LIFI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MARKET_QUOTE_CACHE_TTL_MS = 60 * 1000; // 1 minute

const _tokenMarketQuoteCache = new Map<
  string,
  { quote: TokenMarketQuote | null; ts: number }
>();

const PLATFORM_FEE_BPS = 50;
const COPY_TRADE_REWARD_BPS = 25;
const COPY_TRADE_REWARD_MODE = 'swop_reward_wallet';
const SWOP_REWARD_TOKEN = {
  symbol: 'SWOP',
  mint: 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
  chain: 'solana',
  decimals: 9,
};
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const LIFI_NATIVE_SOL_ADDRESS = '11111111111111111111111111111111';
const DEFAULT_SOLANA_RPC_URL =
  'https://dacey-pp61jd-fast-mainnet.helius-rpc.com/';

const getSolanaRpcUrl = () =>
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  DEFAULT_SOLANA_RPC_URL;

type CopyTradeRewardPreview = {
  sourcePostId?: string;
  isSelf?: boolean;
  feeBps?: number;
  rewardBps?: number;
  rewardMode?: string;
  feeRouting?: string;
  claimAvailable?: boolean;
  claimMessage?: string;
  rewardToken?: typeof SWOP_REWARD_TOKEN;
  trader?: {
    userId?: string;
    smartsiteId?: string | null;
    name?: string;
    rewardWalletAddress?: string;
  };
};

const isCopyTradeParamEnabled = (value?: string | null) =>
  value === '1' || value === 'true';

const normalizeCopyTradeRewardPreview = (
  data: any,
  sourcePostId: string,
): CopyTradeRewardPreview => {
  const preview = {
    ...data,
    sourcePostId,
  } as CopyTradeRewardPreview;
  const feeBps = Number(preview.feeBps || 0);
  const rewardBps = Number(preview.rewardBps || 0);

  if (preview.isSelf && feeBps <= 0 && rewardBps <= 0) {
    preview.feeBps = PLATFORM_FEE_BPS;
    preview.rewardBps = 0;
    preview.claimAvailable = false;
    preview.claimMessage =
      'No copy-trade reward is created when you copy your own trade.';
  }

  return preview;
};

const JUPITER_MAX_COMPUTE_UNITS = 1_400_000;
const U64_MAX = BigInt('0xffffffffffffffff');

type JupiterApiInstruction = {
  programId: string;
  accounts?: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string;
};

type JupiterBuildResponse = {
  outAmount?: string;
  computeBudgetInstructions?: JupiterApiInstruction[];
  setupInstructions?: JupiterApiInstruction[];
  swapInstruction?: JupiterApiInstruction;
  cleanupInstruction?: JupiterApiInstruction | null;
  otherInstructions?: JupiterApiInstruction[];
  tipInstruction?: JupiterApiInstruction | null;
  addressesByLookupTableAddress?: Record<string, string[]> | null;
  blockhashWithMetadata?: {
    blockhash: number[];
    lastValidBlockHeight: number;
  };
};

function decodeJupiterInstruction(ix?: JupiterApiInstruction | null) {
  if (!ix) return null;

  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: (ix.accounts || []).map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(ix.data, 'base64'),
  });
}

function buildLookupTableAccounts(
  tables?: Record<string, string[]> | null,
) {
  if (!tables) return [];

  return Object.entries(tables).map(
    ([tableAddress, addresses]) =>
      new AddressLookupTableAccount({
        key: new PublicKey(tableAddress),
        state: {
          deactivationSlot: U64_MAX,
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          authority: undefined,
          addresses: addresses.map(
            (address) => new PublicKey(address),
          ),
        },
      }),
  );
}

function getBuildBlockhash(build: JupiterBuildResponse) {
  const raw = build.blockhashWithMetadata?.blockhash;
  if (!raw?.length) {
    throw new Error(
      'Jupiter build response did not include a blockhash.',
    );
  }
  return bs58.encode(Uint8Array.from(raw));
}

function buildJupiterVersionedTransaction({
  build,
  feePayer,
  computeUnitLimit = JUPITER_MAX_COMPUTE_UNITS,
}: {
  build: JupiterBuildResponse;
  feePayer: string;
  computeUnitLimit?: number;
}) {
  const swapInstruction = decodeJupiterInstruction(
    build.swapInstruction,
  );
  if (!swapInstruction) {
    throw new Error(
      'Jupiter build response did not include a swap instruction.',
    );
  }

  const maybeInstructions = [
    ...(build.setupInstructions || []).map(decodeJupiterInstruction),
    swapInstruction,
    decodeJupiterInstruction(build.cleanupInstruction),
    ...(build.otherInstructions || []).map(decodeJupiterInstruction),
    decodeJupiterInstruction(build.tipInstruction),
  ];

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnitLimit,
    }),
    ...(build.computeBudgetInstructions || []).map(
      decodeJupiterInstruction,
    ),
    ...maybeInstructions,
  ].filter(Boolean) as TransactionInstruction[];

  const message = new TransactionMessage({
    payerKey: new PublicKey(feePayer),
    recentBlockhash: getBuildBlockhash(build),
    instructions,
  }).compileToV0Message(
    buildLookupTableAccounts(build.addressesByLookupTableAddress),
  );

  return new VersionedTransaction(message);
}

async function detectSolanaTokenProgram(
  connection: Connection,
  mint: string,
) {
  try {
    const mintInfo = await connection.getAccountInfo(
      new PublicKey(mint),
    );
    if (mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    }
  } catch {
    // Fall through to the standard SPL Token program.
  }
  return TOKEN_PROGRAM_ID;
}

async function fetchLiFiTokensCached(
  chainId: string,
): Promise<any[]> {
  const cached = _lifiTokenCache.get(chainId);
  if (cached && Date.now() - cached.ts < LIFI_CACHE_TTL_MS) {
    return cached.tokens;
  }
  const result = await fetchTokensFromLiFi(chainId, '').catch(
    () => [],
  );
  const arr = Array.isArray(result) ? result : [];
  _lifiTokenCache.set(chainId, { tokens: arr, ts: Date.now() });
  return arr;
}

function getTokenMarketAddress(token: any): string {
  return String(token?.address || token?.id || '').trim();
}

function getTokenMarketKey(token: any): string {
  return getTokenMarketAddress(token).toLowerCase();
}

function getTokenMarketChain(token: any): string {
  const cid = token?.chainId?.toString?.();
  if (cid) return getNetworkByChainId(cid);
  return String(
    token?.network || token?.chain || 'ethereum',
  ).toLowerCase();
}

function getCachedTokenMarketQuote(key: string) {
  const cached = _tokenMarketQuoteCache.get(key);
  if (cached && Date.now() - cached.ts < MARKET_QUOTE_CACHE_TTL_MS) {
    return cached.quote;
  }
  return undefined;
}

async function fetchTokenMarketQuotes(
  tokens: any[],
  accessToken?: string,
): Promise<Record<string, TokenMarketQuote>> {
  const resolved: Record<string, TokenMarketQuote> = {};
  const missing: Array<{
    address: string;
    chain: string;
    key: string;
  }> = [];
  const seen = new Set<string>();

  tokens.forEach((token) => {
    const key = getTokenMarketKey(token);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const cached = getCachedTokenMarketQuote(key);
    if (cached !== undefined) {
      if (cached) resolved[key] = cached;
      return;
    }

    missing.push({
      address: getTokenMarketAddress(token),
      chain: getTokenMarketChain(token),
      key,
    });
  });

  const chunks: Array<typeof missing> = [];
  for (let i = 0; i < missing.length; i += 50) {
    chunks.push(missing.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    if (!chunk.length) continue;
    try {
      const priceMap = await MarketService.getPricesByAddresses(
        chunk.map(({ address, chain }) => ({ address, chain })),
        accessToken,
      );

      chunk.forEach(({ key }) => {
        const quote = priceMap[key] || null;
        _tokenMarketQuoteCache.set(key, { quote, ts: Date.now() });
        if (quote) resolved[key] = quote;
      });
    } catch (error) {
      console.warn('Failed to enrich token market quotes:', error);
      chunk.forEach(({ key }) => {
        _tokenMarketQuoteCache.set(key, {
          quote: null,
          ts: Date.now(),
        });
      });
    }
  }

  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain / explorer helpers
// ─────────────────────────────────────────────────────────────────────────────

const getChainIcon = (chainName: string) => {
  const chainIcons: Record<string, string> = {
    SOLANA: '/assets/icons/solana.png',
    ETHEREUM: '/images/IconShop/eTH@3x.png',
    BSC: '/images/IconShop/binance-smart-chain.png',
    POLYGON: '/images/IconShop/polygon@3x.png',
    ARBITRUM: '/assets/icons/arbitrum.png',
    BASE: '/assets/icons/base.png',
  };
  return chainIcons[chainName.toUpperCase()] || null;
};

const getChainId = (chainName: string) => {
  const chainIds: Record<string, string> = {
    SOLANA: '1151111081099710',
    ETHEREUM: '1',
    BSC: '56',
    POLYGON: '137',
    ARBITRUM: '42161',
    BASE: '8453',
  };
  return chainIds[chainName.toUpperCase()] || '1';
};

const isPrivyEmbeddedWalletType = (walletClientType?: string) =>
  walletClientType === 'privy' || walletClientType === 'privy-v2';

const isPrivyEmbeddedSolanaWallet = (wallet?: any) =>
  Boolean(
    wallet &&
    (isPrivyEmbeddedWalletType(wallet.walletClientType) ||
      wallet.connectorType === 'embedded'),
  );

const normalizeEvmAddress = (address?: string | null) =>
  typeof address === 'string' ? address.trim().toLowerCase() : '';

const normalizeWalletAddress = (address?: string | null) =>
  address?.trim().toLowerCase() ?? '';

const getAccountField = (
  account: any,
  camelKey: string,
  snakeKey: string,
) => account?.[camelKey] ?? account?.[snakeKey];

const maskIdentifier = (value?: string | null) => {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const getPrivyEmbeddedSolanaWalletId = (
  privyUser: any,
  walletAddress?: string | null,
) => {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  if (!normalizedAddress) return null;

  const linkedAccounts = privyUser?.linkedAccounts || [];
  const solanaWalletAccounts = linkedAccounts.filter(
    (linkedAccount: any) =>
      linkedAccount?.type === 'wallet' &&
      getAccountField(linkedAccount, 'chainType', 'chain_type') ===
        'solana',
  );
  const account = solanaWalletAccounts.find((linkedAccount: any) => {
    const connectorType = getAccountField(
      linkedAccount,
      'connectorType',
      'connector_type',
    );
    const walletClientType = getAccountField(
      linkedAccount,
      'walletClientType',
      'wallet_client_type',
    );

    return (
      connectorType === 'embedded' &&
      isPrivyEmbeddedWalletType(walletClientType) &&
      normalizeWalletAddress(linkedAccount?.address) ===
        normalizedAddress
    );
  });

  console.log('[Solana sponsorship] User wallet ID resolution', {
    selectedWallet: maskIdentifier(walletAddress),
    linkedAccountCount: linkedAccounts.length,
    solanaWalletAccounts: solanaWalletAccounts.map(
      (linkedAccount: any) => ({
        address: maskIdentifier(linkedAccount?.address),
        id: maskIdentifier(linkedAccount?.id),
        chainType: getAccountField(
          linkedAccount,
          'chainType',
          'chain_type',
        ),
        connectorType: getAccountField(
          linkedAccount,
          'connectorType',
          'connector_type',
        ),
        walletClientType: getAccountField(
          linkedAccount,
          'walletClientType',
          'wallet_client_type',
        ),
        hasId: Boolean(linkedAccount?.id),
      }),
    ),
    matchedWalletId: maskIdentifier(account?.id),
  });

  return typeof account?.id === 'string' && account.id.length > 0
    ? account.id
    : null;
};

const formatShortWalletAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const parseOptionalBigInt = (value: unknown) => {
  if (value === undefined || value === null || value === '')
    return undefined;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  return BigInt(String(value));
};

const normalizeHexQuantity = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '')
    return undefined;
  if (typeof value === 'bigint') {
    if (value < 0n) return undefined;
    return `0x${value.toString(16)}`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const whole = Math.trunc(value);
    if (whole < 0) return undefined;
    return `0x${whole.toString(16)}`;
  }
  if (typeof value === 'string') {
    const rawValue = value.trim();
    if (!rawValue) return undefined;
    try {
      const parsed = BigInt(rawValue);
      if (parsed < 0n) return undefined;
      return `0x${parsed.toString(16)}`;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const sanitizeEvmTxRequest = (request: any, fromAddress?: string) => {
  if (!request || typeof request !== 'object') return request;

  const sanitized = { ...request };
  const numericFields = [
    'chainId',
    'nonce',
    'gas',
    'gasLimit',
    'gasPrice',
    'maxFeePerGas',
    'maxPriorityFeePerGas',
    'value',
    'type',
  ];

  numericFields.forEach((field) => {
    const normalized = normalizeHexQuantity(request[field]);
    if (normalized !== undefined) {
      sanitized[field] = normalized;
    } else if (request[field] !== undefined) {
      delete sanitized[field];
      console.warn(`Dropping non-numeric EVM tx field "${field}"`);
    }
  });

  if (!sanitized.from && fromAddress) {
    sanitized.from = fromAddress;
  }

  return sanitized;
};

const isLikelyInvalidParamsError = (error: unknown): boolean => {
  const msg = String(
    (error && typeof error === 'object' && (error as any).message) ||
      error ||
      '',
  ).toLowerCase();
  return (
    msg.includes('invalid parameter') ||
    msg.includes('invalid parameters') ||
    msg.includes('invalid argument') ||
    msg.includes('invalid arguments')
  );
};

const getNetworkByChainId = (chainId: string): string => {
  const map: Record<string, string> = {
    '1151111081099710': 'solana',
    '1': 'ethereum',
    '56': 'bsc',
    '137': 'polygon',
    '42161': 'arbitrum',
    '8453': 'base',
  };
  return map[chainId] || 'ethereum';
};

const SOLANA_CHAIN_ID = '1151111081099710';
const TOKEN_SEARCH_RENDER_LIMIT = 100;

const getTokenChainId = (token: any, fallback = '') => {
  if (token?.chainId !== undefined && token?.chainId !== null) {
    return String(token.chainId);
  }
  if (token?.chain) return getChainId(String(token.chain));
  if (token?.network) return getChainId(String(token.network));
  return fallback;
};

const getSwapTokenImage = (token: any, chainId: string) =>
  token?.logoURI ||
  token?.icon ||
  token?.logo ||
  token?.image ||
  token?.marketData?.iconUrl ||
  getChainIcon(getNetworkByChainId(chainId)) ||
  '/assets/icons/solana.png';

const isSolanaToken = (token: any, fallback = '') =>
  getTokenChainId(token, fallback) === SOLANA_CHAIN_ID ||
  token?.chain?.toUpperCase?.() === 'SOLANA' ||
  token?.network?.toUpperCase?.() === 'SOLANA';

const getTokenAddressKey = (token: any) =>
  String(token?.address || token?.id || '')
    .trim()
    .toLowerCase();

const getTokenIdentityKey = (token: any) => {
  if (!token) return '';
  const addressKey = getTokenAddressKey(token);
  const chainKey = getTokenChainId(token);
  const symbolKey = String(token.symbol || '')
    .trim()
    .toLowerCase();
  const decimalsKey = token.decimals ?? '';
  return [chainKey, addressKey || symbolKey, decimalsKey].join('|');
};

const getTokenSelectionKey = (token: any) => {
  if (!token) return '';
  return [
    String(token.symbol || '')
      .trim()
      .toLowerCase(),
    getTokenIdentityKey(token),
  ].join('|');
};

const isSameTokenSelection = (a: any, b: any) =>
  getTokenSelectionKey(a) === getTokenSelectionKey(b);

const applyBalanceDelta = (
  token: any,
  tokenKey: string,
  delta: number,
) => {
  if (!token || getTokenIdentityKey(token) !== tokenKey) return token;
  const currentBalance = Number(token.balance ?? 0);
  if (!Number.isFinite(currentBalance)) return token;

  const nextBalance = Math.max(0, currentBalance + delta);
  return {
    ...token,
    balance: String(nextBalance),
  };
};

const getNativeTokenSymbol = (chainId: string): string => {
  const map: Record<string, string> = {
    '137': 'POL',
    '56': 'BNB',
  };
  return map[chainId] || 'ETH';
};

const getExplorerUrl = (chainId: string, txHash: string): string => {
  const explorerUrls: Record<string, string> = {
    '1151111081099710': `https://solscan.io/tx/${txHash}`,
    '1': `https://etherscan.io/tx/${txHash}`,
    '56': `https://bscscan.com/tx/${txHash}`,
    '137': `https://polygonscan.com/tx/${txHash}`,
    '42161': `https://arbiscan.io/tx/${txHash}`,
    '8453': `https://basescan.org/tx/${txHash}`,
  };
  return explorerUrls[chainId] || `https://etherscan.io/tx/${txHash}`;
};

const getViemChain = (chainId: number) => {
  switch (chainId) {
    case 1:
      return mainnet;
    case 56:
      return bsc;
    case 137:
      return polygon;
    case 42161:
      return arbitrum;
    case 8453:
      return base;
    default:
      return null;
  }
};

const isNativeEvmToken = (token?: any) => {
  const sym = token?.symbol?.toUpperCase();
  const addr = token?.address?.toLowerCase();
  return (
    sym === 'ETH' ||
    sym === 'POL' ||
    sym === 'MATIC' ||
    sym === 'BNB' ||
    sym === 'AVAX' ||
    addr === '0x0000000000000000000000000000000000000000'
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Error formatting
// ─────────────────────────────────────────────────────────────────────────────

const isRouteUnavailableErrorMessage = (message: string) => {
  const lowerError = message.toLowerCase();
  return (
    lowerError.includes('route not found') ||
    lowerError.includes('no route found') ||
    lowerError.includes('no available quote') ||
    lowerError.includes('no available quotes') ||
    lowerError.includes('requested transfer') ||
    lowerError.includes('unable to find swap route') ||
    lowerError.includes('swap route is not supported') ||
    lowerError.includes('route is not supported')
  );
};

const hasExecutableLiFiQuote = (quoteCandidate: any) =>
  Boolean(quoteCandidate?.transactionRequest);

const MFA_REQUIRED_ERROR_MESSAGE =
  'Please complete the Privy verification check, then try the swap again.';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
      code?: unknown;
    };
    if (typeof maybeError.message === 'string')
      return maybeError.message;
    if (typeof maybeError.error === 'string') return maybeError.error;
    if (typeof maybeError.details === 'string')
      return maybeError.details;
    if (typeof maybeError.code === 'string') return maybeError.code;
  }
  return String(error || '');
};

const isMfaRequiredError = (error: unknown) => {
  const lowerError = getErrorMessage(error).toLowerCase();
  return (
    lowerError.includes('missing mfa token') ||
    lowerError.includes('missing_or_invalid_mfa') ||
    lowerError.includes('missing or invalid mfa')
  );
};

const isUserCancellationError = (error: unknown) => {
  const message = getErrorMessage(error);
  const lowerError = message.toLowerCase();
  return (
    lowerError.includes('user rejected') ||
    lowerError.includes('rejected by user') ||
    lowerError.includes('user denied') ||
    lowerError.includes('cancelled') ||
    lowerError.includes('canceled')
  );
};

const formatSolanaSignature = (signature: unknown) =>
  typeof signature === 'string'
    ? signature
    : bs58.encode(signature as Uint8Array);

const summarizeSolanaError = (error: unknown) => {
  const anyError = error as any;
  return {
    name: anyError?.name,
    message: getErrorMessage(error),
    code: anyError?.code,
    type: anyError?.type,
    status: anyError?.status,
    cause: anyError?.cause
      ? getErrorMessage(anyError.cause)
      : undefined,
    stack:
      typeof anyError?.stack === 'string'
        ? anyError.stack.split('\n').slice(0, 4).join('\n')
        : undefined,
  };
};

const summarizeSolanaTransaction = (
  serializedTransaction: Uint8Array,
) => {
  try {
    const tx = VersionedTransaction.deserialize(
      serializedTransaction,
    );
    return {
      requiredSignatures: tx.message.header.numRequiredSignatures,
      signaturesPresent: tx.signatures.filter((signature) =>
        signature.some((byte) => byte !== 0),
      ).length,
      payer: maskIdentifier(
        tx.message.staticAccountKeys[0]?.toBase58(),
      ),
      staticAccountCount: tx.message.staticAccountKeys.length,
      addressLookupTableCount:
        tx.message.addressTableLookups?.length ?? 0,
      instructionCount: tx.message.compiledInstructions.length,
      recentBlockhash: maskIdentifier(tx.message.recentBlockhash),
    };
  } catch (error) {
    return {
      deserializeError: summarizeSolanaError(error),
    };
  }
};

const getSolanaFeeFallbackError = (
  walletSupportsSponsorship: boolean,
) =>
  walletSupportsSponsorship
    ? 'Gas sponsorship is unavailable and this wallet does not have enough SOL to pay the network fee. Add a small amount of SOL, then try again.'
    : 'This Solana wallet cannot use gas sponsorship. Add a small amount of SOL for the network fee, or switch to your Swop embedded wallet.';

const formatUserFriendlyError = (error: string): string => {
  const lowerError = error.toLowerCase();
  if (isMfaRequiredError(error)) return MFA_REQUIRED_ERROR_MESSAGE;
  if (
    lowerError.includes('gas sponsorship failed') ||
    lowerError.includes('sponsored transaction failed')
  )
    return 'Gas sponsorship failed. Please try again in a moment.';
  if (
    lowerError.includes('network error') ||
    lowerError.includes('fetch failed') ||
    lowerError.includes('network request failed')
  )
    return 'Network connection issue. Please check your internet connection and try again.';
  if (
    lowerError.includes('timeout') ||
    lowerError.includes('request timeout')
  )
    return 'Request timed out. Please try again in a moment.';
  if (
    lowerError.includes('user rejected') ||
    lowerError.includes('rejected by user') ||
    lowerError.includes('user denied')
  )
    return 'Transaction was cancelled. Please try again when ready.';
  // Gas-specific insufficient funds — must be checked BEFORE the generic
  // 'insufficient funds' branch.  The node error is:
  // "insufficient funds for gas * price + value: have X want Y"
  if (
    lowerError.includes('insufficient funds for gas') ||
    lowerError.includes('gas * price + value') ||
    lowerError.includes('intrinsic gas too low')
  )
    return 'Insufficient ETH for gas fees. Please add more ETH to your wallet to cover transaction costs.';
  if (
    lowerError.includes('insufficient funds') ||
    lowerError.includes('insufficient balance')
  )
    return 'Insufficient balance to complete this transaction.';
  if (
    lowerError.includes('wallet not connected') ||
    lowerError.includes('no wallet')
  )
    return 'Please connect your wallet to continue.';
  if (isRouteUnavailableErrorMessage(lowerError))
    return 'No swap route available for this token pair right now. Try a different token, route, or amount.';
  if (
    lowerError.includes('invalid token') ||
    lowerError.includes('token not found')
  )
    return 'Selected token is not supported. Please choose a different token.';
  if (
    lowerError.includes('amount too small') ||
    lowerError.includes('minimum amount')
  )
    return 'Amount is too small. Please enter a larger amount.';
  if (
    lowerError.includes('slippage') ||
    lowerError.includes('price impact')
  )
    return 'Price impact is too high. Try adjusting slippage settings or reducing the amount.';
  if (
    lowerError.includes('rate limit') ||
    lowerError.includes('too many requests')
  )
    return 'Too many requests. Please wait a moment and try again.';
  if (
    lowerError.includes('transaction failed') ||
    lowerError.includes('tx failed')
  )
    return 'Transaction failed. Please try again with adjusted settings.';
  if (
    lowerError.includes('blockhash not found') ||
    lowerError.includes('recent blockhash')
  )
    return 'Network is busy. Please wait a moment and try again.';
  if (
    lowerError.includes('account not found') ||
    lowerError.includes('invalid account')
  )
    return 'Account error. Please reconnect your wallet and try again.';
  if (
    lowerError.includes('failed to fetch') ||
    lowerError.includes('fetch error')
  )
    return 'Unable to connect to swap service. Please check your connection and try again.';
  if (error.length > 150) return error.slice(0, 147) + '...';
  return (
    error.charAt(0).toUpperCase() +
    error.slice(1).replace(/[._]/g, ' ')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Category / token-set definitions  (mirrors Chain.ts from the RN app)
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_CATEGORIES = [
  'stock',
  'crypto',
  'metal',
  'stable',
] as const;
type TokenCategory = (typeof TOKEN_CATEGORIES)[number];

const tokenCategoryAddresses: Record<TokenCategory, Set<string>> = {
  stock: new Set([
    'PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S',
    'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua',
    'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP',
    'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
    'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw',
    'PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx',
    'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB',
    '2CgwU3D1cPvCPs3u64JzU4mz2w6u8bk7R3BfJNvfzTK6',
    'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
    'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ',
    'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1',
    'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',
    'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ',
    'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
    'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu',
    'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
    'XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg',
    'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
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
  ]),
  crypto: new Set([
    'So11111111111111111111111111111111111111112',
    'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
    'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
    'CrAr4RRJMBVwRsZtT62pEhfA9H5utymC2mVx8e7FreP2',
    '98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g',
    'GbbesPbaYh5uiAZSYNXTc7w9jty1rpg3P9L4JeN4LkKc',
    '3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG',
    '9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa',
    '0x0000000000000000000000000000000000000000',
  ]),
  metal: new Set([
    'AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P',
    'GoLDppdjB1vDTPSGxyMJFqdnj134yH6Prg9eqsGDiw6A',
    'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re',
    '7C56WnJ94iEP7YeH2iKiYpvsS5zkcpP9rJBBEBoUGdzj',
    'C3VLBJB2FhEb47s1WEgroyn3BnSYXaezqtBuu5WNmUGw',
    'EtTQ2QRyf33bd6B2uk7nm1nkinrdGKza66EGdjEY4s7o',
    'AEv6xLECJ2KKmwFGX85mHb9S2c2BQE7dqE5midyrXHBb',
    '9eS6ZsnqNJGGKWq8LqZ95YJLZ219oDuJ1qjsLoKcQkmQ',
  ]),
  stable: new Set([
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
    '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c',
    '0xC08512927D12348F6620a698105e1BAac6EcD911',
    '0x70e8de73ce538da2beed35d14187f6959a8eca96',
    '0x01d33FD36ec67c6Ada32cf36b31e88EE190B1839',
    '0xF197FFC28c23E0309B5559e7a166f2c6164C80aA',
    '0xcaDC0acd4B445166f12d2C07EAc6E2544FbE2Eef',
    '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
    '0x043eB4B75d0805c43D7C834902E335621983Cf03',
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    // Polygon native stables
    '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB', // pUSD (Polymarket USD, Polygon)
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT (Polygon)
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI (Polygon)
    // Arbitrum native USDC
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    // Arbitrum bridged USDC.e
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    // Arbitrum USDT
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'Crn4x1Y2HUKko7ox2EZMT6N2t2ZyH7eKtwkBGVnhEq1g',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
  ]),
};

// pUSD is not listed on LiFi so we inject it as a curated token
const PUSD_CURATED_TOKEN = {
  symbol: 'pUSD',
  name: 'Polymarket USD',
  address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
  decimals: 6,
  chain: 'POLYGON',
  chainId: '137',
  network: 'polygon',
  logoURI: '/images/polymarket-logo.png',
  isVerified: true,
};

// Fallback tokens per chain (used when API returns no tokens for a chain/category)
const FALLBACK_CHAIN_TOKENS: Record<string, any[]> = {
  // Polygon stables
  '137': [
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
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6,
      chain: 'POLYGON',
      chainId: '137',
      network: 'polygon',
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
      chain: 'POLYGON',
      chainId: '137',
      network: 'polygon',
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0xc2132D05D31c914a87C6611C10748AEb04B58e8F/logo.png',
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      decimals: 18,
      chain: 'POLYGON',
      chainId: '137',
      network: 'polygon',
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063/logo.png',
    },
  ],
};

// Lowercased lookup tables for case-insensitive matching of token addresses/ids
const tokenCategoryAddressesLower: Record<
  TokenCategory,
  Set<string>
> = Object.fromEntries(
  Object.entries(tokenCategoryAddresses).map(([cat, set]) => [
    cat,
    new Set(Array.from(set).map((v) => v.toLowerCase())),
  ]),
) as Record<TokenCategory, Set<string>>;

/** Bucket a flat token array into the 4 categories – mirrors RN filterTokensByCategory */
function filterTokensByCategory(
  tokenArray: any[],
): Record<TokenCategory, any[]> {
  const result: Record<TokenCategory, any[]> = {
    stock: [],
    crypto: [],
    metal: [],
    stable: [],
  };

  tokenArray.forEach((token) => {
    // FIX: Use address OR id – Solana tokens from Jupiter use `id`, EVM use `address`
    const identifier = (
      token.address ||
      token.id ||
      ''
    ).toLowerCase();
    if (!identifier) return;

    // Normalize chainId: prefer explicit chainId, else derive from chain/network string
    const derivedChainId = getTokenChainId(token);
    const network = getNetworkByChainId(derivedChainId);
    if (!network) return; // skip unknown chains

    let matched = false;
    for (const cat of TOKEN_CATEGORIES) {
      if (tokenCategoryAddressesLower[cat].has(identifier)) {
        result[cat].push({ ...token, network, isVerified: true });
        matched = true;
        break;
      }
    }

    // If token isn't in curated lists, still surface it under "crypto" so the
    // receive drawer isn't empty for supported chains.
    if (!matched) {
      result.crypto.push({ ...token, network, isVerified: false });
    }
  });

  return result;
}

/** Search tokens by id / address / name / symbol, optionally filtered to a chainId */
function searchTokens(
  tokens: any[],
  searchText: string,
  chainId?: string,
): any[] {
  if (!searchText && !chainId) return [];
  return tokens.filter((token) => {
    if (chainId && chainId !== 'all') {
      const tokenChainId = getTokenChainId(token);
      if (tokenChainId !== chainId) return false;
    }
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (token.id ?? '').toLowerCase().includes(q) ||
      (token.address ?? '').toLowerCase().includes(q) ||
      (token.name ?? '').toLowerCase().includes(q) ||
      (token.symbol ?? '').toLowerCase().includes(q)
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain selector configs
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CHAINS = [
  { id: 'all', name: 'All', icon: '/assets/icons/all3x.webp' },
  {
    id: '1151111081099710',
    name: 'SOL',
    icon: '/assets/icons/solana.png',
  },
  { id: '1', name: 'ETH', icon: '/images/IconShop/eTH@3x.png' },
  { id: '137', name: 'POL', icon: '/images/IconShop/polygon@3x.png' },
  {
    id: '8453',
    name: 'BASE',
    icon: '/assets/icons/base.png',
  },
  {
    id: '42161',
    name: 'ARB',
    icon: '/assets/icons/arbitrum.png',
  },
];

const PAY_CHAINS = [
  { id: 'all', name: 'All', icon: null },
  {
    id: '1151111081099710',
    name: 'SOL',
    icon: '/assets/icons/solana.png',
  },
  {
    id: '1',
    name: 'ETH',
    icon: '/images/IconShop/outline-icons/light/ethereum-outline@3x.png',
  },
  { id: '137', name: 'POL', icon: '/images/IconShop/polygon.png' },
  {
    id: '8453',
    name: 'BASE',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
  },
  {
    id: '42161',
    name: 'ARB',
    icon: '/assets/icons/arbitrum.png',
  },
];

const CATEGORY_LABELS: Record<TokenCategory, string> = {
  stock: 'Stocks',
  crypto: 'Crypto',
  metal: 'Metals',
  stable: 'Stables',
};

// Network display order for grouped rendering (matches RN implicit order)
const NETWORK_DISPLAY_ORDER = [
  'solana',
  'ethereum',
  'polygon',
  'base',
  'arbitrum',
  'bsc',
];

// ─────────────────────────────────────────────────────────────────────────────
// Grouped token result type
// ─────────────────────────────────────────────────────────────────────────────

type FlatResult = { grouped: false; tokens: any[] };
type GroupedResult = {
  grouped: true;
  groups: { network: string; tokens: any[] }[];
};
type TokenListResult = FlatResult | GroupedResult;

// ─────────────────────────────────────────────────────────────────────────────
// TokenRow sub-component
// ─────────────────────────────────────────────────────────────────────────────

function formatTokenPrice(price: number | null): string {
  if (price === null) return '--';
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 0.01) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })}`;
  }
  return `$${price.toLocaleString('en-US', {
    maximumSignificantDigits: 4,
  })}`;
}

function formatTokenChange(change: number | null): string {
  if (change === null) return '24h --';
  const sign = change > 0 ? '+' : '';
  return `24h ${sign}${change.toFixed(2)}%`;
}

function TokenRow({
  token,
  onClick,
}: {
  token: any;
  onClick: () => void;
}) {
  const toBase64 = (str: string) => {
    if (typeof window === 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(str)));
  };

  const getInitialSVG = (t: any) => {
    const initials = (t.symbol || '??').slice(0, 2).toUpperCase();
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#F9A826',
      '#6C5CE7',
    ];
    const colorIndex = (t.symbol?.length ?? 0) % colors.length;
    const svg = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" fill="${colors[colorIndex]}" rx="18"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${toBase64(svg)}`;
  };

  const imgSrc =
    sanitizeNextImageSrc(token?.logoURI || token?.icon) ||
    getInitialSVG(token);
  // FIX: resolve network from token.network (set by filterTokensByCategory) first,
  // then fallback to chain field, then chainId
  const networkName = token.network
    ? token.network.toUpperCase()
    : token.chain
      ? token.chain
      : getNetworkByChainId(
          token.chainId?.toString() ?? '',
        ).toUpperCase();
  const chainIconSrc = getChainIcon(networkName);
  const networkLabel = networkName
    ? networkName.charAt(0).toUpperCase() +
      networkName.slice(1).toLowerCase()
    : '';
  const tokenPrice = readTokenPrice(token);
  const tokenChange24h = readTokenChange24h(token);
  const hasBalance =
    token.balance != null && Number(token.balance) > 0;
  const balanceNumber = Number(token.balance || 0);
  const tokenValue =
    hasBalance && tokenPrice !== null
      ? balanceNumber * tokenPrice
      : null;
  const changeTone =
    tokenChange24h === null
      ? 'text-gray-400'
      : tokenChange24h >= 0
        ? 'text-emerald-500'
        : 'text-red-500';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* Token icon + chain badge */}
      <div className="relative flex-shrink-0 w-9 h-9">
        <Image
          src={imgSrc}
          alt={token.symbol || 'token'}
          width={36}
          height={36}
          className="w-9 h-9 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getInitialSVG(token);
          }}
        />
        {chainIconSrc && (
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full w-4 h-4 flex items-center justify-center">
            <Image
              src={sanitizeNextImageSrc(chainIconSrc)}
              alt="chain"
              width={12}
              height={12}
              className="w-3 h-3 rounded-full"
            />
          </div>
        )}
      </div>

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {token.symbol}
          </span>
          {token.isVerified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {token.name}
          {networkLabel ? ` · ${networkLabel}` : ''}
        </p>
      </div>

      <div className="flex min-w-[78px] flex-shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold text-gray-900">
          {formatTokenPrice(tokenPrice)}
        </span>
        <span className={`text-[11px] font-semibold ${changeTone}`}>
          {formatTokenChange(tokenChange24h)}
        </span>
        {hasBalance && (
          <span className="text-[10.5px] font-medium text-gray-400">
            {tokenValue !== null
              ? `${formatTokenPrice(tokenValue)} value`
              : `${balanceNumber.toFixed(4)} bal`}
          </span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NetworkHeader sub-component (matches RN network section header)
// ─────────────────────────────────────────────────────────────────────────────

function NetworkHeader({ network }: { network: string }) {
  const iconSrc = getChainIcon(network.toUpperCase());
  const displayName =
    network.charAt(0).toUpperCase() + network.slice(1);

  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      {iconSrc && (
        <Image
          src={sanitizeNextImageSrc(iconSrc)}
          alt={network}
          width={16}
          height={16}
          className="w-4 h-4 rounded-full"
        />
      )}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {displayName}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SwapTokenModal({
  tokens,
  token,
  defaultPayToken,
  defaultPayAmount,
  defaultPayChainId,
  defaultReceiveToken,
  defaultReceiveChainId,
  preferredSolanaWalletAddress,
  onSwapComplete,
  onSwapReceiptDismiss,
}: {
  tokens: any[];
  token?: any;
  /** Pre-select the pay token for agent/opened swap flows */
  defaultPayToken?: any;
  /** Pre-fill the pay amount for agent/opened swap flows */
  defaultPayAmount?: string | number | null;
  /** Chain ID string for the pre-selected pay token */
  defaultPayChainId?: string;
  /** Pre-select the receive token (e.g. Arbitrum USDC for perps deposit) */
  defaultReceiveToken?: any;
  /** Chain ID string for the pre-selected receive token (e.g. "42161") */
  defaultReceiveChainId?: string;
  /** Solana address used to load balances; swaps must sign from this wallet. */
  preferredSolanaWalletAddress?: string;
  /** Called after a swap tx is submitted successfully */
  onSwapComplete?: (txHash: string) => void;
  /** Called when the submitted-swap receipt is dismissed */
  onSwapReceiptDismiss?: () => void;
}) {
  // ── Core swap state ──────────────────────────────────────────────────────────
  const [payToken, setPayToken] = useState<any>(
    defaultPayToken || token || null,
  );
  const [receiveToken, setReceiveToken] = useState<any>(
    defaultReceiveToken || null,
  );

  const [payAmount, setPayAmount] = useState(
    defaultPayAmount !== undefined && defaultPayAmount !== null
      ? String(defaultPayAmount)
      : '',
  );
  const [receiveAmount, setReceiveAmount] = useState('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selecting, setSelecting] = useState<
    'pay' | 'receive' | null
  >(null);

  // Pay-token drawer
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [selectedPayChain, setSelectedPayChain] = useState('all');
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Quote & swap
  const [isCalculating, setIsCalculating] = useState(false);
  const [chainId, setChainId] = useState('1151111081099710');
  const [receiverChainId, setReceiverChainId] = useState(
    defaultReceiveChainId || '137',
  );
  const [quote, setQuote] = useState<any>(null);
  const [jupiterQuote, setJupiterQuote] = useState<any>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [gasBalanceError, setGasBalanceError] = useState<
    string | null
  >(null);
  const [estimatedGasFeeEth, setEstimatedGasFeeEth] = useState<
    string | null
  >(null);

  // Slippage
  const [slippage, setSlippage] = useState(3.0);
  const [customSlippage, setCustomSlippage] = useState('');
  const [showSlippageModal, setShowSlippageModal] = useState(false);

  const [showSwapSuccess, setShowSwapSuccess] = useState(false);
  // Confirm-review modal (screen 16 — G8 Confirm transaction)
  const [showConfirmReview, setShowConfirmReview] = useState(false);

  // Quote refresh
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteCountdown, setQuoteCountdown] = useState(10);
  const [lastQuoteTime, setLastQuoteTime] = useState<number | null>(
    null,
  );

  // Auth
  const [accessToken, setAccessToken] = useState('');

  // Shared search query
  const [searchQuery, setSearchQuery] = useState('');

  // ── Receive-token drawer state (mirrors RN app) ──────────────────────────────
  const [tempTokens, setTempTokens] = useState<any[]>([]);
  // console.log("tempTokens", tempTokens);

  const [targetList, setTargetList] = useState<
    Record<TokenCategory, any[]>
  >({
    stock: [],
    crypto: [],
    metal: [],
    stable: [],
  });
  const [activeReceiveTab, setActiveReceiveTab] = useState<number>(0);
  const [selectedReceiveChain, setSelectedReceiveChain] =
    useState<string>('all');
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [receiveDrawerLoading, setReceiveDrawerLoading] =
    useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const quoteRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const urlAmountHydrationKeyRef = useRef('');
  const quoteRequestIdRef = useRef(0);

  useEffect(() => {
    if (defaultPayToken) {
      setPayToken(defaultPayToken);
      setChainId(
        defaultPayChainId ||
          getTokenChainId(defaultPayToken, SOLANA_CHAIN_ID),
      );
    }

    if (defaultPayAmount !== undefined && defaultPayAmount !== null) {
      setPayAmount(String(defaultPayAmount));
    }

    if (defaultReceiveToken) {
      setReceiveToken(defaultReceiveToken);
      setReceiverChainId(
        defaultReceiveChainId ||
          getTokenChainId(defaultReceiveToken, SOLANA_CHAIN_ID),
      );
    }
  }, [
    defaultPayAmount,
    defaultPayChainId,
    defaultPayToken,
    defaultReceiveChainId,
    defaultReceiveToken,
  ]);

  // ── Wallet hooks ─────────────────────────────────────────────────────────────
  const { wallets } = useWallets();
  const { sendTransaction: sendPrivyTransaction } =
    useSendTransaction();
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { socket: chatSocket } = useNewSocketChat();
  const socket = chatSocket;
  const ethWallet = wallets[0]?.address;
  const normalizedPreferredSolanaWalletAddress =
    normalizeWalletAddress(preferredSolanaWalletAddress);

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    if (normalizedPreferredSolanaWalletAddress) {
      return directSolanaWallets.find(
        (w) =>
          normalizeWalletAddress(w.address) ===
          normalizedPreferredSolanaWalletAddress,
      );
    }
    return (
      directSolanaWallets.find(
        (w) => w.address && w.address.length > 0,
      ) ?? directSolanaWallets[0]
    );
  }, [
    solanaReady,
    directSolanaWallets,
    normalizedPreferredSolanaWalletAddress,
  ]);

  const solanaWalletMismatchError = useMemo(() => {
    if (
      !normalizedPreferredSolanaWalletAddress ||
      !preferredSolanaWalletAddress ||
      !solanaReady ||
      !directSolanaWallets.length ||
      selectedSolanaWallet
    ) {
      return null;
    }

    return `The Solana wallet with these balances (${formatShortWalletAddress(preferredSolanaWalletAddress)}) is not connected for signing. Connect that wallet or switch accounts, then try again.`;
  }, [
    directSolanaWallets.length,
    normalizedPreferredSolanaWalletAddress,
    preferredSolanaWalletAddress,
    selectedSolanaWallet,
    solanaReady,
  ]);

  const [fromWalletAddress, setFromWalletAddress] = useState(
    selectedSolanaWallet?.address || '',
  );
  const [toWalletAddress, setToWalletAddress] = useState(
    selectedSolanaWallet?.address || '',
  );

  const isSourceEvmWalletPrivySponsored = useMemo(() => {
    if (
      !fromWalletAddress ||
      isSolanaToken(payToken, chainId) ||
      !wallets.length
    ) {
      return false;
    }

    const normalizedFrom = normalizeWalletAddress(fromWalletAddress);
    return wallets.some(
      (wallet) =>
        normalizeWalletAddress(wallet.address) === normalizedFrom &&
        isPrivyEmbeddedWalletType(wallet.walletClientType),
    );
  }, [chainId, fromWalletAddress, payToken, wallets]);

  const { user: PrivyUser, getAccessToken } = usePrivy();
  const { user: userData } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const copyTradeParam = searchParams?.get('copyTrade');
  const copyTradePostIdParam =
    searchParams?.get('copyTradePostId') || '';
  // One-shot guard: source posts whose copied trade has already executed. A
  // copy-trade reward must never re-fire for these, even if the copyTrade
  // params still linger in the /wallet URL (the inline wallet swap box, unlike
  // the old SwapButton modal, has no on-close URL cleanup of its own).
  const consumedCopyTradePostIdsRef = useRef<Set<string>>(new Set());
  const [copyTradeContext, setCopyTradeContext] = useState(() => ({
    isCopyTrade:
      isCopyTradeParamEnabled(copyTradeParam) &&
      copyTradePostIdParam.length > 0,
    sourcePostId: copyTradePostIdParam,
  }));
  const [copyTradeRewardPreview, setCopyTradeRewardPreview] =
    useState<CopyTradeRewardPreview | null>(null);
  const [copyTradeRewardLoading, setCopyTradeRewardLoading] =
    useState(false);
  const copyTradeRewardPreviewRef =
    useRef<CopyTradeRewardPreview | null>(null);
  const isCopyTrade = copyTradeContext.isCopyTrade;
  const copyTradePostId = copyTradeContext.sourcePostId;

  useEffect(() => {
    if (
      !isCopyTradeParamEnabled(copyTradeParam) ||
      copyTradePostIdParam.length === 0
    ) {
      return;
    }

    // Never re-enable a copy-trade reward for a post whose copied trade was
    // already executed in this session, even if its params still linger.
    if (
      consumedCopyTradePostIdsRef.current.has(copyTradePostIdParam)
    ) {
      return;
    }

    setCopyTradeContext((current) => {
      if (
        current.isCopyTrade &&
        current.sourcePostId === copyTradePostIdParam
      ) {
        return current;
      }

      return {
        isCopyTrade: true,
        sourcePostId: copyTradePostIdParam,
      };
    });
  }, [copyTradeParam, copyTradePostIdParam]);

  // Copy intent follows the first swap submitted from the copied feed entry,
  // even if the copier edits amount, token, or pair before submitting. After
  // that first recorded swap, consumeCopyTrade clears the context so later
  // ordinary swaps are not rewarded.
  const clearCopyTrade = useCallback(() => {
    copyTradeRewardPreviewRef.current = null;
    setCopyTradeRewardPreview(null);
    setCopyTradeContext((current) =>
      current.isCopyTrade
        ? { isCopyTrade: false, sourcePostId: '' }
        : current,
    );
  }, []);

  // Remove the copyTrade params from the /wallet URL so a remount can't revive
  // the copy-trade context. Mirrors the cleanup the old SwapButton modal does
  // on close, which the inline wallet swap box otherwise lacks.
  const stripCopyTradeParamsFromUrl = useCallback(() => {
    if (!pathname) return;
    if (
      !searchParams?.get('copyTrade') &&
      !searchParams?.get('copyTradePostId')
    ) {
      return;
    }
    const newParams = new URLSearchParams(
      searchParams?.toString() || '',
    );
    newParams.delete('copyTrade');
    newParams.delete('copyTradePostId');
    const nextQuery = newParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [pathname, router, searchParams]);

  // One-shot: a copy-trade reward applies only to the single trade copied from
  // the feed. The copier may edit amount, token, or pair before submitting.
  // After that swap is recorded, mark the source post consumed, strip the URL
  // params, and clear the context so no subsequent plain swap in the same box is
  // ever rewarded.
  const consumeCopyTrade = useCallback(() => {
    const consumedId =
      copyTradeContext.sourcePostId || copyTradePostIdParam;
    if (consumedId) {
      consumedCopyTradePostIdsRef.current.add(consumedId);
    }
    stripCopyTradeParamsFromUrl();
    clearCopyTrade();
  }, [
    copyTradeContext.sourcePostId,
    copyTradePostIdParam,
    stripCopyTradeParamsFromUrl,
    clearCopyTrade,
  ]);

  const fetchCopyTradeRewardPreview = useCallback(async () => {
    if (!isCopyTrade || !copyTradePostId || !accessToken) {
      copyTradeRewardPreviewRef.current = null;
      setCopyTradeRewardPreview(null);
      return null;
    }

    const current = copyTradeRewardPreviewRef.current;
    if (current?.sourcePostId === copyTradePostId) {
      return current;
    }

    setCopyTradeRewardLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/copy-trade-reward-preview`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: copyTradePostId }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Could not load copy-trade reward details.',
        );
      }

      const preview = normalizeCopyTradeRewardPreview(
        data,
        copyTradePostId,
      );
      copyTradeRewardPreviewRef.current = preview;
      setCopyTradeRewardPreview(preview);
      return preview;
    } catch (error) {
      console.warn('Copy-trade reward preview unavailable:', error);
      copyTradeRewardPreviewRef.current = null;
      setCopyTradeRewardPreview(null);
      return null;
    } finally {
      setCopyTradeRewardLoading(false);
    }
  }, [accessToken, copyTradePostId, isCopyTrade]);

  useEffect(() => {
    copyTradeRewardPreviewRef.current = null;
    setCopyTradeRewardPreview(null);

    if (!isCopyTrade || !copyTradePostId || !accessToken) {
      return;
    }

    let cancelled = false;
    setCopyTradeRewardLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/copy-trade-reward-preview`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId: copyTradePostId }),
      },
    )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              'Could not load copy-trade reward details.',
          );
        }
        return normalizeCopyTradeRewardPreview(data, copyTradePostId);
      })
      .then((preview) => {
        if (cancelled) return;
        copyTradeRewardPreviewRef.current = preview;
        setCopyTradeRewardPreview(preview);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('Copy-trade reward preview unavailable:', error);
        copyTradeRewardPreviewRef.current = null;
        setCopyTradeRewardPreview(null);
      })
      .finally(() => {
        if (!cancelled) setCopyTradeRewardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, copyTradePostId, isCopyTrade]);

  // ── Default token selection: SWOP (pay) → USDC (receive), both Solana ───────
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;
    const hasSearchParams =
      searchParams?.get('inputToken') ||
      searchParams?.get('outputToken') ||
      searchParams?.get('amount');
    if (hasSearchParams) return;

    if (!payToken) {
      // Prefer the user's USDC token (has balance); fall back to a static definition
      const userUSDC = tokens.find(
        (t) =>
          t.symbol?.toUpperCase() === 'USDC' &&
          t.chain?.toUpperCase() === 'SOLANA',
      );

      const defaultPay = userUSDC || {
        symbol: 'USDC',
        name: 'USD Coin',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        chain: 'SOLANA',
        chainId: '1151111081099710',
        decimals: 6,
        logoURI:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        balance: null,
      };
      setPayToken(defaultPay);
      setChainId(getChainId(defaultPay.chain));
    }

    if (!receiveToken) {
      const swopAddress =
        'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB';
      // Look up by symbol first, then by address — the token in the user's
      // wallet may carry the same contract address under a different symbol
      // (e.g. TSLAX). Using the wallet entry ensures the correct decimals
      // (8 for TSLAX) are used instead of the hardcoded fallback (6).
      const defaultReceive = tokens.find(
        (t) =>
          t.symbol?.toUpperCase() === 'SWOP' &&
          t.chain?.toUpperCase() === 'SOLANA',
      ) ||
        tokens.find((t) => (t.address || t.id) === swopAddress) || {
          symbol: 'SWOP',
          name: 'SWOP',
          address: swopAddress,
          chain: 'SOLANA',
          chainId: '1151111081099710',
          decimals: 8,
          logoURI:
            'https://coin-images.coingecko.com/coins/images/66773/large/Group_1000007182_copy.png?1750487480',
          balance: null,
        };
      setReceiveToken(defaultReceive);
      setReceiverChainId('1151111081099710');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const safeRefreshSession = useCallback(async () => {
    try {
      const timeout = new Promise((_, r) =>
        setTimeout(
          () => r(new Error('Session refresh timeout')),
          5000,
        ),
      );
      await Promise.race([getAccessToken(), timeout]);
    } catch (e) {
      console.warn(
        'Session refresh failed, proceeding with existing session:',
        e,
      );
    }
  }, [getAccessToken]);

  const formatTokenAmount = (
    amount: string | number,
    decimals: number | bigint,
  ): string => {
    return (
      decimalAmountToRawUnits(amount, decimals)?.toString() ?? '0'
    );
  };

  const validateBalance = () => {
    if (!payAmount) return { isValid: true, error: null };
    const decimals = normalizeTokenDecimals(payToken?.decimals, 6);
    const amountUnits = decimalAmountToRawUnits(payAmount, decimals);
    if (amountUnits === null || amountUnits <= 0n)
      return {
        isValid: false,
        error: 'Amount must be greater than 0',
      };
    if (
      payToken?.balance === undefined ||
      payToken?.balance === null ||
      payToken?.balance === ''
    )
      return { isValid: true, error: null };
    const balanceUnits = decimalAmountToRawUnits(
      String(payToken.balance),
      decimals,
    );
    if (balanceUnits !== null && amountUnits > balanceUnits)
      return {
        isValid: false,
        error: `Insufficient balance. Available: ${parseFloat(String(payToken.balance)).toFixed(6)} ${payToken.symbol}`,
      };
    return { isValid: true, error: null };
  };

  const isSolanaToSolanaSwap = useCallback(
    () =>
      isSolanaToken(payToken, chainId) &&
      isSolanaToken(receiveToken, receiverChainId),
    [chainId, payToken, receiveToken, receiverChainId],
  );

  const applySubmittedSwapBalanceUpdate = useCallback(() => {
    const payKey = getTokenIdentityKey(payToken);
    const receiveKey = getTokenIdentityKey(receiveToken);
    const payDelta = Number(payAmount);
    const receiveDelta = Number(receiveAmount);

    const deltas: Record<string, number> = {};
    if (payKey && Number.isFinite(payDelta) && payDelta > 0) {
      deltas[payKey] = (deltas[payKey] || 0) - payDelta;
    }
    if (
      receiveKey &&
      Number.isFinite(receiveDelta) &&
      receiveDelta > 0
    ) {
      deltas[receiveKey] = (deltas[receiveKey] || 0) + receiveDelta;
    }

    const hasDeltas = Object.keys(deltas).length > 0;
    if (!hasDeltas) return;

    const updateToken = (token: any) => {
      const tokenKey = getTokenIdentityKey(token);
      const delta = deltas[tokenKey];
      return delta
        ? applyBalanceDelta(token, tokenKey, delta)
        : token;
    };

    setPayToken((current: any) => updateToken(current));
    setReceiveToken((current: any) => updateToken(current));
    setAvailableTokens((current) => current.map(updateToken));
    setTempTokens((current) => current.map(updateToken));
    setFilteredList((current) => current.map(updateToken));
    setTargetList((current) => ({
      stock: current.stock.map(updateToken),
      crypto: current.crypto.map(updateToken),
      metal: current.metal.map(updateToken),
      stable: current.stable.map(updateToken),
    }));

    console.debug('[SwapTokenModal] Applied local balance update', {
      payToken: payToken?.symbol,
      payDelta: deltas[payKey],
      receiveToken: receiveToken?.symbol,
      receiveDelta: deltas[receiveKey],
    });
  }, [payAmount, payToken, receiveAmount, receiveToken]);

  const isNativeSolToken = (t: any) => {
    const chain =
      t?.chain?.toUpperCase?.() ||
      (t?.chainId?.toString?.() === '1151111081099710'
        ? 'SOLANA'
        : '');
    const address = t?.address ?? t?.id ?? t?.mint ?? null;
    const tags = Array.isArray(t?.tags)
      ? t.tags.map((tag: unknown) => String(tag).toLowerCase())
      : [];
    const hasNativeMarker =
      t?.isNative === true || tags.includes('native');

    return (
      t?.symbol?.toUpperCase?.() === 'SOL' &&
      (hasNativeMarker ||
        address === LIFI_NATIVE_SOL_ADDRESS ||
        (chain === 'SOLANA' && address == null))
    );
  };

  const getSolanaTokenMint = (t: any) =>
    isNativeSolToken(t) ? SOL_MINT : t?.address || t?.id || t?.mint;

  const getLiFiSolanaTokenAddress = (t: any) =>
    isNativeSolToken(t)
      ? LIFI_NATIVE_SOL_ADDRESS
      : t?.address || t?.id || t?.mint;

  const toHex = (value: bigint) => `0x${value.toString(16)}`;

  const ensureEvmAllowance = useCallback(
    async (params: {
      tokenAddress: string;
      owner: string;
      spender: string;
      amountWei: string; // decimal string in smallest units
      chainId: number;
      provider: any; // EIP-1193 provider
      walletClientType?: string;
      switchChain?: (chainId: number) => Promise<void>;
      sendPrivyTransaction?: (
        input: any,
        options?: any,
      ) => Promise<{ hash: `0x${string}` | string }>;
    }) => {
      const {
        tokenAddress,
        owner,
        spender,
        amountWei,
        chainId,
        provider,
        walletClientType,
        switchChain,
        sendPrivyTransaction,
      } = params;

      // Native tokens (ETH/MATIC/BNB/…) require no allowance.
      if (
        !tokenAddress ||
        tokenAddress === '0x0000000000000000000000000000000000000000'
      )
        return;

      const chain = getViemChain(chainId);
      if (!chain) throw new Error('Unsupported EVM chain');

      if (switchChain) {
        await switchChain(chainId);
      }

      const client = createPublicClient({
        chain,
        transport: custom(provider),
      });
      let allowance: bigint;
      try {
        allowance = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [owner as `0x${string}`, spender as `0x${string}`],
        });
      } catch (allowanceErr) {
        console.warn('Token allowance check failed:', allowanceErr);
        throw new Error(
          'Unable to check token approval. Please reconnect your wallet and try again.',
        );
      }

      if (allowance >= BigInt(amountWei)) return; // Already approved

      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender as `0x${string}`, BigInt(amountWei)],
      });

      if (
        sendPrivyTransaction &&
        isPrivyEmbeddedWalletType(walletClientType)
      ) {
        await sendPrivyTransaction(
          {
            to: tokenAddress as `0x${string}`,
            data: approveData,
            chainId,
          },
          {
            sponsor: true,
            address: owner,
            uiOptions: { showWalletUIs: false },
          },
        );
        return;
      }

      // Include chainId in the tx params so the provider knows which chain to
      // use even if switchChain was a no-op (e.g. not supported by the wallet).
      await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: owner,
            to: tokenAddress,
            data: approveData,
            chainId: `0x${chainId.toString(16)}`,
          },
        ],
      });
    },
    [],
  );

  // ── Load & bucket all receive tokens on mount ─────────────────────────────────
  useEffect(() => {
    const loadReceiveTokens = async () => {
      setReceiveDrawerLoading(true);
      try {
        const [
          ethTokens,
          polygonTokens,
          baseTokens,
          solanaTokens,
          arbitrumTokens,
        ] = await Promise.all([
          fetchLiFiTokensCached('1'),
          fetchLiFiTokensCached('137'),
          fetchLiFiTokensCached('8453'),
          fetchLiFiTokensCached('1151111081099710'),
          fetchLiFiTokensCached('42161'),
        ]);

        // FIX: Merge user tokens (which have balance) + fetched tokens.
        // Deduplicate by chain + identifier so native ETH variants from
        // Base/Ethereum/Arbitrum do not collapse into a different network.
        // fetchLiFiTokensCached always returns an array so no defensive wrap needed.
        // PUSD_CURATED_TOKEN is prepended so it survives deduplication even when
        // LiFi does not return it for Polygon.
        const merged = [
          PUSD_CURATED_TOKEN,
          ...tokens,
          ...ethTokens,
          ...polygonTokens,
          ...baseTokens,
          ...solanaTokens,
          ...arbitrumTokens,
        ];
        const seen = new Set<string>();
        const deduped = merged.filter((t) => {
          const key = getTokenIdentityKey(t);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setTempTokens(deduped);
        setTargetList(filterTokensByCategory(deduped));
      } catch (err) {
        console.error('Failed to load receive tokens:', err);
        setTempTokens(tokens);
        setTargetList(filterTokensByCategory(tokens));
      } finally {
        setReceiveDrawerLoading(false);
      }
    };

    if (tokens.length > 0) loadReceiveTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]);

  // ── Debounced search across tempTokens ────────────────────────────────────────
  // useCallback (not useMemo) keeps a stable reference that always closes over
  // the latest tempTokens.  The debounce is managed manually via a useRef timer
  // so that updating tempTokens never resets an in-flight keystroke timer.
  // Results are capped at FLAT_RENDER_LIMIT so the filteredList state stays small.
  const runReceiveSearch = useCallback(
    (query: string, chainFilter: string) => {
      const cid = chainFilter !== 'all' ? chainFilter : undefined;
      const results = searchTokens(tempTokens, query, cid).slice(
        0,
        100,
      );
      setFilteredList(results);
      setIsSearching(false);
    },
    [tempTokens],
  );

  const onReceiveSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchDebounceTimer.current)
      clearTimeout(searchDebounceTimer.current);
    if (q) {
      setIsSearching(true);
      searchDebounceTimer.current = setTimeout(
        () => runReceiveSearch(q, selectedReceiveChain),
        400,
      );
    } else {
      setFilteredList([]);
      setIsSearching(false);
    }
  };

  // ── FIX: getGroupedReceiveTokens – mirrors RN rendering logic exactly ─────────
  //
  // RN rules (from SwapInterface.tsx render):
  //   Priority 1: filteredList (search results) → always flat, no grouping
  //   Priority 2: chain selected (not "all") → filter category by network, flat
  //   Priority 3: chain = "all" → group by network (applies to ALL categories,
  //               but RN only explicitly groups for "stable"; for others it just
  //               renders all tokens which naturally appear in network order from
  //               filterTokensByCategory. We group all to make chains clear.)
  //
  // The stable category is ALWAYS grouped by network regardless of chain filter.
  const getGroupedReceiveTokens = useMemo((): TokenListResult => {
    const currentCategory = TOKEN_CATEGORIES[activeReceiveTab];

    // Search results → always flat (shown across all chains)
    if (filteredList.length > 0) {
      return { grouped: false, tokens: filteredList };
    }

    const categoryTokens = targetList[currentCategory] ?? [];
    const resolveNetwork = (t: any) => {
      const cid = getTokenChainId(t);
      return getNetworkByChainId(cid);
    };

    // Specific chain selected → filter and show flat (show all tokens, even zero balance)
    if (selectedReceiveChain !== 'all') {
      const network = getNetworkByChainId(selectedReceiveChain);
      const tokensOnChain = tempTokens.filter(
        (t) => (t.network ?? resolveNetwork(t)) === network,
      );
      // Prefer curated category ordering; if empty fall back to all tokens on chain.
      const preferred = categoryTokens.filter(
        (t) => (t.network ?? resolveNetwork(t)) === network,
      );
      if (process.env.NODE_ENV !== 'production') {
        console.log('Receive drawer debug', {
          selectedChain: selectedReceiveChain,
          network,
          category: currentCategory,
          preferredCount: preferred.length,
          tokensOnChainCount: tokensOnChain.length,
          categoryTokensCount: categoryTokens.length,
        });
      }
      let finalList =
        preferred.length > 0 ? preferred : tokensOnChain;

      // Fallback: inject curated stable tokens for this chain if still empty
      if (finalList.length === 0 && currentCategory === 'stable') {
        const fallback = FALLBACK_CHAIN_TOKENS[selectedReceiveChain];
        if (fallback?.length) {
          finalList = fallback;
          if (process.env.NODE_ENV !== 'production') {
            console.log('Receive drawer fallback injected', {
              chain: selectedReceiveChain,
              count: fallback.length,
            });
          }
        }
      }

      return { grouped: false, tokens: finalList };
    }

    // "All" chains selected → group by network (matches RN stable grouping,
    // extended to all categories so users can see which chain each token is on)
    const groupMap: Record<string, any[]> = {};
    const tokensToGroup =
      categoryTokens.length > 0 ? categoryTokens : tempTokens;

    tokensToGroup.forEach((token) => {
      const net = token.network ?? resolveNetwork(token) ?? 'unknown';
      if (!groupMap[net]) groupMap[net] = [];
      groupMap[net].push(token);
    });

    // Sort networks in the defined display order
    const groups = NETWORK_DISPLAY_ORDER.filter(
      (net) => groupMap[net]?.length > 0,
    ).map((net) => ({ network: net, tokens: groupMap[net] }));

    // Append any networks not in the display order at the end
    Object.keys(groupMap).forEach((net) => {
      if (
        !NETWORK_DISPLAY_ORDER.includes(net) &&
        groupMap[net]?.length > 0
      ) {
        groups.push({ network: net, tokens: groupMap[net] });
      }
    });

    return { grouped: true, groups };
  }, [
    filteredList,
    targetList,
    tempTokens,
    activeReceiveTab,
    selectedReceiveChain,
  ]);

  const visibleReceiveTokensForQuotes = useMemo(() => {
    const r = getGroupedReceiveTokens;
    const tokensToQuote = r.grouped
      ? r.groups.flatMap((group) => group.tokens)
      : r.tokens;
    return tokensToQuote.slice(0, 120);
  }, [getGroupedReceiveTokens]);

  useEffect(() => {
    let cancelled = false;
    const candidates = visibleReceiveTokensForQuotes.filter(
      (token) => {
        const key = getTokenMarketKey(token);
        if (!key) return false;
        return (
          readTokenPrice(token) === null ||
          readTokenChange24h(token) === null
        );
      },
    );

    if (!candidates.length) return;

    fetchTokenMarketQuotes(candidates, accessToken)
      .then((quotes) => {
        if (cancelled || Object.keys(quotes).length === 0) return;

        const enrichList = (list: any[]) =>
          enrichTokenListWithMarketQuotes(list, quotes);

        setTempTokens((prev) => enrichList(prev));
        setTargetList((prev) =>
          enrichTokenCategoryListsWithMarketQuotes(prev, quotes),
        );
        setFilteredList((prev) =>
          prev.length > 0 ? enrichList(prev) : prev,
        );
      })
      .catch((error) => {
        console.warn(
          'Failed to load visible token market quotes:',
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [visibleReceiveTokensForQuotes, accessToken]);

  // Helper to resolve chainId safely — treats missing/undefined string as Solana
  const resolveChainId = (param: string | null) => {
    if (!param || param === 'undefined' || param === 'null')
      return '1151111081099710';
    return param;
  };

  //set feed trade details from URL params on mount (if present)
  useEffect(() => {
    const inputTokenParam = searchParams?.get('inputToken');
    const inputMintParam = searchParams?.get('inputMint');
    const inputChainParam = searchParams?.get('inputChain');
    const inputImgParam = searchParams?.get('inputImg');
    const inputDecimalsParam = searchParams?.get('inputDecimals');

    const outputTokenParam = searchParams?.get('outputToken');
    const outputMintParam = searchParams?.get('outputMint');
    const outputChainParam = searchParams?.get('outputChain');
    const outputImgParam = searchParams?.get('outputImg');
    const outputDecimalsParam = searchParams?.get('outputDecimals');

    const amountParam = searchParams?.get('amount');

    if (!inputTokenParam && !outputTokenParam) return;

    const urlAmountHydrationKey = [
      inputTokenParam,
      inputMintParam,
      outputTokenParam,
      outputMintParam,
      amountParam,
    ].join('|');

    if (
      amountParam &&
      urlAmountHydrationKeyRef.current !== urlAmountHydrationKey
    ) {
      const trimmedAmount = amountParam.trim();
      const numericAmount = Number(trimmedAmount);

      if (
        trimmedAmount &&
        Number.isFinite(numericAmount) &&
        numericAmount > 0
      ) {
        urlAmountHydrationKeyRef.current = urlAmountHydrationKey;
        setPayAmount(trimmedAmount);
        setIsQuoteLoading(true);
      }
    }

    // ── Input token ──
    if (inputTokenParam) {
      const inputChainId = resolveChainId(inputChainParam ?? null); // ← changed
      const inputNetwork =
        getNetworkByChainId(inputChainId).toUpperCase();
      const inputMintLower = inputMintParam?.toLowerCase();

      const found = [...tempTokens, ...tokens].find((t) => {
        const symbolMatch =
          t.symbol?.toLowerCase() === inputTokenParam.toLowerCase();
        if (!symbolMatch) return false;
        if (inputChainParam && inputChainParam !== 'undefined') {
          // ← guard
          const tokenChainId = getTokenChainId(t);
          return tokenChainId === inputChainId;
        }
        return true;
      });

      const userToken = tokens.find((t) => {
        const symbolMatch =
          t.symbol?.toLowerCase() === inputTokenParam.toLowerCase();
        const identifier = (t.address || t.id || '').toLowerCase();
        const mintMatch = inputMintLower
          ? identifier === inputMintLower
          : false;
        return (
          (symbolMatch || mintMatch) &&
          getTokenChainId(t) === inputChainId
        );
      });

      const payTokenData = found
        ? {
            ...found,
            address:
              inputMintParam || found.address || found.id || '',
            id: inputMintParam || found.id || found.address || '',
            chain: inputNetwork,
            chainId: inputChainId,
            decimals: inputDecimalsParam
              ? parseInt(inputDecimalsParam)
              : found.decimals,
            logoURI: inputImgParam
              ? decodeURIComponent(inputImgParam)
              : found.logoURI,
            balance: userToken?.balance ?? found.balance ?? '0',
          }
        : {
            symbol: inputTokenParam.toUpperCase(),
            name: inputTokenParam,
            address: inputMintParam || '',
            chain: inputNetwork,
            chainId: inputChainId,
            decimals: inputDecimalsParam
              ? parseInt(inputDecimalsParam)
              : 6,
            logoURI: inputImgParam
              ? decodeURIComponent(inputImgParam)
              : '',
            balance: userToken?.balance ?? '0',
          };

      setPayToken((current: any) =>
        isSameTokenSelection(current, payTokenData)
          ? current
          : payTokenData,
      );
      setChainId((current) =>
        current === inputChainId ? current : inputChainId,
      );
    }

    // ── Output token ──
    if (outputTokenParam) {
      const outputChainId = resolveChainId(outputChainParam ?? null); // ← changed
      const outputNetwork =
        getNetworkByChainId(outputChainId).toUpperCase();

      const found = [...tempTokens, ...tokens].find((t) => {
        const symbolMatch =
          t.symbol?.toLowerCase() === outputTokenParam.toLowerCase();
        if (!symbolMatch) return false;
        if (outputChainParam && outputChainParam !== 'undefined') {
          // ← guard
          const tokenChainId = getTokenChainId(t);
          return tokenChainId === outputChainId;
        }
        return true;
      });

      const userToken = tokens.find(
        (t) =>
          t.symbol?.toLowerCase() ===
            outputTokenParam.toLowerCase() &&
          getTokenChainId(t) === outputChainId,
      );

      const receiveTokenData = found
        ? {
            ...found,
            address:
              outputMintParam || found.address || found.id || '',
            id: outputMintParam || found.id || found.address || '',
            chain: outputNetwork,
            chainId: outputChainId,
            decimals: outputDecimalsParam
              ? parseInt(outputDecimalsParam)
              : found.decimals,
            logoURI: outputImgParam
              ? decodeURIComponent(outputImgParam)
              : found.logoURI,
            balance: userToken?.balance ?? found.balance ?? null,
          }
        : {
            symbol: outputTokenParam.toUpperCase(),
            name: outputTokenParam,
            address: outputMintParam || '',
            chain: outputNetwork,
            chainId: outputChainId,
            decimals: outputDecimalsParam
              ? parseInt(outputDecimalsParam)
              : 6,
            logoURI: outputImgParam
              ? decodeURIComponent(outputImgParam)
              : '',
            balance: userToken?.balance ?? null,
          };

      setReceiveToken((current: any) =>
        isSameTokenSelection(current, receiveTokenData)
          ? current
          : receiveTokenData,
      );
      setReceiverChainId((current) =>
        current === outputChainId ? current : outputChainId,
      );
    }
  }, [searchParams, tempTokens, tokens]);

  // ── Pay-token drawer helpers ──────────────────────────────────────────────────
  const payTokenUniverse = useMemo(() => {
    const toNumber = (v: unknown) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return parseFloat(v);
      return 0;
    };

    const base = (tokens ?? []).filter((t) => {
      const b = toNumber(t?.balance);
      return Number.isFinite(b) && b > 0;
    });

    if (!payToken) return base;

    const payKey = getTokenIdentityKey(payToken);
    if (!payKey) return base;

    const alreadyIncluded = base.some(
      (t) => getTokenIdentityKey(t) === payKey,
    );
    return alreadyIncluded ? base : [payToken, ...base];
  }, [tokens, payToken]);

  const tokenChainId = (t: any) => getTokenChainId(t);

  const filterTokensByPayChain = (toks: any[], cId: string) =>
    cId === 'all'
      ? toks
      : toks.filter((t) => tokenChainId(t) === cId);

  const getJupiterPlatformFeeAccount = async ({
    mint,
    connection,
  }: {
    mint: string;
    connection: Connection;
  }) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenAccount/${mint}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.tokenAccount) {
      throw new Error(
        data?.message ||
          data?.error ||
          'Could not prepare the Jupiter fee account.',
      );
    }

    const tokenProgramId =
      data.tokenProgramId === TOKEN_2022_PROGRAM_ID.toString()
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

    await getAccount(
      connection,
      new PublicKey(data.tokenAccount),
      undefined,
      tokenProgramId,
    );

    return {
      feeAccount: data.tokenAccount as string,
      tokenProgramId,
    };
  };

  const handlePayChainSelect = (cId: string) => {
    setSelectedPayChain(cId);
    setSearchQuery('');
    setAvailableTokens(filterTokensByPayChain(payTokenUniverse, cId));
  };

  const handlePayTokenSearch = (query: string) => {
    setIsLoadingTokens(true);
    try {
      const q = query.toLowerCase();
      if (q) {
        // When searching, scan ALL known tokens (not just balance > 0) so
        // tokens like TSLAX that exist in the wallet but weren't balance-
        // detected still appear. Address/id matching allows paste-to-search.
        const searchBase =
          selectedPayChain !== 'all'
            ? tempTokens.filter(
                (t) => tokenChainId(t) === selectedPayChain,
              )
            : tempTokens;
        setAvailableTokens(
          searchBase
            .filter(
              (t) =>
                t.symbol?.toLowerCase().includes(q) ||
                t.name?.toLowerCase().includes(q) ||
                getTokenAddressKey(t).includes(q),
            )
            .slice(0, TOKEN_SEARCH_RENDER_LIMIT),
        );
      } else {
        // No query → show only tokens the user holds
        const base =
          selectedPayChain !== 'all'
            ? filterTokensByPayChain(
                payTokenUniverse,
                selectedPayChain,
              )
            : payTokenUniverse;

        setAvailableTokens(base);
      }
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (openDrawer && selecting === 'pay') {
      setAvailableTokens(
        filterTokensByPayChain(payTokenUniverse, selectedPayChain),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDrawer, selecting, payTokenUniverse, selectedPayChain]);

  // ── Quote fetching helpers ────────────────────────────────────────────────────

  const getJupiterQuote = async (slippageBpsOverride?: number) => {
    if (!payToken || !receiveToken || !payAmount)
      throw new Error('Missing required parameters');
    const inputMint = getSolanaTokenMint(payToken);
    const outputMint = getSolanaTokenMint(receiveToken);
    if (!inputMint || !outputMint)
      throw new Error('Invalid token addresses');
    if (inputMint.toLowerCase() === outputMint.toLowerCase())
      throw new Error(
        'Pay token and receive token are the same. Please select different tokens.',
      );
    const amountInSmallestUnit = formatTokenAmount(
      payAmount,
      payToken.decimals || 6,
    );
    const baseSlippageBps = Math.floor(slippage * 100);
    const slippageBps = Math.min(
      Math.max(
        Math.round(
          Number.isFinite(slippageBpsOverride as number)
            ? (slippageBpsOverride as number)
            : baseSlippageBps,
        ),
        1,
      ),
      5000,
    );

    const quoteParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amountInSmallestUnit,
      slippageBps: slippageBps.toString(),
      platformFeeBps: PLATFORM_FEE_BPS.toString(),
      swapMode: 'ExactIn',
    });

    const response = await fetch(
      `/api/jupiter/quote?${quoteParams}`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success)
      throw new Error(result?.error || 'Failed to get Jupiter quote');
    return result.data;
  };

  const getLifiQuote = async () => {
    const fromAmount = formatTokenAmount(
      payAmount,
      payToken.decimals || 6,
    );
    if (fromAmount === '0' || !fromAmount)
      throw new Error('Invalid amount');

    let fromTokenAddress: string;
    if (chainId === '1151111081099710') {
      if (payToken?.symbol === 'SOL')
        fromTokenAddress =
          'So11111111111111111111111111111111111111112';
      else if (payToken?.address) fromTokenAddress = payToken.address;
      else throw new Error('Invalid Solana token');
    } else {
      if (
        payToken?.symbol === 'ETH' ||
        payToken?.symbol === 'POL' ||
        payToken?.symbol === 'MATIC'
      )
        fromTokenAddress =
          '0x0000000000000000000000000000000000000000';
      else if (payToken?.address) fromTokenAddress = payToken.address;
      else throw new Error('Invalid EVM token');
    }

    let toTokenAddress: string;
    if (receiverChainId === '1151111081099710') {
      if (receiveToken?.symbol === 'SOL')
        toTokenAddress =
          'So11111111111111111111111111111111111111112';
      else if (receiveToken?.address)
        toTokenAddress = receiveToken.address;
      else throw new Error('Invalid Solana receive token');
    } else {
      if (
        receiveToken?.symbol === 'ETH' ||
        receiveToken?.symbol === 'POL'
      )
        toTokenAddress = '0x0000000000000000000000000000000000000000';
      else if (receiveToken?.address)
        toTokenAddress = receiveToken.address;
      else throw new Error('Invalid EVM receive token');
    }

    if (!fromWalletAddress || !toWalletAddress)
      throw new Error('Wallet addresses not available');

    const result = await fetchLifiQuote({
      fromChain: chainId.toString(),
      toChain: receiverChainId.toString(),
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      fromAddress: fromWalletAddress,
      toAddress: toWalletAddress,
      fromAmount,
      slippage: slippage / 100,
      fee: (PLATFORM_FEE_BPS / 10000).toString(),
    });
    if (!result || !result.success)
      throw new Error(result?.error || 'Failed to get LiFi quote');
    return result.data;
  };

  // ── Main fetchQuote ──────────────────────────────────────────────────────────
  const fetchQuote = useCallback(
    async (isAutoRefresh = false) => {
      const requestId = quoteRequestIdRef.current + 1;
      quoteRequestIdRef.current = requestId;

      if (
        !payAmount ||
        !payToken ||
        !receiveToken ||
        !fromWalletAddress ||
        !toWalletAddress
      ) {
        setQuote(null);
        setJupiterQuote(null);
        setLastQuoteTime(null);
        setIsQuoteLoading(false);
        setIsCalculating(false);
        return;
      }
      try {
        setIsQuoteLoading(true);
        if (!isAutoRefresh) setIsCalculating(true);
        setSwapError(null);
        if (isSolanaToSolanaSwap()) {
          const nextJupiterQuote = await getJupiterQuote();
          if (quoteRequestIdRef.current !== requestId) return;
          setJupiterQuote(nextJupiterQuote);
          setQuote(null);
        } else {
          const nextLifiQuote = await getLifiQuote();
          if (quoteRequestIdRef.current !== requestId) return;
          setQuote(nextLifiQuote);
          setJupiterQuote(null);
        }
        setLastQuoteTime(Date.now());
      } catch (err: any) {
        if (quoteRequestIdRef.current !== requestId) return;
        console.error('Quote fetch error:', err);
        if (isAutoRefresh) {
          return;
        }
        setQuote(null);
        setJupiterQuote(null);
        setSwapError(
          formatUserFriendlyError(
            err.message || err.toString() || 'Failed to get quote',
          ),
        );
        setSwapStatus(null);
        setLastQuoteTime(null);
      } finally {
        if (quoteRequestIdRef.current === requestId) {
          setIsQuoteLoading(false);
          setIsCalculating(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      chainId,
      fromWalletAddress,
      payAmount,
      payToken,
      receiveToken,
      receiverChainId,
      toWalletAddress,
      slippage,
      isCopyTrade,
      copyTradePostId,
      accessToken,
      selectedSolanaWallet?.address,
      isSolanaToSolanaSwap,
    ],
  );

  // Auto-refresh quote every 10 s
  useEffect(() => {
    if (quoteRefreshInterval.current)
      clearInterval(quoteRefreshInterval.current);
    if (
      lastQuoteTime &&
      payAmount &&
      payToken &&
      receiveToken &&
      !isSwapping
    ) {
      quoteRefreshInterval.current = setInterval(
        () => fetchQuote(true),
        10000,
      );
      return () => {
        if (quoteRefreshInterval.current)
          clearInterval(quoteRefreshInterval.current);
      };
    }
  }, [
    lastQuoteTime,
    payAmount,
    payToken,
    receiveToken,
    fetchQuote,
    isSwapping,
  ]);

  // Countdown timer
  useEffect(() => {
    if (lastQuoteTime && payAmount && payToken && receiveToken) {
      if (countdownInterval.current)
        clearInterval(countdownInterval.current);
      setQuoteCountdown(10);
      countdownInterval.current = setInterval(
        () => setQuoteCountdown((p) => (p <= 1 ? 10 : p - 1)),
        1000,
      );
      return () => {
        if (countdownInterval.current)
          clearInterval(countdownInterval.current);
      };
    } else {
      if (countdownInterval.current)
        clearInterval(countdownInterval.current);
      setQuoteCountdown(10);
    }
  }, [lastQuoteTime, payAmount, payToken, receiveToken]);

  // Clear stale quotes as soon as any quote-defining input changes. This keeps
  // the CTA from submitting a transactionRequest that was built for the previous
  // chain/token/amount while the next quote is still loading.
  useEffect(() => {
    quoteRequestIdRef.current += 1;
    setQuote(null);
    setJupiterQuote(null);
    setReceiveAmount('');
    setLastQuoteTime(null);
    setGasBalanceError(null);
    setEstimatedGasFeeEth(null);
  }, [
    chainId,
    fromWalletAddress,
    payAmount,
    payToken,
    receiveToken,
    receiverChainId,
    toWalletAddress,
    slippage,
  ]);

  // Debounced quote on param change
  useEffect(() => {
    if (quoteRefreshInterval.current)
      clearInterval(quoteRefreshInterval.current);
    const id = setTimeout(() => fetchQuote(false), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chainId,
    fromWalletAddress,
    payAmount,
    payToken,
    receiveToken,
    receiverChainId,
    toWalletAddress,
    slippage,
  ]);

  // Derive receive amount from quote
  useEffect(() => {
    if ((quote || jupiterQuote) && receiveToken) {
      const toAmount = jupiterQuote
        ? jupiterQuote.outAmount
        : (quote?.estimate?.toAmount ?? quote?.toAmount);
      if (toAmount && receiveToken.decimals) {
        const readable =
          Number(toAmount) / Math.pow(10, receiveToken.decimals);
        setReceiveAmount(readable.toFixed(8).replace(/\.?0+$/, ''));
      } else {
        setReceiveAmount('0');
      }
    } else {
      setReceiveAmount('');
    }
  }, [quote, jupiterQuote, receiveToken]);

  // Guard: if pay and receive resolve to the same on-chain mint, clear the
  // receive token so the user is forced to pick a different one.  This
  // handles every entry path (defaults, URL params, manual selection) without
  // relying solely on the handleTokenSelect auto-swap.
  useEffect(() => {
    if (!payToken || !receiveToken) return;
    const payKey = getTokenIdentityKey(payToken);
    const receiveKey = getTokenIdentityKey(receiveToken);
    if (payKey && receiveKey && payKey === receiveKey) {
      setReceiveToken(null);
      setReceiverChainId('');
      setReceiveAmount('');
    }
    // Only re-run when the actual mint identifiers change, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    payToken?.address,
    payToken?.id,
    payToken?.chain,
    payToken?.chainId,
    payToken?.network,
    receiveToken?.address,
    receiveToken?.id,
    receiveToken?.chain,
    receiveToken?.chainId,
    receiveToken?.network,
  ]);

  useEffect(() => {
    setSwapError(null);
    setSwapStatus(null);
  }, [payAmount, payToken, receiveToken]);

  // ── EVM gas balance check ─────────────────────────────────────────────────────
  // Runs whenever the LiFi quote updates. Reads the native token balance on the
  // source chain and compares it against the estimated gas cost from the quote.
  // When insufficient, sets gasBalanceError to block the swap button.
  useEffect(() => {
    // Only applies to EVM LiFi swaps (not Solana-to-Solana Jupiter swaps)
    const isSolSol = isSolanaToSolanaSwap();

    if (
      !quote ||
      isSolSol ||
      !fromWalletAddress ||
      !chainId ||
      isSourceEvmWalletPrivySponsored
    ) {
      setGasBalanceError(null);
      setEstimatedGasFeeEth(null);
      return;
    }

    const numericChainId = parseInt(chainId);
    const evmChain = getViemChain(numericChainId);
    if (!evmChain) {
      setGasBalanceError(null);
      return;
    }

    let cancelled = false;

    const checkGasBalance = async () => {
      try {
        const parseHexOrNum = (v: any): bigint | null => {
          if (v == null) return null;
          try {
            if (typeof v === 'bigint') return v;
            const s = v.toString();
            return BigInt(s.startsWith('0x') ? s : s);
          } catch {
            return null;
          }
        };

        const client = createPublicClient({
          chain: evmChain,
          transport: http(),
        });
        const balance = await client.getBalance({
          address: fromWalletAddress as `0x${string}`,
        });

        if (cancelled) return;

        const txReq = quote.transactionRequest;
        const gasLimitRaw = txReq?.gasLimit ?? txReq?.gas;
        // EIP-1559 uses maxFeePerGas; legacy uses gasPrice
        const gasPriceRaw = txReq?.maxFeePerGas ?? txReq?.gasPrice;
        const valueRaw = txReq?.value;

        const gasLimitBig = parseHexOrNum(gasLimitRaw);

        if (!gasLimitBig) {
          setGasBalanceError(null);
          setEstimatedGasFeeEth(null);
          return;
        }

        // LiFi same-chain quotes (e.g. Arbitrum USDC → Arbitrum ETH) often
        // omit gas price from transactionRequest at quote time.  Fall back to
        // the live network gas price so the check always runs.
        let gasPriceBig = parseHexOrNum(gasPriceRaw);
        if (!gasPriceBig || gasPriceBig === 0n) {
          try {
            gasPriceBig = await client.getGasPrice();
          } catch {
            // If live gas price fetch fails, skip the check rather than block
            setGasBalanceError(null);
            setEstimatedGasFeeEth(null);
            return;
          }
        }

        if (!gasPriceBig) {
          setGasBalanceError(null);
          setEstimatedGasFeeEth(null);
          return;
        }

        // Apply the same cap used in executeLiFiSwap
        const EVM_MAX_GAS = 20_000_000n;
        const cappedGasLimit =
          gasLimitBig > EVM_MAX_GAS ? EVM_MAX_GAS : gasLimitBig;
        const estimatedGasCost = cappedGasLimit * gasPriceBig;
        const value = parseHexOrNum(valueRaw) ?? 0n;
        const totalRequired = estimatedGasCost + value;
        const gasCostEth = Number(estimatedGasCost) / 1e18;
        const nativeSymbol = getNativeTokenSymbol(chainId);
        setEstimatedGasFeeEth(
          `~${gasCostEth < 0.00001 ? gasCostEth.toExponential(3) : gasCostEth.toFixed(6)} ${nativeSymbol}`,
        );

        if (balance < totalRequired) {
          const shortfallEth = Number(totalRequired - balance) / 1e18;
          setGasBalanceError(
            `Insufficient ${nativeSymbol} for gas fees. You need ~${shortfallEth.toFixed(5)} more ${nativeSymbol} on ${evmChain.name} to complete this swap.`,
          );
        } else {
          setGasBalanceError(null);
        }
      } catch {
        // Non-fatal — don't block the swap if the check itself fails
        setGasBalanceError(null);
      }
    };

    checkGasBalance();
    return () => {
      cancelled = true;
    };
    // payToken.chain changes update chainId (separate effect) → re-triggers here.
    // receiveToken/receiverChainId changes invalidate the quote → re-triggers here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    quote,
    chainId,
    fromWalletAddress,
    isSourceEvmWalletPrivySponsored,
  ]);

  useEffect(() => {
    const nextChainId = getTokenChainId(payToken);
    if (nextChainId) setChainId(nextChainId);
  }, [payToken]);

  useEffect(() => {
    setFromWalletAddress(
      isSolanaToken(payToken, chainId)
        ? selectedSolanaWallet?.address || ''
        : ethWallet || '',
    );
    if (!receiveToken) {
      setToWalletAddress('');
    } else if (isSolanaToken(receiveToken, receiverChainId)) {
      setToWalletAddress(selectedSolanaWallet?.address || '');
    } else {
      setToWalletAddress(ethWallet || '');
    }
  }, [
    ethWallet,
    chainId,
    payToken,
    receiveToken,
    receiverChainId,
    selectedSolanaWallet?.address,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = Cookies.get('access-token');
      if (t) setAccessToken(t);
    }
  }, []);

  // Cleanup
  useEffect(
    () => () => {
      if (quoteRefreshInterval.current)
        clearInterval(quoteRefreshInterval.current);
      if (countdownInterval.current)
        clearInterval(countdownInterval.current);
      if (searchDebounceTimer.current)
        clearTimeout(searchDebounceTimer.current);
    },
    [],
  );

  // ── Save swap + socket notification ──────────────────────────────────────────
  const saveSwapToDatabase = async (signature: string, q: any) => {
    try {
      const inputChainId = getTokenChainId(payToken);
      const outputChainId = getTokenChainId(receiveToken);
      const network = getNetworkByChainId(inputChainId) || 'solana';

      console.log('payToken', payToken);
      console.log('receiveToken', receiveToken);

      const copyTradePayoutMode = isSolanaToSolanaSwap()
        ? 'jupiter_batch'
        : 'lifi_batch';

      const params = {
        smartsiteId: userData?.primaryMicrosite || '',
        userId: userData?._id || '',
        postType: 'swapTransaction',
        content: {
          signature,
          platformFeeBps: PLATFORM_FEE_BPS,
          copyTrade: isCopyTrade
            ? {
                sourcePostId: copyTradePostId,
                feeBps: PLATFORM_FEE_BPS,
                totalFeeBps: PLATFORM_FEE_BPS,
                payoutBps: COPY_TRADE_REWARD_BPS,
                rewardBps: COPY_TRADE_REWARD_BPS,
                payoutMode: COPY_TRADE_REWARD_MODE,
                feeSource:
                  copyTradePayoutMode === 'jupiter_batch'
                    ? 'jupiter_platform_fee'
                    : 'lifi_integrator_fee',
                rewardMode: COPY_TRADE_REWARD_MODE,
                rewardStatus: 'pending_buyback',
                feeRouting: 'swop_buyback',
                rewardToken: SWOP_REWARD_TOKEN,
                integrator: 'SWOP',
              }
            : undefined,
          inputToken: {
            symbol: payToken?.symbol || q.inputMint || '',
            amount: parseFloat(payAmount),
            decimals: payToken?.decimals || 6,
            mint:
              payToken?.address || payToken?.id || q.inputMint || '',
            price:
              payToken?.price ||
              payToken?.marketData?.price ||
              payToken?.usdPrice ||
              '0',
            tokenImg: getSwapTokenImage(payToken, inputChainId),
            chain: inputChainId,
          },
          outputToken: {
            symbol: receiveToken?.symbol || q.outputMint || '',
            amount: parseFloat(receiveAmount),
            decimals: receiveToken?.decimals || 6,
            mint:
              receiveToken?.address ||
              receiveToken?.id ||
              q.outputMint ||
              '',
            price:
              receiveToken?.price ||
              receiveToken?.marketData?.price ||
              receiveToken?.priceUSD ||
              '0',
            tokenImg: getSwapTokenImage(receiveToken, outputChainId),
            chain: outputChainId,
          },
        },
        walletAddress:
          fromWalletAddress ||
          selectedSolanaWallet?.address ||
          ethWallet ||
          '',
        slippageBps: Math.floor(slippage * 100),
        platformFeeBps: PLATFORM_FEE_BPS,
        timestamp: Date.now(),
        transactionType: 'SWAP',
        network,
      };

      const feedUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed`;
      console.log('[CopyTradeReward] saving swap feed post', {
        url: feedUrl,
        isCopyTrade,
        copyTradePostId: copyTradePostId || null,
        signature,
        hasAccessToken: Boolean(accessToken),
        smartsiteId: params.smartsiteId,
        userId: params.userId,
        postType: params.postType,
        copyTrade: params.content.copyTrade,
      });

      const feedResponse = await fetch(feedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(params),
      });
      const feedResponseText = await feedResponse
        .text()
        .catch(() => '');
      let feedResponseData: any = null;
      try {
        feedResponseData = feedResponseText
          ? JSON.parse(feedResponseText)
          : null;
      } catch {
        feedResponseData = feedResponseText;
      }

      console.log('[CopyTradeReward] swap feed post response', {
        status: feedResponse.status,
        ok: feedResponse.ok,
        isCopyTrade,
        copyTradePostId: copyTradePostId || null,
        savedPostId: feedResponseData?.data?._id,
        response: feedResponseData,
      });

      if (!feedResponse.ok) {
        console.error(
          'Failed to save swap feed post:',
          feedResponseData,
        );
      } else {
        useModalStore.getState().triggerFeedRefetch();
      }

      if (accessToken && PLATFORM_FEE_BPS > 0) {
        const inputUsdValue = formatUSDValue(
          params.content.inputToken.amount,
          params.content.inputToken.price,
        );
        const outputUsdValue = formatUSDValue(
          params.content.outputToken.amount,
          params.content.outputToken.price,
        );
        const priceImpactPct = jupiterQuote?.priceImpactPct
          ? Number(jupiterQuote.priceImpactPct) * 100
          : undefined;

        const feeNotifyResult = await notifySwapFee(
          {
            txHash: signature,
            walletAddress: params.walletAddress,
            inputTokenSymbol: params.content.inputToken.symbol,
            inputAmount: String(params.content.inputToken.amount),
            inputUsdValue,
            outputTokenSymbol: params.content.outputToken.symbol,
            outputAmount: String(params.content.outputToken.amount),
            outputUsdValue,
            priceImpactPct,
            route: isSolanaToSolanaSwap() ? 'Jupiter' : 'Li.Fi',
            network,
            skipSwopBuyback: isCopyTrade,
          },
          accessToken,
        );

        if (!feeNotifyResult.success) {
          console.error(
            'Failed to notify swap platform fee:',
            feeNotifyResult.error,
          );
        }
      }

      if (socket?.connected) {
        try {
          getWalletNotificationService(socket).emitSwapCompleted({
            inputTokenSymbol: params.content.inputToken.symbol,
            inputAmount: params.content.inputToken.amount.toFixed(6),
            outputTokenSymbol: params.content.outputToken.symbol,
            outputAmount:
              params.content.outputToken.amount.toFixed(6),
            txSignature: signature,
            network: payToken?.chain || 'SOLANA',
            inputTokenLogo: params.content.inputToken.tokenImg,
            outputTokenLogo: params.content.outputToken.tokenImg,
            inputUsdValue: formatUSDValue(
              params.content.inputToken.amount,
              params.content.inputToken.price,
            ),
            outputUsdValue: formatUSDValue(
              params.content.outputToken.amount,
              params.content.outputToken.price,
            ),
          });
        } catch (notifError) {
          console.error(
            'Failed to send swap notification:',
            notifError,
          );
        }
      }

      // One-shot: the copied trade has now been recorded, so retire the
      // copy-trade context and its URL params. Any further swap in this box is
      // an ordinary swap and must not be rewarded.
      if (isCopyTrade) {
        consumeCopyTrade();
      }
    } catch (e) {
      console.error('Failed to save swap transaction:', e);
    }
  };

  const submitSolanaTransactionWithFallback = async ({
    serializedTransaction,
    wallet,
    connection,
    canUseUserFundedFallback,
    sponsoredStatus,
    userFundedStatus,
    context,
    walletSupportsSponsorshipOverride,
  }: {
    serializedTransaction: Uint8Array;
    wallet: any;
    connection: Connection;
    canUseUserFundedFallback: boolean;
    sponsoredStatus: string;
    userFundedStatus: string;
    context: string;
    walletSupportsSponsorshipOverride?: boolean;
  }) => {
    const walletSupportsSponsorship =
      walletSupportsSponsorshipOverride ??
      isPrivyEmbeddedSolanaWallet(wallet);

    console.log('[Solana sponsorship] Fallback submit decision', {
      context,
      walletAddress: maskIdentifier(wallet?.address),
      walletSupportsSponsorship,
      canUseUserFundedFallback,
      walletClientType: wallet?.walletClientType,
      connectorType: wallet?.connectorType,
      standardWalletName: wallet?.standardWallet?.name,
      transaction: summarizeSolanaTransaction(serializedTransaction),
    });

    if (walletSupportsSponsorship) {
      try {
        setSwapStatus(sponsoredStatus);
        const sponsoredResult = await signAndSendTransaction({
          transaction: serializedTransaction,
          wallet,
          options: {
            sponsor: true,
            uiOptions: { showWalletUIs: false },
          },
        });
        const signature = formatSolanaSignature(
          sponsoredResult.signature,
        );
        console.log(
          '[Solana sponsorship] Sponsored submit succeeded',
          {
            context,
            signature: maskIdentifier(signature),
            walletAddress: maskIdentifier(wallet?.address),
          },
        );
        return signature;
      } catch (sponsoredError) {
        if (isUserCancellationError(sponsoredError)) {
          throw sponsoredError;
        }
        if (isMfaRequiredError(sponsoredError)) {
          throw new Error(MFA_REQUIRED_ERROR_MESSAGE);
        }

        console.warn(`${context} gas sponsorship failed`, {
          error: summarizeSolanaError(sponsoredError),
          canUseUserFundedFallback,
          walletAddress: maskIdentifier(wallet?.address),
          walletClientType: wallet?.walletClientType,
          connectorType: wallet?.connectorType,
          transaction: summarizeSolanaTransaction(
            serializedTransaction,
          ),
        });

        if (!canUseUserFundedFallback) {
          throw new Error(getSolanaFeeFallbackError(true));
        }
      }
    } else if (!canUseUserFundedFallback) {
      console.warn(
        `${context} gas sponsorship skipped; selected wallet is not Privy embedded and cannot pay fallback gas.`,
        {
          walletAddress: maskIdentifier(wallet?.address),
          walletClientType: wallet?.walletClientType,
          connectorType: wallet?.connectorType,
          standardWalletName: wallet?.standardWallet?.name,
          transaction: summarizeSolanaTransaction(
            serializedTransaction,
          ),
        },
      );
      throw new Error(getSolanaFeeFallbackError(false));
    }

    setSwapStatus(userFundedStatus);
    let signedTransaction: Uint8Array;
    try {
      const result = await signTransaction({
        transaction: serializedTransaction,
        wallet,
        options: {
          uiOptions: { showWalletUIs: false },
        },
      });
      signedTransaction = result.signedTransaction;
    } catch (signError) {
      if (isMfaRequiredError(signError)) {
        throw new Error(MFA_REQUIRED_ERROR_MESSAGE);
      }
      console.warn(`${context} user-funded signing failed`, {
        error: summarizeSolanaError(signError),
        walletAddress: maskIdentifier(wallet?.address),
      });
      throw signError;
    }

    try {
      const signature = await connection.sendRawTransaction(
        signedTransaction,
        {
          maxRetries: 3,
          skipPreflight: false,
        },
      );
      console.log(
        '[Solana sponsorship] User-funded submit succeeded',
        {
          context,
          signature: maskIdentifier(signature),
          walletAddress: maskIdentifier(wallet?.address),
        },
      );
      return signature;
    } catch (sendError) {
      console.warn(`${context} user-funded submit failed`, {
        error: summarizeSolanaError(sendError),
        walletAddress: maskIdentifier(wallet?.address),
      });
      throw sendError;
    }
  };

  // ── Jupiter swap (/order + /execute) ─────────────────────────────────────────
  const executeJupiterSwap = async () => {
    try {
      let canRunUserFundedSimulation = true;

      if (!solanaReady) {
        setSwapError(
          'Solana wallet is not ready. Please wait and try again.',
        );
        setIsSwapping(false);
        return;
      }
      if (!selectedSolanaWallet?.address) {
        setSwapError(
          solanaWalletMismatchError || 'No Solana wallet connected',
        );
        setIsSwapping(false);
        return;
      }

      const getTokenMint = (t: any) =>
        t.symbol === 'SOL'
          ? 'So11111111111111111111111111111111111111112'
          : t.address || t.id;

      const inputMint = getTokenMint(payToken);
      const outputMint = getTokenMint(receiveToken);
      if (!inputMint || !outputMint)
        throw new Error('Invalid token addresses');
      if (inputMint.toLowerCase() === outputMint.toLowerCase())
        throw new Error(
          'Pay token and receive token are the same. Please select different tokens.',
        );
      const amountInSmallestUnit = formatTokenAmount(
        payAmount,
        payToken.decimals || 6,
      );
      const rpcUrl = getSolanaRpcUrl();

      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });

      setSwapStatus('Preparing swap...');
      await safeRefreshSession();

      const USER_FEE_PAYER_SIMULATION_BUFFER = 15_000;
      const walletPubkey = new PublicKey(
        selectedSolanaWallet.address,
      );
      const outputMintPubkey = new PublicKey(outputMint);
      const isSOLInput = isNativeSolMint(inputMint);
      const isSOLOutput = isNativeSolMint(outputMint);

      if (!isSOLOutput) {
        const outputTokenProgram = await detectSolanaTokenProgram(
          connection,
          outputMint,
        );
        const outputAtaAddr = await getAssociatedTokenAddress(
          outputMintPubkey,
          walletPubkey,
          false,
          outputTokenProgram,
        );
        let outputAtaAcct = await connection
          .getAccountInfo(outputAtaAddr)
          .catch(() => null);

        if (!outputAtaAcct) {
          setSwapStatus(
            `Preparing ${receiveToken?.symbol ?? 'token'} account...`,
          );
          try {
            await ensureSponsoredSolanaTokenAccount({
              ownerAddress: selectedSolanaWallet.address,
              mint: outputMint,
              tokenProgramId: outputTokenProgram.toString(),
              accessToken,
              label: `${receiveToken?.symbol ?? 'output token'}`,
            });
          } catch (accountError) {
            console.warn(
              '[Solana sponsorship] Sponsored output token account preparation threw',
              {
                error: summarizeSolanaError(accountError),
                owner: maskIdentifier(selectedSolanaWallet.address),
                outputMint: maskIdentifier(outputMint),
                outputTokenProgram: outputTokenProgram.toString(),
                outputAta: maskIdentifier(outputAtaAddr.toBase58()),
                accessTokenPresent: Boolean(accessToken),
              },
            );
            throw accountError;
          }

          outputAtaAcct = await connection
            .getAccountInfo(outputAtaAddr)
            .catch(() => null);
          if (!outputAtaAcct) {
            console.warn(
              '[Solana sponsorship] Sponsored output token account preparation failed to create ATA',
              {
                owner: maskIdentifier(selectedSolanaWallet.address),
                outputMint: maskIdentifier(outputMint),
                outputTokenProgram: outputTokenProgram.toString(),
                outputAta: maskIdentifier(outputAtaAddr.toBase58()),
                accessTokenPresent: Boolean(accessToken),
              },
            );
            throw new Error(
              `Could not prepare your ${receiveToken?.symbol ?? 'output token'} account. Please try again.`,
            );
          }
        }
      }

      setSwapStatus('Checking wallet balance...');
      const solLamports = await connection.getBalance(walletPubkey);
      const swapLamports = isSOLInput
        ? Number(
            formatTokenAmount(payAmount, payToken?.decimals ?? 9),
          )
        : 0;

      canRunUserFundedSimulation =
        solLamports >=
        USER_FEE_PAYER_SIMULATION_BUFFER + swapLamports;

      console.log('[Solana sponsorship] Jupiter balance check', {
        selectedWallet: maskIdentifier(selectedSolanaWallet.address),
        solLamports,
        swapLamports,
        simulationBufferLamports: USER_FEE_PAYER_SIMULATION_BUFFER,
        canRunUserFundedSimulation,
        isSOLInput,
        isSOLOutput,
      });

      if (solLamports < swapLamports) {
        const shortfall = (
          (swapLamports - solLamports) /
          1e9
        ).toFixed(5);
        throw new Error(
          `Insufficient SOL: you need ${shortfall} more SOL to cover the swap amount.`,
        );
      }

      const userPrivySolanaWalletId = getPrivyEmbeddedSolanaWalletId(
        PrivyUser,
        selectedSolanaWallet.address,
      );
      console.log(
        '[Solana sponsorship] Jupiter sponsorship context',
        {
          selectedWallet: maskIdentifier(
            selectedSolanaWallet.address,
          ),
          userPrivySolanaWalletId: maskIdentifier(
            userPrivySolanaWalletId,
          ),
          hasPrivyUser: Boolean(PrivyUser),
          canRunUserFundedSimulation,
          solLamports,
          swapLamports,
        },
      );

      {
        const [inputTokenProgram, outputTokenProgram] =
          await Promise.all([
            detectSolanaTokenProgram(connection, inputMint),
            detectSolanaTokenProgram(connection, outputMint),
          ]);

        setSwapStatus('Preparing Jupiter fee...');
        const feeInfo = await getJupiterPlatformFeeAccount({
          mint: inputMint,
          connection,
        });
        const requiresInstructionV2 =
          isSOLOutput ||
          inputTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ||
          outputTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ||
          feeInfo.tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);

        setSwapStatus('Fetching Jupiter route...');
        const buildResult = await fetchJupiterBuild({
          inputMint,
          outputMint,
          amount: amountInSmallestUnit,
          taker: selectedSolanaWallet.address,
          payer: selectedSolanaWallet.address,
          slippageBps: Math.floor(slippage * 100),
          mode: 'fast',
          platformFeeBps: PLATFORM_FEE_BPS,
          feeAccount: feeInfo.feeAccount,
          instructionVersion: requiresInstructionV2
            ? 'V2'
            : undefined,
          wrapAndUnwrapSol: isSOLInput || isSOLOutput,
          nativeDestinationAccount: isSOLOutput
            ? selectedSolanaWallet.address
            : undefined,
        });

        console.log('[Solana sponsorship] Jupiter build result', {
          success: buildResult.success,
          error: buildResult.success ? undefined : buildResult.error,
          taker: maskIdentifier(selectedSolanaWallet.address),
          payer: maskIdentifier(selectedSolanaWallet.address),
          inputMint: maskIdentifier(inputMint),
          outputMint: maskIdentifier(outputMint),
          amount: amountInSmallestUnit,
          feeAccount: maskIdentifier(feeInfo.feeAccount),
          feeTokenProgram: feeInfo.tokenProgramId.toString(),
          instructionVersion: requiresInstructionV2
            ? 'V2'
            : undefined,
          wrapAndUnwrapSol: isSOLInput || isSOLOutput,
          nativeDestinationAccount: isSOLOutput
            ? maskIdentifier(selectedSolanaWallet.address)
            : undefined,
        });

        if (!buildResult.success || !buildResult.data) {
          throw new Error(
            buildResult.error ||
              'Failed to build Jupiter swap route.',
          );
        }

        const build = buildResult.data as JupiterBuildResponse;
        if (build.outAmount && receiveToken?.decimals) {
          const readable =
            Number(build.outAmount) /
            Math.pow(10, receiveToken.decimals);
          setReceiveAmount(readable.toFixed(8).replace(/\.?0+$/, ''));
        }

        setSwapStatus('Simulating Jupiter swap...');
        let computeUnitLimit = JUPITER_MAX_COMPUTE_UNITS;
        if (canRunUserFundedSimulation) {
          try {
            const simulationTx = buildJupiterVersionedTransaction({
              build,
              feePayer: selectedSolanaWallet.address,
              computeUnitLimit: JUPITER_MAX_COMPUTE_UNITS,
            });
            const simulation = await connection.simulateTransaction(
              simulationTx,
              {
                sigVerify: false,
                replaceRecentBlockhash: true,
                commitment: 'confirmed',
              },
            );

            if (simulation.value.err) {
              const logs =
                simulation.value.logs?.slice(-4).join(' ') || '';
              throw new Error(
                `Jupiter swap simulation failed. ${logs}`.trim(),
              );
            }

            const unitsConsumed = simulation.value.unitsConsumed;
            if (unitsConsumed) {
              computeUnitLimit = Math.min(
                Math.ceil(unitsConsumed * 1.2),
                JUPITER_MAX_COMPUTE_UNITS,
              );
            }
          } catch (simulationError) {
            console.warn(
              'Jupiter simulation failed before signing:',
              simulationError,
            );
            throw simulationError;
          }
        } else {
          console.warn(
            'Skipping Jupiter simulation because the selected wallet does not have enough SOL for a user-funded fee simulation.',
            {
              selectedWallet: maskIdentifier(
                selectedSolanaWallet.address,
              ),
              solLamports,
              swapLamports,
              requiredLamports:
                USER_FEE_PAYER_SIMULATION_BUFFER + swapLamports,
            },
          );
        }

        const tx = buildJupiterVersionedTransaction({
          build,
          feePayer: selectedSolanaWallet.address,
          computeUnitLimit,
        });

        await safeRefreshSession();

        const serializedTransaction = new Uint8Array(tx.serialize());
        if (userPrivySolanaWalletId) {
          console.log(
            '[Solana sponsorship] Using client Privy wallet path',
            {
              walletId: maskIdentifier(userPrivySolanaWalletId),
              feePayer: maskIdentifier(selectedSolanaWallet.address),
            },
          );
        } else {
          console.log(
            '[Solana sponsorship] User Privy wallet ID missing; using fallback path',
            {
              selectedWallet: maskIdentifier(
                selectedSolanaWallet.address,
              ),
              hasPrivyUser: Boolean(PrivyUser),
              linkedAccountCount:
                PrivyUser?.linkedAccounts?.length ?? 0,
            },
          );
        }
        const txId = await submitSolanaTransactionWithFallback({
          serializedTransaction,
          wallet: selectedSolanaWallet,
          connection,
          canUseUserFundedFallback: canRunUserFundedSimulation,
          sponsoredStatus: 'Submitting sponsored Jupiter swap...',
          userFundedStatus:
            'Gas sponsorship unavailable; signing Jupiter swap...',
          context: 'Jupiter swap',
          walletSupportsSponsorshipOverride: Boolean(
            userPrivySolanaWalletId,
          ),
        });

        if (!txId) {
          throw new Error('Failed to submit Solana transaction');
        }

        setTxHash(txId);
        setSwapStatus('Transaction submitted!');
        applySubmittedSwapBalanceUpdate();
        setIsSwapping(false);
        onSwapComplete?.(txId);

        void (async () => {
          try {
            await saveSwapToDatabase(txId, { inputMint, outputMint });
          } catch (postSwapError) {
            console.warn(
              'Post-swap persistence failed:',
              postSwapError,
            );
          }

          try {
            const blockhash = getBuildBlockhash(build);
            const lastValidBlockHeight =
              build.blockhashWithMetadata?.lastValidBlockHeight;
            if (lastValidBlockHeight) {
              await connection.confirmTransaction(
                {
                  signature: txId,
                  blockhash,
                  lastValidBlockHeight,
                },
                'confirmed',
              );
            } else {
              await connection.confirmTransaction(txId, 'confirmed');
            }
            setSwapStatus('Transaction confirmed');
          } catch {
            setSwapStatus('Transaction submitted successfully');
          }
        })();

        return;
      }
    } catch (error: any) {
      const rawMsg =
        error?.message || error?.toString() || 'Swap failed';
      console.error(
        '[Jupiter executeJupiterSwap] error:',
        rawMsg,
        error,
      );
      setSwapError(formatUserFriendlyError(rawMsg));
      setSwapStatus(null);
    } finally {
      setIsSwapping(false);
    }
  };

  // ── Solana LiFi swap ──────────────────────────────────────────────────────────
  const executeSolanaSwap = async (quoteOverride?: any) => {
    try {
      const activeQuote = quoteOverride || quote;
      if (!solanaReady) {
        setSwapError('Solana wallet is not ready.');
        setIsSwapping(false);
        return;
      }
      if (!selectedSolanaWallet?.address) {
        setSwapError(
          solanaWalletMismatchError || 'No Solana wallet connected',
        );
        setIsSwapping(false);
        return;
      }

      if (!activeQuote) {
        setSwapError('No Li.Fi quote available');
        setIsSwapping(false);
        return;
      }

      const { transactionRequest } = activeQuote;
      const rawTx =
        transactionRequest?.transaction || transactionRequest?.data;
      if (!rawTx)
        throw new Error('No transactionRequest found in LiFi quote');

      setSwapStatus('Submitting transaction...');
      const solanaRpcUrl = getSolanaRpcUrl();

      const connection = new Connection(solanaRpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });
      const swapTransactionBuffer = Buffer.from(rawTx, 'base64');
      const transaction = VersionedTransaction.deserialize(
        swapTransactionBuffer,
      );
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;

      const walletPubkey = new PublicKey(
        selectedSolanaWallet.address,
      );
      const solLamports = await connection.getBalance(walletPubkey);
      const inputMint = payToken?.address || payToken?.id;
      const isSOLInput =
        payToken?.symbol === 'SOL' || isNativeSolMint(inputMint);
      const swapLamports = isSOLInput
        ? Number(
            formatTokenAmount(payAmount, payToken?.decimals ?? 9),
          )
        : 0;
      const canUseUserFundedFallback =
        solLamports >= 15_000 + swapLamports;

      if (solLamports < swapLamports) {
        const shortfall = (
          (swapLamports - solLamports) /
          1e9
        ).toFixed(5);
        throw new Error(
          `Insufficient SOL: you need ${shortfall} more SOL to cover the swap amount.`,
        );
      }

      setSwapStatus('Signing and sending transaction...');
      await safeRefreshSession();
      const serializedTransaction = new Uint8Array(
        transaction.serialize(),
      );

      const signature = await submitSolanaTransactionWithFallback({
        serializedTransaction,
        wallet: selectedSolanaWallet,
        connection,
        canUseUserFundedFallback,
        sponsoredStatus: 'Submitting sponsored Solana swap...',
        userFundedStatus:
          'Gas sponsorship unavailable; signing Solana swap...',
        context: 'Solana swap',
      });

      // setTxHash(signature);
      // setSwapStatus('Transaction submitted!');
      // applySubmittedSwapBalanceUpdate();

      // // Unfreeze UI immediately — confirmation runs in background
      // setIsSwapping(false);

      // (async () => {
      //   try {
      //     await saveSwapToDatabase(signature, activeQuote);
      //   } catch (postSwapError) {
      //     console.warn(
      //       'Post-swap persistence failed:',
      //       postSwapError,
      //     );
      //   }

      //   try {
      //     await connection.confirmTransaction(signature, 'confirmed');
      //     setSwapStatus('Transaction confirmed');
      //   } catch {
      //     setSwapStatus('Transaction submitted successfully');
      //   }
      // })();
    } catch (error: any) {
      console.error('[Jupiter execute] error:', error);
      setSwapError(
        formatUserFriendlyError(
          error?.message || error?.toString() || 'Transaction failed',
        ),
      );
    } finally {
      setIsSwapping(false);
    }
  };

  // ── EVM LiFi swap ─────────────────────────────────────────────────────────────
  const executeLiFiSwap = async (quoteOverride?: any) => {
    try {
      const activeQuote = quoteOverride || quote;
      if (!activeQuote) {
        setSwapError('No Li.Fi quote available');
        setIsSwapping(false);
        return;
      }

      const fromChainId = parseInt(chainId);
      if (fromChainId === 1151111081099710) {
        await executeSolanaSwap(activeQuote);
      } else {
        const allAccounts = PrivyUser?.linkedAccounts || [];
        const fallbackEthereumAccount = allAccounts.find(
          (account: any) =>
            account.chainType === 'ethereum' &&
            account.type === 'wallet' &&
            account.address,
        );
        const quoteFromAddress =
          (activeQuote as any)?.action?.fromAddress ||
          (activeQuote as any)?.fromAddress ||
          (activeQuote as any)?.transactionRequest?.from;
        const sourceWalletAddress =
          quoteFromAddress ||
          fromWalletAddress ||
          ethWallet ||
          (fallbackEthereumAccount as any)?.address ||
          '';
        if (!sourceWalletAddress) {
          setSwapError('No Ethereum wallet connected');
          setIsSwapping(false);
          return;
        }
        const wallet = wallets.find(
          (w) =>
            normalizeEvmAddress(w.address) ===
            normalizeEvmAddress(sourceWalletAddress),
        );
        if (!wallet) {
          setSwapError('Selected wallet not found');
          setIsSwapping(false);
          return;
        }
        const provider = await wallet.getEthereumProvider();
        if (!provider) {
          setSwapError('Failed to get wallet provider');
          setIsSwapping(false);
          return;
        }

        // Switch the wallet to the source chain upfront so that both the
        // allowance approval and the main swap transaction land on the correct
        // network.  Without this, if the wallet was last used on a different
        // chain (e.g. Polygon), the approval would be sent there instead of
        // the source chain (e.g. Arbitrum).
        try {
          if (wallet.switchChain) {
            await wallet.switchChain(fromChainId);
          }
        } catch (switchErr) {
          console.warn(
            'Pre-swap chain switch failed, proceeding:',
            switchErr,
          );
        }

        // --- New: ensure ERC20 allowance for LiFi contract before sending main tx ---
        const isNative = isNativeEvmToken(payToken);
        const spender =
          (activeQuote as any)?.estimate?.approvalAddress ||
          (activeQuote as any)?.approvalAddress;
        const tokenAddr = payToken?.address;
        const amountRaw =
          (activeQuote as any)?.estimate?.fromAmount ||
          (activeQuote as any)?.fromAmount;

        if (!isNative && spender && tokenAddr && amountRaw) {
          try {
            await ensureEvmAllowance({
              tokenAddress: tokenAddr,
              owner: wallet.address as string,
              spender,
              amountWei: amountRaw.toString(),
              chainId: fromChainId,
              provider,
              walletClientType: wallet.walletClientType,
              switchChain: wallet.switchChain?.bind(wallet),
              sendPrivyTransaction,
            });
          } catch (allowErr: any) {
            setSwapError(
              formatUserFriendlyError(
                allowErr?.message || 'Token approval failed',
              ),
            );
            setIsSwapping(false);
            return;
          }
        }

        setSwapStatus('Waiting for confirmation...');
        // LiFi can return an inflated gas limit that exceeds the chain's block
        // gas cap (Polygon cap: ~30M). Clamp it to a safe ceiling.
        const EVM_MAX_GAS = 20_000_000;
        const rawTxReq = sanitizeEvmTxRequest(
          { ...activeQuote.transactionRequest },
          wallet.address,
        );
        const gasField = rawTxReq.gasLimit ?? rawTxReq.gas;
        if (gasField !== undefined) {
          const gasNum =
            typeof gasField === 'string'
              ? parseInt(
                  gasField,
                  gasField.startsWith('0x') ? 16 : 10,
                )
              : Number(gasField);
          if (gasNum > EVM_MAX_GAS) {
            const capped = '0x' + EVM_MAX_GAS.toString(16);
            if (rawTxReq.gasLimit !== undefined)
              rawTxReq.gasLimit = capped;
            if (rawTxReq.gas !== undefined) rawTxReq.gas = capped;
          }
        }
        let txHashResult: string;
        if (isPrivyEmbeddedWalletType(wallet.walletClientType)) {
          const privyTxRequest: any = {
            to: rawTxReq.to as `0x${string}`,
            data: rawTxReq.data as `0x${string}`,
            chainId: rawTxReq.chainId
              ? Number(rawTxReq.chainId)
              : fromChainId,
          };
          const value = parseOptionalBigInt(rawTxReq.value);
          if (value !== undefined) privyTxRequest.value = value;
          const gas = parseOptionalBigInt(
            rawTxReq.gas ?? rawTxReq.gasLimit,
          );
          if (gas !== undefined) privyTxRequest.gas = gas;
          const gasPrice = parseOptionalBigInt(rawTxReq.gasPrice);
          if (gasPrice !== undefined)
            privyTxRequest.gasPrice = gasPrice;
          const maxFeePerGas = parseOptionalBigInt(
            rawTxReq.maxFeePerGas,
          );
          if (maxFeePerGas !== undefined)
            privyTxRequest.maxFeePerGas = maxFeePerGas;
          const maxPriorityFeePerGas = parseOptionalBigInt(
            rawTxReq.maxPriorityFeePerGas,
          );
          if (maxPriorityFeePerGas !== undefined)
            privyTxRequest.maxPriorityFeePerGas =
              maxPriorityFeePerGas;

          const result = await sendPrivyTransaction(privyTxRequest, {
            sponsor: true,
            address: wallet.address,
            uiOptions: { showWalletUIs: false },
          });
          txHashResult = result.hash;
        } else {
          try {
            txHashResult = await provider.request({
              method: 'eth_sendTransaction',
              params: [rawTxReq],
            });
          } catch (sendError) {
            if (!isLikelyInvalidParamsError(sendError))
              throw sendError;
            const retryTxReq = sanitizeEvmTxRequest(
              activeQuote.transactionRequest,
              wallet.address,
            );
            txHashResult = await provider.request({
              method: 'eth_sendTransaction',
              params: [retryTxReq],
            });
          }
        }
        setTxHash(txHashResult);
        setSwapStatus('Transaction submitted!');
        applySubmittedSwapBalanceUpdate();

        // Unfreeze UI immediately — confirmation and database save run in background
        setIsSwapping(false);
        onSwapComplete?.(txHashResult);

        // Background: wait for on-chain confirmation before saving / notifying.
        // This prevents false-positive "swap successful" notifications when the
        // transaction reverts on-chain (e.g. due to insufficient gas balance).
        (async () => {
          try {
            const confirmChain = getViemChain(fromChainId);
            if (confirmChain) {
              const confirmClient = createPublicClient({
                chain: confirmChain,
                transport: http(),
              });
              const receipt =
                await confirmClient.waitForTransactionReceipt({
                  hash: txHashResult as `0x${string}`,
                  timeout: 120_000,
                });
              if (receipt.status === 'reverted') {
                setSwapStatus(null);
                setSwapError(
                  'Transaction failed on-chain. Your gas balance may be insufficient — please add more native tokens and try again.',
                );
                return;
              }
              setSwapStatus('Transaction confirmed');
            } else {
              setSwapStatus('Transaction submitted successfully');
            }
          } catch {
            setSwapStatus('Transaction submitted successfully');
          }
          await saveSwapToDatabase(txHashResult, activeQuote);
        })();
      }
    } catch (error: any) {
      const friendlyError = formatUserFriendlyError(
        error.message ||
          error.toString() ||
          'Cross-chain swap failed',
      );
      setSwapError(friendlyError);
      if (socket?.connected) {
        try {
          const fromChainId = parseInt(chainId);
          const networkName =
            fromChainId === 1151111081099710
              ? 'SOLANA'
              : fromChainId === 1
                ? 'ETHEREUM'
                : fromChainId === 137
                  ? 'POLYGON'
                  : fromChainId === 8453
                    ? 'BASE'
                    : 'Unknown';
          getWalletNotificationService(socket).emitSwapFailed({
            inputTokenSymbol: payToken?.symbol || 'Unknown',
            inputAmount: payAmount || '0',
            outputTokenSymbol: receiveToken?.symbol || 'Unknown',
            network: networkName,
            reason: friendlyError,
          });
        } catch {}
      }
      throw new Error(friendlyError);
    } finally {
      setIsSwapping(false);
    }
  };

  // ── Top-level swap entry point ────────────────────────────────────────────────
  const executeCrossChainSwap = async () => {
    try {
      setIsSwapping(true);
      setSwapError(null);
      setTxHash(null);
      setSwapStatus('Preparing transaction...');
      console.log('[SwapTokenModal] Starting swap submit', {
        route: isSolanaToSolanaSwap() ? 'Jupiter' : 'Li.Fi',
        isCopyTrade,
        copyTradePostId: copyTradePostId || null,
        payToken: {
          symbol: payToken?.symbol,
          chainId: getTokenChainId(payToken),
          address: maskIdentifier(payToken?.address || payToken?.id),
        },
        receiveToken: {
          symbol: receiveToken?.symbol,
          chainId: getTokenChainId(receiveToken),
          address: maskIdentifier(
            receiveToken?.address || receiveToken?.id,
          ),
        },
      });
      const balanceCheck = validateBalance();
      if (!balanceCheck.isValid) {
        setSwapError(balanceCheck.error);
        setIsSwapping(false);
        return;
      }
      if (isCopyTrade && copyTradePostId) {
        setSwapStatus('Checking copy trade reward...');
        await fetchCopyTradeRewardPreview();
      }
      if (isSolanaToSolanaSwap()) {
        await executeJupiterSwap();
      } else {
        const existingQuote = quote;
        if (hasExecutableLiFiQuote(existingQuote)) {
          if (quoteRefreshInterval.current) {
            clearInterval(quoteRefreshInterval.current);
          }
          setSwapStatus('Using latest quote...');
          setIsQuoteLoading(false);
          setIsCalculating(false);
          await executeLiFiSwap(existingQuote);
          return;
        }

        setSwapStatus('Getting quote...');
        if (quoteRefreshInterval.current) {
          clearInterval(quoteRefreshInterval.current);
        }
        const submitQuoteRequestId = quoteRequestIdRef.current + 1;
        quoteRequestIdRef.current = submitQuoteRequestId;
        setIsQuoteLoading(true);

        const freshQuote = await getLifiQuote();

        if (quoteRequestIdRef.current !== submitQuoteRequestId) {
          throw new Error(
            'Swap parameters changed while refreshing the quote. Please try again.',
          );
        }
        setQuote(freshQuote);
        setJupiterQuote(null);
        setLastQuoteTime(Date.now());
        setIsQuoteLoading(false);
        setIsCalculating(false);

        const freshToAmount =
          freshQuote?.estimate?.toAmount ?? freshQuote?.toAmount;
        if (freshToAmount && receiveToken?.decimals) {
          const readable =
            Number(freshToAmount) /
            Math.pow(10, receiveToken.decimals);
          setReceiveAmount(readable.toFixed(8).replace(/\.?0+$/, ''));
        }

        await executeLiFiSwap(freshQuote);
      }
    } catch (error: any) {
      setSwapError(
        formatUserFriendlyError(
          error.message || error.toString() || 'Swap failed',
        ),
      );
      setSwapStatus(null);
      setIsQuoteLoading(false);
      setIsCalculating(false);
      setIsSwapping(false);
    }
  };

  // ── Token selection ───────────────────────────────────────────────────────────
  const handleTokenSelect = (t: any, type: 'pay' | 'receive') => {
    const tKey = getTokenIdentityKey(t);
    const tokenChainId = getTokenChainId(t);

    if (type === 'pay') {
      const receiveKey = getTokenIdentityKey(receiveToken);
      // If the chosen pay token is the same contract as the current receive
      // token, auto-swap them so the user never ends up with
      // inputMint === outputMint.
      if (tKey && tKey === receiveKey) {
        const prevPayChainId = getTokenChainId(payToken);
        setReceiveToken(payToken ?? null);
        setReceiverChainId(prevPayChainId);
      }
      setPayToken(t);
      if (tokenChainId) setChainId(tokenChainId);
    } else {
      const payKey = getTokenIdentityKey(payToken);
      // Same guard for receive selection.
      if (tKey && tKey === payKey) {
        const previousReceiveChainId = getTokenChainId(receiveToken);
        setPayToken(receiveToken ?? null);
        if (previousReceiveChainId)
          setChainId(previousReceiveChainId);
      }
      setReceiveToken(t);
      if (tokenChainId) setReceiverChainId(tokenChainId);
    }
    setOpenDrawer(false);
    setSearchQuery('');
    setFilteredList([]);
    setIsSearching(false);
    if (
      payAmount &&
      ((type === 'pay' && receiveToken) ||
        (type === 'receive' && payToken))
    ) {
      setIsQuoteLoading(true);
    }
  };

  const handleFlip = () => {
    const nextPayToken = receiveToken ?? null;
    const nextReceiveToken = payToken ?? null;
    setPayToken(nextPayToken);
    setReceiveToken(nextReceiveToken);
    setChainId(getTokenChainId(nextPayToken, chainId));
    setReceiverChainId(getTokenChainId(nextReceiveToken, ''));
    const a = payAmount;
    setPayAmount(receiveAmount);
    setReceiveAmount(a);
    if (nextPayToken && nextReceiveToken && receiveAmount) {
      setIsQuoteLoading(true);
    }
  };

  const handlePercentageClick = (pct: number) => {
    if (!payToken?.balance) return;

    const isSOLInput = isNativeSolToken(payToken);
    const decimals = normalizeTokenDecimals(
      payToken.decimals,
      isSOLInput ? 9 : 6,
    );

    // Gas sponsorship covers swap fees, and the backend sponsor prepares ATAs.
    const reserveRawUnits = 0n;

    setPayAmount(
      getSafeSwapInputAmount({
        balance: String(payToken.balance),
        decimals,
        percent: pct,
        reserveRawUnits,
        subtractOneRawUnit: !isSOLInput && pct === 1,
      }),
    );
    if (receiveToken) setIsQuoteLoading(true);
  };

  const handlePayAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPayAmount(e.target.value);
    if (e.target.value && payToken && receiveToken)
      setIsQuoteLoading(true);
  };

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (selecting === 'pay') handlePayTokenSearch(q);
  };

  // ── Quote info ────────────────────────────────────────────────────────────────
  const calculateExchangeRate = () => {
    const q = jupiterQuote || quote;
    if (!q || !payToken || !receiveToken) return null;
    const fromAmount = jupiterQuote
      ? jupiterQuote.inAmount
      : (quote?.estimate?.fromAmount ?? quote?.fromAmount);
    const toAmount = jupiterQuote
      ? jupiterQuote.outAmount
      : (quote?.estimate?.toAmount ?? quote?.toAmount);
    if (!fromAmount || !toAmount) return null;
    // For Jupiter (Solana) swaps the native token SOL uses 9 decimals and
    // SPL tokens use 6.  Falling back to 18 (EVM default) gives a wildly
    // wrong rate for Solana pairs, so use chain-aware defaults.
    const isSolanaSwap = !!jupiterQuote;
    const payDec =
      payToken.decimals != null
        ? payToken.decimals
        : isSolanaSwap
          ? 9
          : 18;
    const recvDec =
      receiveToken.decimals != null
        ? receiveToken.decimals
        : isSolanaSwap
          ? 6
          : 18;
    const from = Number(fromAmount) / Math.pow(10, payDec);
    const to = Number(toAmount) / Math.pow(10, recvDec);
    return from > 0 ? to / from : null;
  };

  const getQuoteInfo = () => {
    const q = jupiterQuote || quote;
    if (!q || !payToken || !receiveToken) return null;
    const fromAmountUSD = quote
      ? (quote.estimate?.fromAmountUSD ?? quote.fromAmountUSD)
      : null;
    const toAmountUSD = quote
      ? (quote.estimate?.toAmountUSD ?? quote.toAmountUSD)
      : null;
    const priceImpact = jupiterQuote
      ? Number(jupiterQuote.priceImpactPct ?? 0) * 100
      : fromAmountUSD && toAmountUSD
        ? ((parseFloat(toAmountUSD) - parseFloat(fromAmountUSD)) /
            parseFloat(fromAmountUSD)) *
          100
        : null;
    return {
      exchangeRate: calculateExchangeRate(),
      fromAmountUSD: fromAmountUSD ? parseFloat(fromAmountUSD) : null,
      toAmountUSD: toAmountUSD ? parseFloat(toAmountUSD) : null,
      priceImpact,
    };
  };

  const solanaSwapWalletError =
    solanaWalletMismatchError &&
    (isSolanaToken(payToken, chainId) ||
      isSolanaToken(receiveToken, receiverChainId))
      ? solanaWalletMismatchError
      : null;

  const isSwapButtonLoading = () =>
    isQuoteLoading ||
    isCalculating ||
    !!(
      payAmount &&
      payToken &&
      receiveToken &&
      !quote &&
      !jupiterQuote &&
      !swapError &&
      !solanaSwapWalletError
    );

  const balanceValidation = validateBalance();
  const isSwapDone =
    swapStatus?.includes('confirmed') ||
    swapStatus?.includes('completed');
  const routeProviderLabel = isSolanaToSolanaSwap()
    ? 'Jupiter'
    : 'Li.Fi';
  const swapExplorerUrl = txHash
    ? getExplorerUrl(chainId, txHash)
    : '';
  const resetSwapForm = () => {
    quoteRequestIdRef.current += 1;
    if (quoteRefreshInterval.current) {
      clearInterval(quoteRefreshInterval.current);
      quoteRefreshInterval.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setShowSwapSuccess(false);
    setSwapStatus(null);
    setSwapError(null);
    setTxHash(null);
    setQuote(null);
    setJupiterQuote(null);
    setIsQuoteLoading(false);
    setIsCalculating(false);
    setIsSwapping(false);
    setPayAmount('');
    setReceiveAmount('');
    setLastQuoteTime(null);
    setQuoteCountdown(10);
    setGasBalanceError(null);
    setEstimatedGasFeeEth(null);
  };

  const dismissSwapReceipt = useCallback(() => {
    setShowSwapSuccess(false);
    onSwapReceiptDismiss?.();
  }, [onSwapReceiptDismiss]);

  useEffect(() => {
    if (txHash && isSwapDone) {
      setShowSwapSuccess(true);
    }
  }, [txHash, isSwapDone]);
  // ── Render ────────────────────────────────────────────────────────────────────

  // Maximum tokens to render per view / per network group.
  // LiFi returns hundreds of tokens per chain; rendering all of them as DOM
  // nodes simultaneously freezes the browser.  Users can always search to
  // find tokens beyond these limits.
  const FLAT_RENDER_LIMIT = 100; // single-chain or search results view
  const GROUP_RENDER_LIMIT = 30; // per-network group in the "all chains" view

  // Helper to render the token list for the receive drawer
  const renderReceiveTokenList = (payIdentity: string) => {
    const result = getGroupedReceiveTokens;

    if (!result.grouped) {
      // Flat list (search results or specific chain selected)
      const filtered = result.tokens.filter(
        (t) => getTokenIdentityKey(t) !== payIdentity,
      );
      const visible = filtered.slice(0, FLAT_RENDER_LIMIT);
      const overflow = filtered.length - visible.length;
      return (
        <>
          {visible.map((t, i) => (
            <TokenRow
              key={`${getTokenIdentityKey(t)}-${i}`}
              token={t}
              onClick={() => handleTokenSelect(t, 'receive')}
            />
          ))}
          {overflow > 0 && (
            <p className="text-center text-xs text-gray-400 py-3 px-4">
              Showing {visible.length} of {filtered.length} tokens —
              use the search bar to find more.
            </p>
          )}
        </>
      );
    }

    // Grouped list (all chains) – render network headers + tokens
    return result.groups.map(({ network, tokens: groupTokens }) => {
      const filtered = groupTokens.filter(
        (t) => getTokenIdentityKey(t) !== payIdentity,
      );
      const visible = filtered.slice(0, GROUP_RENDER_LIMIT);
      const overflow = filtered.length - visible.length;
      return (
        <div key={network}>
          <NetworkHeader network={network} />
          {visible.map((t, i) => (
            <TokenRow
              key={`${getTokenIdentityKey(t)}-${i}`}
              token={t}
              onClick={() => handleTokenSelect(t, 'receive')}
            />
          ))}
          {overflow > 0 && (
            <p className="text-xs text-gray-400 px-4 py-2">
              +{overflow} more on {network} — search to find them.
            </p>
          )}
        </div>
      );
    });
  };

  // Count visible tokens (for "no results" check)
  const visibleReceiveCount = useMemo(() => {
    const r = getGroupedReceiveTokens;
    if (!r.grouped) return r.tokens.length;
    return r.groups.reduce((sum, g) => sum + g.tokens.length, 0);
  }, [getGroupedReceiveTokens]);

  return (
    <div className="flex justify-center pb-4 relative">
      <div className="w-full text-[#0a0a0c] px-4">
        {/* Header — Tag + subtitle pattern from G3 design */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold tracking-[1.4px] uppercase font-mono px-2 py-1 rounded-md bg-[#fafafa] border border-black/[0.06] text-[#0a0a0c]">
              Swap
            </span>
            <span className="text-[11.5px] text-[#6e6e76] -tracking-[0.05px]">
              Trade across DEXs at the best route
            </span>
          </div>
          <button
            onClick={() => setShowSlippageModal(true)}
            className="w-[30px] h-[30px] rounded-lg bg-[#fafafa] border border-black/[0.06] hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
            aria-label="Slippage settings"
          >
            <Settings className="w-[13px] h-[13px] text-[#0a0a0c]" />
          </button>
        </div>

        {/* Quote countdown */}
        {lastQuoteTime &&
          payAmount &&
          payToken &&
          receiveToken &&
          !isQuoteLoading && (
            <div className="text-center mb-3">
              <span className="text-[10.5px] font-mono px-2 py-1 rounded-full bg-[#fafafa] border border-black/[0.06] text-[#6e6e76]">
                Refreshing in {quoteCountdown}s
              </span>
            </div>
          )}

        <div className="space-y-1.5">
          {/* ── Pay card ── */}
          <div className="relative">
            <div className="p-4 pb-[18px] rounded-2xl bg-[#fafafa] border border-black/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76]">
                  You pay
                </span>
                <span
                  className={`text-[10.5px] font-mono ${!balanceValidation.isValid ? 'text-red-500' : 'text-[#6e6e76]'}`}
                >
                  Bal ·{' '}
                  {payToken?.balance
                    ? `${parseFloat(payToken.balance).toFixed(4)} ${payToken.symbol}`
                    : '0'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2.5">
                <div className="flex-1 min-w-0">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={handlePayAmountChange}
                    className="bg-transparent border-none text-[32px] font-semibold w-full p-0 h-auto leading-none -tracking-[1px] font-mono focus:outline-none focus:ring-0 focus:border-none shadow-none"
                  />
                  {payAmount &&
                    payToken &&
                    getQuoteInfo()?.fromAmountUSD && (
                      <div className="text-[11.5px] text-[#6e6e76] font-mono mt-[5px]">
                        ≈ ${getQuoteInfo()?.fromAmountUSD?.toFixed(2)}
                      </div>
                    )}
                </div>
                <button
                  onClick={() => {
                    setSelecting('pay');
                    setOpenDrawer(true);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-[7px] pl-[7px] pr-3 py-[7px] rounded-full bg-white border border-black/[0.06] hover:bg-gray-50 transition-colors"
                >
                  <div className="relative w-6 h-6 flex-shrink-0">
                    {payToken?.logoURI ? (
                      <Image
                        src={sanitizeNextImageSrc(payToken.logoURI)}
                        alt={payToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#dfe6ef] flex items-center justify-center text-[9px] font-bold text-[#0a0a0c]">
                        {payToken?.symbol?.slice(0, 3) || '—'}
                      </div>
                    )}
                    {payToken?.chain && (
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center w-3 h-3">
                        <Image
                          src={sanitizeNextImageSrc(
                            getChainIcon(payToken.chain) || '',
                          )}
                          alt={payToken.chain}
                          width={12}
                          height={12}
                          className="w-3 h-3 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[12.5px] font-semibold">
                    {payToken ? payToken.symbol : 'Select'}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 text-[#6e6e76]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
              {(() => {
                const bal = Number(payToken?.balance || 0);
                const pct =
                  bal > 0
                    ? Math.min(
                        100,
                        Math.max(0, (Number(payAmount) / bal) * 100),
                      )
                    : 0;
                return (
                  <div className="mt-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(pct)}
                      onChange={(e) =>
                        handlePercentageClick(
                          Number(e.target.value) / 100,
                        )
                      }
                      disabled={bal <= 0}
                      aria-label="Amount to pay"
                      className="swop-dial w-full h-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background: `linear-gradient(to right, #0a0a0c 0%, #0a0a0c ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex gap-2 mt-3">
                      {[25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="px-3 py-1.5 text-[11px] font-medium bg-white border border-black/[0.06] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
                          onClick={() =>
                            handlePercentageClick(p / 100)
                          }
                          disabled={bal <= 0}
                        >
                          {p === 100 ? 'Max' : `${p}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Flip — floating overlap button between pay/receive cards */}
            <button
              onClick={handleFlip}
              disabled={!receiveToken}
              className="absolute left-1/2 -translate-x-1/2 -bottom-[18px] z-10 w-9 h-9 rounded-[11px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),_0_8px_28px_-12px_rgba(10,10,12,0.10)] hover:shadow-md transition-shadow flex items-center justify-center disabled:opacity-50"
              aria-label="Flip pay and receive"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0a0a0c]" />
            </button>
          </div>

          {/* ── Receive card ── */}
          <div className="p-4 pb-[18px] rounded-2xl bg-[#fafafa] border border-black/[0.06]">
            <div className="flex justify-between items-center">
              <span className="text-[10.5px] font-bold tracking-[1.2px] uppercase font-mono text-[#6e6e76]">
                You receive
              </span>
              <span className="text-[10.5px] font-mono text-[#6e6e76]">
                {receiveToken?.balance
                  ? `Bal · ${parseFloat(receiveToken.balance).toFixed(4)} ${receiveToken.symbol}`
                  : receiveToken
                    ? `Bal · 0 ${receiveToken.symbol}`
                    : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2.5">
              <div className="flex-1 min-w-0">
                {isCalculating || isQuoteLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-32 rounded" />
                ) : (
                  <div className="text-[32px] font-semibold leading-none -tracking-[1px] font-mono text-[#0a0a0c]">
                    {receiveAmount || '0.00'}
                  </div>
                )}
                {receiveAmount &&
                  receiveToken &&
                  getQuoteInfo()?.toAmountUSD && (
                    <div className="text-[11.5px] text-[#6e6e76] font-mono mt-[5px]">
                      ≈ ${getQuoteInfo()?.toAmountUSD?.toFixed(2)}
                      {(() => {
                        const info = getQuoteInfo();
                        if (
                          info &&
                          typeof info.priceImpact === 'number'
                        ) {
                          return (
                            <>
                              {' · '}
                              <span
                                className={
                                  info.priceImpact < 0
                                    ? 'text-[#e5484d]'
                                    : 'text-[#19a974]'
                                }
                              >
                                {info.priceImpact >= 0 ? '+' : ''}
                                {info.priceImpact.toFixed(2)}%
                              </span>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
              </div>
              <button
                onClick={() => {
                  setSelecting('receive');
                  setOpenDrawer(true);
                  setSearchQuery('');
                  setFilteredList([]);
                }}
                className="flex items-center gap-[7px] pl-[7px] pr-3 py-[7px] rounded-full bg-white border border-black/[0.06] hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                {receiveToken ? (
                  <>
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={sanitizeNextImageSrc(
                          receiveToken.logoURI,
                        )}
                        alt={receiveToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                      {(() => {
                        const chainName =
                          getNetworkByChainId(
                            receiverChainId,
                          ).toUpperCase();
                        return (
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center w-3 h-3">
                            <Image
                              src={sanitizeNextImageSrc(
                                getChainIcon(chainName) || '',
                              )}
                              alt={chainName}
                              width={12}
                              height={12}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-[12.5px] font-semibold">
                      {receiveToken.symbol}
                    </span>
                  </>
                ) : (
                  <span className="text-[12.5px] font-semibold">
                    Select
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-[#6e6e76]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Route summary card */}
          {payToken &&
            receiveToken &&
            (quote || jupiterQuote) &&
            (() => {
              const info = getQuoteInfo();
              const rate = info?.exchangeRate;
              if (!rate) return null;
              const rateLabel =
                rate < 0.000001
                  ? rate.toExponential(4)
                  : rate.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8,
                    });
              const slippageLabel = customSlippage
                ? `${customSlippage}%`
                : `${slippage}%`;
              const networkFeeLabel = estimatedGasFeeEth
                ? `${estimatedGasFeeEth} ${getNativeTokenSymbol(chainId)}`
                : '—';
              const priceImpactLabel =
                info && typeof info.priceImpact === 'number'
                  ? `${info.priceImpact >= 0 ? '+' : ''}${info.priceImpact.toFixed(2)}%`
                  : '—';
              const priceImpactNegative =
                info &&
                typeof info.priceImpact === 'number' &&
                info.priceImpact < -3;
              const isSelfCopyTrade = Boolean(
                copyTradeRewardPreview?.isSelf,
              );
              const copyTradeFeeBps = Number(
                copyTradeRewardPreview?.feeBps ?? PLATFORM_FEE_BPS,
              );
              const copyTradeRewardBps = Number(
                copyTradeRewardPreview?.rewardBps ??
                  COPY_TRADE_REWARD_BPS,
              );
              const copyTradeRetainedBps = Math.max(
                copyTradeFeeBps - copyTradeRewardBps,
                0,
              );
              const routeRows: Array<[string, string, boolean]> = [
                [
                  'Rate',
                  `1 ${payToken.symbol} = ${rateLabel} ${receiveToken.symbol}`,
                  false,
                ],
                ['Slippage', slippageLabel, false],
                [
                  'Swop fee',
                  `${(copyTradeFeeBps / 100).toFixed(2)}%`,
                  false,
                ],
                ...(isCopyTrade
                  ? ([
                      [
                        'Trader reward',
                        copyTradeRewardLoading
                          ? 'Checking reward'
                          : isSelfCopyTrade
                            ? 'No reward for self-copy'
                            : `${(copyTradeRewardBps / 100).toFixed(2)}% value in SWOP`,
                        false,
                      ],
                      [
                        'Swop retained',
                        isSelfCopyTrade
                          ? `${(copyTradeFeeBps / 100).toFixed(2)}% retained by Swop`
                          : `${(copyTradeRetainedBps / 100).toFixed(2)}% bought into SWOP`,
                        false,
                      ],
                      [
                        'Reward wallet',
                        isSelfCopyTrade
                          ? 'Not created for self-copy'
                          : 'Claimable after SWOP buyback',
                        false,
                      ],
                    ] as Array<[string, string, boolean]>)
                  : []),
                ['Network fee', networkFeeLabel, false],
                [
                  'Price impact',
                  priceImpactLabel,
                  priceImpactNegative,
                ],
              ];
              return (
                <div className="pt-2.5">
                  <div className="px-3.5 py-3 rounded-[10px] bg-white border border-black/[0.06]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono font-bold tracking-[1.2px] uppercase text-[#6e6e76]">
                          Route
                        </span>
                        <span className="text-[11.5px] font-semibold">
                          {isSolanaToSolanaSwap()
                            ? 'Jupiter · best'
                            : 'Li.Fi · best'}
                        </span>
                      </div>
                      {info?.toAmountUSD &&
                        info?.fromAmountUSD &&
                        info.toAmountUSD - info.fromAmountUSD > 0 && (
                          <span className="text-[10.5px] font-mono font-semibold text-[#19a974] bg-[#19a974]/10 px-[7px] py-[3px] rounded-full">
                            +$
                            {(
                              info.toAmountUSD - info.fromAmountUSD
                            ).toFixed(2)}
                          </span>
                        )}
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-black/[0.06]">
                      {routeRows.map(([k, v, danger]) => (
                        <div
                          key={k as string}
                          className="flex justify-between py-1"
                        >
                          <span className="text-[11.5px] text-[#6e6e76]">
                            {k}
                          </span>
                          <span
                            className={`text-[11.5px] font-medium font-mono ${danger ? 'text-[#e5484d]' : 'text-[#0a0a0c]'}`}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Error / status */}
          {(swapError ||
            swapStatus ||
            !balanceValidation.isValid ||
            solanaSwapWalletError ||
            gasBalanceError) && (
            <div
              className={`p-3 rounded-lg border ${isSwapDone ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              {!balanceValidation.isValid && (
                <div className="text-red-600 text-sm mb-2 text-center">
                  {balanceValidation.error}
                </div>
              )}
              {gasBalanceError && (
                <div className="text-red-600 text-sm mb-2 text-center">
                  {gasBalanceError}
                </div>
              )}
              {solanaSwapWalletError && (
                <div className="text-red-600 text-sm mb-2 text-center">
                  {solanaSwapWalletError}
                </div>
              )}
              {swapError && (
                <div className="text-red-600 text-sm mb-2 text-center flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {swapError}
                </div>
              )}
              {swapStatus && (
                <div
                  className={`text-sm text-center flex items-center justify-center gap-2 ${isSwapDone ? 'text-green-600' : 'text-blue-600'}`}
                >
                  {isSwapDone ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  )}
                  {swapStatus}
                </div>
              )}
              {txHash && (
                <div className="text-green-600 text-xs text-center mt-3 pt-2 border-t border-gray-200">
                  <a
                    href={getExplorerUrl(chainId, txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-700 transition-colors"
                  >
                    View on explorer
                  </a>
                  <div className="text-gray-500 mt-1 font-mono text-xs">
                    {txHash.length > 16
                      ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}`
                      : txHash}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer — Cancel + sign/approve CTA */}
          <div className="pt-4 grid grid-cols-[1fr_1.6fr] gap-2.5 border-t border-black/[0.04] mt-4">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                resetSwapForm();
              }}
              className="py-3.5 rounded-xl bg-[#fafafa] border border-black/[0.06] text-sm font-semibold text-[#0a0a0c] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                if (isSwapDone) {
                  resetSwapForm();
                } else {
                  void executeCrossChainSwap();
                }
              }}
              className={`py-3.5 rounded-xl ${isSwapDone ? 'bg-green-600 hover:bg-green-700' : 'bg-[#0a0a0c] hover:bg-black/90'} text-white text-sm font-bold -tracking-[0.1px] disabled:opacity-50 transition-colors`}
              disabled={
                isSwapping ||
                (!balanceValidation.isValid && !isSwapDone) ||
                (!!gasBalanceError && !isSwapDone) ||
                (!!solanaSwapWalletError && !isSwapDone) ||
                (isSwapButtonLoading() && !isSwapDone) ||
                !payToken ||
                !receiveToken ||
                !payAmount ||
                !receiveAmount
              }
            >
              {isSwapDone ? (
                'New swap'
              ) : isSwapping ? (
                'Swapping…'
              ) : !balanceValidation.isValid ? (
                'Insufficient balance'
              ) : gasBalanceError ? (
                'Insufficient gas'
              ) : solanaSwapWalletError ? (
                'Connect wallet'
              ) : isSwapButtonLoading() ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Getting quote…
                </span>
              ) : !payAmount || !receiveAmount ? (
                'Enter amount'
              ) : !receiveToken ? (
                'Select token'
              ) : (
                <span className="truncate">
                  Sign & approve · {payAmount} {payToken?.symbol} →{' '}
                  {receiveAmount} {receiveToken?.symbol}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Token Select Drawer
      ═══════════════════════════════════════════════════════════════════════ */}
      {openDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setOpenDrawer(false);
              setSearchQuery('');
              setFilteredList([]);
            }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-[30rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] mx-0 sm:mx-4 z-50">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-900">
                {selecting === 'pay'
                  ? 'Select Token to Pay'
                  : 'Select Token to Receive'}
              </h3>
              <button
                onClick={() => {
                  setOpenDrawer(false);
                  setSearchQuery('');
                  setFilteredList([]);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* ══ PAY drawer ══ */}
            {selecting === 'pay' && (
              <>
                {/* Chain filter */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {PAY_CHAINS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handlePayChainSelect(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedPayChain === c.id
                            ? 'bg-black text-white border-black'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {c.icon ? (
                          <Image
                            src={sanitizeNextImageSrc(c.icon)}
                            alt={c.name}
                            width={16}
                            height={16}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              ✦
                            </span>
                          </div>
                        )}
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="px-4 pb-3 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search token name or symbol"
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>

                {/* Token list */}
                <div className="flex-1 overflow-y-auto px-2 pb-6">
                  {isLoadingTokens ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black" />
                    </div>
                  ) : availableTokens.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No tokens found
                    </div>
                  ) : (
                    availableTokens
                      .filter(
                        (t) =>
                          getTokenIdentityKey(t) !==
                          getTokenIdentityKey(receiveToken),
                      )
                      .map((t, i) => (
                        <TokenRow
                          key={`${getTokenIdentityKey(t)}-${i}`}
                          token={t}
                          onClick={() => handleTokenSelect(t, 'pay')}
                        />
                      ))
                  )}
                </div>
              </>
            )}

            {/* ══ RECEIVE drawer ══ */}
            {selecting === 'receive' && (
              <>
                {/* Search bar */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={onReceiveSearchChange}
                      placeholder="Search tokens across all chains..."
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                      </div>
                    )}
                    {searchQuery && !isSearching && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => {
                          setSearchQuery('');
                          setFilteredList([]);
                        }}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chain icons – hidden while searching */}
                {!searchQuery && (
                  <div className="px-4 pb-2 flex-shrink-0">
                    <p className="text-xs font-medium text-black mb-1 tracking-wide">
                      SELECT CHAIN
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {ALL_CHAINS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedReceiveChain(c.id);
                            setSearchQuery('');
                            setFilteredList([]);
                          }}
                          className={`border-2 rounded-full transition-all ${
                            selectedReceiveChain === c.id
                              ? 'border-black'
                              : 'border-transparent'
                          }`}
                        >
                          {c.icon ? (
                            <Image
                              src={sanitizeNextImageSrc(c.icon)}
                              alt={c.name}
                              width={28}
                              height={28}
                              quality={100}
                              className="w-7 h-7 rounded-full"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                ✦
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category tabs – hidden while searching */}
                {!searchQuery && (
                  <div className="px-4 pb-2 flex-shrink-0">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                      {TOKEN_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat}
                          onClick={() => setActiveReceiveTab(idx)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeReceiveTab === idx
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search result count hint */}
                {searchQuery &&
                  !isSearching &&
                  filteredList.length > 0 && (
                    <div className="px-4 pb-1 flex-shrink-0">
                      <p className="text-xs text-gray-400">
                        {filteredList.length} result
                        {filteredList.length !== 1 ? 's' : ''} across
                        all chains
                      </p>
                    </div>
                  )}

                {/* Token list */}
                <div className="flex-1 overflow-y-auto px-2 pb-6">
                  {receiveDrawerLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black" />
                      <p className="text-sm text-gray-400">
                        Loading tokens…
                      </p>
                    </div>
                  ) : isSearching ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-400" />
                    </div>
                  ) : visibleReceiveCount === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400 text-sm">
                        No tokens found
                      </p>
                      <p className="text-gray-300 text-xs mt-1">
                        {searchQuery
                          ? 'Try a different name, symbol or address'
                          : 'Try selecting a different chain or category'}
                      </p>
                    </div>
                  ) : (
                    renderReceiveTokenList(
                      getTokenIdentityKey(payToken),
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Slippage modal ── */}
      {showSlippageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSlippageModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4 z-50">
            <h3 className="text-lg font-semibold mb-4">
              Slippage Settings
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slippage tolerance
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {[0.1, 0.5, 1.0, 2.0, 3.0].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setSlippage(v);
                      setCustomSlippage('');
                    }}
                    className={`py-2 text-sm rounded-lg transition-all ${
                      slippage === v && !customSlippage
                        ? 'bg-black text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {v === 0.5
                      ? '0.5% (Auto)'
                      : v === 3.0
                        ? '3% (Default)'
                        : `${v}%`}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
                    const n = parseFloat(e.target.value);
                    if (!isNaN(n) && n >= 0.1 && n <= 50)
                      setSlippage(n);
                  }}
                  placeholder="Custom"
                  className="pr-10"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">
                  %
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4 flex items-start gap-1.5">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Your transaction will revert if the price changes
              unfavorably by more than this percentage.
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSlippageModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowSlippageModal(false)}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Swap in-progress overlay ── */}
      {isSwapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
            <p className="text-gray-700">
              {swapStatus || 'Processing swap…'}
            </p>
          </div>
        </div>
      )}

      {showSwapSuccess && txHash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(10,10,12,0.48)] backdrop-blur-[3px]"
            onClick={dismissSwapReceipt}
          />
          <div className="relative mx-4 w-full max-w-[540px] overflow-hidden rounded-3xl border border-black/[0.06] bg-white text-[#0a0a0c] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4),_0_12px_24px_-8px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md border border-black/[0.06] bg-[#fafafa] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[1.4px]">
                  Confirmed
                </span>
                <span className="text-[11.5px] text-[#6e6e76]">
                  Swap submitted on-chain
                </span>
              </div>
              <button
                onClick={dismissSwapReceipt}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-black/[0.06] bg-[#fafafa] hover:bg-gray-100"
                aria-label="Close swap receipt"
              >
                <X className="h-[13px] w-[13px]" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-3.5 rounded-2xl border border-black/[0.06] bg-[#fafafa] px-5 py-[18px]">
                <div className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-white">
                  <CheckCircle2 className="h-[19px] w-[19px] text-[#19a974]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] font-semibold tracking-[0.6px] text-[#6e6e76]">
                    SWAP · {routeProviderLabel.toUpperCase()}
                  </div>
                  <div className="mt-0.5 truncate text-base font-semibold tracking-[-0.2px]">
                    {payAmount} {payToken?.symbol} → {receiveAmount}{' '}
                    {receiveToken?.symbol}
                  </div>
                </div>
                <span className="rounded-full bg-[#19a974]/10 px-2.5 py-1 text-[10.5px] font-bold text-[#19a974]">
                  SAFE
                </span>
              </div>

              <div className="mt-[18px]">
                <div className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-[1.2px] text-[#6e6e76]">
                  Balance changes
                </div>
                <div className="overflow-hidden rounded-xl border border-black/[0.06]">
                  {[
                    {
                      side: 'out',
                      label: 'You sent',
                      asset: payToken?.symbol || '',
                      amount: `-${payAmount} ${payToken?.symbol || ''}`,
                    },
                    {
                      side: 'in',
                      label: 'You received',
                      asset: receiveToken?.symbol || '',
                      amount: `+${receiveAmount} ${receiveToken?.symbol || ''}`,
                    },
                  ].map((row, index) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 px-3.5 py-3 ${
                        index === 0
                          ? 'border-b border-black/[0.06]'
                          : ''
                      } ${row.side === 'in' ? 'bg-[#19a974]/10' : 'bg-white'}`}
                    >
                      <div
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.06] bg-white ${
                          row.side === 'in' ? 'rotate-180' : ''
                        }`}
                      >
                        <ArrowRight
                          className={`h-3.5 w-3.5 ${
                            row.side === 'in'
                              ? 'text-[#19a974]'
                              : 'text-[#0a0a0c]'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-[#6e6e76]">
                          {row.label}
                        </div>
                        <div className="mt-0.5 text-[13px] font-semibold tracking-[-0.1px]">
                          {row.asset}
                        </div>
                      </div>
                      <div
                        className={`text-right font-mono text-[13px] font-semibold ${
                          row.side === 'in'
                            ? 'text-[#19a974]'
                            : 'text-[#0a0a0c]'
                        }`}
                      >
                        {row.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-black/[0.06] bg-[#fafafa] px-4 py-3.5">
                {[
                  [
                    'Route',
                    `${payToken?.symbol || '—'} → ${receiveToken?.symbol || '—'} · ${routeProviderLabel}`,
                  ],
                  ['Network', getNetworkByChainId(chainId)],
                  [
                    'Tx hash',
                    `${txHash.slice(0, 8)}...${txHash.slice(-8)}`,
                  ],
                ].map(([label, value], index, rows) => (
                  <div
                    key={label}
                    className={`flex justify-between gap-4 py-1.5 ${
                      index === rows.length - 1
                        ? ''
                        : 'border-b border-dashed border-black/[0.04]'
                    }`}
                  >
                    <span className="text-xs text-[#6e6e76]">
                      {label}
                    </span>
                    <span className="min-w-0 truncate text-right font-mono text-xs font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1.6fr] gap-2.5 border-t border-black/[0.04] px-6 py-4">
              <button
                onClick={resetSwapForm}
                className="rounded-xl border border-black/[0.06] bg-[#fafafa] py-3.5 text-sm font-semibold hover:bg-gray-100"
              >
                New swap
              </button>
              <a
                href={swapExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a0a0c] py-3.5 text-sm font-bold text-white hover:bg-black/90"
              >
                View transaction
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
