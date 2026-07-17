'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useConnectWallet,
  useCreateWallet as useEvmCreateWallet,
  usePrivy,
  useSendTransaction,
  useWallets as useEvmWallets,
} from '@privy-io/react-auth';
import {
  useCreateWallet as useSolanaCreateWallet,
  useWallets as useSolanaWallets,
} from '@privy-io/react-auth/solana';
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
} from 'viem';
import { arbitrum, base, mainnet, polygon } from 'viem/chains';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  CheckoutIntent,
  getCheckoutIntent,
  prepareCheckoutLifiTransaction,
  prepareCheckoutTransaction,
  submitCheckoutLifiTransaction,
  submitCheckoutTransaction,
} from '@/lib/checkout-api';
import { getJupiterQuote as fetchJupiterQuote } from '@/actions/jupiterSwap';
import {
  calculateCheckoutTokenAmount,
  formatRawTokenAmount,
  getCheckoutAmounts,
  getLifiTokenAddressForCheckout,
  getProtectedCheckoutOutputRawAmount,
  isSolanaSettlementUsdc,
  NATIVE_EVM_TOKEN_ADDRESS,
  SOL_MINT,
  SOLANA_USDC_MINT,
} from '@/lib/checkout-payment-amounts';
import { copyTextToClipboard } from '@/lib/clipboard';
import { decimalAmountToRawUnits } from '@/lib/wallet/swapAmounts';
import { formatUsdAmount } from '@/lib/marketplace-api';
import {
  getPhantomCheckoutUrl,
  normalizeCheckoutUrl,
} from '@/lib/phantom-checkout';
import {
  selectPreferredWallet,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { PrivyLinkedAccount, isSolanaWalletAccount } from '@/types/privy';
import { TokenData } from '@/types/token';

const SUCCESS_STATUSES = new Set(['paid', 'settled']);
const FINAL_STATUSES = new Set([
  'paid',
  'settled',
  'expired',
  'cancelled',
  'conversion_failed',
  'settlement_failed',
]);

type Stage =
  | 'idle'
  | 'loading'
  | 'preparing'
  | 'signing'
  | 'confirming'
  | 'completed'
  | 'failed';

type RailFilter = 'all' | 'solana' | 'evm';

type ScanMethod = 'swop' | 'phantom';

type MobilePlatform = 'ios' | 'android' | 'other';

type LifiTransactionRequest = {
  to: string;
  data: string;
  value?: string;
  chainId?: number;
};

const DEFAULT_SWOP_IOS_STORE_URL =
  'https://apps.apple.com/us/app/swopnew/id1593201322';
const DEFAULT_SWOP_ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.travisheron.swop';
const DEFAULT_SWOP_APP_CHECKOUT_DEEP_LINK_BASES = [
  'swopmobileexpo://checkout',
  'swop://pay/v1/checkout',
];
const SWOP_APP_CHECKOUT_DEEP_LINK_BASES = (
  process.env.NEXT_PUBLIC_SWOP_APP_CHECKOUT_DEEP_LINK_BASES || ''
)
  .split(',')
  .map((base) => base.trim())
  .filter(Boolean);
const CHAIN_CONFIG: Record<
  string,
  { id: string; name: string; explorer: string }
> = {
  ETHEREUM: {
    id: '1',
    name: 'Ethereum',
    explorer: 'https://etherscan.io/tx/',
  },
  POLYGON: {
    id: '137',
    name: 'Polygon',
    explorer: 'https://polygonscan.com/tx/',
  },
  BASE: {
    id: '8453',
    name: 'Base',
    explorer: 'https://basescan.org/tx/',
  },
  ARBITRUM: {
    id: '42161',
    name: 'Arbitrum',
    explorer: 'https://arbiscan.io/tx/',
  },
  SOLANA: {
    id: '1151111081099710',
    name: 'Solana',
    explorer: 'https://solscan.io/tx/',
  },
};

const VIEM_CHAINS = {
  '1': mainnet,
  '137': polygon,
  '8453': base,
  '42161': arbitrum,
};

function decimalToRawTokenAmount(value: string, decimals: number) {
  const [whole = '0', fraction = ''] = value.split('.');
  const safeWhole = whole.replace(/\D/g, '') || '0';
  const safeFraction = fraction.replace(/\D/g, '').slice(0, decimals);
  return `${safeWhole}${safeFraction.padEnd(decimals, '0')}`.replace(
    /^0+(?=\d)/,
    ''
  );
}

function formatCurrency(value?: number, currency = 'USDC') {
  return `${formatUsdAmount(Number(value || 0))} ${currency}`;
}

type CheckoutAmountBreakdown = ReturnType<typeof getCheckoutAmounts>;

function roundCheckoutAmount(value: number) {
  return Number(value.toFixed(6));
}

function isMinimumCheckoutFee(amounts: CheckoutAmountBreakdown | null) {
  if (!amounts) return false;
  const percentageFeeAmount = roundCheckoutAmount(
    amounts.merchantReceivesAmount * (amounts.platformFeeBps / 10000)
  );
  return amounts.platformFeeAmount > percentageFeeAmount + 0.000001;
}

function checkoutFeeLabel(amounts: CheckoutAmountBreakdown | null) {
  if (!amounts) return 'Swop fee';
  if (isMinimumCheckoutFee(amounts)) return 'Swop fee (minimum)';
  return `Swop fee (${(amounts.platformFeeBps / 100).toFixed(2)}%)`;
}

function formatCheckoutTotal(value?: number, currency = 'USDC') {
  const amount = Number(value || 0);
  const normalizedCurrency = currency.toUpperCase();
  if (['USD', 'USDC', 'USDT'].includes(normalizedCurrency)) {
    return `$${formatUsdAmount(amount)}`;
  }

  return formatCurrency(value, currency);
}

function formatTokenQuantity(value?: string | number | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return value ? String(value) : '--';

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount >= 1 ? 4 : 6,
  });
}

function checkoutItemLabel(intent?: CheckoutIntent | null) {
  const lineItems = intent?.lineItems || [];
  if (lineItems.length === 1) return lineItems[0].name;
  if (lineItems.length > 1) return `${lineItems.length} items`;
  return intent?.description || 'Checkout payment';
}

// Gate on the exact base-unit balance whenever the backend provides it —
// `balance` is a display float that can round 1.014999 up to 1.015 and
// approve a payment the on-chain transfer then rejects with "insufficient
// funds". The Swop fee rides on top of the item price, so real payments sit
// exactly on that boundary.
function tokenCoversAmount(token: TokenData, tokenAmount: string) {
  if (!tokenAmount) return false;
  if (token.rawAmount != null) {
    try {
      const requiredRaw = decimalAmountToRawUnits(tokenAmount, token.decimals);
      if (requiredRaw !== null) return requiredRaw <= BigInt(token.rawAmount);
    } catch {
      // Malformed rawAmount — fall back to the float comparison below.
    }
  }
  return Number(token.balance || 0) >= Number(tokenAmount);
}

function tokenHeldBalanceLabel(token: TokenData) {
  if (token.rawAmount != null) {
    try {
      return formatTokenQuantity(
        formatRawTokenAmount(token.rawAmount, token.decimals)
      );
    } catch {
      // Malformed rawAmount — fall back to the float below.
    }
  }
  return formatTokenQuantity(token.balance);
}

function insufficientBalanceCopy(token: TokenData, tokenAmount: string) {
  return `Insufficient ${token.symbol}: this payment needs ${formatTokenQuantity(
    tokenAmount
  )} ${token.symbol} (Swop fee included), but the selected wallet holds ${tokenHeldBalanceLabel(
    token
  )}. Top up or pay with another token.`;
}

function tokenUnitPriceLabel(token: TokenData | null) {
  if (!token) return '';
  const price = Number(token.marketData?.price || 0);
  if (price <= 0) return `${CHAIN_CONFIG[token.chain]?.name || token.chain} quote`;

  const formattedPrice = price.toLocaleString(undefined, {
    minimumFractionDigits: price >= 1 ? 2 : 4,
    maximumFractionDigits: price >= 1 ? 2 : 6,
  });
  return `1 ${token.symbol} = $${formattedPrice}`;
}

function tokenMintForCheckout(token: TokenData) {
  if (token.isNative || token.symbol?.toUpperCase() === 'SOL') return null;
  return token.address || null;
}

function tokenRail(token: TokenData | null) {
  if (!token) return null;
  return token.chain === 'SOLANA' ? 'solana' : 'lifi';
}

function paymentWalletAddressForToken(
  token: TokenData | null,
  evmSignerWalletAddresses: string[]
) {
  if (!token || token.chain === 'SOLANA') return '';
  const tokenWalletAddress = token.walletAddress?.trim();
  if (
    tokenWalletAddress &&
    evmSignerWalletAddresses.some(
      (address) => address.toLowerCase() === tokenWalletAddress.toLowerCase()
    )
  ) {
    return tokenWalletAddress;
  }
  if (tokenWalletAddress) return '';

  return evmSignerWalletAddresses[0] || '';
}

function uniqueWalletAddresses(...values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const addresses: string[] = [];
  values.forEach((value) => {
    const address = value?.trim();
    if (!address) return;
    const key = address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    addresses.push(address);
  });
  return addresses;
}

function isEmbeddedWalletAlreadyExistsError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : '';

  return (
    code === 'embedded_wallet_already_exists' ||
    message.includes('embedded_wallet_already_exists') ||
    message.includes('already has an embedded wallet')
  );
}

function checkoutErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

