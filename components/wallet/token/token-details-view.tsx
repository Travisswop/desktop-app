'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  Bell,
  DollarSign,
  Plus,
  Repeat2,
  Send,
  Star,
} from 'lucide-react';
import { TokenData, ChainType } from '@/types/token';
import { Transaction } from '@/types/transaction';
import { BentoCard, Chip } from '@/components/ui/bento';
import TokenImage from './token-image';
import { useUser } from '@/lib/UserContext';
import CustomModal from '@/components/modal/CustomModal';
import GetQrCodeUsingWalletAddress from '../QRCode/GetQrCodeUsingWalletAddress';
import {
  useMultiChainTokenData,
} from '@/lib/hooks/useToken';
import { useMultiChainTransactionData } from '@/lib/hooks/useTransaction';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useFundWallet } from '@privy-io/react-auth/solana';
import {
  useWalletAddresses,
  useWalletData,
} from '../hooks/useWalletData';
import { SUPPORTED_CHAINS } from '../constants';
import SwapTokenModal from '../SwapTokenModal';
import { useTokenChartData } from '@/lib/hooks/useTokenChartData';
import { resolveSwapBalanceSolanaWalletAddress } from '@/lib/wallet/swapWalletSelection';

const POS_GREEN = '#19a974';
const POS_GREEN_SOFT = 'rgba(25,169,116,0.10)';
const NEG_RED = '#e5484d';
const HAIR = 'rgba(0,0,0,0.06)';
const HAIR_2 = 'rgba(0,0,0,0.04)';
const SURFACE_2 = '#fafafa';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const PERIODS = ['1D', '1W', '1M', '1Y'] as const;
type Period = (typeof PERIODS)[number];
type ChartPoint = { timestamp: number; value: number };

const PERIOD_MS: Record<Period, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
};

const TX_FILTERS = ['All', 'Sends', 'Receives', 'Swaps'] as const;
type TxFilter = (typeof TX_FILTERS)[number];

const CHAIN_TAGS: Record<string, string> = {
  ETHEREUM: 'ERC-20',
  POLYGON: 'POLYGON',
  BASE: 'BASE',
  ARBITRUM: 'ARB',
  SOLANA: 'SPL',
};

const normalizeChain = (chain: string): ChainType =>
  chain.toUpperCase() as ChainType;

const tokenSymbolAliases = (symbol?: string, chain?: string) => {
  const normalized = symbol?.toUpperCase();
  if (!normalized) return new Set<string>();
  const aliases = new Set([normalized]);

  if (
    chain?.toUpperCase() === 'POLYGON' &&
    (normalized === 'MATIC' || normalized === 'POL')
  ) {
    aliases.add('MATIC');
    aliases.add('POL');
  }

  return aliases;
};

// SOL-style gradient avatars per chain — matches the G5 reference look.
const TOKEN_AVATAR_BG: Record<string, string> = {
  SOLANA: 'linear-gradient(135deg,#9945FF,#14F195)',
  ETHEREUM: 'linear-gradient(135deg,#3C3C3D,#8A92B2)',
  POLYGON: 'linear-gradient(135deg,#8247E5,#A06FF6)',
  BASE: 'linear-gradient(135deg,#0052FF,#85B0FF)',
  ARBITRUM: 'linear-gradient(135deg,#12AAFF,#28A0F0)',
};

const formatUsd = (n: number, frac = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const formatPriceLabel = (
  price: string | number | null | undefined,
) => {
  if (price == null || price === '') return '—';
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1) return `$${formatUsd(n, 2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
};

const formatLargeNumber = (
  raw: number | string | null | undefined,
  prefix = '',
) => {
  if (raw == null || raw === '') return '—';
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${prefix}${(n / 1e3).toFixed(2)}K`;
  return `${prefix}${n.toFixed(2)}`;
};

