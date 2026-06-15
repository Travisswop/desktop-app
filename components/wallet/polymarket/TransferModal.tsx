'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  usePrivy,
  useWallets,
  useSendTransaction,
  useSignTypedData,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import {
  erc20Abi,
  parseUnits,
  formatUnits,
  hexToBytes,
  createPublicClient,
  fallback,
  http,
} from 'viem';
import { polygon, mainnet, base, arbitrum } from 'viem/chains';
import { encodeFunctionData } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  Check,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  ArrowDownToLine,
  Wallet,
  Copy,
  CheckCheck,
} from 'lucide-react';
import CustomModal from '@/components/modal/CustomModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getPortfolioEvmWalletInput,
  useWalletAddresses,
  useWalletData,
} from '@/components/wallet/hooks/useWalletData';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import {
  getWithdrawTypedData,
  submitWithdraw,
  type WithdrawTypedData,
} from '@/lib/polymarket/backend-session';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { formatPolymarketError } from '@/lib/polymarket';
import { getLifiDepositQuote } from '@/actions/lifiForTokenSwap';
import { usePolygonBalances } from '@/hooks/polymarket';
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  LEGACY_USDC_E_ADDRESS,
} from '@/constants/polymarket';
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'deposit' | 'withdraw';

type DepositStep =
  | 'select'
  | 'amount'
  | 'processing'
  | 'success'
  | 'error';
type WithdrawStep =
  | 'amount'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'error';

type WithdrawToken = 'pUSD' | 'USDC.e';

interface DepositToken {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  walletAddress?: string;
  address: string | null;
  logoURI: string;
  chain: string;
  marketData?: { price?: string } | null;
}

export interface TransferDepositPrefill {
  chain: string;
  symbol: string;
  amount?: string;
  address?: string | null;
  walletAddress?: string;
  decimals?: number;
  name?: string;
  logoURI?: string;
  marketData?: { price?: string } | null;
}

interface LiFiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration?: number;
    feeCosts?: Array<{ amount: string; token: { symbol: string } }>;
    gasCosts?: Array<{ amount: string; token: { symbol: string } }>;
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit?: string;
    gasPrice?: string;
    transaction?: string;
  };
  action: {
    fromToken: { symbol: string; decimals: number };
    toToken: { symbol: string; decimals: number };
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const USDC_E_ADDRESS = USDC_E_CONTRACT_ADDRESS;
const SUPPORTED_CHAINS = [
  'ETHEREUM',
  'POLYGON',
  'BASE',
  'ARBITRUM',
  'SOLANA',
] as const;
const CHAIN_CONFIG: Record<
  string,
  { id: string; name: string; icon: string }
> = {
  ETHEREUM: {
    id: '1',
    name: 'Ethereum',
    icon: '/images/IconShop/eTH@3x.png',
  },
  POLYGON: {
    id: '137',
    name: 'Polygon',
    icon: '/images/IconShop/polygon.png',
  },
  BASE: {
    id: '8453',
    name: 'Base',
    icon: 'https://www.base.org/document/safari-pinned-tab.svg',
  },
  ARBITRUM: {
    id: '42161',
    name: 'Arbitrum',
    icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  },
  SOLANA: {
    id: '1151111081099710',
    name: 'Solana',
    icon: '/images/IconShop/solana@2x.png',
  },
};
const POLYGON_CHAIN_ID = '137';
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
    'https://polygon.drpc.org',
  ],
  '8453': [
    process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL,
    'https://base-rpc.publicnode.com',
    'https://mainnet.base.org',
  ],
  '42161': [
    process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL,
    'https://arbitrum-one-rpc.publicnode.com',
    'https://arb1.arbitrum.io/rpc',
  ],
};
const CHAIN_MIN_DEPOSIT_USD: Record<string, number> = {
  ETHEREUM: 7,
  POLYGON: 2,
  BASE: 2,
  ARBITRUM: 2,
  SOLANA: 2,
};

type DelegatedSignerConfig = {
  signerId: string;
  policyIds: string[];
};

const swopApiBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const delegatedSignerId =
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_SIGNER_ID ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ID;
const delegatedPolicyIds = (
  process.env.NEXT_PUBLIC_PRIVY_DELEGATED_POLICY_IDS ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_POLICY_IDS ||
  ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const readWithRetry = async <T,>(
  read: () => Promise<T>,
  retries = 2,
  baseDelayMs = 450,
): Promise<T> => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await read();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(baseDelayMs * (attempt + 1));
      }
    }
  }
  throw lastErr;
};

const isUserRejectionError = (
  error: unknown,
  { includeGeneric = true }: { includeGeneric?: boolean } = {},
) => {
  const message =
    error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  const phrases = [
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'rejected by user',
    'denied by user',
    'cancelled by user',
    'canceled by user',
  ];

  if (includeGeneric) {
    phrases.push('rejected', 'denied', 'cancelled', 'canceled');
  }

  return phrases.some((phrase) => lower.includes(phrase));
};

const getDepositExplorerUrl = (chain: string, hash: string) =>
  ({
    SOLANA: `https://solscan.io/tx/${hash}`,
    ETHEREUM: `https://etherscan.io/tx/${hash}`,
    POLYGON: `https://polygonscan.com/tx/${hash}`,
    BASE: `https://basescan.org/tx/${hash}`,
  })[chain.toUpperCase()] || `https://polygonscan.com/tx/${hash}`;

function serializeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        serializeForJson(nested),
      ]),
    );
  }
  return value;
}

const formatTokenAmount = (
  amount: string | number,
  decimals: number,
): string => {
  try {
    const safeDecimals = decimals || 18;
    const amountStr =
      typeof amount === 'number' ? amount.toString() : amount;
    if (!amountStr || amountStr.trim() === '') return '0';
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) return '0';
    let cleanAmount = numAmount.toFixed(safeDecimals);
    if (cleanAmount.includes('.')) {
      cleanAmount = cleanAmount.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (!cleanAmount || cleanAmount === '0') return '0';
    return parseUnits(cleanAmount, safeDecimals).toString();
  } catch {
    return '0';
  }
};

const getTokenAddressForLifi = (token: DepositToken): string => {
  const chain = token.chain.toUpperCase();
  if (chain === 'SOLANA' && token.symbol === 'SOL')
    return 'So11111111111111111111111111111111111111112';
  if (
    ['ETHEREUM', 'POLYGON', 'BASE', 'ARBITRUM'].includes(chain) &&
    ['ETH', 'POL', 'MATIC'].includes(token.symbol)
  )
    return '0x0000000000000000000000000000000000000000';
  return (
    token.address || '0x0000000000000000000000000000000000000000'
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ActiveTab;
  depositPrefill?: TransferDepositPrefill | null;
}

export default function TransferModal({
  open,
  onOpenChange,
  defaultTab = 'deposit',
  depositPrefill = null,
}: TransferModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <CustomModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title=""
      width="max-w-md"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 mx-6 mb-4 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'deposit'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'withdraw'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'deposit' && (
        <DepositTab
          open={open}
          onClose={() => onOpenChange(false)}
          depositPrefill={depositPrefill}
        />
      )}
      {activeTab === 'withdraw' && (
        <WithdrawTab
          open={open}
          onClose={() => onOpenChange(false)}
        />
      )}
    </CustomModal>
  );
}