const isUserRejectionError = (error: unknown) => {
  const message = checkoutErrorMessage(error).toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('request rejected') ||
    message.includes('user cancelled') ||
    message.includes('user canceled') ||
    message.includes('rejected the request')
  );
};

// Turns raw SDK/network errors (e.g. Privy's
// `[POST] "/api/v1/wallets/authenticate": <no response> [TimeoutError]: The
// operation was aborted due to timeout`) into copy a shopper can act on.
function humanizeCheckoutError(error: unknown, fallback: string) {
  const raw = checkoutErrorMessage(error).trim();
  const message = raw.toLowerCase();

  if (!message) return fallback;

  // The backend's balance gate already writes shopper-facing copy naming
  // exact required/held amounts — pass it through before the generic rules
  // below flatten it (or worse, the sponsorship rule claims the token
  // balance "is not the problem").
  if (
    message.includes('swop fee') ||
    message.includes('add at least') ||
    message.includes('the paying wallet holds')
  ) {
    return raw;
  }

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted due to timeout') ||
    message.includes('<no response>') ||
    message.includes('etimedout')
  ) {
    return 'The connection timed out before we could reach your wallet. Check your internet and try again.';
  }

  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('request rejected') ||
    message.includes('user cancelled') ||
    message.includes('user canceled') ||
    message.includes('rejected the request')
  ) {
    return 'You cancelled the request in your wallet. Try again when you’re ready to approve it.';
  }

  if (
    (message.includes('insufficient') &&
      (message.includes('rent') ||
        message.includes('fee payer') ||
        message.includes('network fee') ||
        message.includes('sponsor') ||
        message.includes('transaction simulation failed'))) ||
    message.includes('insufficient funds for rent') ||
    message.includes('rent-exempt')
  ) {
    return 'Swop could not complete the sponsored Solana network setup for this payment. Your token balance is not the problem, so try again or choose another token.';
  }

  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance')
  ) {
    return 'Your wallet doesn’t have enough balance to cover this payment plus network fees.';
  }

  if (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('err_network') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  ) {
    return 'We couldn’t reach the network. Check your connection and try again.';
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return 'Too many requests right now. Wait a moment and try again.';
  }

  // Don't surface raw status-line/stack noise to shoppers.
  if (
    raw.startsWith('[POST]') ||
    raw.startsWith('[GET]') ||
    message.includes('xhr') ||
    /\b[45]\d{2}\b/.test(raw)
  ) {
    return fallback;
  }

  return raw;
}

function isPrivyEmbeddedWallet(wallet: unknown) {
  if (!wallet || typeof wallet !== 'object') return false;
  const walletRecord = wallet as {
    connectorType?: unknown;
    walletClientType?: unknown;
  };

  return (
    walletRecord.walletClientType === 'privy' ||
    walletRecord.connectorType === 'embedded'
  );
}

function emptyTimeSeriesData() {
  return {
    '1H': [],
    '1D': [],
    '1W': [],
    '1M': [],
    '1Y': [],
  };
}

type LinkedWalletAccount = PrivyLinkedAccount & {
  address?: string;
  chainType?: string;
  chain_type?: string;
  walletClientType?: string;
  connectorType?: string;
};

function linkedSolanaWalletAddress(
  privyUser: unknown,
  storedSolanaWalletAddress?: string
) {
  const linkedAccounts = (
    (privyUser as { linkedAccounts?: LinkedWalletAccount[] } | null)
      ?.linkedAccounts || []
  ).map((account) => ({
    ...account,
    chainType: account.chainType || account.chain_type,
  })) as PrivyLinkedAccount[];

  return (
    selectPreferredWallet(
      linkedAccounts.filter(isSolanaWalletAccount),
      undefined,
      {
        ...tradingWalletSelectionOptions(),
        preferredAddresses: [storedSolanaWalletAddress],
      }
    )?.address || ''
  );
}

type SolanaFallbackToken = {
  mint: string;
  amount?: number | string | null;
  decimals?: number;
  price?: string | number | null;
  name?: string;
  symbol?: string;
  logoURI?: string;
  tags?: string[];
};

function solanaFallbackTokenToTokenData(
  token: SolanaFallbackToken,
  walletAddress: string
): TokenData | null {
  const balance = Number(token.amount || 0);
  if (!Number.isFinite(balance) || balance <= 0) return null;

  const price = Number(token.price || 0);
  const isNative =
    token.mint === SOL_MINT || token.tags?.some((tag) => tag === 'native');
  const symbol = token.symbol || (isNative ? 'SOL' : 'UNKNOWN');
  const name = token.name || symbol;

  return {
    name,
    symbol,
    balance: String(balance),
    decimals: token.decimals ?? (isNative ? 9 : 0),
    walletAddress,
    address: isNative ? null : token.mint,
    logoURI:
      token.logoURI ||
      (isNative
        ? '/assets/crypto-icons/SOL.png'
        : `/assets/crypto-icons/${symbol}.png`),
    chain: 'SOLANA',
    marketData: {
      price: Number.isFinite(price) && price > 0 ? String(price) : '0',
      symbol,
      name,
    },
    sparklineData: [],
    timeSeriesData: emptyTimeSeriesData(),
    isNative,
    value: Number.isFinite(price) ? balance * price : 0,
  };
}

function mergeCheckoutTokens(
  primaryTokens: TokenData[],
  fallbackTokens: TokenData[]
) {
  const seen = new Set<string>();
  const merged: TokenData[] = [];

  [...primaryTokens, ...fallbackTokens].forEach((token) => {
    const key = [
      token.chain,
      token.walletAddress || '',
      token.address || (token.isNative ? 'native' : ''),
      token.symbol,
    ]
      .join(':')
      .toLowerCase();

    if (seen.has(key)) return;
    seen.add(key);
    merged.push(token);
  });

  return merged;
}

function tokenIdentity(token: TokenData | null) {
  if (!token) return '';
  return [
    token.chain,
    token.walletAddress || '',
    token.address || (token.isNative ? 'native' : ''),
    token.symbol,
  ]
    .join(':')
    .toLowerCase();
}

function explorerUrlForToken(token: TokenData | null, txHash: string) {
  const chain = token?.chain || 'SOLANA';
  return `${CHAIN_CONFIG[chain]?.explorer || CHAIN_CONFIG.SOLANA.explorer}${txHash}`;
}

function chainNameById(chainId?: string | null) {
  if (!chainId) return '';
  const match = Object.values(CHAIN_CONFIG).find(
    (chain) => chain.id === String(chainId)
  );
  return match?.name || chainId;
}

function swopAppCheckoutUrlFromBase(base: string, intentId: string) {
  const encodedIntentId = encodeURIComponent(intentId);
  const normalizedBase = base.replace(/\/+$/, '');

  if (normalizedBase.includes('://')) {
    return `${normalizedBase}/${encodedIntentId}`;
  }

  return `${normalizedBase}://checkout/${encodedIntentId}`;
}

function swopAppCheckoutUrls(intentId: string) {
  const bases =
    SWOP_APP_CHECKOUT_DEEP_LINK_BASES.length > 0
      ? SWOP_APP_CHECKOUT_DEEP_LINK_BASES
      : DEFAULT_SWOP_APP_CHECKOUT_DEEP_LINK_BASES;

  return bases.map((base) => swopAppCheckoutUrlFromBase(base, intentId));
}

function mobilePlatformFromUserAgent(userAgent: string): MobilePlatform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  return 'other';
}

function swopInstallUrl(platform: MobilePlatform) {
  if (platform === 'android') {
    return (
      process.env.NEXT_PUBLIC_SWOP_ANDROID_STORE_URL ||
      DEFAULT_SWOP_ANDROID_STORE_URL
    );
  }

  return process.env.NEXT_PUBLIC_SWOP_IOS_STORE_URL || DEFAULT_SWOP_IOS_STORE_URL;
}

function getPublicClient(chainId: string) {
  const chain = VIEM_CHAINS[chainId as keyof typeof VIEM_CHAINS];
  if (!chain) return null;
  return createPublicClient({ chain, transport: http() });
}

function statusCopy(intent?: CheckoutIntent | null) {
  switch (intent?.status) {
    case 'settled':
      return 'Paid and settled';
    case 'paid':
      return 'Paid';
    case 'conversion_failed':
      return 'Paid, conversion pending';
    case 'settlement_failed':
      return 'Paid, settlement pending';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'pending_payment':
      return 'Awaiting signature';
    default:
      return 'Ready';
  }
}

function PhantomMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-white text-xs font-black text-[#5f4acb] ${className}`}
      aria-hidden="true"
    >
      P
    </span>
  );
}

type CheckoutPaymentClientProps = {
  intentId: string;
  initialScanMethod?: ScanMethod;
  fallbackHref?: string;
  fallbackLabel?: string;
  onClose?: () => void;
};

