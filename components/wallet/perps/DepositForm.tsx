'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import Image from 'next/image';
import {
  usePrivy,
  useSendTransaction,
  useWallets,
} from '@privy-io/react-auth';
import {
  useSignAndSendTransaction,
  useWallets as useSolanaWallets,
} from '@privy-io/react-auth/solana';
import {
  ArrowDownToLine,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
  ChevronRight,
  Wallet,
  Droplets,
  ArrowUpDown,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  fallback,
  formatUnits,
  http,
  parseUnits,
} from 'viem';
import { arbitrum, base, mainnet, polygon } from 'viem/chains';
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { getLifiDepositQuote } from '@/actions/lifiForTokenSwap';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { HL_DEPOSIT_CONFIG, HL_IS_TESTNET } from '@/services/hyperliquid/config';
import type { ChainType } from '@/types/token';
import { useHyperliquidDeposit } from './hooks/useHyperliquidDeposit';
import { useHyperliquidFaucet } from './hooks/useHyperliquidFaucet';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import {
  selectPreferredWallet,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';

interface DepositFormProps {
  masterAddress: string | null;
  onClose: () => void;
  onBridgeToArbitrum?: () => void;
  onDepositSubmitted?: () => void;
  /** When true (default), renders the gradient header above the form. */
  showHeader?: boolean;
}

type DepositStep = 'form' | 'processing' | 'success' | 'error';
type ProcessingPhase = 'convert' | 'wait' | 'deposit';

interface DepositToken {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  address: string | null;
  logoURI: string;
  chain: string;
  marketData?: { price?: string | number | null } | null;
  value?: number | string | null;
}

interface LiFiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration?: number;
  };
  transactionRequest: {
    to: string;
    data: string;
    value?: string;
    from: string;
    chainId: number;
    transaction?: string;
  };
  action: {
    fromToken: { symbol: string; decimals: number };
    toToken: { symbol: string; decimals: number };
  };
}

const QUICK_AMOUNTS_USD = ['10', '50', '100', '500'];
const ARBITRUM_CHAIN_ID = String(HL_DEPOSIT_CONFIG.chainId);
const ARBITRUM_USDC_ADDRESS = HL_DEPOSIT_CONFIG.usdcAddress;
const USDC_DECIMALS = 6;
const QUOTE_DEBOUNCE_MS = 550;
const USDC_SETTLE_TIMEOUT_MS = 30 * 60 * 1000;
const USDC_SETTLE_POLL_MS = 5_000;
const USDC_SETTLE_TOLERANCE = 0.005;

const SUPPORTED_CHAINS: ChainType[] = [
  'ETHEREUM',
  'POLYGON',
  'BASE',
  'ARBITRUM',
  'SOLANA',
];

const CHAIN_CONFIG: Record<
  string,
  { id: string; name: string; icon: string; minUsd: number }
> = {
  ETHEREUM: {
    id: '1',
    name: 'Ethereum',
    icon: '/images/IconShop/eTH@3x.png',
    minUsd: 7,
  },
  POLYGON: {
    id: '137',
    name: 'Polygon',
    icon: '/images/IconShop/polygon.png',
    minUsd: 2,
  },
  BASE: {
    id: '8453',
    name: 'Base',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
    minUsd: 2,
  },
  ARBITRUM: {
    id: ARBITRUM_CHAIN_ID,
    name: 'Arbitrum',
    icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    minUsd: 2,
  },
  SOLANA: {
    id: '1151111081099710',
    name: 'Solana',
    icon: '/images/IconShop/solana@2x.png',
    minUsd: 2,
  },
};

const VIEM_CHAINS: Record<
  string,
  typeof mainnet | typeof polygon | typeof base | typeof arbitrum
> = {
  '1': mainnet,
  '137': polygon,
  '8453': base,
  '42161': arbitrum,
};

const RPC_URLS_BY_CHAIN_ID: Record<string, Array<string | undefined>> = {
  '1': [
    process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL,
    'https://ethereum-rpc.publicnode.com',
    'https://rpc.flashbots.net',
    'https://eth.llamarpc.com',
  ],
  '137': [
    process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL,
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon-rpc.com',
  ],
  '8453': [
    process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    'https://base-rpc.publicnode.com',
    'https://mainnet.base.org',
  ],
  [ARBITRUM_CHAIN_ID]: [
    process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL,
    'https://arbitrum-one-rpc.publicnode.com',
    'https://arb1.arbitrum.io/rpc',
  ],
};

const STABLE_SYMBOLS = new Set([
  'USDC',
  'USDC.E',
  'USDT',
  'DAI',
  'PUSD',
  'USDS',
  'USDE',
]);

const ARBITRUM_USDC_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png';

const WAIT_CONFETTI_PIECES = [
  { left: '8%', top: '20%', color: '#38bdf8', x: '-8px', y: '-34px', delay: '0s' },
  { left: '18%', top: '10%', color: '#22c55e', x: '-14px', y: '-26px', delay: '0.12s' },
  { left: '28%', top: '24%', color: '#f59e0b', x: '-10px', y: '-38px', delay: '0.24s' },
  { left: '38%', top: '12%', color: '#ec4899', x: '-4px', y: '-30px', delay: '0.05s' },
  { left: '50%', top: '18%', color: '#6366f1', x: '0px', y: '-42px', delay: '0.18s' },
  { left: '62%', top: '11%', color: '#14b8a6', x: '8px', y: '-31px', delay: '0.28s' },
  { left: '72%', top: '25%', color: '#f97316', x: '14px', y: '-36px', delay: '0.08s' },
  { left: '84%', top: '16%', color: '#a855f7', x: '10px', y: '-28px', delay: '0.2s' },
  { left: '12%', top: '52%', color: '#f43f5e', x: '-16px', y: '-24px', delay: '0.34s' },
  { left: '88%', top: '54%', color: '#10b981', x: '16px', y: '-24px', delay: '0.31s' },
];

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const truncateDecimal = (value: string, decimals: number) => {
  const normalized = String(value || '').trim();
  const dotIdx = normalized.indexOf('.');
  if (dotIdx < 0) return normalized || '0';
  return `${normalized.slice(0, dotIdx)}.${normalized.slice(
    dotIdx + 1,
    dotIdx + 1 + decimals,
  )}`;
};

const tokenKey = (token: DepositToken) =>
  `${token.chain.toUpperCase()}-${token.symbol.toUpperCase()}-${(
    token.address || 'native'
  ).toLowerCase()}`;