// ─── Deposit Tab ─────────────────────────────────────────────────────────────

function DepositTab({
  open,
  onClose,
  depositPrefill,
}: {
  open: boolean;
  onClose: () => void;
  depositPrefill?: TransferDepositPrefill | null;
}) {
  const {
    authenticated,
    ready,
    user: privyUser,
    getAccessToken,
  } = usePrivy();
  const { user: swopUser } = useUser();
  const { safeAddress } = useTrading();
  const { publicClient, eoaAddress, switchToPolygon } =
    usePolymarketWallet();
  const queryClient = useQueryClient();
  const { wallets } = useWallets();
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    return (
      directSolanaWallets.find((w) => w.address?.length > 0) ||
      directSolanaWallets[0]
    );
  }, [solanaReady, directSolanaWallets]);

  const safeRefreshSession = useCallback(async () => {
    try {
      await Promise.race([
        getAccessToken(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
    } catch {}
  }, [getAccessToken]);

  const walletData = useWalletData(
    authenticated,
    ready,
    privyUser,
    swopUser,
  );
  const { solWalletAddress, evmWalletAddress, evmWalletAddresses } =
    useWalletAddresses(walletData);
  const solanaAddress = solWalletAddress || selectedSolanaWallet?.address;
  const evmAddress = useMemo(
    () =>
      getPortfolioEvmWalletInput(
        evmWalletAddress || eoaAddress || privyUser?.wallet?.address,
        [
          ...evmWalletAddresses,
          eoaAddress,
          privyUser?.wallet?.address,
        ].filter((address): address is string => Boolean(address)),
      ),
    [
      evmWalletAddress,
      evmWalletAddresses,
      eoaAddress,
      privyUser?.wallet?.address,
    ],
  );

  const sendActiveEvmTransaction = useCallback(
    (
      tx: Parameters<typeof sendTransaction>[0],
      options?: Parameters<typeof sendTransaction>[1],
      activeAddress?: string,
    ) => {
      const fallbackAddress = Array.isArray(evmAddress)
        ? evmAddress[0]
        : evmAddress;
      const address = activeAddress || fallbackAddress;
      const withActiveAddress = address
        ? { ...options, address }
        : options;
      return sendTransaction(tx, withActiveAddress);
    },
    [evmAddress, sendTransaction],
  );

  const {
    tokens,
    loading: tokensLoading,
    refetch: refetchTokens,
  } = useMultiChainTokenData(solanaAddress, evmAddress, [
    ...SUPPORTED_CHAINS,
  ]);

  const [step, setStep] = useState<DepositStep>('select');
  const [selectedToken, setSelectedToken] =
    useState<DepositToken | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lifiQuote, setLifiQuote] = useState<LiFiQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedChainFilter, setSelectedChainFilter] =
    useState('all');
  const [depositStatus, setDepositStatus] = useState('');
  const isTransactionInProgress = useRef(false);
  const appliedDepositPrefillRef = useRef<string | null>(null);

  const depositHandedOffToToast = useRef(false);
  const activeDepositToastId = useRef<string | undefined>();

  const isDirectUsdcE =
    selectedToken?.chain.toUpperCase() === 'POLYGON' &&
    selectedToken?.address?.toLowerCase() ===
      USDC_E_ADDRESS.toLowerCase();

  const needsBridge = selectedToken && !isDirectUsdcE;

  const showDepositProcessingToast = useCallback(
    (hash: string) => {
      if (!selectedToken || depositHandedOffToToast.current) return;

      depositHandedOffToToast.current = true;
      const symbol = selectedToken.symbol || 'Funds';
      const explorerUrl = getDepositExplorerUrl(
        selectedToken.chain,
        hash,
      );
      const body = needsBridge
        ? `${symbol} is converting to pUSD. You can keep using Swop; it should be in your Predictions balance soon.`
        : `${symbol} is moving into your Predictions wallet. You can keep using Swop; it should be there soon.`;

      activeDepositToastId.current = toast.loading(
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            Deposit processing
          </p>
          <p className="text-xs leading-5 text-white/70">{body}</p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-xs font-semibold text-[#3fe08f]"
          >
            View transaction
          </a>
        </div>,
        {
          id: activeDepositToastId.current,
          duration: Infinity,
        },
      );

      onClose();
    },
    [needsBridge, onClose, selectedToken],
  );

  const updateDepositToastSuccess = useCallback(
    (hash: string | null) => {
      if (!activeDepositToastId.current || !selectedToken) return;

      const explorerUrl = hash
        ? getDepositExplorerUrl(selectedToken.chain, hash)
        : null;
      const body = needsBridge
        ? 'Bridge submitted. Your pUSD will appear after the route finishes settling.'
        : 'Deposit confirmed. Your pUSD balance should update shortly.';

      toast.success(
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {needsBridge ? 'Bridge submitted' : 'Deposit confirmed'}
          </p>
          <p className="text-xs leading-5 text-white/70">{body}</p>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs font-semibold text-[#3fe08f]"
            >
              View transaction
            </a>
          )}
        </div>,
        {
          id: activeDepositToastId.current,
          duration: 9000,
        },
      );
      activeDepositToastId.current = undefined;
    },
    [needsBridge, selectedToken],
  );

  const updateDepositToastError = useCallback((message: string) => {
    if (!activeDepositToastId.current) return;
    toast.error(
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">
          Deposit needs attention
        </p>
        <p className="text-xs leading-5 text-white/70">{message}</p>
      </div>,
      {
        id: activeDepositToastId.current,
        duration: 9000,
      },
    );
    activeDepositToastId.current = undefined;
  }, []);

  const filteredTokens = tokens.filter((t) => {
    const hasBalance = parseFloat(t.balance) > 0;
    const matchesChain =
      selectedChainFilter === 'all' ||
      t.chain.toUpperCase() === selectedChainFilter.toUpperCase();
    return hasBalance && matchesChain;
  });

  const userUsdcE = tokens.find(
    (t) =>
      t.chain.toUpperCase() === 'POLYGON' &&
      t.address?.toLowerCase() === USDC_E_ADDRESS.toLowerCase(),
  );

  useEffect(() => {
    if (!open || !depositPrefill || tokensLoading) return;

    const prefillKey = JSON.stringify(depositPrefill);
    if (appliedDepositPrefillRef.current === prefillKey) return;

    const chain = depositPrefill.chain.toUpperCase();
    const address = depositPrefill.address?.toLowerCase();
    const symbol = depositPrefill.symbol.toUpperCase();
    const sourceWalletAddress =
      depositPrefill.walletAddress ||
      (Array.isArray(evmAddress) ? evmAddress[0] : evmAddress);

    const tokenMatch = tokens.find((token) => {
      if (token.chain.toUpperCase() !== chain) return false;
      if (
        sourceWalletAddress &&
        token.walletAddress &&
        token.walletAddress.toLowerCase() !==
          sourceWalletAddress.toLowerCase()
      ) {
        return false;
      }
      if (address && token.address?.toLowerCase() === address) return true;
      return token.symbol.toUpperCase() === symbol;
    });

    const fallbackToken: DepositToken = {
      name: depositPrefill.name ?? depositPrefill.symbol,
      symbol: depositPrefill.symbol,
      balance: tokenMatch?.balance ?? '0',
      decimals: depositPrefill.decimals ?? tokenMatch?.decimals ?? 6,
      walletAddress: sourceWalletAddress,
      address: depositPrefill.address ?? tokenMatch?.address ?? null,
      logoURI: depositPrefill.logoURI ?? tokenMatch?.logoURI ?? '',
      chain,
      marketData:
        depositPrefill.marketData ?? tokenMatch?.marketData ?? { price: '1' },
    };

    setSelectedChainFilter(chain);
    setSelectedToken(
      tokenMatch
        ? {
            ...tokenMatch,
            walletAddress: tokenMatch.walletAddress || sourceWalletAddress,
          }
        : fallbackToken,
    );
    setAmount(depositPrefill.amount ?? '');
    setLifiQuote(null);
    setQuoteError(null);
    setError(null);
    setStep('amount');
    appliedDepositPrefillRef.current = prefillKey;
  }, [depositPrefill, evmAddress, open, tokens, tokensLoading]);

  useEffect(() => {
    if (isDirectUsdcE) return;
    if (
      !selectedToken ||
      !amount ||
      !safeAddress ||
      parseFloat(amount) <= 0 ||
      parseFloat(amount) > parseFloat(selectedToken.balance)
    ) {
      setLifiQuote(null);
      return;
    }
    // Skip quote if insufficient balance or below chain minimum
    const amountFloat = parseFloat(amount);
    if (amountFloat > parseFloat(selectedToken.balance)) {
      setLifiQuote(null);
      return;
    }
    const rawPrice = parseFloat(
      selectedToken.marketData?.price || '0',
    );
    const isStable = [
      'USDC',
      'USDT',
      'USDC.E',
      'PUSD',
      'DAI',
      'USDS',
      'USDE',
    ].includes(selectedToken.symbol.toUpperCase());
    const tokenPrice = rawPrice > 0 ? rawPrice : isStable ? 1 : 0;
    const minDepositUsd =
      CHAIN_MIN_DEPOSIT_USD[selectedToken.chain.toUpperCase()] ?? 2;
    if (
      tokenPrice > 0 &&
      amountFloat * tokenPrice < minDepositUsd - 0.01
    ) {
      setLifiQuote(null);
      return;
    }
    const timer = setTimeout(() => fetchLifiQuote(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, selectedToken, safeAddress, isDirectUsdcE]);

  useEffect(() => {
    if (!open && !isTransactionInProgress.current) {
      setStep('select');
      setSelectedToken(null);
      setAmount('');
      setTxHash(null);
      setError(null);
      setLifiQuote(null);
      setIsQuoteLoading(false);
      setQuoteError(null);
      setSelectedChainFilter('all');
      setDepositStatus('');
      appliedDepositPrefillRef.current = null;
    }
  }, [open]);

  const fetchLifiQuote = useCallback(async () => {
    if (
      !selectedToken ||
      !amount ||
      !safeAddress ||
      parseFloat(amount) <= 0
    )
      return;
    if (isDirectUsdcE) return;
    const _rawPrice = parseFloat(
      selectedToken.marketData?.price || '0',
    );
    const _isStable = [
      'USDC',
      'USDT',
      'USDC.E',
      'PUSD',
      'DAI',
      'USDS',
      'USDE',
    ].includes(selectedToken.symbol.toUpperCase());
    const _tokenPrice = _rawPrice > 0 ? _rawPrice : _isStable ? 1 : 0;
    const _minUsd =
      CHAIN_MIN_DEPOSIT_USD[selectedToken.chain.toUpperCase()] ?? 2;
    if (
      _tokenPrice > 0 &&
      parseFloat(amount) * _tokenPrice < _minUsd - 0.01
    )
      return;
    setIsQuoteLoading(true);
    setQuoteError(null);
    setLifiQuote(null);
    try {
      const fromChainId =
        CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.id;
      if (!fromChainId) throw new Error('Unsupported chain');
      const fromAmount = formatTokenAmount(
        amount,
        selectedToken.decimals || 6,
      );
      if (fromAmount === '0') throw new Error('Invalid amount');
      const fromTokenAddress = getTokenAddressForLifi(selectedToken);
      const fromWalletAddress =
        selectedToken.chain.toUpperCase() === 'SOLANA'
          ? solanaAddress
          : selectedToken.walletAddress ||
            (Array.isArray(evmAddress) ? evmAddress[0] : evmAddress);
      if (!fromWalletAddress)
        throw new Error('Wallet address not available');
      const result = await getLifiDepositQuote({
        fromChain: fromChainId,
        toChain: POLYGON_CHAIN_ID,
        fromToken: fromTokenAddress,
        toToken: USDC_E_ADDRESS,
        fromAddress: fromWalletAddress,
        toAddress: safeAddress,
        fromAmount,
        slippage: '0.01',
      });
      if (!result.success) throw new Error(result.error);
      setLifiQuote(result.data);
    } catch (err: any) {
      setQuoteError(formatPolymarketError(err));
    } finally {
      setIsQuoteLoading(false);
    }
  }, [
    selectedToken,
    amount,
    safeAddress,
    solanaAddress,
    evmAddress,
    isDirectUsdcE,
  ]);

  const executeDirectTransfer = async () => {
    const sourceEvmAddress = selectedToken?.walletAddress || eoaAddress;
    if (!sourceEvmAddress || !safeAddress)
      throw new Error('Wallet not ready');
    const wallet = wallets.find(
      (w) => w.address?.toLowerCase() === sourceEvmAddress.toLowerCase(),
    );
    if (wallet && wallet.chainId !== `eip155:${polygon.id}`) {
      await wallet.switchChain(polygon.id);
    } else {
      await switchToPolygon();
    }

    // Safely coerce to string (balance fields can be numeric at runtime)
    // and truncate to max USDC_E_DECIMALS places to prevent viem parseUnits errors
    const amountStr = String(amount ?? '').trim();
    const dotIdx = amountStr.indexOf('.');
    const safeAmount =
      dotIdx >= 0
        ? `${amountStr.slice(0, dotIdx)}.${amountStr.slice(dotIdx + 1, dotIdx + 1 + USDC_E_DECIMALS)}`
        : amountStr || '0';

    const amountInWei = parseUnits(safeAmount, USDC_E_DECIMALS);
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [safeAddress as `0x${string}`, amountInWei],
    });
    const tx = {
      to: USDC_E_ADDRESS as `0x${string}`,
      data,
      chainId: polygon.id,
    };

    try {
      const result = await sendActiveEvmTransaction(
        tx,
        {
          sponsor: true,
          uiOptions: { showWalletUIs: false },
        },
        sourceEvmAddress,
      );
      return result.hash;
    } catch (sponsorErr: any) {
      if (
        isUserRejectionError(sponsorErr, {
          includeGeneric: false,
        })
      )
        throw sponsorErr;

      console.warn(
        '[Polymarket deposit] Sponsored pUSD transfer failed; retrying user-funded transfer.',
        sponsorErr,
      );

      let gasBalance: bigint | null = null;
      try {
        gasBalance = await readWithRetry(
          () =>
            publicClient.getBalance({
              address: sourceEvmAddress as `0x${string}`,
            }),
          1,
          500,
        );
      } catch (balanceErr) {
        console.warn(
          '[Polymarket deposit] Polygon gas balance check failed before fallback.',
          balanceErr,
        );
      }

      if (gasBalance === BigInt(0)) {
        throw new Error(
          'Gas sponsorship was unavailable and this wallet has no POL for the Polygon network fee. Add a small amount of POL, then try the deposit again.',
        );
      }

      setDepositStatus('Retrying transfer with wallet gas...');
      const result = await sendActiveEvmTransaction(tx, {
        sponsor: false,
      });
      return result.hash;
    }
  };

  const executeLifiEvmSwap = async () => {
    if (!lifiQuote || !selectedToken)
      throw new Error('No quote available');
    const sourceEvmAddress =
      selectedToken.walletAddress ||
      (Array.isArray(evmAddress) ? evmAddress[0] : evmAddress);
    if (!sourceEvmAddress) throw new Error('EVM wallet not found');
    const wallet = wallets.find(
      (w) => w.address?.toLowerCase() === sourceEvmAddress.toLowerCase(),
    );
    if (!wallet) throw new Error('EVM wallet not found');
    const sourceChainIdStr =
      CHAIN_CONFIG[selectedToken!.chain.toUpperCase()].id;
    const sourceChainId = parseInt(sourceChainIdStr);
    if (wallet.chainId !== `eip155:${sourceChainId}`)
      await wallet.switchChain(sourceChainId);
    const sourcePublicClient =
      sourceChainId === polygon.id
        ? publicClient
        : getPublicClientForChain(sourceChainIdStr);
    if (!sourcePublicClient)
      throw new Error(
        `Unsupported source chain: ${selectedToken!.chain}`,
      );
    const { transactionRequest, estimate } = lifiQuote;
    const fromTokenAddress = getTokenAddressForLifi(selectedToken!);
    const isNativeToken =
      fromTokenAddress ===
      '0x0000000000000000000000000000000000000000';
    if (!isNativeToken && estimate.approvalAddress) {
      setDepositStatus('Checking token approval...');
      const fromAmount = formatTokenAmount(
        amount,
        selectedToken!.decimals || 6,
      );
      let currentAllowance: bigint | null = null;
      try {
        currentAllowance = await readWithRetry(() =>
          sourcePublicClient.readContract({
            address: fromTokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [
              sourceEvmAddress as `0x${string}`,
              estimate.approvalAddress as `0x${string}`,
            ],
          }),
        );
      } catch (allowanceErr) {
        console.warn(
          '[Polymarket deposit] Token approval check failed; requesting approval.',
          allowanceErr,
        );
      }

      if (
        currentAllowance === null ||
        currentAllowance < BigInt(fromAmount)
      ) {
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
          const r = await sendActiveEvmTransaction(
            {
              to: fromTokenAddress as `0x${string}`,
              data: approveData,
              chainId: sourceChainId,
            },
            { sponsor: false },
            sourceEvmAddress,
          );
          approvalHash = r.hash;
        } catch (approvalErr) {
          if (isUserRejectionError(approvalErr)) throw approvalErr;
          const r = await sendActiveEvmTransaction(
            {
              to: fromTokenAddress as `0x${string}`,
              data: approveData,
              chainId: sourceChainId,
            },
            undefined,
            sourceEvmAddress,
          );
          approvalHash = r.hash;
        }
        setDepositStatus('Waiting for approval confirmation...');
        await readWithRetry(
          () =>
            sourcePublicClient.waitForTransactionReceipt({
              hash: approvalHash as `0x${string}`,
            }),
          2,
          1000,
        );
      }
    }
    setDepositStatus('Waiting for transaction approval...');
    let txValue = BigInt(0);
    if (transactionRequest.value) {
      try {
        txValue = BigInt(transactionRequest.value);
      } catch {}
    }
    let hash: string;
    try {
      const r = await sendActiveEvmTransaction(
        {
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          value: txValue,
          chainId: sourceChainId,
        },
        { sponsor: false },
        sourceEvmAddress,
      );
      hash = r.hash;
    } catch (sponsorErr: any) {
      if (isUserRejectionError(sponsorErr))
        throw sponsorErr;
      setDepositStatus('Retrying transaction...');
      const r = await sendActiveEvmTransaction(
        {
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          value: txValue,
          chainId: sourceChainId,
        },
        undefined,
        sourceEvmAddress,
      );
      hash = r.hash;
    }
    setDepositStatus('Waiting for confirmation...');
    showDepositProcessingToast(hash);
    try {
      await sourcePublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      });
    } catch {}
    return hash;
  };

  const executeLifiSolanaSwap = async () => {
    if (
      !lifiQuote ||
      !signAndSendTransaction ||
      !selectedSolanaWallet
    )
      throw new Error('No quote available or wallet not ready');
    const { transactionRequest } = lifiQuote;
    const rawTx =
      transactionRequest.transaction || transactionRequest.data;
    if (!rawTx) throw new Error('No transaction data in LiFi quote');
    setDepositStatus('Preparing transaction...');
    const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!solanaRpcUrl)
      throw new Error('No Solana RPC URL configured');
    const connection = new Connection(solanaRpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    const walletPubkey = new PublicKey(selectedSolanaWallet.address);

    // Ensure common token ATAs exist before executing the LiFi transaction.
    // LiFi routes SOL → USDC on Solana (via Jupiter) then bridges USDC to
    // Polygon. The Token Program's TransferChecked instruction fails with
    // InvalidAccountData if the user's USDC (or WSOL/USDT) ATA doesn't exist.
    setDepositStatus('Checking token accounts...');

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
    const sourceTokenAddress = getTokenAddressForLifi(selectedToken!);
    if (
      selectedToken!.symbol !== 'SOL' &&
      !commonMints.some((m) => m.address === sourceTokenAddress)
    ) {
      commonMints.push({
        address: sourceTokenAddress,
        symbol: selectedToken!.symbol,
      });
    }

    let createdAnyAta = false;
    for (const { address: mintAddr, symbol } of commonMints) {
      try {
        const mintPubkey = new PublicKey(mintAddr);
        const mintInfo = await connection.getAccountInfo(mintPubkey);
        const tokenProgramId =
          mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
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
          const { blockhash: ataBlockhash } =
            await connection.getLatestBlockhash('finalized');
          createAtaTx.recentBlockhash = ataBlockhash;
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
          console.log(
            `Created ${symbol} token account:`,
            ata.toBase58(),
          );
          createdAnyAta = true;
        }
      } catch (ataError) {
        console.warn(
          `Could not check/create ATA for ${symbol}:`,
          ataError,
        );
      }
    }

    // If we created any ATAs, wait to ensure all RPC nodes (including Privy's
    // simulation node) have propagated the finalized state.
    if (createdAnyAta) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const txBuffer = Buffer.from(rawTx, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('finalized');
    transaction.message.recentBlockhash = blockhash;
    setDepositStatus('Waiting for signature...');
    await safeRefreshSession();
    const serializedTransaction = new Uint8Array(
      transaction.serialize(),
    );
    let signatureString: string;
    try {
      const r = await signAndSendTransaction({
        transaction: serializedTransaction,
        wallet: selectedSolanaWallet,
      });
      signatureString = bs58.encode(r.signature);
    } catch (sponsorErr: any) {
      const msg = sponsorErr?.message || sponsorErr?.toString() || '';
      if (
        ['rejected', 'denied', 'cancelled', 'user rejected'].some(
          (s) => msg.includes(s),
        )
      )
        throw sponsorErr;
      setDepositStatus('Retrying transaction...');
      await safeRefreshSession();
      try {
        const r = await signAndSendTransaction({
          transaction: serializedTransaction,
          wallet: selectedSolanaWallet,
        });
        signatureString = bs58.encode(r.signature);
      } catch {
        throw sponsorErr;
      }
    }
    setDepositStatus('Waiting for confirmation...');
    showDepositProcessingToast(signatureString);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await connection.confirmTransaction(
        {
          signature: signatureString,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed',
      );
    } catch {}
    return signatureString;
  };

  const handleDeposit = async () => {
    if (!selectedToken || !amount || !safeAddress) return;
    if (needsBridge && !lifiQuote) {
      setError('Please get a quote first');
      return;
    }
    isTransactionInProgress.current = true;
    depositHandedOffToToast.current = false;
    activeDepositToastId.current = undefined;
    setStep('processing');
    setError(null);
    setDepositStatus('Initiating deposit...');
    try {
      let hash: string;
      if (isDirectUsdcE) {
        setDepositStatus('Transferring pUSD...');
        hash = await executeDirectTransfer();
      } else if (selectedToken.chain.toUpperCase() === 'SOLANA') {
        hash = await executeLifiSolanaSwap();
      } else {
        hash = await executeLifiEvmSwap();
      }
      setTxHash(hash);
      setDepositStatus('Waiting for confirmation...');
      showDepositProcessingToast(hash);
      if (
        selectedToken.chain.toUpperCase() !== 'SOLANA' &&
        isDirectUsdcE
      ) {
        try {
          await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
          });
        } catch (receiptErr) {
          console.warn(
            '[Polymarket deposit] Direct deposit receipt wait failed after tx submission.',
            receiptErr,
          );
        }
      }
      isTransactionInProgress.current = false;
      if (depositHandedOffToToast.current) {
        updateDepositToastSuccess(hash);
      } else {
        setStep('success');
      }
      queryClient.invalidateQueries({ queryKey: ['pusdBalance'] });
      queryClient.invalidateQueries({ queryKey: ['legacyUsdcBalance'] });
      queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pusdBalance'] });
        queryClient.invalidateQueries({ queryKey: ['legacyUsdcBalance'] });
        queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] });
      }, 3000);
    } catch (err: any) {
      isTransactionInProgress.current = false;
      const formattedError = formatPolymarketError(err);
      if (depositHandedOffToToast.current) {
        updateDepositToastError(formattedError);
      } else {
        setError(formattedError);
        setStep('error');
      }
    }
  };

  // Render helpers
  if (step === 'processing')
    return (
      <div className="px-6 pb-6 flex flex-col items-center py-8">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {needsBridge
            ? 'Bridging & Depositing'
            : 'Processing Deposit'}
        </p>
        <p className="text-sm text-gray-500 text-center">
          {depositStatus || 'Transferring to trading wallet...'}
        </p>
        {txHash && selectedToken && (
          <a
            href={getDepositExplorerUrl(selectedToken.chain, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 mt-4"
          >
            View on explorer
          </a>
        )}
      </div>
    );

  if (step === 'success')
    return (
      <div className="px-6 pb-6 flex flex-col items-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          {needsBridge ? 'Bridge Initiated!' : 'Deposit Complete!'}
        </p>
        <p className="text-sm text-gray-500 text-center mb-4">
          {needsBridge
            ? 'Your funds are being bridged. This may take a few minutes.'
            : 'Your funds have been deposited.'}
        </p>
        {txHash && selectedToken && (
          <a
            href={getDepositExplorerUrl(selectedToken.chain, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 mb-4"
          >
            View transaction
          </a>
        )}
        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={() => {
            onClose();
            refetchTokens();
          }}
        >
          Done
        </Button>
      </div>
    );

  if (step === 'error')
    return (
      <div className="px-6 pb-6 flex flex-col items-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          Deposit Failed
        </p>
        <p className="text-sm text-red-600 text-center mb-4">
          {error}
        </p>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-black text-white hover:bg-gray-800"
            onClick={() => setStep('amount')}
          >
            Try Again
          </Button>
        </div>
      </div>
    );

  if (step === 'amount' && selectedToken) {
    const amountFloat = parseFloat(amount) || 0;
    const tokenBalance = parseFloat(selectedToken.balance) || 0;
    const rawPrice = parseFloat(
      selectedToken.marketData?.price || '0',
    );
    const isStable = [
      'USDC',
      'USDT',
      'USDC.E',
      'PUSD',
      'DAI',
      'USDS',
      'USDE',
    ].includes(selectedToken.symbol.toUpperCase());
    const tokenPrice = rawPrice > 0 ? rawPrice : isStable ? 1 : 0;
    const amountUsd = amountFloat * tokenPrice;
    const chainKey = selectedToken.chain.toUpperCase();
    const minDepositUsd = CHAIN_MIN_DEPOSIT_USD[chainKey] ?? 2;

    const hasInsufficientBalance =
      amountFloat > 0 && amountFloat > tokenBalance;
    // Only flag below-minimum when balance is sufficient; use 0.01 tolerance for float precision
    const belowMinimum =
      amountFloat > 0 &&
      !hasInsufficientBalance &&
      tokenPrice > 0 &&
      amountUsd < minDepositUsd - 0.01;

    const canDeposit =
      amount &&
      amountFloat > 0 &&
      !hasInsufficientBalance &&
      !belowMinimum;
    const hasValidQuote = needsBridge && lifiQuote;
    const isLoadingQuote =
      needsBridge && canDeposit && isQuoteLoading;
    return (
      <div className="px-6 pb-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedToken.logoURI ? (
                  <Image
                    src={sanitizeNextImageSrc(selectedToken.logoURI)}
                    alt={selectedToken.symbol}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">$</span>
                  </div>
                )}
                {CHAIN_CONFIG[selectedToken.chain.toUpperCase()]
                  ?.icon && (
                  <Image
                    src={
                      CHAIN_CONFIG[selectedToken.chain.toUpperCase()]
                        .icon
                    }
                    alt={selectedToken.chain}
                    width={16}
                    height={16}
                    className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white"
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedToken.symbol}
                </p>
                <p className="text-xs text-gray-500">
                  Balance:{' '}
                  {parseFloat(selectedToken.balance).toFixed(4)} on{' '}
                  {CHAIN_CONFIG[selectedToken.chain.toUpperCase()]
                    ?.name || selectedToken.chain}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setStep('select');
                setLifiQuote(null);
                setQuoteError(null);
              }}
              className="text-sm text-blue-600"
            >
              Change
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Amount
            </label>
            <button
              onClick={() => {
                setAmount(selectedToken.balance);
                setLifiQuote(null);
                setQuoteError(null);
              }}
              className="text-xs text-blue-600"
            >
              MAX
            </button>
          </div>
          <Input
            type="text"
            value={amount}
            onChange={(e) => {
              const v = e.target.value
                .replace(/[^0-9.]/g, '')
                .replace(/(\..*)\./g, '$1');
              setAmount(v);
              setLifiQuote(null);
              setQuoteError(null);
            }}
            placeholder="0.00"
            className="text-2xl font-medium h-14 text-center"
          />
          {hasInsufficientBalance && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">
                  Insufficient balance. You have{' '}
                  {tokenBalance.toFixed(4)} {selectedToken.symbol}.
                </p>
              </div>
            </div>
          )}
          {belowMinimum && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">
                  Minimum deposit on{' '}
                  {CHAIN_CONFIG[chainKey]?.name || chainKey} is $
                  {minDepositUsd}. Current value ≈ $
                  {amountUsd.toFixed(2)}.
                </p>
              </div>
            </div>
          )}
        </div>

        {needsBridge && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ArrowUpDown className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Bridge & Swap required — {selectedToken.symbol} will
                be converted to pUSD on Polygon
              </p>
            </div>
          </div>
        )}

        {isLoadingQuote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-blue-800">
              Fetching best route...
            </p>
          </div>
        )}

        {!isLoadingQuote && hasValidQuote && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-green-800 font-medium">
                You will receive
              </p>
              <button
                onClick={fetchLifiQuote}
                disabled={isQuoteLoading}
                className="text-xs text-green-600 flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isQuoteLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
            <p className="text-lg font-semibold text-green-900">
              ~
              {formatUnits(
                BigInt(lifiQuote.estimate.toAmount),
                USDC_E_DECIMALS,
              )}{' '}
              pUSD
            </p>
          </div>
        )}

        {!isLoadingQuote && quoteError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{quoteError}</p>
          </div>
        )}

        {isDirectUsdcE && canDeposit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 mt-0.5" />
            <p className="text-sm text-green-800">
              Direct transfer — no bridge fees
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setStep('select');
              setLifiQuote(null);
              setQuoteError(null);
            }}
          >
            Back
          </Button>
          {isLoadingQuote && (
            <Button
              className="flex-1 bg-gray-400 text-white cursor-not-allowed"
              disabled
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Getting Quote...
            </Button>
          )}
          {!isLoadingQuote && (isDirectUsdcE || hasValidQuote) && (
            <Button
              className="flex-1 bg-black text-white hover:bg-gray-800"
              onClick={handleDeposit}
              disabled={!canDeposit}
            >
              {isDirectUsdcE ? 'Deposit' : 'Bridge & Deposit'}
            </Button>
          )}
          {!isLoadingQuote && quoteError && (
            <Button
              className="flex-1 bg-blue-600 text-white"
              onClick={fetchLifiQuote}
              disabled={!canDeposit}
            >
              Retry Quote
            </Button>
          )}
        </div>
      </div>
    );
  }

  // step === 'select'
  return (
    <div className="px-6 pb-6 space-y-4">
      <p className="text-sm text-gray-600 text-center">
        Select a token from any chain to deposit as pUSD
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', ...SUPPORTED_CHAINS].map((chain) => (
          <button
            key={chain}
            onClick={() => setSelectedChainFilter(chain)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${selectedChainFilter === chain ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {chain !== 'all' && CHAIN_CONFIG[chain]?.icon && (
              <Image
                src={CHAIN_CONFIG[chain].icon}
                alt={chain}
                width={14}
                height={14}
                className="rounded-full"
              />
            )}
            {chain === 'all'
              ? 'All Chains'
              : CHAIN_CONFIG[chain]?.name || chain}
          </button>
        ))}
      </div>

      {tokensLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tokens found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {userUsdcE &&
            (selectedChainFilter === 'all' ||
              selectedChainFilter === 'POLYGON') && (
              <button
                onClick={() => {
                  setSelectedToken(userUsdcE);
                  setAmount('');
                  setLifiQuote(null);
                  setQuoteError(null);
                  setStep('amount');
                }}
                className="w-full p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-between hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        $
                      </span>
                    </div>
                    <Image
                      src={CHAIN_CONFIG.POLYGON.icon}
                      alt="Polygon"
                      width={16}
                      height={16}
                      className="absolute -bottom-1 -right-1 rounded-full border border-white"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {userUsdcE.symbol}
                    </p>
                    <p className="text-xs text-green-600">
                      Direct deposit (no fees)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {parseFloat(userUsdcE.balance).toFixed(2)}
                  </p>
                </div>
              </button>
            )}
          {filteredTokens
            .filter(
              (t) =>
                !(
                  t.chain.toUpperCase() === 'POLYGON' &&
                  t.address?.toLowerCase() ===
                    USDC_E_ADDRESS.toLowerCase()
                ),
            )
            .map((token) => (
              <button
                key={`${token.chain}-${token.symbol}-${token.address}`}
                onClick={() => {
                  setSelectedToken(token);
                  setAmount('');
                  setLifiQuote(null);
                  setQuoteError(null);
                  setStep('amount');
                }}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {token.logoURI ? (
                      <Image
                        src={sanitizeNextImageSrc(token.logoURI)}
                        alt={token.symbol}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-sm">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    {CHAIN_CONFIG[token.chain.toUpperCase()]
                      ?.icon && (
                      <Image
                        src={
                          CHAIN_CONFIG[token.chain.toUpperCase()].icon
                        }
                        alt={token.chain}
                        width={16}
                        height={16}
                        className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white"
                      />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {token.symbol}
                    </p>
                    <p className="text-xs text-gray-500">
                      {token.name} (
                      {CHAIN_CONFIG[token.chain.toUpperCase()]
                        ?.name || token.chain}
                      )
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {parseFloat(token.balance).toFixed(4)}
                  </p>
                  {token.marketData?.price && (
                    <p className="text-xs text-gray-500">
                      $
                      {(
                        parseFloat(token.balance) *
                        parseFloat(token.marketData.price)
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Withdraw Tab ─────────────────────────────────────────────────────────────

function WithdrawTab({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    safeAddress,
    depositWalletAddress,
    walletType,
    isTradingSessionComplete,
  } = useTrading();
  const { eoaAddress, walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();
  const { user: privyUser } = usePrivy();
  const { signTypedData: signTypedDataWithPrivy } =
    useSignTypedData();
  const { usdcBalance, legacyUsdcBalance } =
    usePolygonBalances(safeAddress);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WithdrawStep>('amount');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedWithdrawToken, setSelectedWithdrawToken] =
    useState<WithdrawToken>('pUSD');
  const [delegatedSignerConfig, setDelegatedSignerConfig] =
    useState<DelegatedSignerConfig | null>(null);

  const destination = eoaAddress;

  // Derived state for active token
  const activeBalance =
    selectedWithdrawToken === 'pUSD'
      ? usdcBalance
      : legacyUsdcBalance;
  const activeAddress =
    selectedWithdrawToken === 'pUSD'
      ? USDC_E_CONTRACT_ADDRESS
      : LEGACY_USDC_E_ADDRESS;
  const activeLabel = selectedWithdrawToken;
  const showTokenSelector = legacyUsdcBalance > 0;
  const walletLabel =
    walletType === 'deposit' ? 'Deposit wallet' : 'Safe wallet';

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid =
    parsedAmount > 0 && parsedAmount <= activeBalance;

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  useEffect(() => {
    if (!open) {
      setStep('amount');
      setAmount('');
      setTxHash(null);
      setError(null);
      setSelectedWithdrawToken('pUSD');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedWithdrawToken(
      legacyUsdcBalance > 0 && usdcBalance === 0 ? 'USDC.e' : 'pUSD',
    );
    setAmount('');
  }, [legacyUsdcBalance, usdcBalance, open]);

  const handleCopyAddress = async () => {
    if (!destination) return;
    const didCopy = await copyTextToClipboard(destination);
    if (!didCopy) {
      setError('Could not copy address. Please try again.');
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectWithdrawToken = (token: WithdrawToken) => {
    setSelectedWithdrawToken(token);
    setAmount('');
    setError(null);
  };

  const isEmbeddedPrivyWallet = useCallback(
    (address: string) => {
      const target = address.toLowerCase();
      return (privyUser?.linkedAccounts || []).some((account: any) => {
        if (account?.type !== 'wallet') return false;
        if (account?.address?.toLowerCase() !== target) return false;
        return (
          account.walletClientType === 'privy' ||
          account.wallet_client_type === 'privy' ||
          account.connectorType === 'embedded' ||
          account.connector_type === 'embedded'
        );
      });
    },
    [privyUser],
  );

  const getDelegatedSignerConfig = useCallback(async () => {
    if (delegatedSignerId) {
      return {
        signerId: delegatedSignerId,
        policyIds: delegatedPolicyIds,
      };
    }

    if (delegatedSignerConfig) return delegatedSignerConfig;
    if (!accessToken || !swopApiBase()) return null;

    const response = await fetch(
      `${swopApiBase()}/api/v5/wallet/privy/delegated-signer-config`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    const data = body?.data || body;
    if (!data?.configured || !data?.signerId) return null;

    const config = {
      signerId: String(data.signerId),
      policyIds: Array.isArray(data.policyIds)
        ? data.policyIds
            .map((id: unknown) => String(id))
            .filter(Boolean)
        : [],
    };
    setDelegatedSignerConfig(config);
    return config;
  }, [accessToken, delegatedSignerConfig]);

  const signWithDelegatedPrivy = useCallback(
    async (
      path: 'sign-typed-data' | 'sign-message',
      body: Record<string, unknown>,
    ) => {
      if (!eoaAddress || !accessToken || !swopApiBase()) {
        throw new Error('Silent withdrawal signing is not configured.');
      }

      const config = await getDelegatedSignerConfig();
      if (!config?.signerId) {
        throw new Error('Silent withdrawal signing is not ready.');
      }

      const response = await fetch(
        `${swopApiBase()}/api/v5/wallet/privy/ethereum/${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            address: eoaAddress,
            ...body,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.signature) {
        throw new Error(
          data.message ||
            data.error ||
            'Silent withdrawal signing failed.',
        );
      }

      return data.signature as `0x${string}`;
    },
    [accessToken, eoaAddress, getDelegatedSignerConfig],
  );

  const signDepositWithdrawTypedData = useCallback(
    async (withdrawTypedData: WithdrawTypedData) => {
      if (
        !withdrawTypedData.typedData ||
        !withdrawTypedData.deadline ||
        !withdrawTypedData.calls
      ) {
        throw new Error('Withdrawal signing data is incomplete.');
      }

      const message = {
        ...withdrawTypedData.typedData.message,
        nonce: BigInt(withdrawTypedData.nonce),
        deadline: BigInt(withdrawTypedData.deadline),
        calls: withdrawTypedData.calls.map((call) => ({
          ...call,
          value: BigInt(call.value),
        })),
      };

      if (!eoaAddress || !walletClient) {
        throw new Error('Wallet not connected.');
      }

      if (isEmbeddedPrivyWallet(eoaAddress)) {
        const typedDataPayload = {
          domain: withdrawTypedData.typedData.domain,
          types: withdrawTypedData.typedData.types,
          primaryType:
            withdrawTypedData.typedData.primaryType ?? 'Batch',
          message: serializeForJson(message),
        };

        try {
          return await signWithDelegatedPrivy('sign-typed-data', {
            typedData: typedDataPayload,
          });
        } catch (delegatedError) {
          console.warn(
            'Silent delegated withdrawal signing unavailable; using hidden Privy signing:',
            delegatedError,
          );
        }

        const { signature } = await signTypedDataWithPrivy(
          typedDataPayload as any,
          {
            address: eoaAddress,
            uiOptions: { showWalletUIs: false },
          },
        );
        return signature as `0x${string}`;
      }

      return walletClient.signTypedData({
        account: eoaAddress as `0x${string}`,
        domain: withdrawTypedData.typedData.domain as Parameters<
          typeof walletClient.signTypedData
        >[0]['domain'],
        types: withdrawTypedData.typedData.types as Parameters<
          typeof walletClient.signTypedData
        >[0]['types'],
        primaryType: withdrawTypedData.typedData.primaryType ?? 'Batch',
        message: message as Parameters<
          typeof walletClient.signTypedData
        >[0]['message'],
      });
    },
    [
      eoaAddress,
      isEmbeddedPrivyWallet,
      signTypedDataWithPrivy,
      signWithDelegatedPrivy,
      walletClient,
    ],
  );

  const executeWithdraw = useCallback(async () => {
    if (
      !isTradingSessionComplete ||
      !destination ||
      !safeAddress ||
      !eoaAddress ||
      !walletClient ||
      !accessToken
    ) {
      setError('Trading session not ready.');
      setStep('error');
      return;
    }
    setStep('processing');
    setError(null);
    try {
      const typedData = await getWithdrawTypedData(
        {
          safeAddress,
          depositWalletAddress,
          walletType,
          eoaAddress,
          toAddress: destination,
          amount: parsedAmount,
          tokenAddress: activeAddress,
        },
        accessToken,
      );

      let signature: `0x${string}`;
      if (walletType === 'deposit') {
        signature = await signDepositWithdrawTypedData(typedData);
      } else {
        if (!typedData.txHash) {
          throw new Error('Withdrawal signing hash is missing.');
        }
        signature = isEmbeddedPrivyWallet(eoaAddress)
          ? await signWithDelegatedPrivy('sign-message', {
              message: typedData.txHash,
            })
          : await walletClient!.signMessage({
              account: eoaAddress as `0x${string}`,
              message: {
                raw: hexToBytes(typedData.txHash as `0x${string}`),
              },
            });
      }

      const result = await submitWithdraw(
        {
          safeAddress,
          depositWalletAddress,
          walletType,
          eoaAddress,
          toAddress: destination,
          amount: parsedAmount,
          signature,
          nonce: typedData.nonce,
          deadline: typedData.deadline,
          tokenAddress: activeAddress,
        },
        accessToken,
      );

      setTxHash(result.txId ?? null);

      setStep('success');
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['pusdBalance'],
        });
        queryClient.invalidateQueries({
          queryKey: ['legacyUsdcBalance'],
        });
      }, 3000);
    } catch (err: any) {
      const msg =
        err?.message || err?.toString() || 'Withdrawal failed';
      const isRejected = [
        'rejected',
        'denied',
        'cancelled',
        'user rejected',
      ].some((s) => msg.includes(s));
      setError(
        isRejected
          ? 'Transaction was rejected.'
          : `Withdrawal failed: ${msg}`,
      );
      setStep('error');
    }
  }, [
    isTradingSessionComplete,
    destination,
    safeAddress,
    eoaAddress,
    accessToken,
    parsedAmount,
    activeAddress,
    walletClient,
    walletType,
    depositWalletAddress,
    isEmbeddedPrivyWallet,
    queryClient,
    signDepositWithdrawTypedData,
    signWithDelegatedPrivy,
  ]);

  if (step === 'processing')
    return (
      <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">
            Processing withdrawal...
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Signing and submitting via {walletLabel}
          </p>
        </div>
      </div>
    );

  if (step === 'success')
    return (
      <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">
            Withdrawal successful!
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {parsedAmount.toFixed(2)} {activeLabel} sent to your Privy
            wallet
          </p>
        </div>
        {txHash && (
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on Polygonscan ↗
          </a>
        )}
        <Button
          className="w-full bg-black text-white hover:bg-gray-800 mt-2"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    );

  if (step === 'error')
    return (
      <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">
            Withdrawal failed
          </p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="flex-1 bg-black text-white hover:bg-gray-800"
            onClick={() => {
              setError(null);
              setStep('confirm');
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );

  if (step === 'confirm')
    return (
      <div className="px-6 pb-6 space-y-4">
        <div className="space-y-3">
          {[
            [
              'You withdraw',
              `${parsedAmount.toFixed(6)} ${activeLabel}`,
            ],
            ['USD value', `≈ $${parsedAmount.toFixed(2)}`],
            [
              'From',
              `${safeAddress ? truncateAddress(safeAddress) : '—'} (${walletLabel})`,
            ],
            [
              'To',
              `${destination ? truncateAddress(destination) : '—'} (Privy wallet)`,
            ],
            ['Network', 'Polygon'],
            ['Gas fee', 'Sponsored'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span
                className={`font-semibold text-xs ${
                  label === 'Gas fee'
                    ? 'text-green-600'
                    : 'text-gray-900'
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep('amount')}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-black text-white hover:bg-gray-800"
            onClick={executeWithdraw}
          >
            Approve Withdrawal
          </Button>
        </div>
      </div>
    );

  // step === 'amount'
  return (
    <div className="px-6 pb-6 space-y-5">
      {showTokenSelector && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            aria-pressed={selectedWithdrawToken === 'pUSD'}
            onClick={() => handleSelectWithdrawToken('pUSD')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selectedWithdrawToken === 'pUSD'
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            pUSD
            <span
              className={`text-xs ${
                selectedWithdrawToken === 'pUSD'
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}
            >
              ${usdcBalance.toFixed(2)}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={selectedWithdrawToken === 'USDC.e'}
            onClick={() => handleSelectWithdrawToken('USDC.e')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selectedWithdrawToken === 'USDC.e'
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            USDC.e
            <span
              className={`text-xs ${
                selectedWithdrawToken === 'USDC.e'
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}
            >
              ${legacyUsdcBalance.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-gray-500 mb-1">
          Available to withdraw
        </p>
        <p className="text-2xl font-bold text-gray-900">
          ${activeBalance.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {activeBalance.toFixed(6)} {activeLabel} ({walletLabel})
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Destination (Privy wallet)
        </label>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-700 font-mono flex-1">
            {destination
              ? truncateAddress(destination)
              : 'Not connected'}
          </span>
          {destination && (
            <button
              onClick={handleCopyAddress}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copied ? (
                <CheckCheck className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Amount ({activeLabel})
        </label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16 text-base"
            min="0"
            step="0.01"
          />
          <button
            onClick={() => setAmount(activeBalance.toFixed(6))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            MAX
          </button>
        </div>
        {amount && !isAmountValid && (
          <p className="text-xs text-red-500">
            {parsedAmount <= 0
              ? 'Enter a valid amount'
              : 'Exceeds available balance'}
          </p>
        )}
      </div>

      <Button
        onClick={() => setStep('confirm')}
        disabled={
          !isAmountValid || !destination || !isTradingSessionComplete
        }
        className="w-full bg-black text-white hover:bg-gray-800"
      >
        <ArrowDownToLine className="w-4 h-4 mr-2" />
        Review Withdrawal
      </Button>
      {!isTradingSessionComplete && (
        <p className="text-xs text-center text-amber-600">
          Trading session must be initialized to withdraw.
        </p>
      )}
    </div>
  );
}