const truncateAddr = (addr: string | undefined | null) => {
  if (!addr) return '';
  if (addr.length < 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

const formatTxWhen = (timeStamp: string | number) => {
  const ts =
    typeof timeStamp === 'string' ? parseInt(timeStamp, 10) : timeStamp;
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
};

const normalizeChartPoints = (
  points: Array<Partial<ChartPoint>> | null | undefined,
): ChartPoint[] => {
  if (!points?.length) return [];

  return points
    .map((point) => {
      const timestamp =
        typeof point.timestamp === 'number'
          ? point.timestamp
          : parseFloat(String(point.timestamp ?? 'NaN'));
      const value =
        typeof point.value === 'number'
          ? point.value
          : parseFloat(String(point.value ?? 'NaN'));

      return Number.isFinite(timestamp) && Number.isFinite(value)
        ? { timestamp, value }
        : null;
    })
    .filter((point): point is ChartPoint => Boolean(point));
};

const sparklineToChartPoints = (
  values: unknown,
  period: Period,
): ChartPoint[] => {
  if (!Array.isArray(values) || values.length < 2) return [];

  const numericValues = values
    .map((value) =>
      typeof value === 'number'
        ? value
        : parseFloat(String(value ?? 'NaN')),
    )
    .filter((value) => Number.isFinite(value));

  if (numericValues.length < 2) return [];

  const end = Date.now();
  const span = PERIOD_MS[period];
  const step = span / (numericValues.length - 1);

  return numericValues.map((value, index) => ({
    timestamp: end - span + step * index,
    value,
  }));
};

const fallbackChartDataForToken = (
  token: TokenData,
  period: Period,
): ChartPoint[] => {
  const periodData = normalizeChartPoints(token.timeSeriesData?.[period]);
  if (periodData.length >= 2) return periodData;

  if (period !== '1D') return [];

  const tokenSparkline = normalizeChartPoints(token.sparklineData);
  if (tokenSparkline.length >= 2) return tokenSparkline;

  return sparklineToChartPoints(
    (token.marketData as { sparkline?: unknown } | null)?.sparkline,
    period,
  );
};

interface TokenDetailsProps {
  token: TokenData;
  onBack: () => void;
  onSend: (arg0: TokenData) => void;
}

// Chart hover tooltip — dark mono pill matching the G5 design.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const ts = label > 10000000000 ? label : label * 1000;
  return (
    <div
      className="px-2.5 py-1.5 rounded-lg text-white shadow-lg"
      style={{ background: '#0a0a0c', fontFamily: MONO }}
    >
      <div className="text-[10.5px] font-semibold opacity-80">
        {new Date(ts).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}
      </div>
      <div className="text-[12px] font-semibold">
        {formatPriceLabel(payload[0].value)}
      </div>
    </div>
  );
};

function Delta({
  value,
  big = false,
}: {
  value: string;
  big?: boolean;
}) {
  const positive =
    !String(value).startsWith('-') && !String(value).startsWith('−');
  const color = positive ? POS_GREEN : NEG_RED;
  const bg = positive ? POS_GREEN_SOFT : 'rgba(229,72,77,0.08)';
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold rounded-full"
      style={{
        background: bg,
        color,
        padding: big ? '4px 10px' : '2px 8px',
        fontSize: big ? 13 : 11,
        letterSpacing: -0.1,
      }}
    >
      <span style={{ fontSize: big ? 10 : 9 }}>
        {positive ? '▲' : '▼'}
      </span>
      {value}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase font-bold text-gray-500 tracking-[1.4px] text-[10.5px]">
      {children}
    </span>
  );
}