export default function CheckoutPaymentClient({
  intentId,
  initialScanMethod = 'swop',
  onClose,
}: CheckoutPaymentClientProps) {
  const router = useRouter();
  const { login, ready, authenticated, user: privyUser, getAccessToken } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { accessToken, user } = useUser();
  const { wallets: evmWallets } = useEvmWallets();
  const { sendTransaction } = useSendTransaction();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet: createEvmWallet } = useEvmCreateWallet();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [tokenSelectionTouched, setTokenSelectionTouched] = useState(false);
  const [search, setSearch] = useState('');
  const [railFilter, setRailFilter] = useState<RailFilter>('all');
  const [stage, setStage] = useState<Stage>('loading');
  const [scanMethod, setScanMethod] =
    useState<ScanMethod>(initialScanMethod);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [restoringWallet, setRestoringWallet] = useState(false);
  const [pendingSignerRestore, setPendingSignerRestore] = useState(false);
  const [copiedPayUri, setCopiedPayUri] = useState(false);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>('other');
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const selectedSignerReadyRef = useRef(false);
  const signerRestoreMissingMessageRef = useRef('');
  const copyFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    router.back();
  }, [onClose, router]);
  const [quotedTokenAmount, setQuotedTokenAmount] = useState('');
  const [tokenAmountLoading, setTokenAmountLoading] = useState(false);
  const [tokenAmountQuoteError, setTokenAmountQuoteError] = useState<
    string | null
  >(null);
  const [solanaFallbackTokens, setSolanaFallbackTokens] = useState<TokenData[]>(
    []
  );
  const [solanaFallbackLoading, setSolanaFallbackLoading] = useState(false);
  const [quoteSummary, setQuoteSummary] = useState<{
    quotedOutputAmount?: number;
    minOutputAmount?: number;
    requiredSettlementAmount?: number;
    destinationChain?: string;
    settlementMode?: string;
    platformFeeCollection?: string;
    lifiTool?: string | null;
    approvalAddress?: string | null;
    directTransfer?: boolean;
  } | null>(null);

  const storedSolanaWalletAddress =
    user?.solanaWallet || user?.solanaAddress || '';

  const privySolanaWalletAddress = useMemo(
    () => linkedSolanaWalletAddress(privyUser, storedSolanaWalletAddress),
    [privyUser, storedSolanaWalletAddress]
  );

  const solanaWallet = useMemo(
    () =>
      selectPreferredWallet(
        solanaWallets,
        storedSolanaWalletAddress || privySolanaWalletAddress,
        {
          ...tradingWalletSelectionOptions(),
          preferredAddresses: [
            storedSolanaWalletAddress,
            privySolanaWalletAddress,
          ],
        }
      ) || null,
    [privySolanaWalletAddress, solanaWallets, storedSolanaWalletAddress]
  );

  const signableSolanaWalletAddress =
    solanaWallet?.address || privySolanaWalletAddress || '';
  const activeSolanaWalletAddress =
    signableSolanaWalletAddress || storedSolanaWalletAddress || '';

  const evmSignerWalletAddresses = useMemo(
    () =>
      uniqueWalletAddresses(
        ...evmWallets
          .filter((wallet) => wallet.address)
          .map((wallet) => wallet.address)
      ),
    [evmWallets]
  );

  const evmWalletAddresses = useMemo(() => {
    if (evmSignerWalletAddresses.length > 0) {
      return evmSignerWalletAddresses;
    }
    return uniqueWalletAddresses(user?.ethereumWallet, user?.ethAddress);
  }, [evmSignerWalletAddresses, user?.ethAddress, user?.ethereumWallet]);

  const { tokens, loading: tokensLoading, refetch } = useMultiChainTokenData(
    activeSolanaWalletAddress,
    evmWalletAddresses,
    ['SOLANA', 'ETHEREUM', 'POLYGON', 'BASE', 'ARBITRUM']
  );
  const checkoutTokens = useMemo(
    () =>
      mergeCheckoutTokens(tokens as TokenData[], solanaFallbackTokens),
    [solanaFallbackTokens, tokens]
  );
  const checkoutTokensLoading = tokensLoading || solanaFallbackLoading;

  const payable = Boolean(
    intent && !FINAL_STATUSES.has(intent.status)
  );

  const payableTokens = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return checkoutTokens
      .filter((token) => {
        if (railFilter === 'solana') return token.chain === 'SOLANA';
        if (railFilter === 'evm') return token.chain !== 'SOLANA';
        return true;
      })
      .filter((token) => Number(token.balance || 0) > 0)
      .filter(
        (token) =>
          // Solana tokens are sized by a live Jupiter ExactOut quote, so a
          // market price feed is not required to pay with them. EVM tokens
          // still need a price to size the LiFi input amount.
          token.chain === 'SOLANA' ||
          Number(token.marketData?.price || 0) > 0
      )
      .filter((token) => {
        if (!lowerSearch) return true;
        return (
          token.name?.toLowerCase().includes(lowerSearch) ||
          token.symbol?.toLowerCase().includes(lowerSearch)
        );
      });
  }, [checkoutTokens, railFilter, search]);

  const estimatedTokenAmount = useMemo(
    () => (intent ? calculateCheckoutTokenAmount(intent, selectedToken) : ''),
    [intent, selectedToken]
  );

  const needsSolanaSettlementQuote = Boolean(
    intent &&
      selectedToken &&
      selectedToken.chain === 'SOLANA' &&
      !isSolanaSettlementUsdc(selectedToken)
  );
  const tokenAmount = needsSolanaSettlementQuote
    ? quotedTokenAmount
    : estimatedTokenAmount;

  const checkoutAmounts = useMemo(
    () => (intent ? getCheckoutAmounts(intent) : null),
    [intent]
  );

  const selectedRail = tokenRail(selectedToken);
  const selectedPaymentWalletAddress = useMemo(
    () =>
      paymentWalletAddressForToken(
        selectedToken,
        evmSignerWalletAddresses
      ),
    [evmSignerWalletAddresses, selectedToken]
  );
  const selectedEvmSignerWallet = useMemo(
    () =>
      selectedPaymentWalletAddress
        ? evmWallets.find(
            (wallet) =>
              wallet.address?.toLowerCase() ===
              selectedPaymentWalletAddress.toLowerCase()
          ) || null
        : null,
    [evmWallets, selectedPaymentWalletAddress]
  );
  const selectedSolanaSignerWallet = useMemo(() => {
    if (selectedToken?.chain !== 'SOLANA') return solanaWallet;
    const sourceWallet = selectedToken.walletAddress || activeSolanaWalletAddress;
    if (!sourceWallet) return solanaWallet;
    return (
      solanaWallets.find((wallet) => wallet.address === sourceWallet) ||
      (solanaWallet?.address === sourceWallet ? solanaWallet : null)
    );
  }, [activeSolanaWalletAddress, selectedToken, solanaWallet, solanaWallets]);
  const selectedTokenWalletLabel = selectedToken?.walletAddress
    ? truncateWalletAddress(selectedToken.walletAddress)
    : '';
  const selectedSignerReady =
    selectedRail === 'solana'
      ? Boolean(selectedSolanaSignerWallet?.address)
      : selectedRail === 'lifi'
      ? Boolean(selectedEvmSignerWallet?.address)
      : false;
  const selectedSignerIsEmbedded = isPrivyEmbeddedWallet(
    selectedRail === 'solana'
      ? selectedSolanaSignerWallet
      : selectedRail === 'lifi'
      ? selectedEvmSignerWallet
      : null
  );
  const confirmPaymentLabel = selectedSignerIsEmbedded
    ? 'Confirm with passkey'
    : 'Confirm payment';
  const walletRestoreBusy = restoringWallet || pendingSignerRestore;
  const walletRestoreLabel = pendingSignerRestore
    ? 'Checking wallet...'
    : restoringWallet
    ? 'Opening sign-in...'
    : 'Pay with passkey or email';
  const needsSolanaSigner =
    selectedRail === 'solana' && !selectedSolanaSignerWallet?.address;
  const needsEvmSigner =
    selectedRail === 'lifi' && !selectedEvmSignerWallet?.address;
  const needsSignerRestore = needsSolanaSigner || needsEvmSigner;
  const signerRestoreTargetAddress =
    selectedRail === 'solana'
      ? selectedToken?.walletAddress || activeSolanaWalletAddress
      : selectedToken?.walletAddress || selectedPaymentWalletAddress;
  const signerRestoreMissingMessage = signerRestoreTargetAddress
    ? `Signed in, but ${truncateWalletAddress(
        signerRestoreTargetAddress
      )} is not available to sign yet. Use the Swop wallet for that address or connect it externally.`
    : 'Signed in, but the paying wallet is not available to sign yet. Restore your Swop wallet or connect the paying wallet.';
  const appCheckoutUrls = useMemo(
    () => swopAppCheckoutUrls(intentId),
    [intentId]
  );
  const appCheckoutUrl = appCheckoutUrls[0] || '';
  const appInstallUrl = useMemo(
    () => swopInstallUrl(mobilePlatform),
    [mobilePlatform]
  );
  const phantomCheckoutUrl = useMemo(
    () =>
      getPhantomCheckoutUrl({
        checkoutUrl: intent?.checkoutUrl,
        intentId: intent?.intentId || intentId,
      }),
    [intent?.checkoutUrl, intent?.intentId, intentId]
  );
  const webCheckoutUrl = useMemo(
    () =>
      normalizeCheckoutUrl(intent?.checkoutUrl, intent?.intentId || intentId),
    [intent?.checkoutUrl, intent?.intentId, intentId]
  );
  const scanQrValue = useMemo(() => {
    if (scanMethod === 'phantom') {
      return phantomCheckoutUrl || intent?.paymentRequest?.url || '';
    }
    return webCheckoutUrl || intent?.paymentRequest?.url || '';
  }, [intent?.paymentRequest?.url, phantomCheckoutUrl, scanMethod, webCheckoutUrl]);
  const marketplaceOrderId = intent?.marketplaceOrder?.orderId || '';

  useEffect(() => {
    setMobilePlatform(mobilePlatformFromUserAgent(navigator.userAgent));
  }, []);

  const hasSufficientBalance = useMemo(() => {
    if (!selectedToken || !tokenAmount) return false;
    return tokenCoversAmount(selectedToken, tokenAmount);
  }, [selectedToken, tokenAmount]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntent() {
      setStage('loading');
      try {
        const nextIntent = await getCheckoutIntent(intentId);
        if (cancelled) return;
        setIntent(nextIntent);
        setStage(SUCCESS_STATUSES.has(nextIntent.status) ? 'completed' : 'idle');
      } catch (loadError) {
        if (cancelled) return;
        setError(humanizeCheckoutError(loadError, 'Unable to load checkout'));
        setStage('failed');
      }
    }

    loadIntent();
    return () => {
      cancelled = true;
    };
  }, [intentId]);

  useEffect(() => {
    let cancelled = false;
    const walletAddress = activeSolanaWalletAddress.trim();

    if (!walletAddress) {
      setSolanaFallbackTokens([]);
      setSolanaFallbackLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadSolanaFallbackTokens() {
      setSolanaFallbackLoading(true);
      try {
        const response = await fetch(
          `/api/tokens?address=${encodeURIComponent(walletAddress)}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        const fallbackTokens = ((data.tokens || []) as SolanaFallbackToken[])
          .map((token) =>
            solanaFallbackTokenToTokenData(token, walletAddress)
          )
          .filter((token): token is TokenData => Boolean(token));

        setSolanaFallbackTokens(fallbackTokens);
      } catch (fallbackError) {
        if (!cancelled) {
          console.warn('Solana checkout token fallback unavailable:', fallbackError);
          setSolanaFallbackTokens([]);
        }
      } finally {
        if (!cancelled) setSolanaFallbackLoading(false);
      }
    }

    loadSolanaFallbackTokens();

    return () => {
      cancelled = true;
    };
  }, [activeSolanaWalletAddress]);

  useEffect(() => {
    if (payableTokens.length === 0) return;
    const preferred =
      payableTokens.find(
        (token) =>
          token.chain === 'SOLANA' &&
          token.symbol?.toUpperCase() === 'USDC'
      ) ||
      payableTokens.find((token) => token.symbol?.toUpperCase() === 'USDC') ||
      payableTokens[0];

    if (!selectedToken) {
      setSelectedToken(preferred);
      return;
    }

    const selectedTokenStillPayable = payableTokens.some(
      (token) => tokenIdentity(token) === tokenIdentity(selectedToken)
    );
    if (!selectedTokenStillPayable) {
      setSelectedToken(preferred);
      return;
    }

    if (
      !tokenSelectionTouched &&
      preferred.chain === 'SOLANA' &&
      tokenIdentity(preferred) !== tokenIdentity(selectedToken)
    ) {
      setSelectedToken(preferred);
    }
  }, [payableTokens, selectedToken, tokenSelectionTouched]);

  useEffect(() => {
    setTokenMenuOpen(false);
  }, [
    selectedToken?.address,
    selectedToken?.chain,
    selectedToken?.symbol,
    selectedToken?.walletAddress,
  ]);

  useEffect(() => {
    selectedSignerReadyRef.current = selectedSignerReady;
  }, [selectedSignerReady]);

  useEffect(() => {
    signerRestoreMissingMessageRef.current = signerRestoreMissingMessage;
  }, [signerRestoreMissingMessage]);

  useEffect(() => {
    if (!pendingSignerRestore || !selectedSignerReady) return;
    setPendingSignerRestore(false);
    setError(null);
    toast.success('Swop wallet ready');
  }, [pendingSignerRestore, selectedSignerReady]);

  useEffect(() => {
    if (!copyFallback) return;
    window.setTimeout(() => {
      copyFallbackInputRef.current?.focus();
      copyFallbackInputRef.current?.select();
    }, 0);
  }, [copyFallback]);

  useEffect(() => {
    setQuoteSummary(null);
  }, [selectedToken, tokenAmount]);

  useEffect(() => {
    let cancelled = false;

    setQuotedTokenAmount('');
    setTokenAmountQuoteError(null);

    async function quoteSolanaSettlementAmount() {
      if (!intent || !selectedToken || !needsSolanaSettlementQuote) {
        setTokenAmountLoading(false);
        return;
      }

      const inputMint =
        selectedToken.isNative ||
        selectedToken.symbol?.toUpperCase() === 'SOL'
          ? SOL_MINT
          : selectedToken.address;

      if (!inputMint) {
        setTokenAmountQuoteError('Unable to quote selected token.');
        setTokenAmountLoading(false);
        return;
      }

      setTokenAmountLoading(true);

      try {
        const result = await fetchJupiterQuote({
          inputMint,
          outputMint: intent.merchantCurrency.mint || SOLANA_USDC_MINT,
          amount: getProtectedCheckoutOutputRawAmount(
            intent,
            intent.merchantCurrency.decimals || 6
          ),
          slippageBps: getCheckoutAmounts(intent).slippageBps,
          swapMode: 'ExactOut',
        });

        if (cancelled) return;

        if (!result.success || !result.data?.inAmount) {
          throw new Error(
            result.error || 'Unable to quote selected token into USDC.'
          );
        }

        setQuotedTokenAmount(
          formatRawTokenAmount(
            result.data.inAmount,
            selectedToken.decimals || 9
          )
        );
      } catch (quoteError) {
        if (cancelled) return;
        setTokenAmountQuoteError(
          quoteError instanceof Error
            ? quoteError.message
            : 'Unable to quote selected token into USDC.'
        );
      } finally {
        if (!cancelled) setTokenAmountLoading(false);
      }
    }

    quoteSolanaSettlementAmount();

    return () => {
      cancelled = true;
    };
  }, [intent, needsSolanaSettlementQuote, selectedToken]);

  const ensureEvmEmbeddedWallet = async () => {
    await createEvmWallet().catch((walletError) => {
      if (isEmbeddedWalletAlreadyExistsError(walletError)) return null;
      throw walletError;
    });
  };

  const ensureSolanaEmbeddedWallet = async () => {
    await createSolanaWallet().catch((walletError) => {
      if (isEmbeddedWalletAlreadyExistsError(walletError)) return null;
      throw walletError;
    });
  };

  const ensureEmbeddedWalletForSelectedRail = async () => {
    if (selectedRail === 'lifi') {
      await ensureEvmEmbeddedWallet();
      return;
    }
    if (selectedRail === 'solana') {
      await ensureSolanaEmbeddedWallet();
      return;
    }

    await Promise.all([ensureEvmEmbeddedWallet(), ensureSolanaEmbeddedWallet()]);
  };

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    setError(null);
    try {
      if (!authenticated) {
        await login();
        return;
      }
      await ensureEmbeddedWalletForSelectedRail();
      toast.success('Wallet created');
      await refetch();
    } catch (walletError) {
      setError(humanizeCheckoutError(walletError, 'Unable to create wallet'));
    } finally {
      setCreatingWallet(false);
    }
  };

  const handleUsePasskeyWallet = async () => {
    if (!ready) return;
    setRestoringWallet(true);
    setError(null);
    try {
      if (!authenticated) {
        await login();
        return;
      }

      await ensureEmbeddedWalletForSelectedRail();

      await refetch();
      setPendingSignerRestore(true);
      window.setTimeout(() => {
        if (selectedSignerReadyRef.current) return;
        setPendingSignerRestore(false);
        setError(signerRestoreMissingMessageRef.current);
      }, 3000);
    } catch (walletError) {
      setError(
        humanizeCheckoutError(walletError, 'Unable to prepare Swop wallet')
      );
    } finally {
      setRestoringWallet(false);
    }
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setError(null);
    try {
      await connectWallet();
      await refetch();
    } catch (connectError) {
      setError(
        humanizeCheckoutError(connectError, 'Unable to connect wallet')
      );
    } finally {
      setConnectingWallet(false);
    }
  };

  const rememberCheckoutForInstall = () => {
    try {
      localStorage.setItem(
        'swop:pendingCheckoutUrl',
        webCheckoutUrl || appCheckoutUrl
      );
    } catch {
      // Best-effort only. Checkout still works from the current page.
    }
  };

  const handleOpenSwopApp = () => {
    rememberCheckoutForInstall();
    const [primaryUrl, fallbackUrl] = appCheckoutUrls;
    if (!primaryUrl) return;
    window.location.href = primaryUrl;
    if (fallbackUrl) {
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = fallbackUrl;
        }
      }, 700);
    }
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        toast('Swop app not detected. Install it or continue here.');
      }
    }, fallbackUrl ? 1800 : 1400);
  };

  const handleInstallSwopApp = () => {
    rememberCheckoutForInstall();
    window.location.href = appInstallUrl;
  };

  const handleOpenPhantom = () => {
    if (!phantomCheckoutUrl) return;
    window.location.href = phantomCheckoutUrl;
  };

  const copyScanLink = async () => {
    if (!scanQrValue) return;
    const copiedToClipboard = await copyTextToClipboard(scanQrValue);
    if (copiedToClipboard) {
      setCopyFallback('');
      toast.success(
        scanMethod === 'phantom' ? 'Phantom link copied' : 'Swop link copied'
      );
      return;
    }

    setCopyFallback(scanQrValue);
    toast('Link selected. Press Cmd+C to copy.');
  };

  const copySolanaPayUri = async () => {
    if (!intent?.paymentRequest?.url) return;
    const copiedToClipboard = await copyTextToClipboard(intent.paymentRequest.url);
    if (copiedToClipboard) {
      setCopyFallback('');
      setCopiedPayUri(true);
      toast.success('Solana Pay URI copied');
      window.setTimeout(() => setCopiedPayUri(false), 1600);
      return;
    }

    setCopyFallback(intent.paymentRequest.url);
    toast('Payment URI selected. Press Cmd+C to copy.');
  };

  const executeLifiTransaction = async (
    transactionRequest: LifiTransactionRequest,
    spenderAddress?: string | null
  ) => {
    if (!selectedToken || selectedToken.chain === 'SOLANA') {
      throw new Error('Select a supported token for Swop Pay');
    }

    const chainConfig = CHAIN_CONFIG[selectedToken.chain];
    if (!chainConfig) throw new Error('Unsupported payment network');

    const sourceChainId = Number(chainConfig.id);
    const sourceWalletAddress = selectedPaymentWalletAddress;
    if (!sourceWalletAddress || !selectedEvmSignerWallet?.address) {
      throw new Error('Wallet not found');
    }

    if (
      selectedEvmSignerWallet &&
      selectedEvmSignerWallet.chainId !== `eip155:${sourceChainId}`
    ) {
      const evmWallet = selectedEvmSignerWallet;
      await evmWallet.switchChain(sourceChainId);
    }

    const publicClient = getPublicClient(chainConfig.id);
    if (!publicClient) {
      throw new Error(`Unsupported source chain: ${selectedToken.chain}`);
    }

    const fromTokenAddress = getLifiTokenAddressForCheckout(selectedToken);
    const isNativeToken = fromTokenAddress === NATIVE_EVM_TOKEN_ADDRESS;

    if (!isNativeToken) {
      const approvalAddress =
        spenderAddress && /^0x[a-fA-F0-9]{40}$/.test(spenderAddress)
          ? spenderAddress
          : null;
      if (approvalAddress) {
        const rawAmount = BigInt(
          decimalToRawTokenAmount(tokenAmount, selectedToken.decimals || 18)
        );
        const currentAllowance = await publicClient.readContract({
          address: fromTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [
            sourceWalletAddress as `0x${string}`,
            approvalAddress as `0x${string}`,
          ],
        });

        if (currentAllowance < rawAmount) {
          setStage('signing');
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [
              approvalAddress as `0x${string}`,
              BigInt(
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
              ),
            ],
          });
          let approval: Awaited<ReturnType<typeof sendTransaction>>;
          try {
            approval = await sendTransaction(
              {
                from: sourceWalletAddress as `0x${string}`,
                to: fromTokenAddress as `0x${string}`,
                data: approveData,
                chainId: sourceChainId,
              },
              {
                sponsor: true,
                address: sourceWalletAddress,
                uiOptions: { showWalletUIs: false },
              }
            );
          } catch (approvalError) {
            if (isUserRejectionError(approvalError)) throw approvalError;
            approval = await sendTransaction(
              {
                from: sourceWalletAddress as `0x${string}`,
                to: fromTokenAddress as `0x${string}`,
                data: approveData,
                chainId: sourceChainId,
              },
              { sponsor: false, address: sourceWalletAddress }
            );
          }
          await publicClient.waitForTransactionReceipt({
            hash: approval.hash as `0x${string}`,
          });
        }
      }
    }

    setStage('signing');
    const txValue = transactionRequest.value
      ? BigInt(transactionRequest.value)
      : undefined;
    let result: Awaited<ReturnType<typeof sendTransaction>>;
    try {
      result = await sendTransaction(
        {
          from: sourceWalletAddress as `0x${string}`,
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          ...(txValue ? { value: txValue } : {}),
          chainId: transactionRequest.chainId || sourceChainId,
        },
        {
          sponsor: true,
          address: sourceWalletAddress,
          uiOptions: { showWalletUIs: false },
        }
      );
    } catch (sendError) {
      if (isUserRejectionError(sendError)) throw sendError;
      result = await sendTransaction(
        {
          from: sourceWalletAddress as `0x${string}`,
          to: transactionRequest.to as `0x${string}`,
          data: transactionRequest.data as `0x${string}`,
          ...(txValue ? { value: txValue } : {}),
          chainId: transactionRequest.chainId || sourceChainId,
        },
        { sponsor: false, address: sourceWalletAddress }
      );
    }

    return result.hash;
  };

  const pollLifiSettlement = async (txHash: string) => {
    let latestIntent: CheckoutIntent | undefined;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const result = await submitCheckoutLifiTransaction(
        intentId,
        { txHash },
        accessToken || ''
      );
      if (result.intent) {
        latestIntent = result.intent;
        setIntent(result.intent);
      }
      if (result.settlementStatus !== 'pending_payment') {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }

    return {
      transactionHash: txHash,
      settlementStatus: 'pending_payment',
      intent: latestIntent,
    };
  };

  const handlePay = async () => {
    if (!intent || !selectedToken || !tokenAmount) {
      return;
    }

    setError(null);
    setTransactionHash('');
    setQuoteSummary(null);

    try {
      setStage('preparing');
      if (selectedRail === 'lifi') {
        const chainConfig = CHAIN_CONFIG[selectedToken.chain];
        const fromAddress = selectedPaymentWalletAddress;
        if (!chainConfig || !fromAddress || !selectedEvmSignerWallet?.address) {
          throw new Error('Wallet not ready');
        }

        const prepared = await prepareCheckoutLifiTransaction(
          intent.intentId,
          {
            fromAddress,
            fromChain: chainConfig.id,
            fromToken: getLifiTokenAddressForCheckout(selectedToken),
            tokenDecimals: selectedToken.decimals ?? 18,
            tokenAmount,
          },
          accessToken || ''
        );
        setQuoteSummary(prepared.quote || null);
        const hash = await executeLifiTransaction(
          prepared.transactionRequest,
          prepared.quote?.approvalAddress
        );
        setTransactionHash(hash);

        setStage('confirming');
        const result = await pollLifiSettlement(hash);
        if (result.intent) setIntent(result.intent);
        if (result.settlementStatus === 'pending_payment') {
          toast.success('Payment sent. Settlement is still confirming.');
        } else {
          toast.success('Payment sent');
        }
        setStage('completed');
        return;
      }

      if (!selectedSolanaSignerWallet?.address) {
        throw new Error('Solana wallet not ready');
      }

      const prepared = await prepareCheckoutTransaction(
        intent.intentId,
        {
          fromAddress: selectedSolanaSignerWallet.address,
          tokenMint: tokenMintForCheckout(selectedToken),
          tokenDecimals: selectedToken.decimals ?? 9,
          tokenAmount,
        },
        accessToken || ''
      );
      setQuoteSummary(prepared.quote || null);

      // Sponsored relay contract (backend 16bc5bef): prepare freezes the
      // amounts, then the backend rebuilds the transfer and has Privy sign
      // it with the buyer's wallet, sponsoring gas from its fee-payer pool.
      // The user's Privy access token is what authorizes the sign — no
      // on-device signature.
      setStage('signing');
      const privyAccessToken = await getAccessToken().catch(() => null);
      if (!privyAccessToken) {
        throw new Error('Your session expired. Sign in again to pay.');
      }

      setStage('confirming');
      const result = await submitCheckoutTransaction(
        intent.intentId,
        { privyAccessToken },
        accessToken || ''
      );

      setTransactionHash(result.transactionHash || '');
      if (result.intent) setIntent(result.intent);
      setStage('completed');
      toast.success('Payment sent');
    } catch (payError) {
      const message = humanizeCheckoutError(payError, 'Payment failed');
      setError(message);
      setStage('failed');
      toast.error(message);
    }
  };

  const loading = stage === 'loading';
  const busy = ['preparing', 'signing', 'confirming'].includes(stage);
  const paymentDisabledReason = (() => {
    if (busy) return '';
    if (tokenAmountLoading) return 'Getting a live quote...';
    if (tokenAmountQuoteError) return tokenAmountQuoteError;
    if (!selectedToken) return 'Select a token to continue.';
    if (!tokenAmount) return 'Payment amount is still loading.';
    if (!hasSufficientBalance) {
      return insufficientBalanceCopy(selectedToken, tokenAmount);
    }
    if (!accessToken) return 'Sign in again to authorize payment.';
    if (needsSolanaSigner) {
      return selectedToken?.walletAddress
        ? `Sign in with passkey, email, or SMS to restore ${truncateWalletAddress(
            selectedToken.walletAddress
          )} and pay with this Solana token.`
        : 'Sign in with passkey, email, or SMS to restore your Solana Swop wallet.';
    }
    if (needsEvmSigner) {
      return selectedToken?.walletAddress
        ? `Sign in with passkey, email, or SMS, or connect ${truncateWalletAddress(
            selectedToken.walletAddress
          )} to pay with this token.`
        : 'Sign in with passkey, email, or SMS, or connect an EVM wallet to pay with this token.';
    }
    return '';
  })();
  const supplementalPaymentIssue =
    paymentDisabledReason &&
    !tokenAmountQuoteError &&
    !(selectedToken && tokenAmount && !hasSufficientBalance)
      ? paymentDisabledReason
      : '';
  const paymentDisabled =
    busy ||
    tokenAmountLoading ||
    Boolean(tokenAmountQuoteError) ||
    !selectedToken ||
    !tokenAmount ||
    !hasSufficientBalance ||
    !accessToken ||
    !selectedSignerReady;
  const amountDueValue =
    checkoutAmounts?.totalDueAmount ?? intent?.amount.value ?? 0;
  const amountDueCurrency =
    intent?.amount.currency || intent?.merchantCurrency.symbol || 'USDC';
  const itemLabel = checkoutItemLabel(intent);
  const merchantName = intent?.merchant.name || 'Swop Pay';
  const merchantInitial = merchantName.trim().charAt(0).toUpperCase() || 'S';
  const tokenPaymentText =
    tokenAmountLoading
      ? 'quoting...'
      : selectedToken && tokenAmount
      ? `${formatTokenQuantity(tokenAmount)} ${selectedToken.symbol}`
      : '--';
  const checkoutFeeText = checkoutFeeLabel(checkoutAmounts);
  const royaltyRecipientNames = Array.from(
    new Set(
      (intent?.lineItems || [])
        .filter((item) => Number(item.royalty?.amount || 0) > 0)
        .map((item) => item.royalty?.name || item.royalty?.ens || '')
        .filter(Boolean)
    )
  );
  const royaltyRowLabel =
    royaltyRecipientNames.length === 1
      ? `Creator royalty · ${royaltyRecipientNames[0]}`
      : 'Creator royalty';
  const tokenBalanceText = selectedToken
    ? formatTokenQuantity(selectedToken.balance)
    : '--';
  const selectedTokenChainName =
    selectedToken && (CHAIN_CONFIG[selectedToken.chain]?.name || selectedToken.chain);

  if (scanMethod === 'swop') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#e9e6df] text-[#090a0d]">
        <div
          className="absolute inset-0 opacity-70 blur-[2px]"
          aria-hidden="true"
        >
          <div className="mx-auto mt-12 w-full max-w-5xl px-6">
            <div className="h-8 w-32 rounded bg-white/70" />
            <div className="mt-16 h-20 rounded-lg bg-white/65 shadow-sm" />
            <div className="mt-5 h-64 rounded-lg bg-white/55 shadow-sm" />
          </div>
        </div>
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

        <section className="fixed inset-x-0 bottom-0 z-10 mx-auto max-h-[94vh] w-full overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px]">
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#d9d9d9] sm:hidden" />
          <header className="flex items-center justify-between gap-4 border-b border-[#ececec] px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#06140d] text-lg font-black text-[#21c765]">
                {merchantInitial}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-normal">
                  {merchantName}
                </h1>
                <p className="mt-1 flex items-center gap-2 truncate font-mono text-xs font-semibold lowercase text-[#9aa0aa]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18b85b]" />
                  secure checkout · swop pay
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#e3e3e3] bg-[#f7f7f7] text-[#8a8f99] transition hover:border-[#d3d3d3] hover:text-[#101114]"
              aria-label="Close checkout"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center gap-3 px-8 text-sm font-semibold text-[#6d7480]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading checkout...
            </div>
          ) : !intent ? (
            <div className="px-8 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff5f5] text-[#b42318]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">
                Checkout unavailable
              </h2>
              <p className="mt-2 text-sm text-[#6d7480]">
                This payment request could not be loaded.
              </p>
            </div>
          ) : SUCCESS_STATUSES.has(intent.status) || stage === 'completed' ? (
            <div className="px-8 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f8ee] text-[#16a34a]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Payment complete</h2>
              <p className="mt-2 text-sm text-[#6d7480]">
                {statusCopy(intent)}
              </p>
              {(transactionHash || intent.payment?.txHash) && (
                <a
                  href={explorerUrlForToken(
                    selectedToken,
                    transactionHash || intent.payment?.txHash || ''
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#101114] px-5 text-sm font-semibold text-white"
                >
                  View transaction
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : !payable ? (
            <div className="px-8 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f5] text-[#737b8c]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">
                Checkout {statusCopy(intent).toLowerCase()}
              </h2>
              <p className="mt-2 text-sm text-[#6d7480]">
                This checkout cannot accept another payment.
              </p>
            </div>
          ) : (
            <div className="px-6 py-8 sm:px-8">
              <div className="text-center">
                <p className="font-mono text-xs font-semibold uppercase text-[#a0a7b2]">
                  Amount due
                </p>
                <p className="mt-3 text-[56px] font-semibold leading-none tracking-normal sm:text-[72px]">
                  {formatCheckoutTotal(amountDueValue, amountDueCurrency)}
                </p>
                <p className="mt-4 font-mono text-sm font-semibold text-[#7b8491]">
                  ≈ {tokenPaymentText}
                  {selectedToken ? ` · ${tokenUnitPriceLabel(selectedToken)}` : ''}
                </p>
              </div>

              <div className="relative mt-8">
                <button
                  type="button"
                  onClick={() => setTokenMenuOpen((open) => !open)}
                  disabled={checkoutTokensLoading}
                  className="flex min-h-[84px] w-full items-center justify-between gap-4 rounded-2xl border border-[#dedede] bg-[#f6f6f5] px-5 py-4 text-left shadow-sm transition hover:border-[#cfcfcf] disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    {selectedToken?.logoURI ? (
                      <Image
                        src={sanitizeNextImageSrc(selectedToken.logoURI)}
                        alt={selectedToken.symbol || 'Token'}
                        width={52}
                        height={52}
                        className="h-[52px] w-[52px] flex-shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-[#36c98b] text-xl font-black text-white">
                        {(selectedToken?.symbol || 'S').charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold uppercase text-[#a0a7b2]">
                        Pay with
                      </span>
                      <span className="mt-1 block truncate text-xl font-semibold">
                        {checkoutTokensLoading
                          ? 'Loading...'
                          : selectedToken?.symbol || 'Select token'}
                      </span>
                      {selectedTokenWalletLabel ? (
                        <span className="mt-1 block truncate font-mono text-[11px] font-semibold text-[#7b8491]">
                          {selectedTokenWalletLabel}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-right font-mono">
                      <span className="block text-xs font-semibold text-[#7b8491]">
                        balance
                      </span>
                      <span className="mt-1 block text-sm font-bold text-[#17191d]">
                        {tokenBalanceText}
                      </span>
                    </span>
                    <ChevronDown className="h-5 w-5 text-[#9aa0aa]" />
                  </span>
                </button>

                {tokenMenuOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-[#e1e1e1] bg-white p-2 shadow-2xl">
                    {checkoutTokensLoading ? (
                      <div className="flex items-center gap-3 px-3 py-5 text-sm font-semibold text-[#6d7480]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading balances...
                      </div>
                    ) : payableTokens.length === 0 ? (
                      <p className="px-3 py-5 text-sm font-semibold text-[#6d7480]">
                        No funded supported tokens found in connected wallets.
                      </p>
                    ) : (
                      payableTokens.map((token) => {
                        const isSelected =
                          selectedToken?.address === token.address &&
                          selectedToken?.symbol === token.symbol &&
                          selectedToken?.chain === token.chain &&
                          selectedToken?.walletAddress === token.walletAddress;
                        return (
                          <button
                            key={`${token.chain}-${token.walletAddress || ''}-${
                              token.symbol
                            }-${token.address || 'native'}`}
                            type="button"
                            onClick={() => {
                              setTokenSelectionTouched(true);
                              setSelectedToken(token);
                              setTokenMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                              isSelected ? 'bg-[#eefbf3]' : 'hover:bg-[#f6f6f5]'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {token.logoURI ? (
                                <Image
                                  src={sanitizeNextImageSrc(token.logoURI)}
                                  alt={token.symbol || ''}
                                  width={36}
                                  height={36}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#36c98b] text-sm font-black text-white">
                                  {(token.symbol || '?').charAt(0)}
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {token.symbol}
                                </span>
                                <span className="block truncate text-xs font-medium text-[#7b8491]">
                                  {CHAIN_CONFIG[token.chain]?.name || token.chain}
                                  {token.walletAddress
                                    ? ` · ${truncateWalletAddress(
                                        token.walletAddress
                                      )}`
                                    : ''}
                                </span>
                              </span>
                            </span>
                            <span className="text-right font-mono text-sm font-bold">
                              {formatTokenQuantity(token.balance)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <dl className="mt-6 space-y-4 font-mono text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#7b8491]">Item</dt>
                  <dd className="min-w-0 truncate text-right font-bold">
                    {itemLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#7b8491]">Pay amount</dt>
                  <dd className="text-right font-bold">{tokenPaymentText}</dd>
                </div>
                {checkoutAmounts ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#7b8491]">{checkoutFeeText}</dt>
                    <dd className="text-right font-bold">
                      {formatCurrency(
                        checkoutAmounts.platformFeeAmount,
                        amountDueCurrency
                      )}
                    </dd>
                  </div>
                ) : null}
                {checkoutAmounts && checkoutAmounts.royaltyAmount > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-[#7b8491]">{royaltyRowLabel}</dt>
                    <dd className="text-right font-bold">
                      {formatCurrency(
                        checkoutAmounts.royaltyAmount,
                        amountDueCurrency
                      )}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#7b8491]">Network fee</dt>
                  <dd className="flex items-center justify-end gap-2 text-right">
                    <span className="text-[#a4aab4] line-through">$0.02</span>
                    <span className="rounded-lg bg-[#e6f7ec] px-2 py-1 text-[10px] font-black uppercase text-[#18a957]">
                      Sponsored
                    </span>
                  </dd>
                </div>
              </dl>

              {selectedToken && tokenAmount && !hasSufficientBalance ? (
                <div className="mt-5 rounded-2xl border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
                  {insufficientBalanceCopy(selectedToken, tokenAmount)}
                </div>
              ) : null}

              {tokenAmountQuoteError ? (
                <div className="mt-5 rounded-2xl border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
                  {tokenAmountQuoteError}
                </div>
              ) : null}

              {error ? (
                <div className="mt-5 rounded-2xl border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b42318]">
                  {error}
                </div>
              ) : null}

              {supplementalPaymentIssue ? (
                <div className="mt-5 rounded-2xl border border-[#dce5f5] bg-[#f5f8ff] px-4 py-3 text-sm font-semibold text-[#4b5870]">
                  {supplementalPaymentIssue}
                </div>
              ) : null}

              {!ready || !authenticated ? (
                <button
                  type="button"
                  onClick={handleUsePasskeyWallet}
                  disabled={!ready || walletRestoreBusy}
                  className="mt-6 inline-flex h-16 w-full items-center justify-center rounded-2xl bg-[#18a957] px-5 text-base font-bold text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {walletRestoreBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {walletRestoreLabel}
                </button>
              ) : needsSignerRestore ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleUsePasskeyWallet}
                    disabled={walletRestoreBusy}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#18a957] px-4 text-sm font-bold text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  >
                    {walletRestoreBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    {walletRestoreLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={connectingWallet}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe4eb] bg-white px-4 text-sm font-bold text-[#101114] transition hover:border-[#c8d0dc] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  >
                    {connectingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect external wallet
                  </button>
                </div>
              ) : !solanaWallet && evmSignerWalletAddresses.length === 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleUsePasskeyWallet}
                    disabled={walletRestoreBusy}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#18a957] px-4 text-sm font-bold text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {walletRestoreBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    {walletRestoreLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={connectingWallet}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe4eb] bg-white px-4 text-sm font-bold text-[#101114] transition hover:border-[#c8d0dc] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connectingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect wallet
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paymentDisabled}
                  className="mt-6 inline-flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[#18a957] px-5 text-base font-bold text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? 'Confirming...' : confirmPaymentLabel}
                </button>
              )}

              {stage !== 'idle' && stage !== 'failed' ? (
                <p className="mt-4 text-center text-xs font-semibold text-[#7b8491]">
                  {stage === 'preparing' && 'Preparing Swop Pay...'}
                  {stage === 'signing' && 'Waiting for wallet signature...'}
                  {stage === 'confirming' && 'Confirming payment...'}
                </p>
              ) : null}

              <p className="mt-5 text-center font-mono text-xs font-semibold lowercase text-[#a0a7b2]">
                swop covers gas · settles in ~2s on{' '}
                {selectedTokenChainName || 'solana'}
              </p>
            </div>
          )}
        </section>

        {copyFallback ? (
          <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-2xl rounded-lg border border-[#dfe4eb] bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#101114]">
                  Copy manually
                </p>
                <p className="mt-1 text-xs text-[#737b8c]">
                  Browser clipboard access was blocked, so the value is
                  selected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyFallback('')}
                className="inline-flex h-8 items-center justify-center rounded-md border border-[#dfe4eb] px-3 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                ref={copyFallbackInputRef}
                readOnly
                value={copyFallback}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 min-w-0 flex-1 rounded-md border border-[#dfe4eb] px-3 font-mono text-xs font-semibold outline-none focus:border-[#101114]"
              />
              <button
                type="button"
                onClick={() => {
                  copyFallbackInputRef.current?.focus();
                  copyFallbackInputRef.current?.select();
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
              >
                Select
              </button>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f9] px-4 py-6 text-[#101114] sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dde1e6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6574]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Swop Pay
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#101114]">
                {loading
                  ? 'Loading checkout'
                  : intent?.description || 'Checkout payment'}
              </h1>
              <p className="mt-2 text-sm text-[#646b78]">
                {intent?.merchant.name || 'Merchant'} receives{' '}
                {intent
                  ? formatCurrency(
                      getCheckoutAmounts(intent).merchantReceivesAmount,
                      intent.merchantCurrency.symbol
                    )
                  : 'USDC'}.
              </p>
            </div>
            <div className="min-w-[180px] rounded-md border border-[#eceef2] bg-[#fafafa] p-3 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                Amount due
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {intent
                  ? formatCurrency(
                      getCheckoutAmounts(intent).totalDueAmount,
                      intent.amount.currency
                    )
                  : '--'}
              </p>
              <p className="mt-2 text-xs font-medium text-[#5d6574]">
                {statusCopy(intent)}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] p-3 text-sm text-[#b42318]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && intent?.lineItems && intent.lineItems.length > 0 && (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#101114]">
                Order
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                {intent.lineItems.length}{' '}
                {intent.lineItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="mt-3 divide-y divide-[#edf0f3]">
              {intent.lineItems.map((item) => (
                <div
                  key={`${item.productId || item.templateId || item.name}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.image ? (
                      <Image
                        src={sanitizeNextImageSrc(item.image)}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#f0f2f5]">
                        <Package className="h-4 w-4 text-[#737b8c]" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-[#737b8c]">
                        {item.quantity} x{' '}
                        {formatCurrency(item.unitAmount, item.currency)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(item.totalAmount, item.currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && intent?.paymentRequest?.url && payable && scanMethod === 'phantom' && (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto rounded-lg border border-[#dfe4eb] bg-white p-3 shadow-sm">
                <QRCodeSVG
                  value={scanQrValue || intent.paymentRequest.url}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#101114"
                  level="M"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                      Scan to pay
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Pay with Phantom
                    </h2>
                  </div>
                  <div className="inline-flex rounded-md border border-[#dde1e6] bg-[#fafafa] p-1">
                    <button
                      type="button"
                      onClick={() => setScanMethod('swop')}
                      className="h-8 rounded px-3 text-xs font-semibold text-[#737b8c] transition"
                    >
                      Swop Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMethod('phantom')}
                      className={`h-8 rounded px-3 text-xs font-semibold transition ${
                        scanMethod === 'phantom'
                          ? 'bg-white text-[#5f4acb] shadow-sm'
                          : 'text-[#737b8c]'
                      }`}
                    >
                      Phantom
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Scan or open the link to launch the Phantom browser, connect the wallet,
                  and approve the requested amount.
                </p>
                <div className="mt-4 rounded-md border border-[#edf0f3] bg-[#fbfcfd] p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#737b8c]">Recipient</span>
                    <span className="font-semibold">
                      {intent.paymentRequest.recipientRole === 'merchant'
                        ? 'Merchant wallet'
                        : 'Swop settlement wallet'}
                    </span>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-[#737b8c]">
                    Ref {intent.paymentRequest.reference}
                  </p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleOpenPhantom}
                    disabled={!phantomCheckoutUrl}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#5f4acb] px-3 text-sm font-semibold text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PhantomMark className="h-5 w-5" />
                    Open Phantom
                  </button>
                  <button
                    type="button"
                    onClick={copyScanLink}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa]"
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={copySolanaPayUri}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 text-sm font-semibold text-[#303642] transition hover:border-[#c8d0dc] hover:bg-[#f7f8fa] sm:col-span-2"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedPayUri ? 'Copied' : 'Copy Solana Pay URI'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-6">
            <div className="flex items-center gap-3 text-sm text-[#646b78]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading checkout...
            </div>
          </section>
        ) : !intent ? null : SUCCESS_STATUSES.has(intent.status) ||
          stage === 'completed' ? (
          <section className="rounded-lg border border-[#d8f5e4] bg-white p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6 flex-shrink-0 text-[#16a34a]" />
              <div>
                <h2 className="text-lg font-semibold">Payment complete</h2>
                <p className="mt-1 text-sm text-[#646b78]">
                  Settlement status: {statusCopy(intent)}
                </p>
                {(transactionHash || intent.payment?.txHash) && (
                  <a
                    href={explorerUrlForToken(
                      selectedToken,
                      transactionHash || intent.payment?.txHash || ''
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#101114] px-3 py-2 text-sm font-semibold text-white"
                  >
                    View transaction
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                {marketplaceOrderId && (
                  <a
                    href={`/order/${encodeURIComponent(marketplaceOrderId)}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#dfe4eb] bg-white px-3 py-2 text-sm font-semibold text-[#101114]"
                  >
                    View order
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </section>
        ) : !payable ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-[#737b8c]" />
              <div>
                <h2 className="text-lg font-semibold">
                  Checkout {statusCopy(intent).toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-[#646b78]">
                  This checkout cannot accept another payment.
                </p>
              </div>
            </div>
          </section>
        ) : !ready || !authenticated ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Pay your way
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Pay with Swop Pay
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Open this request in Swop or continue here to choose the
                  wallet that pays.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[760px] lg:grid-cols-4">
                <button
                  type="button"
                  onClick={handleOpenPhantom}
                  disabled={!phantomCheckoutUrl}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#5f4acb] bg-[#5f4acb] p-3 text-left text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    <PhantomMark className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Phantom
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Open wallet browser
                    </span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 flex-shrink-0 text-white/70" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenSwopApp}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#101114] text-white">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Open Swop app
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Use your Swop wallet
                    </span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 flex-shrink-0 text-[#8b93a3]" />
                </button>
                <button
                  type="button"
                  onClick={handleInstallSwopApp}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#f0f2f5] text-[#101114]">
                    <Download className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Get Swop app
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Install, then reopen
                    </span>
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 flex-shrink-0 text-[#8b93a3]" />
                </button>
                <button
                  type="button"
                  onClick={handleUsePasskeyWallet}
                  disabled={!ready || walletRestoreBusy}
                  className="flex min-h-[84px] items-center gap-3 rounded-md border border-[#101114] bg-[#101114] p-3 text-left text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    {walletRestoreBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {walletRestoreLabel}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Restore Swop wallet
                    </span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-white/70" />
                </button>
              </div>
            </div>
          </section>
        ) : needsSignerRestore ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Wallet selection
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Sign in to your Swop wallet
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Use passkey, email, or SMS to restore your Swop wallet for{' '}
                  {selectedToken?.walletAddress
                    ? truncateWalletAddress(selectedToken.walletAddress)
                    : selectedRail === 'solana'
                    ? 'your Solana wallet'
                    : 'an EVM wallet'}
                  , or connect that exact wallet externally.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[440px]">
                <button
                  type="button"
                  onClick={handleUsePasskeyWallet}
                  disabled={walletRestoreBusy}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#18a957] bg-[#18a957] p-3 text-left text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    {walletRestoreBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {walletRestoreLabel}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Restore Swop wallet
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={connectingWallet}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#f0f2f5] text-[#101114]">
                    {connectingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Connect external wallet
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Select the funded wallet
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        ) : !solanaWallet && evmSignerWalletAddresses.length === 0 ? (
          <section className="rounded-lg border border-[#e7e8ec] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b8c]">
                  Wallet selection
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Choose a wallet to pay
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#646b78]">
                  Sign in with passkey, email, or SMS to restore your Swop
                  wallet, or connect an external wallet as a fallback.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-[640px]">
                <button
                  type="button"
                  onClick={handleUsePasskeyWallet}
                  disabled={!ready || walletRestoreBusy}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#18a957] bg-[#18a957] p-3 text-left text-white transition hover:bg-[#13964c] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    {walletRestoreBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {walletRestoreLabel}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Restore Swop wallet
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPhantom}
                  disabled={!phantomCheckoutUrl}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#5f4acb] bg-[#5f4acb] p-3 text-left text-white transition hover:bg-[#523db8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    <PhantomMark className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Phantom</span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Open provider
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={connectingWallet}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#101114] bg-[#101114] p-3 text-left text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                    {connectingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Connect wallet
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/70">
                      Select an external wallet
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateWallet}
                  disabled={creatingWallet}
                  className="flex min-h-[76px] items-center gap-3 rounded-md border border-[#dde1e6] bg-white p-3 text-left transition hover:border-[#101114] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#f0f2f5] text-[#101114]">
                    {creatingWallet ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#101114]">
                      Create embedded wallet
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#737b8c]">
                      Backup wallet setup
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-[#e7e8ec] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Choose wallet</h2>
                  <p className="mt-1 text-xs font-medium text-[#737b8c]">
                    {selectedToken?.walletAddress || solanaWallet?.address
                      ? `Wallet ${truncateWalletAddress(
                          selectedToken?.walletAddress ||
                            solanaWallet?.address ||
                            ''
                        )}`
                      : 'Choose a funded wallet balance'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-9 w-10 items-center justify-center self-start rounded-md border border-[#dde1e6] px-3 text-sm font-semibold text-[#303642] sm:w-auto sm:self-auto"
                  title="Refresh balances"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 inline-flex rounded-md border border-[#dde1e6] bg-[#fafafa] p-1">
                {[
                  ['all', 'All'],
                  ['solana', 'Solana'],
                  ['evm', 'Other chains'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRailFilter(value as RailFilter);
                      setSelectedToken(null);
                    }}
                    className={`h-8 rounded px-3 text-xs font-semibold ${
                      railFilter === value
                        ? 'bg-white text-[#101114] shadow-sm'
                        : 'text-[#737b8c]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a3]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search wallet or token"
                  className="h-10 w-full rounded-md border border-[#dde1e6] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#101114]"
                />
              </div>

              <div className="mt-3 max-h-[420px] overflow-y-auto">
                {checkoutTokensLoading ? (
                  <div className="flex items-center gap-3 py-8 text-sm text-[#646b78]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tokens...
                  </div>
                ) : payableTokens.length === 0 ? (
                  <p className="py-8 text-sm text-[#646b78]">
                    No supported tokens found for this filter.
                  </p>
                ) : (
                  <div className="divide-y divide-[#edf0f3]">
                    {payableTokens.map((token) => {
                      const isSelected =
                        selectedToken?.address === token.address &&
                        selectedToken?.symbol === token.symbol &&
                        selectedToken?.chain === token.chain &&
                        selectedToken?.walletAddress === token.walletAddress;
                      return (
                        <button
                          key={`${token.chain}-${token.walletAddress || ''}-${
                            token.symbol
                          }-${token.address || 'native'}`}
                          type="button"
                          onClick={() => {
                            setTokenSelectionTouched(true);
                            setSelectedToken(token);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition ${
                            isSelected ? 'bg-[#f4fff8]' : 'hover:bg-[#fafafa]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {token.logoURI ? (
                              <Image
                                src={sanitizeNextImageSrc(token.logoURI)}
                                alt={token.symbol || ''}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <span className="h-8 w-8 rounded-full bg-[#eceef2]" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {token.symbol}
                              </p>
                              <p className="truncate text-xs text-[#737b8c]">
                                {token.name} ·{' '}
                                {CHAIN_CONFIG[token.chain]?.name || token.chain}
                                {token.walletAddress
                                  ? ` · ${truncateWalletAddress(token.walletAddress)}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {Number(token.balance || 0).toFixed(4)}
                            </p>
                            <p className="text-xs text-[#737b8c]">
                              {Number(token.marketData?.price || 0) > 0
                                ? `$${Number(token.marketData?.price).toFixed(4)}`
                                : 'Quoted at payment'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-lg border border-[#e7e8ec] bg-white p-4">
              <h2 className="text-lg font-semibold">Review</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Merchant</dt>
                  <dd className="font-semibold">{intent.merchant.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Receives</dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.merchantReceivesAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">{checkoutFeeText}</dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.platformFeeAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                {checkoutAmounts && checkoutAmounts.royaltyAmount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#737b8c]">{royaltyRowLabel}</dt>
                    <dd className="font-semibold">
                      {formatCurrency(
                        checkoutAmounts.royaltyAmount,
                        intent.merchantCurrency.symbol
                      )}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-[#edf0f3] pt-3">
                  <dt className="font-semibold text-[#303642]">Total due</dt>
                  <dd className="font-semibold">
                    {formatCurrency(
                      checkoutAmounts?.totalDueAmount,
                      intent.merchantCurrency.symbol
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">You pay</dt>
                  <dd className="font-semibold">
                    {tokenAmountLoading
                      ? 'Quoting...'
                      : selectedToken && tokenAmount
                      ? `${tokenAmount} ${selectedToken.symbol}`
                      : '--'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#737b8c]">Payment</dt>
                  <dd className="font-semibold">
                    {selectedRail === 'lifi'
                      ? 'Same-network USDC'
                      : 'Solana USDC'}
                  </dd>
                </div>
              </dl>

              {quoteSummary?.minOutputAmount ? (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  Merchant minimum:{' '}
                  {formatCurrency(
                    quoteSummary.requiredSettlementAmount ||
                      quoteSummary.minOutputAmount,
                    intent.merchantCurrency.symbol
                  )}
                  {quoteSummary.destinationChain
                    ? ` on ${chainNameById(quoteSummary.destinationChain)}`
                    : ''}
                  . Quote minimum:{' '}
                  {formatCurrency(
                    quoteSummary.minOutputAmount,
                    intent.merchantCurrency.symbol
                  )}
                </div>
              ) : null}

              {tokenAmountLoading && selectedToken ? (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  Getting a payout-safe {selectedToken.symbol} quote...
                </div>
              ) : null}

              {tokenAmountQuoteError ? (
                <div className="mt-4 rounded-md border border-[#ffd0d0] bg-[#fff5f5] p-3 text-xs font-medium text-[#b42318]">
                  {tokenAmountQuoteError}
                </div>
              ) : null}

              {selectedToken && tokenAmount && !hasSufficientBalance && (
                <div className="mt-4 rounded-md border border-[#ffd0d0] bg-[#fff5f5] p-3 text-xs font-medium text-[#b42318]">
                  {insufficientBalanceCopy(selectedToken, tokenAmount)}
                </div>
              )}

              {stage !== 'idle' && stage !== 'failed' && (
                <div className="mt-4 rounded-md border border-[#dde1e6] bg-[#fafafa] p-3 text-xs font-medium text-[#646b78]">
                  {stage === 'preparing' && 'Preparing Swop Pay...'}
                  {stage === 'signing' && 'Waiting for wallet signature...'}
                  {stage === 'confirming' && 'Confirming payment...'}
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={paymentDisabled}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101114] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? 'Confirming...' : confirmPaymentLabel}
              </button>
            </aside>
          </section>
        )}
      </div>
      {copyFallback ? (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-2xl rounded-lg border border-[#dfe4eb] bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#101114]">
                Copy manually
              </p>
              <p className="mt-1 text-xs text-[#737b8c]">
                Browser clipboard access was blocked, so the value is selected.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCopyFallback('')}
              className="inline-flex h-8 items-center justify-center rounded-md border border-[#dfe4eb] px-3 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              ref={copyFallbackInputRef}
              readOnly
              value={copyFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-md border border-[#dfe4eb] px-3 font-mono text-xs font-semibold outline-none focus:border-[#101114]"
            />
            <button
              type="button"
              onClick={() => {
                copyFallbackInputRef.current?.focus();
                copyFallbackInputRef.current?.select();
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#101114] px-4 text-sm font-semibold text-white"
            >
              Select
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