const parseBalance = (value: unknown) => {
  const parsed = parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const tokenPrice = (token?: DepositToken | null) => {
  if (!token) return 0;
  const raw = parseFloat(String(token.marketData?.price ?? '0'));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return STABLE_SYMBOLS.has(token.symbol.toUpperCase()) ? 1 : 0;
};

const tokenUsdValue = (token: DepositToken) => {
  const explicitValue = Number(token.value);
  if (Number.isFinite(explicitValue) && explicitValue > 0) {
    return explicitValue;
  }
  const price = tokenPrice(token);
  return price > 0 ? parseBalance(token.balance) * price : 0;
};

const formatMoney = (value: number, maxDecimals = 2) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });

const formatTokenBalance = (value: string | number) => {
  const n = parseFloat(String(value ?? '0'));
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4).replace(/\.?0+$/, '');
  return n.toFixed(6).replace(/\.?0+$/, '');
};

const getPublicClientForChain = (chainId: string) => {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) return null;
  const rpcUrls = Array.from(
    new Set(
      (RPC_URLS_BY_CHAIN_ID[chainId] ?? [])
        .map((url) => url?.trim())
        .filter((url): url is string => Boolean(url)),
    ),
  );
  const transport =
    rpcUrls.length > 1
      ? fallback(rpcUrls.map((url) => http(url)))
      : http(rpcUrls[0]);
  return createPublicClient({ chain, transport });
};

const formatTokenAmount = (
  amount: string | number,
  decimals: number,
): string => {
  try {
    const safeDecimals = decimals || 18;
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    if (!amountStr || amountStr.trim() === '') return '0';
    const cleanAmount = truncateDecimal(amountStr, safeDecimals);
    const numAmount = parseFloat(cleanAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return '0';
    return parseUnits(cleanAmount, safeDecimals).toString();
  } catch {
    return '0';
  }
};

const getTokenAddressForLifi = (token: DepositToken): string => {
  const chain = token.chain.toUpperCase();
  const symbol = token.symbol.toUpperCase();
  if (chain === 'SOLANA' && symbol === 'SOL') {
    return 'So11111111111111111111111111111111111111112';
  }
  if (
    ['ETHEREUM', 'POLYGON', 'BASE', 'ARBITRUM'].includes(chain) &&
    ['ETH', 'POL', 'MATIC'].includes(symbol)
  ) {
    return '0x0000000000000000000000000000000000000000';
  }
  return token.address || '0x0000000000000000000000000000000000000000';
};

const getErrorMessage = (error: unknown) => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Deposit failed. Please try again.';
  const lower = raw.toLowerCase();
  if (
    lower.includes('rejected') ||
    lower.includes('denied') ||
    lower.includes('cancelled') ||
    lower.includes('user rejected')
  ) {
    return 'Transaction was rejected.';
  }
  if (lower.includes('no route') || lower.includes('route not found')) {
    return 'No conversion route is available for that token and amount right now.';
  }
  if (
    (lower.includes('request failed') && lower.includes('url:')) ||
    lower.includes('http request failed') ||
    lower.includes('eth_call')
  ) {
    return 'Token approval check failed while preparing the deposit. Please try again in a moment.';
  }
  return raw;
};

const isDirectArbitrumUsdc = (token?: DepositToken | null) =>
  Boolean(
    token &&
      token.chain.toUpperCase() === 'ARBITRUM' &&
      token.address?.toLowerCase() === ARBITRUM_USDC_ADDRESS.toLowerCase(),
  );

const quoteOutputUsdc = (quote: LiFiQuote | null) => {
  if (!quote?.estimate?.toAmountMin) return 0;
  try {
    return Number(formatUnits(BigInt(quote.estimate.toAmountMin), USDC_DECIMALS));
  } catch {
    return 0;
  }
};

/**
 * DepositForm
 *
 * Lets users fund Hyperliquid from any supported wallet token. Non-USDC inputs
 * are first converted into Arbitrum-native USDC in the user's perps wallet, then
 * that wallet submits the actual USDC transfer to the Hyperliquid bridge.
 */