export default function TokenDetails({
  token,
  onBack,
  onSend,
}: TokenDetailsProps) {
  const { accessToken, user } = useUser();
  const { fundWallet } = useFundWallet();
  const { wallets: solanaWallets } = useSolanaWallets();
  const isMarketOnly = Boolean(token.isMarketOnly);
  const marketId = token.marketData?.id || null;

  if (!accessToken) {
    throw new Error('No access token found');
  }

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1W');
  const fallbackChartData = useMemo(
    () => fallbackChartDataForToken(token, selectedPeriod),
    [token, selectedPeriod],
  );
  const [chartData, setChartData] = useState<ChartPoint[]>(
    () => fallbackChartDataForToken(token, '1W'),
  );
  const [changePercentage, setChangePercentage] = useState(
    token.marketData?.priceChangePercentage24h || '0',
  );
  const [openWalletQrOpen, setOpenWalletQrOpen] = useState(false);
  const [qrState, setQrState] = useState<
    'sol' | 'eth' | 'pol' | 'base'
  >('sol');
  const [openWalletSwapOpen, setOpenWalletSwapOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [txFilter, setTxFilter] = useState<TxFilter>('All');

  // Lazy-load chart data per period. Native tokens (SOL/ETH/MATIC/etc.)
  // pass `null` address; the hook maps those to CoinGecko IDs.
  const day = useTokenChartData(
    token.address,
    token.chain,
    '1D',
    selectedPeriod === '1D',
    accessToken,
    marketId,
  );
  const week = useTokenChartData(
    token.address,
    token.chain,
    '1W',
    selectedPeriod === '1W',
    accessToken,
    marketId,
  );
  const month = useTokenChartData(
    token.address,
    token.chain,
    '1M',
    selectedPeriod === '1M',
    accessToken,
    marketId,
  );
  const year = useTokenChartData(
    token.address,
    token.chain,
    '1Y',
    selectedPeriod === '1Y',
    accessToken,
    marketId,
  );

  const periodChangeNumeric = parseFloat(changePercentage || '0');
  const strokeColor = periodChangeNumeric >= 0 ? POS_GREEN : NEG_RED;
  const hasChartData = chartData.length >= 2;

  // Sync chart data + change percent + loading flag when period or query data changes.
  useEffect(() => {
    const timeSeriesMap = {
      '1D': day.data?.sparklineData || [],
      '1W': week.data?.sparklineData || [],
      '1M': month.data?.sparklineData || [],
      '1Y': year.data?.sparklineData || [],
    };
    const changeMap = {
      '1D': (day.data?.change as string) || '0',
      '1W': (week.data?.change as string) || '0',
      '1M': (month.data?.change as string) || '0',
      '1Y': (year.data?.change as string) || '0',
    };
    const loadingMap = {
      '1D': day.isLoading,
      '1W': week.isLoading,
      '1M': month.isLoading,
      '1Y': year.isLoading,
    };

    setIsLoading(loadingMap[selectedPeriod] || false);

    const newData = timeSeriesMap[selectedPeriod];
    const newChange = changeMap[selectedPeriod];
    if (newData && newData.length > 0) {
      setChartData(newData);
      setChangePercentage(newChange);
      return;
    }

    if (!loadingMap[selectedPeriod]) {
      setChartData(fallbackChartData);
      setChangePercentage(
        selectedPeriod === '1D'
          ? token.marketData?.priceChangePercentage24h ||
              token.marketData?.change ||
              newChange
          : newChange,
      );
    }
  }, [
    selectedPeriod,
    fallbackChartData,
    token.marketData?.change,
    token.marketData?.priceChangePercentage24h,
    day.data,
    day.isLoading,
    week.data,
    week.isLoading,
    month.data,
    month.isLoading,
    year.data,
    year.isLoading,
  ]);

  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const walletData = useWalletData(
    authenticated,
    ready,
    PrivyUser,
    user,
  );
  const { solWalletAddress, evmWalletAddress, evmWalletAddresses } =
    useWalletAddresses(walletData);
  const { tokens } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddresses.length ? evmWalletAddresses : evmWalletAddress,
    SUPPORTED_CHAINS,
  );

  // Pull this chain's transactions and filter to this token only.
  const tokenChain = useMemo(
    () => normalizeChain(token.chain),
    [token.chain],
  );
  const txChainList = useMemo<ChainType[]>(
    () => [tokenChain],
    [tokenChain],
  );
  const {
    transactions: rawTransactions,
    loading: txLoading,
    error: txError,
  } = useMultiChainTransactionData(
    solWalletAddress || '',
    evmWalletAddresses.length ? evmWalletAddresses : evmWalletAddress || '',
    txChainList,
    { limit: 200, offset: 0 },
  );

  const tokenTransactions = useMemo(() => {
    if (!rawTransactions) return [] as Transaction[];
    const symbolAliases = tokenSymbolAliases(token.symbol, token.chain);
    const addr = token.address?.toLowerCase();

    const symbolMatches = (symbol?: string) =>
      !!symbol && symbolAliases.has(symbol.toUpperCase());
    const addressMatches = (contractAddress?: string) =>
      !!addr &&
      !!contractAddress &&
      contractAddress.toLowerCase() === addr;
    const swapMatches = (tx: Transaction) => {
      if (!tx.swapped) return false;
      return (
        addressMatches(tx.swapped.from.contractAddress) ||
        addressMatches(tx.swapped.to.contractAddress) ||
        (!addr &&
          (symbolMatches(tx.swapped.from.symbol) ||
            symbolMatches(tx.swapped.to.symbol)))
      );
    };

    return rawTransactions.filter((tx) => {
      if (swapMatches(tx)) return true;
      if (addressMatches(tx.contractAddress)) return true;

      // Native tokens: tx has no contractAddress and matches the symbol.
      if (!addr && (!tx.contractAddress || tx.contractAddress === '')) {
        return symbolMatches(tx.tokenSymbol);
      }

      // Last-resort fallback for APIs that omit token contract metadata.
      return !addr && symbolMatches(tx.tokenSymbol);
    });
  }, [rawTransactions, token.symbol, token.address, token.chain]);

  const filteredTxs = useMemo(() => {
    const list = tokenTransactions.filter((tx) => {
      if (txFilter === 'All') return true;
      if (txFilter === 'Swaps') return !!tx.isSwapped;
      if (txFilter === 'Sends') return !tx.isSwapped && tx.flow === 'out';
      if (txFilter === 'Receives')
        return !tx.isSwapped && tx.flow === 'in';
      return true;
    });
    return list.slice(0, 50);
  }, [tokenTransactions, txFilter]);

  const handleWalletQrOpen = () => {
    const c = token.chain.toLowerCase();
    if (c === 'solana') setQrState('sol');
    else if (c === 'polygon') setQrState('pol');
    else if (c === 'base') setQrState('base');
    else setQrState('eth');
    setOpenWalletQrOpen(true);
  };

  const solanaWalletAddress = solanaWallets?.[0]?.address;
  const selectedSolanaWallet = useMemo(() => {
    if (!solWalletAddress) return undefined;
    const normalizedSelectedAddress =
      solWalletAddress.toLowerCase();
    return solanaWallets.find(
      (wallet) =>
        wallet.address?.toLowerCase() === normalizedSelectedAddress,
    );
  }, [solWalletAddress, solanaWallets]);
  const preferredSwapSolanaWalletAddress =
    resolveSwapBalanceSolanaWalletAddress({
      selectedWalletAddress: solWalletAddress,
      signableWalletAddress: selectedSolanaWallet?.address,
    });

  const handleWalletOptionsOpen = async () => {
    if (!solanaWalletAddress) {
      console.error('No wallet address available');
      return;
    }
    setIsLoading(true);
    try {
      await fundWallet({
        address: solanaWalletAddress,
        options: { asset: 'USDC', amount: '20' },
      });
    } catch (error) {
      console.error('Failed to open Coinbase funding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived values
  const balanceNum = parseFloat(token.balance || '0');
  const priceNum = token.marketData?.price
    ? parseFloat(token.marketData.price.toString())
    : 0;
  const usdValue = balanceNum * priceNum;
  const change24h = parseFloat(
    token.marketData?.priceChangePercentage24h || '0',
  );
  const pnl24h = useMemo(() => {
    if (!Number.isFinite(change24h) || !usdValue) return 0;
    const startValue = usdValue / (1 + change24h / 100);
    return usdValue - startValue;
  }, [change24h, usdValue]);

  const hiLo = useMemo(() => {
    if (!chartData?.length) return { high: null, low: null };
    let hi = -Infinity;
    let lo = Infinity;
    for (const p of chartData) {
      const v =
        typeof p.value === 'number'
          ? p.value
          : parseFloat(String(p.value ?? 'NaN'));
      if (!Number.isFinite(v)) continue;
      if (v > hi) hi = v;
      if (v < lo) lo = v;
    }
    return {
      high: Number.isFinite(hi) ? hi : null,
      low: Number.isFinite(lo) ? lo : null,
    };
  }, [chartData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md = (token.marketData || {}) as any;

  const description: string | undefined = md.description;
  const truncate = (text: string, max = 220) =>
    text.length <= max ? text : `${text.slice(0, max)}…`;

  const chainLabelCode = (token.chain || '').toUpperCase();
  const chainTag = isMarketOnly
    ? 'MARKET'
    : CHAIN_TAGS[chainLabelCode] || chainLabelCode;
  const avatarBg =
    TOKEN_AVATAR_BG[chainLabelCode] ||
    'linear-gradient(135deg,#dfe6ef,#a3aab2)';

  const periodChangeText = `${
    periodChangeNumeric >= 0 ? '+' : ''
  }${
    Number.isFinite(periodChangeNumeric)
      ? periodChangeNumeric.toFixed(2)
      : '0.00'
  }%`;

  const actions = [
    {
      key: 'send',
      label: 'Send',
      icon: <Send className="w-4 h-4" strokeWidth={1.75} />,
      disabled: isMarketOnly || balanceNum <= 0,
      onClick: () => onSend(token),
    },
    {
      key: 'receive',
      label: 'Receive',
      icon: <Plus className="w-4 h-4" strokeWidth={1.75} />,
      disabled: isMarketOnly,
      onClick: handleWalletQrOpen,
    },
    {
      key: 'swap',
      label: 'Swap',
      icon: <Repeat2 className="w-4 h-4" strokeWidth={1.75} />,
      disabled: isMarketOnly,
      onClick: () => setOpenWalletSwapOpen(true),
    },
    {
      key: 'buy',
      label: 'Buy',
      icon: <DollarSign className="w-4 h-4" strokeWidth={1.75} />,
      disabled: isMarketOnly,
      onClick: handleWalletOptionsOpen,
    },
  ];

  // Walls + descriptions for the About card chips. Pulls from market data
  // when available, falls back to a chain-aware explorer.
  const explorerLink = useMemo(() => {
    if (isMarketOnly) return null;

    const addr = token.address;
    switch (chainLabelCode) {
      case 'SOLANA':
        return addr ? `https://solscan.io/token/${addr}` : 'https://solscan.io';
      case 'ETHEREUM':
        return addr
          ? `https://etherscan.io/token/${addr}`
          : 'https://etherscan.io';
      case 'POLYGON':
        return addr
          ? `https://polygonscan.com/token/${addr}`
          : 'https://polygonscan.com';
      case 'BASE':
        return addr
          ? `https://basescan.org/token/${addr}`
          : 'https://basescan.org';
      case 'ARBITRUM':
        return addr ? `https://arbiscan.io/token/${addr}` : 'https://arbiscan.io';
      default:
        return null;
    }
  }, [chainLabelCode, isMarketOnly, token.address]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex flex-col"
        style={{ background: '#ecebe6' }}
      >
        {/* Top bar — back pill + sticky token-level actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-black/[0.06] flex-shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-black/[0.06] text-[12.5px] font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Wallet
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Watchlist"
              className="w-9 h-9 rounded-xl border border-black/[0.06] bg-white flex items-center justify-center text-gray-700 hover:border-black/[0.15] transition"
            >
              <Star className="w-[15px] h-[15px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Price alert"
              className="w-9 h-9 rounded-xl border border-black/[0.06] bg-white flex items-center justify-center text-gray-700 hover:border-black/[0.15] transition"
            >
              <Bell className="w-[15px] h-[15px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[820px] mx-auto px-5 py-5 space-y-3">
            {/* ───────── Token hero ───────── */}
            <BentoCard padding="p-6">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to wallet"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#fafafa] pl-2.5 pr-3.5 text-[12.5px] font-semibold text-gray-900 transition hover:border-black/[0.14] hover:bg-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Wallet
                </button>
              </div>
              <div className="flex justify-between items-start gap-4 mb-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[19px] tracking-[-0.5px] flex-shrink-0 overflow-hidden"
                    style={{ background: avatarBg }}
                  >
                    {token.logoURI ? (
                      <TokenImage
                        token={token}
                        width={56}
                        height={56}
                        className="rounded-full w-14 h-14"
                        showNetworkBadge={false}
                      />
                    ) : (
                      <span>{token.symbol?.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[22px] font-semibold tracking-[-0.02em] text-gray-900">
                        {token.name}
                      </span>
                      <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold bg-[#f6f6f3] text-gray-900 border border-black/[0.06]">
                        {token.symbol}
                      </span>
                      <Tag>{chainTag}</Tag>
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className="text-[36px] font-semibold tracking-[-1.4px] text-gray-900 leading-none"
                        style={{ fontFamily: MONO }}
                      >
                        {formatPriceLabel(token.marketData?.price)}
                      </span>
                      <Delta value={periodChangeText} big />
                    </div>
                    {md.totalVolume != null && (
                      <div
                        className="text-[11.5px] text-gray-500 mt-1.5"
                        style={{
                          fontFamily: MONO,
                          letterSpacing: '-0.05px',
                        }}
                      >
                        {selectedPeriod} change · 24h vol{' '}
                        {formatLargeNumber(md.totalVolume, '$')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-[220px]">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin h-7 w-7 border-[3px] border-gray-300 border-t-gray-900 rounded-full" />
                      <p className="text-[11px] text-gray-500">
                        Loading chart…
                      </p>
                    </div>
                  </div>
                )}
                {hasChartData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="td-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={strokeColor}
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="100%"
                            stopColor={strokeColor}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke={HAIR}
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="timestamp"
                        hide
                        type="number"
                        scale="time"
                        domain={['auto', 'auto']}
                      />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ stroke: strokeColor, strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={strokeColor}
                        strokeWidth={2.4}
                        fill="url(#td-fill)"
                        isAnimationActive
                        animationDuration={600}
                        connectNulls
                        dot={false}
                        activeDot={{
                          r: 4,
                          stroke: '#fff',
                          strokeWidth: 2,
                          fill: strokeColor,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-black/[0.06] bg-[#fafafa]">
                    <span
                      className="text-[11px] font-semibold uppercase text-gray-400"
                      style={{
                        fontFamily: MONO,
                        letterSpacing: '1.1px',
                      }}
                    >
                      Chart unavailable
                    </span>
                  </div>
                )}
              </div>

              {/* Period selector + High/Low */}
              <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div
                  className="flex gap-1 p-1 rounded-xl border"
                  style={{ background: SURFACE_2, borderColor: HAIR }}
                >
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3.5 py-1.5 text-[11.5px] font-semibold rounded-lg transition ${
                        selectedPeriod === p
                          ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(10,10,12,0.06)]'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {(hiLo.high != null || hiLo.low != null) && (
                  <div
                    className="flex gap-3.5 text-[11.5px] text-gray-500"
                    style={{ fontFamily: MONO }}
                  >
                    <span>
                      High{' '}
                      <span className="text-gray-900 font-semibold">
                        {hiLo.high != null
                          ? formatPriceLabel(hiLo.high)
                          : '—'}
                      </span>
                    </span>
                    <span>
                      Low{' '}
                      <span className="text-gray-900 font-semibold">
                        {hiLo.low != null
                          ? formatPriceLabel(hiLo.low)
                          : '—'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </BentoCard>

            {/* ───────── Holdings + actions ───────── */}
            <BentoCard padding="p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <Tag>Your holdings</Tag>
                  <div className="flex items-baseline gap-3 mt-2 flex-wrap">
                    <span
                      className="text-[30px] font-semibold tracking-[-1px] text-gray-900 tabular-nums"
                      style={{ fontFamily: MONO }}
                    >
                      {balanceNum.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 4,
                      })}{' '}
                      <span
                        className="text-[22px]"
                        style={{ color: '#a1a1a8' }}
                      >
                        {token.symbol}
                      </span>
                    </span>
                  </div>
                  <div
                    className="text-[13.5px] text-gray-500 mt-1"
                    style={{
                      fontFamily: MONO,
                      letterSpacing: '-0.05px',
                    }}
                  >
                    ≈ ${formatUsd(usdValue, 2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-gray-500 font-mono">
                    24h P/L
                  </div>
                  <div
                    className="text-[18px] font-semibold mt-0.5 tabular-nums"
                    style={{
                      fontFamily: MONO,
                      color: pnl24h >= 0 ? POS_GREEN : NEG_RED,
                    }}
                  >
                    {pnl24h >= 0 ? '+' : '−'}$
                    {formatUsd(Math.abs(pnl24h), 2)}
                  </div>
                  <div
                    className="text-[11px] text-gray-500 mt-0.5"
                    style={{ fontFamily: MONO }}
                  >
                    {Number.isFinite(change24h)
                      ? `${
                          change24h >= 0 ? '+' : ''
                        }${change24h.toFixed(2)}% today`
                      : ''}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4">
                {actions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={a.onClick}
                    disabled={a.disabled}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-black/[0.06] bg-white text-gray-900 text-[12px] font-semibold transition hover:border-black/[0.15] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {a.icon}
                    {a.label}
                  </button>
                ))}
              </div>
            </BentoCard>

            {/* ───────── Market stats ───────── */}
            <BentoCard padding="p-5">
              <Tag>Market stats</Tag>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-3">
                {[
                  {
                    l: 'Market cap',
                    v: formatLargeNumber(md.marketCap, '$'),
                  },
                  {
                    l: 'FDV',
                    v: formatLargeNumber(md.fullyDilutedValuation, '$'),
                  },
                  {
                    l: 'Circ supply',
                    v:
                      md.circulatingSupply != null
                        ? `${formatLargeNumber(md.circulatingSupply)} ${
                            token.symbol
                          }`
                        : '—',
                  },
                  {
                    l: 'Total supply',
                    v:
                      md.totalSupply != null
                        ? `${formatLargeNumber(md.totalSupply)} ${
                            token.symbol
                          }`
                        : '—',
                  },
                  {
                    l: '24h volume',
                    v: formatLargeNumber(md.totalVolume, '$'),
                  },
                  {
                    l: 'All-time high',
                    v:
                      md.ath != null ? formatPriceLabel(md.ath) : '—',
                    sub:
                      md.athChangePercentage != null
                        ? `${parseFloat(
                            md.athChangePercentage,
                          ).toFixed(1)}% off`
                        : undefined,
                  },
                ].map((s, i) => (
                  <div
                    key={s.l}
                    style={{
                      paddingTop: 8,
                      borderTop:
                        i < 3 ? 'none' : `1px solid ${HAIR_2}`,
                    }}
                  >
                    <div className="text-[11px] text-gray-500 font-medium tracking-tight">
                      {s.l}
                    </div>
                    <div
                      className="text-[15px] font-semibold tracking-[-0.3px] mt-0.5 tabular-nums"
                      style={{ fontFamily: MONO }}
                    >
                      {s.v}
                    </div>
                    {s.sub && (
                      <div
                        className="text-[10px] mt-0.5"
                        style={{
                          color: '#a1a1a8',
                          fontFamily: MONO,
                        }}
                      >
                        {s.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* ───────── About ───────── */}
            <BentoCard padding="p-5">
              <Tag>About {token.symbol}</Tag>
              <p
                className="mt-2.5 text-[13px] leading-[1.55] text-gray-800"
                style={{ letterSpacing: '-0.05px' }}
              >
                {description ? (
                  showFullDescription ? (
                    description
                  ) : (
                    truncate(description)
                  )
                ) : (
                  <span className="text-gray-500">
                    No description available for {token.name}.
                  </span>
                )}
              </p>
              {description && description.length > 220 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className="mt-2 text-[12.5px] font-semibold text-gray-900 hover:underline"
                >
                  {showFullDescription ? 'See less' : 'See more'}
                </button>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {md.homepage && (
                  <a
                    href={md.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
                  >
                    homepage ↗
                  </a>
                )}
                {md.whitepaper && (
                  <a
                    href={md.whitepaper}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
                  >
                    whitepaper ↗
                  </a>
                )}
                {explorerLink && (
                  <a
                    href={explorerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
                  >
                    explorer ↗
                  </a>
                )}
              </div>
            </BentoCard>

            {/* ───────── Transactions ───────── */}
            <BentoCard className="overflow-hidden">
              <div
                className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderBottom: `1px solid ${HAIR}` }}
              >
                <div>
                  <div className="text-[14.5px] font-semibold tracking-[-0.3px] text-gray-900">
                    Transactions
                  </div>
                  <div className="text-[11.5px] text-gray-500 mt-0.5">
                    {tokenTransactions.length}{' '}
                    {tokenTransactions.length === 1
                      ? 'record'
                      : 'records'}
                    {txLoading ? ' · loading…' : ''}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {TX_FILTERS.map((f) => (
                    <Chip
                      key={f}
                      active={txFilter === f}
                      onClick={() => setTxFilter(f)}
                    >
                      {f}
                    </Chip>
                  ))}
                </div>
              </div>

              {txError && (
                <div className="px-5 py-4 text-[12px] text-red-500">
                  Couldn&apos;t load transactions.
                </div>
              )}

              {!txLoading && filteredTxs.length === 0 && !txError && (
                <div className="px-5 py-10 text-center text-[12.5px] text-gray-500">
                  No {txFilter === 'All' ? '' : `${txFilter.toLowerCase()} `}
                  transactions for {token.symbol}.
                </div>
              )}

              {txLoading && filteredTxs.length === 0 && (
                <div className="px-5 py-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              )}

              {filteredTxs.map((tx, i, arr) => {
                const isIn = tx.flow === 'in';
                const isSwap = !!tx.isSwapped;
                const type = isSwap
                  ? 'Swap'
                  : isIn
                  ? 'Receive'
                  : 'Send';

                const selectedSymbolAliases = tokenSymbolAliases(
                  token.symbol,
                  token.chain,
                );
                const selectedAddress = token.address?.toLowerCase();
                const swapFromMatches =
                  isSwap &&
                  tx.swapped?.from &&
                  ((selectedAddress &&
                    tx.swapped.from.contractAddress?.toLowerCase() ===
                      selectedAddress) ||
                    (!selectedAddress &&
                      selectedSymbolAliases.has(
                        tx.swapped.from.symbol?.toUpperCase() || '',
                      )));
                const swapToMatches =
                  isSwap &&
                  tx.swapped?.to &&
                  ((selectedAddress &&
                    tx.swapped.to.contractAddress?.toLowerCase() ===
                      selectedAddress) ||
                    (!selectedAddress &&
                      selectedSymbolAliases.has(
                        tx.swapped.to.symbol?.toUpperCase() || '',
                      )));
                const swapLeg = swapFromMatches
                  ? tx.swapped?.from
                  : swapToMatches
                  ? tx.swapped?.to
                  : undefined;

                const valueNum = parseFloat(
                  swapLeg?.value || tx.value || '0',
                );
                const sign =
                  isSwap && swapFromMatches
                    ? '−'
                    : isSwap && swapToMatches
                    ? '+'
                    : isIn
                    ? '+'
                    : '−';
                const amtLabel = `${sign}${
                  Number.isFinite(valueNum)
                    ? valueNum.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 4,
                      })
                    : '0'
                } ${swapLeg?.symbol || tx.tokenSymbol || token.symbol}`;

                const usdNum =
                  Number.isFinite(valueNum) && tx.tokenPrice
                    ? valueNum * (tx.tokenPrice || 0)
                    : Number.isFinite(valueNum) && priceNum
                    ? valueNum * priceNum
                    : 0;
                const usdLabel =
                  usdNum > 0
                    ? `${sign}$${formatUsd(usdNum, 2)}`
                    : '';

                const counterparty = isSwap
                  ? swapFromMatches && tx.swapped?.to?.symbol
                    ? `→ ${tx.swapped.to.symbol}`
                    : swapToMatches && tx.swapped?.from?.symbol
                    ? `← ${tx.swapped.from.symbol}`
                    : 'swap'
                  : isIn
                  ? truncateAddr(tx.from)
                  : truncateAddr(tx.to);

                return (
                  <div
                    key={`${tx.hash}-${i}`}
                    className="px-5 py-3.5 grid items-center gap-3.5"
                    style={{
                      gridTemplateColumns: '40px 1fr auto',
                      borderBottom:
                        i === arr.length - 1
                          ? 'none'
                          : `1px solid ${HAIR_2}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
                      style={{
                        background: isIn ? POS_GREEN_SOFT : SURFACE_2,
                        border: `1px solid ${HAIR}`,
                        color: isIn ? POS_GREEN : '#0a0a0c',
                      }}
                    >
                      {isSwap ? (
                        <Repeat2
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                        />
                      ) : isIn ? (
                        <Plus
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <Send
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold tracking-[-0.1px] text-gray-900">
                        {type}
                      </div>
                      <div
                        className="text-[11px] text-gray-500 mt-0.5 truncate"
                        style={{ fontFamily: MONO }}
                      >
                        {counterparty}
                        {' · '}
                        {formatTxWhen(tx.timeStamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[13px] font-semibold tabular-nums"
                        style={{
                          fontFamily: MONO,
                          color: isIn && !isSwap ? POS_GREEN : '#0a0a0c',
                        }}
                      >
                        {amtLabel}
                      </div>
                      {usdLabel && (
                        <div
                          className="text-[10.5px] text-gray-500 mt-0.5 tabular-nums"
                          style={{ fontFamily: MONO }}
                        >
                          {usdLabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </BentoCard>
          </div>
        </div>
      </div>

      {openWalletQrOpen && (
        <CustomModal
          isOpen={openWalletQrOpen}
          onCloseModal={setOpenWalletQrOpen}
        >
          <GetQrCodeUsingWalletAddress walletName={qrState} />
        </CustomModal>
      )}

      {openWalletSwapOpen && (
        <CustomModal
          isOpen={openWalletSwapOpen}
          onCloseModal={setOpenWalletSwapOpen}
        >
          <SwapTokenModal
            tokens={tokens}
            token={token}
            preferredSolanaWalletAddress={
              preferredSwapSolanaWalletAddress
            }
          />
        </CustomModal>
      )}
    </>
  );
}