export function DepositForm({
  masterAddress: masterAddressProp,
  onClose,
  onBridgeToArbitrum,
  onDepositSubmitted,
  showHeader = true,
}: DepositFormProps) {
  const { user, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { ready: solanaReady, wallets: solanaWallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const masterWallet = selectPreferredWallet(
    wallets,
    user?.wallet?.address,
    tradingWalletSelectionOptions(),
  );
  const masterAddress =
    masterAddressProp ?? (walletsReady ? (masterWallet?.address ?? null) : null);

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !solanaWallets.length) return undefined;
    return solanaWallets.find((wallet) => wallet.address) ?? solanaWallets[0];
  }, [solanaReady, solanaWallets]);

  const [amount, setAmount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<DepositToken | null>(null);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [selectedChainFilter, setSelectedChainFilter] = useState('all');
  const [tokenSearch, setTokenSearch] = useState('');
  const [lifiQuote, setLifiQuote] = useState<LiFiQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [localStep, setLocalStep] = useState<DepositStep>('form');
  const [processingPhase, setProcessingPhase] =
    useState<ProcessingPhase>('deposit');
  const [depositStatus, setDepositStatus] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [finalTxHash, setFinalTxHash] = useState<string | null>(null);
  const [testnetMethod, setTestnetMethod] = useState<'bridge' | 'faucet'>(
    'bridge',
  );

  const isTransactionInProgress = useRef(false);
  const quoteRequestIdRef = useRef(0);

  const {
    deposit,
    prepareDelegatedDeposit,
    fetchArbitrumUsdcBalance,
    isDepositing,
    txHash,
    error,
    minDeposit,
  } = useHyperliquidDeposit();

  const faucet = useHyperliquidFaucet(masterAddress);
  const showFaucetTab = HL_IS_TESTNET && !faucet.alreadyClaimed;
  const isFaucetActive = showFaucetTab && testnetMethod === 'faucet';

  const {
    data: accountData,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = useHyperliquidPositions(HL_IS_TESTNET ? masterAddress : null);

  const evmAddress = masterAddress ?? undefined;
  const solanaAddress = selectedSolanaWallet?.address;
  const {
    tokens,
    loading: tokensLoading,
    refetch: refetchTokens,
  } = useMultiChainTokenData(solanaAddress, evmAddress, SUPPORTED_CHAINS);

  const syntheticArbitrumUsdc = useMemo<DepositToken | null>(() => {
    if (usdcBalance === null) return null;
    return {
      name: 'USD Coin',
      symbol: 'USDC',
      balance: usdcBalance,
      decimals: USDC_DECIMALS,
      address: ARBITRUM_USDC_ADDRESS,
      logoURI: ARBITRUM_USDC_LOGO,
      chain: 'ARBITRUM',
      marketData: { price: '1' },
      value: parseBalance(usdcBalance),
    };
  }, [usdcBalance]);

  const depositTokens = useMemo<DepositToken[]>(() => {
    const normalized = tokens.map((token) => {
      const candidate: DepositToken = {
        name: token.name,
        symbol: token.symbol,
        balance: String(token.balance ?? '0'),
        decimals: token.decimals || 18,
        address: token.address ?? null,
        logoURI: token.logoURI || '',
        chain: token.chain,
        marketData: token.marketData,
        value: (token as { value?: number | string | null }).value,
      };
      if (isDirectArbitrumUsdc(candidate) && usdcBalance !== null) {
        return {
          ...candidate,
          balance: usdcBalance,
          marketData: candidate.marketData ?? { price: '1' },
          value: parseBalance(usdcBalance),
        };
      }
      return candidate;
    });

    if (
      syntheticArbitrumUsdc &&
      !normalized.some((token) => tokenKey(token) === tokenKey(syntheticArbitrumUsdc))
    ) {
      normalized.unshift(syntheticArbitrumUsdc);
    }

    return normalized
      .filter((token) => parseBalance(token.balance) > 0)
      .sort((a, b) => {
        if (isDirectArbitrumUsdc(a)) return -1;
        if (isDirectArbitrumUsdc(b)) return 1;
        return tokenUsdValue(b) - tokenUsdValue(a);
      });
  }, [tokens, syntheticArbitrumUsdc, usdcBalance]);

  const preferredToken = useMemo(
    () =>
      depositTokens.find(isDirectArbitrumUsdc) ??
      depositTokens.find((token) => tokenUsdValue(token) >= minDeposit) ??
      depositTokens[0] ??
      null,
    [depositTokens, minDeposit],
  );

  const selectedTokenKey = selectedToken ? tokenKey(selectedToken) : '';

  useEffect(() => {
    if (!selectedTokenKey && preferredToken) {
      setSelectedToken(preferredToken);
      return;
    }

    if (!selectedTokenKey) return;
    const updated = depositTokens.find((token) => tokenKey(token) === selectedTokenKey);
    if (updated && updated.balance !== selectedToken?.balance) {
      setSelectedToken(updated);
    }
  }, [
    depositTokens,
    preferredToken,
    selectedToken?.balance,
    selectedTokenKey,
  ]);

  useEffect(() => {
    if (testnetMethod === 'faucet' && HL_IS_TESTNET && faucet.alreadyClaimed) {
      setTestnetMethod('bridge');
    }
  }, [testnetMethod, faucet.alreadyClaimed]);

  useEffect(() => {
    if (faucet.success) {
      refetchAccount();
      onDepositSubmitted?.();
    }
  }, [faucet.success, refetchAccount, onDepositSubmitted]);

  useEffect(() => {
    if (!masterAddress) return;
    setBalanceLoading(true);
    fetchArbitrumUsdcBalance(masterAddress)
      .then(setUsdcBalance)
      .finally(() => setBalanceLoading(false));
  }, [masterAddress, fetchArbitrumUsdcBalance]);

  useEffect(() => {
    if (localStep !== 'form') return;
    setFinalTxHash(null);
    setLocalError(null);
  }, [amount, selectedTokenKey, localStep]);

  const amountNum = parseFloat(amount) || 0;
  const balanceNum = parseBalance(selectedToken?.balance);
  const price = tokenPrice(selectedToken);
  const amountUsd = price > 0 ? amountNum * price : 0;
  const sourceChainKey = selectedToken?.chain.toUpperCase() ?? '';
  const sourceChainConfig = CHAIN_CONFIG[sourceChainKey];
  const sourceChainMinUsd = sourceChainConfig?.minUsd ?? 2;
  const needsConversion = Boolean(selectedToken && !isDirectArbitrumUsdc(selectedToken));
  const quoteMinUsdc = quoteOutputUsdc(lifiQuote);
  const hasMasterWallet = Boolean(masterAddress);
  const sourceWalletAddress =
    selectedToken?.chain.toUpperCase() === 'SOLANA'
      ? solanaAddress
      : masterAddress ?? undefined;

  const isInsufficient = amountNum > 0 && amountNum > balanceNum;
  const isBelowEstimatedMin =
    amountNum > 0 &&
    !isInsufficient &&
    price > 0 &&
    amountUsd < Math.max(minDeposit, sourceChainMinUsd) - 0.01;
  const quoteBelowMin =
    needsConversion && lifiQuote && quoteMinUsdc < minDeposit - 0.01;
  const canQuote =
    needsConversion &&
    Boolean(selectedToken) &&
    amountNum > 0 &&
    !isInsufficient &&
    Boolean(masterAddress) &&
    Boolean(sourceWalletAddress);
  const canDeposit =
    Boolean(selectedToken) &&
    amountNum > 0 &&
    !isInsufficient &&
    !isBelowEstimatedMin &&
    !isDepositing &&
    !isTransactionInProgress.current &&
    hasMasterWallet &&
    (!needsConversion || (Boolean(lifiQuote) && !quoteBelowMin));

  const fetchLifiQuote = useCallback(async () => {
    if (!selectedToken || !amount || !masterAddress || !sourceWalletAddress) {
      return;
    }
    const fromChainId = CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.id;
    if (!fromChainId) return;

    const requestId = quoteRequestIdRef.current + 1;
    quoteRequestIdRef.current = requestId;
    setIsQuoteLoading(true);
    setQuoteError(null);

    try {
      const fromAmount = formatTokenAmount(amount, selectedToken.decimals || 18);
      if (fromAmount === '0') throw new Error('Invalid amount');

      const result = await getLifiDepositQuote({
        fromChain: fromChainId,
        toChain: ARBITRUM_CHAIN_ID,
        fromToken: getTokenAddressForLifi(selectedToken),
        toToken: ARBITRUM_USDC_ADDRESS,
        fromAddress: sourceWalletAddress,
        toAddress: masterAddress,
        fromAmount,
        slippage: '0.01',
      });

      if (quoteRequestIdRef.current !== requestId) return;
      if (!result.success) throw new Error(result.error);
      setLifiQuote(result.data as LiFiQuote);
    } catch (quoteErr) {
      if (quoteRequestIdRef.current !== requestId) return;
      setLifiQuote(null);
      setQuoteError(getErrorMessage(quoteErr));
    } finally {
      if (quoteRequestIdRef.current === requestId) {
        setIsQuoteLoading(false);
      }
    }
  }, [amount, masterAddress, selectedToken, sourceWalletAddress]);

  useEffect(() => {
    if (!canQuote || localStep !== 'form') {
      setIsQuoteLoading(false);
      if (!needsConversion) {
        setLifiQuote(null);
        setQuoteError(null);
      }
      return;
    }

    setLifiQuote(null);
    const timer = setTimeout(() => {
      fetchLifiQuote();
    }, QUOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [canQuote, fetchLifiQuote, localStep, needsConversion]);

  const safeRefreshSession = useCallback(async () => {
    try {
      await Promise.race([
        getAccessToken(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
    } catch {
      // Signing can still proceed; this just warms Privy's session.
    }
  }, [getAccessToken]);

  const executeLifiEvmSwap = useCallback(async () => {
    if (!lifiQuote || !selectedToken || !masterAddress) {
      throw new Error('No quote available');
    }

    const sourceChainIdStr = CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.id;
    if (!sourceChainIdStr) throw new Error('Unsupported source chain');
    const sourceChainId = Number(sourceChainIdStr);
    const wallet =
      wallets.find(
        (candidate) =>
          candidate.address?.toLowerCase() === masterAddress.toLowerCase(),
      ) ?? masterWallet;
    if (!wallet) throw new Error('EVM wallet not found');

    if (wallet.chainId !== `eip155:${sourceChainId}`) {
      await wallet.switchChain(sourceChainId);
    }

    const sourcePublicClient = getPublicClientForChain(sourceChainIdStr);
    if (!sourcePublicClient) {
      throw new Error(`Unsupported source chain: ${selectedToken.chain}`);
    }

    const { transactionRequest, estimate } = lifiQuote;
    const fromTokenAddress = getTokenAddressForLifi(selectedToken);
    const isNativeToken =
      fromTokenAddress === '0x0000000000000000000000000000000000000000';

    if (!isNativeToken && estimate.approvalAddress) {
      setDepositStatus('Checking token approval...');
      const fromAmount = formatTokenAmount(amount, selectedToken.decimals || 18);
      const currentAllowance = await sourcePublicClient.readContract({
        address: fromTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [
          masterAddress as `0x${string}`,
          estimate.approvalAddress as `0x${string}`,
        ],
      });

      if (currentAllowance < BigInt(fromAmount)) {
        setDepositStatus('Requesting token approval...');
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [
            estimate.approvalAddress as `0x${string}`,
            BigInt(
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            ),
          ],
        });

        let approvalHash: string;
        try {
          const result = await sendTransaction(
            {
              to: fromTokenAddress as `0x${string}`,
              data: approveData,
              chainId: sourceChainId,
            },
            { sponsor: false },
          );
          approvalHash = result.hash;
        } catch (approvalErr) {
          const message = getErrorMessage(approvalErr).toLowerCase();
          if (message.includes('rejected')) throw approvalErr;
          const result = await sendTransaction({
            to: fromTokenAddress as `0x${string}`,
            data: approveData,
            chainId: sourceChainId,
          });
          approvalHash = result.hash;
        }

        setDepositStatus('Waiting for approval confirmation...');
        await sourcePublicClient.waitForTransactionReceipt({
          hash: approvalHash as `0x${string}`,
        });
      }
    }

    setDepositStatus('Converting to Arbitrum USDC...');
    let txValue = BigInt(0);
    if (transactionRequest.value) {
      try {
        txValue = BigInt(transactionRequest.value);
      } catch {
        txValue = BigInt(0);
      }
    }

    let hash: string;
    try {
      const result = await sendTransaction(
        {
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          value: txValue,
          chainId: sourceChainId,
        },
        { sponsor: false },
      );
      hash = result.hash;
    } catch (swapErr) {
      const message = getErrorMessage(swapErr).toLowerCase();
      if (message.includes('rejected')) throw swapErr;
      setDepositStatus('Retrying conversion...');
      const result = await sendTransaction({
        to: transactionRequest.to as `0x${string}`,
        data: transactionRequest.data as `0x${string}`,
        value: txValue,
        chainId: sourceChainId,
      });
      hash = result.hash;
    }

    setDepositStatus('Waiting for conversion confirmation...');
    try {
      await sourcePublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });
    } catch {
      // Cross-chain routes can continue after the source tx confirms.
    }

    return hash;
  }, [
    amount,
    lifiQuote,
    masterAddress,
    masterWallet,
    selectedToken,
    sendTransaction,
    wallets,
  ]);

  const executeLifiSolanaSwap = useCallback(async () => {
    if (!lifiQuote || !selectedToken || !signAndSendTransaction || !selectedSolanaWallet) {
      throw new Error('No quote available or wallet not ready');
    }

    const { transactionRequest } = lifiQuote;
    const rawTx = transactionRequest.transaction || transactionRequest.data;
    if (!rawTx) throw new Error('No transaction data in LiFi quote');

    const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!solanaRpcUrl) throw new Error('No Solana RPC URL configured');

    const connection = new Connection(solanaRpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    const walletPubkey = new PublicKey(selectedSolanaWallet.address);

    setDepositStatus('Checking Solana token accounts...');
    const commonMints: { address: string; symbol: string }[] = [
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        symbol: 'USDT',
      },
      {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'WSOL',
      },
    ];
    const sourceTokenAddress = getTokenAddressForLifi(selectedToken);
    if (
      selectedToken.symbol.toUpperCase() !== 'SOL' &&
      !commonMints.some((mint) => mint.address === sourceTokenAddress)
    ) {
      commonMints.push({
        address: sourceTokenAddress,
        symbol: selectedToken.symbol,
      });
    }

    let createdAnyAta = false;
    for (const { address: mintAddr, symbol } of commonMints) {
      try {
        const mintPubkey = new PublicKey(mintAddr);
        const mintInfo = await connection.getAccountInfo(mintPubkey);
        const tokenProgramId = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;
        const ata = await getAssociatedTokenAddress(
          mintPubkey,
          walletPubkey,
          false,
          tokenProgramId,
        );
        const ataInfo = await connection.getAccountInfo(ata);
        if (!ataInfo) {
          setDepositStatus(`Creating ${symbol} token account...`);
          const createAtaTx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              walletPubkey,
              ata,
              walletPubkey,
              mintPubkey,
              tokenProgramId,
            ),
          );
          const { blockhash } = await connection.getLatestBlockhash('finalized');
          createAtaTx.recentBlockhash = blockhash;
          createAtaTx.feePayer = walletPubkey;
          const serializedAtaTx = new Uint8Array(
            createAtaTx.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            }),
          );
          await safeRefreshSession();
          const ataResult = await signAndSendTransaction({
            transaction: serializedAtaTx,
            wallet: selectedSolanaWallet,
          });
          const ataSig = bs58.encode(ataResult.signature);
          await connection.confirmTransaction(ataSig, 'finalized');
          createdAnyAta = true;
        }
      } catch (ataError) {
        console.warn(`Could not check/create ATA for ${symbol}:`, ataError);
      }
    }

    if (createdAnyAta) {
      await sleep(3000);
    }

    setDepositStatus('Converting to Arbitrum USDC...');
    const txBytes = Uint8Array.from(atob(rawTx), (char) => char.charCodeAt(0));
    const transaction = VersionedTransaction.deserialize(txBytes);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('finalized');
    transaction.message.recentBlockhash = blockhash;

    await safeRefreshSession();
    const serializedTransaction = new Uint8Array(transaction.serialize());

    let signatureString: string;
    try {
      const result = await signAndSendTransaction({
        transaction: serializedTransaction,
        wallet: selectedSolanaWallet,
      });
      signatureString = bs58.encode(result.signature);
    } catch (swapErr) {
      const message = getErrorMessage(swapErr).toLowerCase();
      if (message.includes('rejected')) throw swapErr;
      setDepositStatus('Retrying conversion...');
      await safeRefreshSession();
      const result = await signAndSendTransaction({
        transaction: serializedTransaction,
        wallet: selectedSolanaWallet,
      });
      signatureString = bs58.encode(result.signature);
    }

    setDepositStatus('Waiting for conversion confirmation...');
    try {
      await connection.confirmTransaction(
        {
          signature: signatureString,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed',
      );
    } catch {
      // The bridge route can keep progressing even if this confirm call times out.
    }

    return signatureString;
  }, [
    lifiQuote,
    safeRefreshSession,
    selectedSolanaWallet,
    selectedToken,
    signAndSendTransaction,
  ]);

  const waitForConvertedUsdc = useCallback(
    async (baselineBalance: number, minExpectedUsdc: number) => {
      if (!masterAddress) throw new Error('EVM wallet not found');
      const target = baselineBalance + minExpectedUsdc - USDC_SETTLE_TOLERANCE;
      const startedAt = Date.now();

      while (Date.now() - startedAt < USDC_SETTLE_TIMEOUT_MS) {
        const currentRaw = await fetchArbitrumUsdcBalance(masterAddress);
        const current = parseBalance(currentRaw);
        setUsdcBalance(currentRaw);
        if (current >= target) return currentRaw;
        const elapsedMinutes = Math.max(
          1,
          Math.ceil((Date.now() - startedAt) / 60_000),
        );
        setDepositStatus(
          `Waiting for Arbitrum USDC to arrive... ${elapsedMinutes}m elapsed`,
        );
        await sleep(USDC_SETTLE_POLL_MS);
      }

      throw new Error(
        'USDC is still arriving on Arbitrum. Keep this deposit open so Swop can finish funding Hyperliquid as soon as it lands.',
      );
    },
    [fetchArbitrumUsdcBalance, masterAddress],
  );

  const handleDeposit = useCallback(async () => {
    if (!selectedToken || !amount || !masterAddress || !canDeposit) return;

    isTransactionInProgress.current = true;
    setLocalStep('processing');
    setLocalError(null);
    setFinalTxHash(null);
    setDepositStatus('Preparing deposit...');

    try {
      await prepareDelegatedDeposit(masterAddress);

      let depositAmount = truncateDecimal(amount, USDC_DECIMALS);

      if (needsConversion) {
        if (!lifiQuote) throw new Error('Please wait for a conversion quote.');
        const expectedUsdc = quoteOutputUsdc(lifiQuote);
        if (expectedUsdc < minDeposit) {
          throw new Error(`Minimum deposit is $${minDeposit} USDC`);
        }

        const baselineRaw = await fetchArbitrumUsdcBalance(masterAddress);
        const baseline = parseBalance(baselineRaw);
        setUsdcBalance(baselineRaw);
        setProcessingPhase('convert');

        if (selectedToken.chain.toUpperCase() === 'SOLANA') {
          await executeLifiSolanaSwap();
        } else {
          await executeLifiEvmSwap();
        }

        setProcessingPhase('wait');
        await waitForConvertedUsdc(baseline, expectedUsdc);
        depositAmount = truncateDecimal(formatUnits(BigInt(lifiQuote.estimate.toAmountMin), USDC_DECIMALS), USDC_DECIMALS);
      }

      setProcessingPhase('deposit');
      setDepositStatus('Submitting Hyperliquid deposit...');
      const hash = await deposit(depositAmount);
      setFinalTxHash(hash ?? txHash);
      onDepositSubmitted?.();

      const refreshedBalance = await fetchArbitrumUsdcBalance(masterAddress);
      setUsdcBalance(refreshedBalance);
      refetchTokens();
      setLocalStep('success');
    } catch (depositErr) {
      setLocalError(getErrorMessage(depositErr));
      setLocalStep('error');
    } finally {
      isTransactionInProgress.current = false;
    }
  }, [
    amount,
    canDeposit,
    deposit,
    executeLifiEvmSwap,
    executeLifiSolanaSwap,
    fetchArbitrumUsdcBalance,
    lifiQuote,
    masterAddress,
    minDeposit,
    needsConversion,
    onDepositSubmitted,
    prepareDelegatedDeposit,
    refetchTokens,
    selectedToken,
    txHash,
    waitForConvertedUsdc,
  ]);

  const handleSelectToken = (token: DepositToken) => {
    setSelectedToken(token);
    setAmount('');
    setLifiQuote(null);
    setQuoteError(null);
    setTokenPickerOpen(false);
    setLocalStep('form');
  };

  const setAmountForUsd = (usdAmount: string) => {
    if (!selectedToken) return;
    const parsedUsd = parseFloat(usdAmount);
    const selectedPrice = tokenPrice(selectedToken);
    if (!Number.isFinite(parsedUsd) || selectedPrice <= 0) return;
    const nextAmount = parsedUsd / selectedPrice;
    setAmount(truncateDecimal(nextAmount.toFixed(selectedToken.decimals || 6), selectedToken.decimals || 6));
    setLifiQuote(null);
    setQuoteError(null);
  };

  const retryFromError = () => {
    setLocalStep('form');
    setLocalError(null);
    setDepositStatus('');
  };

  const directArbitrumUsdcBalance = parseBalance(usdcBalance);
  const sourceTokenPrice = tokenPrice(selectedToken);
  const showEstimatedMin =
    amountNum > 0 && sourceTokenPrice > 0 && isBelowEstimatedMin;

  return (
    <>
      {showHeader &&
        (isFaucetActive ? (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Testnet Faucet</h2>
                <p className="text-purple-100 text-sm">
                  Claim $1,000 USDC on Hyperliquid testnet
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Deposit to Hyperliquid
                </h2>
                <p className="text-blue-100 text-sm">
                  Convert any token to Arbitrum USDC for perps
                </p>
              </div>
            </div>
          </div>
        ))}

      {showFaucetTab && (
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setTestnetMethod('bridge')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                testnetMethod === 'bridge'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              onClick={() => setTestnetMethod('faucet')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                testnetMethod === 'faucet'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              Testnet Faucet
            </button>
          </div>
        </div>
      )}

      {isFaucetActive ? (
        <FaucetView
          masterAddress={masterAddress}
          isClaiming={faucet.isClaiming}
          success={faucet.success}
          error={faucet.error}
          accountValue={accountData?.accountValue ?? null}
          withdrawable={accountData?.withdrawable ?? null}
          balanceLoading={accountLoading}
          onClaim={() => masterAddress && faucet.claimFaucet(masterAddress)}
          onClose={onClose}
        />
      ) : localStep === 'success' && (finalTxHash || txHash) ? (
        <SuccessView
          txHash={finalTxHash ?? txHash!}
          converted={needsConversion}
          onClose={onClose}
        />
      ) : localStep === 'processing' ? (
        <ProcessingView
          needsConversion={needsConversion}
          phase={processingPhase}
          status={depositStatus}
        />
      ) : localStep === 'error' ? (
        <ErrorView
          error={localError || error || 'Deposit failed. Please try again.'}
          onBack={retryFromError}
          onClose={onClose}
        />
      ) : tokenPickerOpen ? (
        <TokenPickerView
          tokens={depositTokens}
          tokensLoading={tokensLoading}
          selectedToken={selectedToken}
          selectedChainFilter={selectedChainFilter}
          tokenSearch={tokenSearch}
          onSearchChange={setTokenSearch}
          onChainFilterChange={setSelectedChainFilter}
          onSelectToken={handleSelectToken}
          onClose={() => setTokenPickerOpen(false)}
          onBridgeToArbitrum={onBridgeToArbitrum}
        />
      ) : (
        <>
          <div className="px-6 pt-4 pb-2">
            <FlowSteps
              currentStep="form"
              needsConversion={needsConversion}
              phase={processingPhase}
            />
          </div>

          <div className="px-6 pb-5 space-y-4">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Pick any supported token. Swop converts it to{' '}
                <strong>Arbitrum USDC</strong>, then deposits that USDC from
                your wallet to Hyperliquid. Funds usually arrive in{' '}
                <strong>2-5 minutes</strong> after the final deposit transaction.
              </p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">
                  {masterAddress
                    ? `${masterAddress.slice(0, 6)}...${masterAddress.slice(-4)}`
                    : 'Connect EVM wallet'}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Arbitrum USDC</p>
                {balanceLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />
                ) : (
                  <p className="text-sm font-semibold text-gray-800">
                    ${formatMoney(directArbitrumUsdcBalance)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  From token
                </label>
                <button
                  onClick={() => setTokenPickerOpen(true)}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  Change
                </button>
              </div>
              <button
                onClick={() => setTokenPickerOpen(true)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                {selectedToken ? (
                  <>
                    <TokenIdentity token={selectedToken} />
                    <div className="text-right pl-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatTokenBalance(selectedToken.balance)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sourceChainConfig?.name || selectedToken.chain}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    Select a token to deposit
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Amount {selectedToken ? `(${selectedToken.symbol})` : ''}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Min ${minDeposit}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedToken) {
                        setAmount(selectedToken.balance);
                        setLifiQuote(null);
                        setQuoteError(null);
                      }
                    }}
                    disabled={!selectedToken || isDepositing}
                    className="text-xs text-blue-600 font-semibold disabled:opacity-40"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    const next = event.target.value
                      .replace(/[^0-9.]/g, '')
                      .replace(/(\..*)\./g, '$1');
                    setAmount(next);
                    setLifiQuote(null);
                    setQuoteError(null);
                  }}
                  placeholder="0.00"
                  disabled={isDepositing || !selectedToken}
                  className="w-full pl-4 pr-24 py-3 text-lg font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                  {selectedToken?.symbol ?? ''}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS_USD.map((quickAmount) => {
                  const quickDisabled =
                    !selectedToken ||
                    tokenPrice(selectedToken) <= 0 ||
                    isDepositing;
                  return (
                    <button
                      key={quickAmount}
                      onClick={() => setAmountForUsd(quickAmount)}
                      disabled={quickDisabled}
                      className="py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      ${quickAmount}
                    </button>
                  );
                })}
              </div>
            </div>

            {amountNum > 0 && sourceTokenPrice > 0 && (
              <p className="text-xs text-gray-500">
                Estimated value: ${formatMoney(amountUsd)}
              </p>
            )}

            {isInsufficient && selectedToken && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                Insufficient {selectedToken.symbol} balance
              </p>
            )}

            {showEstimatedMin && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Minimum estimated value is $
                {Math.max(minDeposit, sourceChainMinUsd).toFixed(0)}
              </p>
            )}

            {!masterAddress && (
              <p className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                Connect an EVM wallet before depositing to Hyperliquid
              </p>
            )}

            {needsConversion && amountNum > 0 && !isInsufficient && (
              <QuotePanel
                quote={lifiQuote}
                quoteError={quoteError}
                isQuoteLoading={isQuoteLoading}
                outputUsdc={quoteMinUsdc}
                quoteBelowMin={Boolean(quoteBelowMin)}
                onRefresh={fetchLifiQuote}
              />
            )}

            {!needsConversion && amountNum >= minDeposit && !isInsufficient && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>You send</span>
                  <span className="font-medium text-gray-800">
                    ${amountNum.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Network</span>
                  <span className="font-medium text-gray-800">
                    Arbitrum One
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>You receive</span>
                  <span className="font-medium text-emerald-600">
                    ${amountNum.toFixed(2)} on Hyperliquid
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Estimated time</span>
                  <span className="font-medium text-gray-800">~2-5 min</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Bridge fee</span>
                  <span className="font-medium text-emerald-600">Free</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={isDepositing || isTransactionInProgress.current}
                className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={!canDeposit}
                className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isQuoteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Quoting...
                  </>
                ) : needsConversion ? (
                  <>
                    <ArrowUpDown className="w-4 h-4" />
                    Convert & Deposit
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    Deposit USDC
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function TokenPickerView({
  tokens,
  tokensLoading,
  selectedToken,
  selectedChainFilter,
  tokenSearch,
  onSearchChange,
  onChainFilterChange,
  onSelectToken,
  onClose,
  onBridgeToArbitrum,
}: {
  tokens: DepositToken[];
  tokensLoading: boolean;
  selectedToken: DepositToken | null;
  selectedChainFilter: string;
  tokenSearch: string;
  onSearchChange: (value: string) => void;
  onChainFilterChange: (value: string) => void;
  onSelectToken: (token: DepositToken) => void;
  onClose: () => void;
  onBridgeToArbitrum?: () => void;
}) {
  const query = tokenSearch.trim().toLowerCase();
  const filteredTokens = tokens.filter((token) => {
    const matchesChain =
      selectedChainFilter === 'all' ||
      token.chain.toUpperCase() === selectedChainFilter;
    const matchesQuery =
      !query ||
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query);
    return matchesChain && matchesQuery;
  });

  return (
    <div className="px-6 pb-6 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Select deposit token
          </h3>
          <p className="text-xs text-gray-500">
            Converts to Arbitrum USDC before the Hyperliquid deposit
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
          aria-label="Close token picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={tokenSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tokens"
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...SUPPORTED_CHAINS].map((chain) => (
          <button
            key={chain}
            onClick={() => onChainFilterChange(chain)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedChainFilter === chain
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {chain !== 'all' && CHAIN_CONFIG[chain]?.icon && (
              <Image
                src={sanitizeNextImageSrc(CHAIN_CONFIG[chain].icon)}
                alt=""
                width={14}
                height={14}
                className="rounded-full"
              />
            )}
            {chain === 'all' ? 'All chains' : CHAIN_CONFIG[chain]?.name || chain}
          </button>
        ))}
      </div>

      {tokensLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No funded tokens found</p>
          {onBridgeToArbitrum && (
            <button
              onClick={onBridgeToArbitrum}
              className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 font-semibold"
            >
              Open classic bridge
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {filteredTokens.map((token) => {
            const selected = selectedToken && tokenKey(selectedToken) === tokenKey(token);
            return (
              <button
                key={tokenKey(token)}
                onClick={() => onSelectToken(token)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors border ${
                  selected
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <TokenIdentity token={token} />
                <div className="text-right pl-3">
                  <p className="font-medium text-gray-900">
                    {formatTokenBalance(token.balance)}
                  </p>
                  {tokenUsdValue(token) > 0 && (
                    <p className="text-xs text-gray-500">
                      ${formatMoney(tokenUsdValue(token))}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TokenIdentity({ token }: { token: DepositToken }) {
  const chain = token.chain.toUpperCase();
  const chainConfig = CHAIN_CONFIG[chain];

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative flex-shrink-0">
        {token.logoURI ? (
          <Image
            src={sanitizeNextImageSrc(token.logoURI)}
            alt=""
            width={40}
            height={40}
            className="rounded-full bg-gray-100 object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-bold text-sm">
              {token.symbol.slice(0, 2)}
            </span>
          </div>
        )}
        {chainConfig?.icon && (
          <Image
            src={sanitizeNextImageSrc(chainConfig.icon)}
            alt=""
            width={16}
            height={16}
            className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white"
          />
        )}
      </div>
      <div className="text-left min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {token.symbol}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {token.name} {chainConfig ? `(${chainConfig.name})` : ''}
        </p>
      </div>
    </div>
  );
}

function QuotePanel({
  quote,
  quoteError,
  isQuoteLoading,
  outputUsdc,
  quoteBelowMin,
  onRefresh,
}: {
  quote: LiFiQuote | null;
  quoteError: string | null;
  isQuoteLoading: boolean;
  outputUsdc: number;
  quoteBelowMin: boolean;
  onRefresh: () => void;
}) {
  if (isQuoteLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <p className="text-sm text-blue-800">Finding best conversion route...</p>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-600">{quoteError}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-xs text-red-700 font-semibold underline"
          >
            Retry quote
          </button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-gray-400" />
        <p className="text-sm text-gray-600">Enter an amount to get a route.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl px-4 py-3 space-y-1.5 text-xs border ${
        quoteBelowMin
          ? 'bg-amber-50 border-amber-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={quoteBelowMin ? 'text-amber-700' : 'text-emerald-700'}>
          Converts to
        </span>
        <button
          onClick={onRefresh}
          disabled={isQuoteLoading}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Minimum received</span>
        <span
          className={`font-semibold ${
            quoteBelowMin ? 'text-amber-700' : 'text-emerald-700'
          }`}
        >
          ~${formatMoney(outputUsdc, 4)} USDC
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Final network</span>
        <span className="font-medium text-gray-800">Arbitrum One</span>
      </div>
      {quoteBelowMin && (
        <p className="pt-1 text-amber-700">
          Route output is below the Hyperliquid minimum deposit.
        </p>
      )}
    </div>
  );
}

function ProcessingView({
  needsConversion,
  phase,
  status,
}: {
  needsConversion: boolean;
  phase: ProcessingPhase;
  status: string;
}) {
  const isWaitingForFunds = needsConversion && phase === 'wait';

  return (
    <div className="px-6 pb-6 pt-4 space-y-5">
      <FlowSteps currentStep="processing" needsConversion={needsConversion} phase={phase} />
      <div
        className="flex flex-col items-center text-center gap-4 py-6"
        role="status"
        aria-live="polite"
      >
        {isWaitingForFunds ? (
          <FundsOnTheWayCelebration />
        ) : (
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {isWaitingForFunds
              ? 'Funds are on the way 🚀'
              : needsConversion
                ? 'Converting & Depositing'
                : 'Depositing USDC'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {status || 'Confirm the transaction in your wallet.'}
          </p>
          {isWaitingForFunds && (
            <p className="mt-3 text-xs leading-relaxed text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              Keep this window open. As soon as the USDC lands on Arbitrum,
              Swop will deposit it to your perps account automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FundsOnTheWayCelebration() {
  return (
    <div className="relative h-28 w-full max-w-xs overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 via-white to-emerald-50 shadow-sm">
      <div className="absolute inset-x-6 bottom-5 h-10 rounded-full bg-emerald-200/30 blur-xl" />
      {WAIT_CONFETTI_PIECES.map((piece, index) => (
        <span
          key={`${piece.left}-${piece.top}`}
          className="absolute h-2.5 w-1.5 rounded-sm opacity-0"
          style={
            {
              left: piece.left,
              top: piece.top,
              backgroundColor: piece.color,
              animation:
                'swop-wait-confetti 1.7s ease-out infinite',
              animationDelay: piece.delay,
              '--confetti-x': piece.x,
              '--confetti-y': piece.y,
              transform: `rotate(${index * 28}deg)`,
            } as CSSProperties
          }
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-sky-100">
          <div className="absolute -inset-2 rounded-full bg-sky-200/40 animate-ping" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
            <Rocket className="h-6 w-6 animate-bounce" />
          </div>
        </div>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 shadow-sm">
        <Sparkles className="h-3 w-3" />
        Auto-deposit queued
      </div>

      <style>{`
        @keyframes swop-wait-confetti {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.8);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--confetti-x), var(--confetti-y), 0) rotate(220deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function ErrorView({
  error,
  onBack,
  onClose,
}: {
  error: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-800">Deposit failed</h3>
        <p className="text-sm text-red-600 mt-1 max-w-full break-words">
          {error}
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold text-white transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Faucet View (testnet only) ───────────────────────────────────────────────

interface FaucetViewProps {
  masterAddress: string | null;
  isClaiming: boolean;
  success: boolean;
  error: string | null;
  accountValue: string | null;
  withdrawable: string | null;
  balanceLoading: boolean;
  onClaim: () => void;
  onClose: () => void;
}

function FaucetView({
  masterAddress,
  isClaiming,
  success,
  error,
  accountValue,
  withdrawable,
  balanceLoading,
  onClaim,
  onClose,
}: FaucetViewProps) {
  const accountNum = parseFloat(accountValue ?? '0');
  const withdrawableNum = parseFloat(withdrawable ?? '0');

  const BalanceRow = () => (
    <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">HL Testnet Balance</span>
        {balanceLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
        ) : (
          <span className="text-sm font-bold text-gray-800">
            $
            {accountNum.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Available to withdraw</span>
        {balanceLoading ? (
          <span className="text-xs text-gray-300">-</span>
        ) : (
          <span className="text-xs font-medium text-emerald-600">
            $
            {withdrawableNum.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Funds Claimed!</h3>
          <p className="text-sm text-gray-500 mt-1">
            $1,000 testnet USDC has been added to your account.
          </p>
        </div>
        <div className="w-full">
          <BalanceRow />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-4 space-y-4">
      <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl p-3">
        <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700">
          Claims <strong>$1,000 USDC</strong> directly on Hyperliquid testnet -
          no bridge or Arbitrum transaction needed. One claim per address.
        </p>
      </div>

      {masterAddress && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <Wallet className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-mono">
            {masterAddress.slice(0, 6)}...{masterAddress.slice(-4)}
          </span>
        </div>
      )}

      <BalanceRow />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          disabled={isClaiming}
          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onClaim}
          disabled={isClaiming || !masterAddress}
          className="flex-1 py-2.5 px-4 bg-violet-500 hover:bg-violet-600 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Droplets className="w-4 h-4" />
              Claim $1,000 USDC
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function FlowSteps({
  currentStep,
  needsConversion,
  phase,
}: {
  currentStep: 'form' | 'processing' | 'success';
  needsConversion: boolean;
  phase: ProcessingPhase;
}) {
  const steps = needsConversion
    ? [
        { id: 'form', label: 'Amount' },
        { id: 'convert', label: 'Convert' },
        { id: 'deposit', label: 'Deposit' },
        { id: 'success', label: 'Done' },
      ]
    : [
        { id: 'form', label: 'Amount' },
        { id: 'deposit', label: 'Deposit' },
        { id: 'success', label: 'Done' },
      ];

  const activeId =
    currentStep === 'success'
      ? 'success'
      : currentStep === 'processing'
        ? phase === 'convert' || phase === 'wait'
          ? 'convert'
          : 'deposit'
        : 'form';
  const activeIndex = steps.findIndex((step) => step.id === activeId);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isDone = index < activeIndex || currentStep === 'success';
        const isActive = index === activeIndex && currentStep !== 'success';

        return (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs font-medium truncate ${
                  isActive
                    ? 'text-blue-600'
                    : isDone
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SuccessView({
  txHash,
  converted,
  onClose,
}: {
  txHash: string;
  converted: boolean;
  onClose: () => void;
}) {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800">Deposit Submitted!</h3>
        <p className="text-sm text-gray-500 mt-1">
          {converted
            ? 'Your token was converted and the USDC deposit is on its way to Hyperliquid.'
            : 'Your USDC is on its way to Hyperliquid.'}
          <br />
          Balance will update in <strong>2-5 minutes</strong>.
        </p>
      </div>

      <a
        href={`https://arbiscan.io/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors font-medium"
      >
        View deposit on Arbiscan
        <ExternalLink className="w-3.5 h-3.5" />
      </a>

      <div className="w-full bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-left">
        <p className="font-semibold text-gray-700 mb-1">What happens next?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Arbitrum confirms the deposit transaction</li>
          <li>Hyperliquid bridge processes the USDC transfer</li>
          <li>Your Perps Balance updates automatically</li>
        </ul>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        Done
      </button>
    </div>
  );
}
