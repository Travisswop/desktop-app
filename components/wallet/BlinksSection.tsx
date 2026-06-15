'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import {
  Shuffle,
  Copy,
  Check,
  ArrowRight,
  ChevronDown,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  type RedemptionPool,
  fromTokenLamports,
} from './redeem/token-list';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import {
  useWalletAddresses,
  useWalletData,
} from './hooks/useWalletData';
import { SUPPORTED_CHAINS } from './constants';
import {
  useCreateRedeemLink,
  RENT_PER_TOKEN_ACCOUNT,
  type RedeemLinkToken,
} from '@/lib/hooks/useCreateRedeemLink';
import { copyTextToClipboard } from '@/lib/clipboard';
import { useUser } from '@/lib/UserContext';

// ── Types ────────────────────────────────────────────────────────────────────

type BlinkStatus = 'open' | 'claimed' | 'expired';
type BlinkFilter = BlinkStatus | 'all';

interface BlinkRowData {
  pool: RedemptionPool;
  status: BlinkStatus;
  ageLabel: string;
  claimLabel: string;
  remainingLabel: string;
}

interface SolanaToken {
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  isNative: boolean;
  address?: string | null;
  logoURI?: string;
  logo?: string;
  priceUsd?: number;
}

const STATUS_TONE: Record<
  BlinkStatus,
  { label: string; bg: string; fg: string }
> = {
  open: { label: 'OPEN', bg: 'rgba(217,119,6,0.10)', fg: '#b45309' },
  claimed: {
    label: 'CLAIMED',
    bg: 'rgba(25,169,116,0.10)',
    fg: '#19a974',
  },
  expired: { label: 'EXPIRED', bg: '#f2f2f0', fg: '#6e6e76' },
};

const STABLE_TOKEN_SYMBOLS = new Set([
  'USDC',
  'USDT',
  'DAI',
  'PYUSD',
  'FDUSD',
]);
const DEFAULT_MAX_WALLETS = '10';
const DEFAULT_MAX_WALLETS_NUM = Number(DEFAULT_MAX_WALLETS);

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function deriveStatus(p: RedemptionPool): BlinkStatus {
  if (p.expires_at && new Date(p.expires_at) < new Date()) return 'expired';
  const remainingAmount = Number(p.remaining_amount);
  const perClaimAmount = Number(p.tokens_per_wallet);
  const maxWallets = Number(p.max_wallets ?? 0);
  const totalRedemptions = Number(p.total_redemptions ?? 0);

  if (
    p.total_amount > 0 &&
    (remainingAmount <= 0 ||
      perClaimAmount <= 0 ||
      remainingAmount < perClaimAmount ||
      (maxWallets > 0 && totalRedemptions >= maxWallets))
  ) {
    return 'claimed';
  }
  return 'open';
}

function formatTokenAmount(amount: number, symbol: string): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const fixed =
    safeAmount >= 1
      ? safeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : safeAmount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return `${fixed} ${symbol || 'TOKEN'}`;
}

function getBlinkTokenImageSrc(pool: RedemptionPool): string {
  const symbol = (pool.token_symbol || '').trim().toUpperCase();
  if (symbol === 'SWOP') return '/assets/crypto-icons/SWOP.png';
  if (symbol === 'SOL') return '/assets/crypto-icons/SOL.png';
  const rawLogo = String(pool.token_logo || '').trim();
  if (
    !rawLogo ||
    rawLogo === '/' ||
    ['undefined', 'null', '[object object]'].includes(rawLogo.toLowerCase())
  ) {
    return '';
  }
  return sanitizeNextImageSrc(pool.token_logo);
}

function formatBalance(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 0.01) return '<$0.01';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseTokenPrice(t: {
  balance: string | number;
  value?: number;
  symbol: string;
  marketData?: { price?: string | number | null } | null;
}): number {
  const marketPrice = Number(t.marketData?.price ?? 0);
  if (Number.isFinite(marketPrice) && marketPrice > 0) return marketPrice;

  const balance =
    typeof t.balance === 'string'
      ? parseFloat(t.balance) || 0
      : Number(t.balance) || 0;
  const value = Number(t.value ?? 0);
  if (balance > 0 && Number.isFinite(value) && value > 0) {
    return value / balance;
  }

  if (STABLE_TOKEN_SYMBOLS.has(t.symbol.toUpperCase())) {
    return 1;
  }

  return 0;
}

function toSolanaToken(t: {
  symbol: string;
  name: string;
  balance: string | number;
  decimals?: number;
  isNative?: boolean;
  address?: string | null;
  logoURI?: string;
  logo?: string;
  chain?: string;
  value?: number;
  marketData?: { price?: string | number | null } | null;
}): SolanaToken {
  const balance =
    typeof t.balance === 'string'
      ? parseFloat(t.balance) || 0
      : Number(t.balance) || 0;
  return {
    symbol: t.symbol,
    name: t.name,
    balance,
    decimals: t.decimals ?? 9,
    isNative: !!t.isNative,
    address: t.address,
    logoURI: t.logoURI,
    logo: t.logo,
    priceUsd: parseTokenPrice(t),
  };
}

function toRedeemLinkToken(t: SolanaToken): RedeemLinkToken {
  return {
    name: t.name,
    symbol: t.symbol,
    address: t.address,
    decimals: t.decimals,
    logoURI: t.logoURI,
    logo: t.logo,
    isNative: t.isNative,
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BlinksSection() {
  const { user, authenticated, ready, user: PrivyUser } = usePrivy();
  const { user: swopUser } = useUser();

  // ── Token fetching (for the inline picker) ─────────────────────────────────
  const walletData = useWalletData(
    authenticated,
    ready,
    PrivyUser,
    swopUser,
  );
  const { solWalletAddress, evmWalletAddress } =
    useWalletAddresses(walletData);
  const { tokens: rawTokens = [], loading: tokensLoading } =
    useMultiChainTokenData(
      solWalletAddress,
      evmWalletAddress,
      SUPPORTED_CHAINS,
    );

  // Only Solana tokens with a non-zero balance can back a blink.
  const solTokens = useMemo<SolanaToken[]>(
    () =>
      (rawTokens as unknown as Parameters<typeof toSolanaToken>[0][])
        .filter((t) => (t.chain ?? '').toUpperCase() === 'SOLANA')
        .map(toSolanaToken)
        .filter((t) => t.balance > 0 || t.isNative),
    [rawTokens],
  );

  const solBalance = useMemo(
    () => solTokens.find((t) => t.isNative)?.balance ?? 0,
    [solTokens],
  );

  // ── Create-blink form state ────────────────────────────────────────────────
  const [selectedToken, setSelectedToken] = useState<SolanaToken | null>(
    null,
  );
  const [amountStr, setAmountStr] = useState('');
  const [maxWalletsStr, setMaxWalletsStr] = useState(DEFAULT_MAX_WALLETS);
  const [recipientMode, setRecipientMode] = useState<
    'open' | 'restricted'
  >('open');
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState('');
  const pickerWrapperRef = useRef<HTMLDivElement>(null);

  const {
    createLink,
    status: createStatus,
    error: createError,
    reset: resetCreate,
  } = useCreateRedeemLink();
  const isCreating = createStatus === 'processing';

  // ── My blinks list state (unchanged) ───────────────────────────────────────
  const [pools, setPools] = useState<RedemptionPool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [filter, setFilter] = useState<BlinkFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash !== '#blinks') return;

    const scrollToBlinks = () => {
      document
        .getElementById('blinks')
        ?.scrollIntoView({ block: 'start' });
    };

    const frameId = window.requestAnimationFrame(scrollToBlinks);
    const timeoutIds = [150, 600, 1200].map((delay) =>
      window.setTimeout(scrollToBlinks, delay),
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const fetchPools = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getRedeemPoolList/${user.id}`,
      );
      if (!response.ok) {
        toast.error('Failed to fetch blinks');
        return;
      }
      const { data } = await response.json();
      const items: RedemptionPool[] = data.map((pool: RedemptionPool) => ({
        ...pool,
        total_amount: fromTokenLamports(pool.total_amount, pool.token_decimals),
        remaining_amount: fromTokenLamports(
          pool.remaining_amount,
          pool.token_decimals,
        ),
        tokens_per_wallet: fromTokenLamports(
          pool.tokens_per_wallet,
          pool.token_decimals,
        ),
        total_redemptions: Number(pool.total_redemptions ?? 0),
        max_wallets: Number(pool.max_wallets ?? 0),
        total_redeemed_amount: fromTokenLamports(
          pool.total_redeemed_amount || 0,
          pool.token_decimals,
        ),
        redeemLink: `https://redeem.swopme.app/${pool.pool_id}`,
      }));
      setPools(items);
    } catch (error) {
      console.error('Error fetching blinks:', error);
    } finally {
      setPoolsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchPools();
  }, [user?.id, fetchPools]);

  // ── Auto-select USDC (or first SOL token with balance) ─────────────────────
  useEffect(() => {
    if (selectedToken || solTokens.length === 0) return;
    const preferred =
      solTokens.find((t) => t.symbol.toUpperCase() === 'USDC') ??
      solTokens[0];
    setSelectedToken(preferred);
  }, [solTokens, selectedToken]);

  // ── Token picker: click-outside + ESC to close ─────────────────────────────
  useEffect(() => {
    if (!tokenPickerOpen) return;
    const onMouse = (e: MouseEvent) => {
      if (
        pickerWrapperRef.current &&
        !pickerWrapperRef.current.contains(e.target as Node)
      ) {
        setTokenPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTokenPickerOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [tokenPickerOpen]);

  // ── React to create flow result ────────────────────────────────────────────
  useEffect(() => {
    if (createStatus === 'success') {
      toast.success('Blink created!');
      setAmountStr('');
      setMaxWalletsStr(DEFAULT_MAX_WALLETS);
      fetchPools();
      const t = setTimeout(() => resetCreate(), 1800);
      return () => clearTimeout(t);
    }
    if (createStatus === 'error' && createError) {
      toast.error(createError);
    }
  }, [createStatus, createError, fetchPools, resetCreate]);

  // ── Derived blink-list values (unchanged) ──────────────────────────────────
  const rows = useMemo<BlinkRowData[]>(
    () =>
      pools.map((p) => ({
        pool: p,
        status: deriveStatus(p),
        ageLabel: relativeAge(p.created_at),
        claimLabel: formatTokenAmount(p.tokens_per_wallet, p.token_symbol),
        remainingLabel: formatTokenAmount(p.remaining_amount, p.token_symbol),
      })),
    [pools],
  );

  const counts = useMemo(() => {
    const c: Record<BlinkStatus, number> = {
      open: 0,
      claimed: 0,
      expired: 0,
    };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      filter === 'all' ? rows : rows.filter((r) => r.status === filter),
    [rows, filter],
  );

  // ── Form derived values ────────────────────────────────────────────────────
  const amountNum = parseFloat(amountStr) || 0;
  const trimmedMaxWalletsStr = maxWalletsStr.trim();
  const parsedMaxWallets = parseInt(trimmedMaxWalletsStr, 10);
  const maxWalletsNum =
    trimmedMaxWalletsStr === ''
      ? DEFAULT_MAX_WALLETS_NUM
      : Number.isFinite(parsedMaxWallets)
        ? parsedMaxWallets
        : 0;
  const missingClaimLimit = amountNum > 0 && maxWalletsNum <= 0;
  const tokensPerWallet =
    maxWalletsNum > 0 ? amountNum / maxWalletsNum : 0;
  const tokenSymbol = selectedToken?.symbol ?? 'Token';
  const tokenBalance = selectedToken?.balance ?? 0;
  const tokenPriceUsd = selectedToken?.priceUsd ?? 0;
  const amountUsdLabel = formatUsd(amountNum * tokenPriceUsd);
  const balanceUsdLabel = formatUsd(tokenBalance * tokenPriceUsd);
  const tokensPerWalletUsdLabel = formatUsd(tokensPerWallet * tokenPriceUsd);
  const exceedsBalance = !!selectedToken && amountNum > tokenBalance;
  const insufficientSol =
    !!selectedToken && solBalance < RENT_PER_TOKEN_ACCOUNT;
  const canCreate =
    !!selectedToken &&
    amountNum > 0 &&
    maxWalletsNum > 0 &&
    !exceedsBalance &&
    !insufficientSol &&
    !isCreating;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectToken = (token: SolanaToken) => {
    setSelectedToken(token);
    setTokenPickerOpen(false);
    setTokenSearch('');
    setAmountStr('');
  };

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized =
      parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setAmountStr(sanitized);
  };

  const handleMaxWalletsChange = (raw: string) => {
    setMaxWalletsStr(raw.replace(/[^0-9]/g, ''));
  };

  const handleQuickAmount = (n: number) => {
    setAmountStr(n.toString());
  };

  const handleMaxAmount = () => {
    if (!selectedToken) return;
    setAmountStr(String(selectedToken.balance));
  };

  const handleCreate = () => {
    if (!canCreate || !selectedToken) return;
    createLink({
      token: toRedeemLinkToken(selectedToken),
      totalAmount: amountNum,
      maxWallets: maxWalletsNum,
      tokensPerWallet,
    });
  };

  const handleCopy = async (poolId: string, link: string) => {
    try {
      const didCopy = await copyTextToClipboard(link);
      if (!didCopy) throw new Error('Unable to copy link');
      setCopiedId(poolId);
      toast.success('Link copied!');
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ── Quick chip presets — token units, with USD shown as secondary text ─────
  const quickChips = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  return (
    <section id="blinks" className="mt-8 scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900">
            Blinks
          </h2>
          <p className="text-[13px] text-gray-500 mt-0.5 tracking-tight">
            Redeemable token links · claim with $swop.id or wallet
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap border bg-white text-gray-900 border-black/[0.06] shrink-0">
          All blinks · {rows.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-3.5 items-stretch">
        {/* ── CREATE BLINK — interactive ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-[11px] bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Shuffle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.01em]">
                Create blink
              </div>
              <div className="text-[11.5px] text-gray-500 mt-0.5">
                Lock tokens to a redeemable link
              </div>
            </div>
          </div>

          {/* Amount + token row (with inline picker popover) */}
          <div
            ref={pickerWrapperRef}
            className="relative rounded-[14px] border border-black/[0.06] bg-gray-50 px-3.5 pt-3 pb-3 mb-2.5"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-[1.2px] font-mono">
                You send
              </span>
              {selectedToken && (
                <span className="text-[10.5px] text-gray-400 font-mono">
                  Balance ·{' '}
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="underline hover:text-gray-700"
                  >
                    {formatBalance(tokenBalance)}
                  </button>
                  {balanceUsdLabel && ` (${balanceUsdLabel})`}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                disabled={isCreating}
                className="bg-transparent text-[26px] font-semibold tracking-[-0.6px] font-mono leading-none text-gray-900 outline-none min-w-0 flex-1 disabled:opacity-50"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
              <button
                type="button"
                onClick={() => setTokenPickerOpen((v) => !v)}
                disabled={isCreating || tokensLoading}
                aria-label="Choose token"
                aria-expanded={tokenPickerOpen}
                className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-white border border-black/[0.06] text-[12.5px] font-semibold text-gray-900 hover:border-black/[0.20] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
              >
                <TokenAvatar token={selectedToken} />
                {tokenSymbol}
                <ChevronDown
                  className={`w-3 h-3 text-gray-500 transition-transform ${
                    tokenPickerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
            {amountNum > 0 && (
              <div className="mt-2 text-[10.5px] text-gray-400 font-mono">
                {amountUsdLabel
                  ? `Estimated value (${amountUsdLabel})`
                  : 'USD estimate unavailable for this token'}
              </div>
            )}

            {tokenPickerOpen && (
              <TokenPickerDropdown
                tokens={solTokens}
                loading={tokensLoading}
                search={tokenSearch}
                onSearch={setTokenSearch}
                onSelect={handleSelectToken}
                selectedSymbol={selectedToken?.symbol}
              />
            )}
          </div>

          {/* Quick amount chips */}
          <div className="flex gap-1.5 mb-3.5">
            {quickChips.map((c) => {
              const active = amountStr === c.value.toString();
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => handleQuickAmount(c.value)}
                  disabled={isCreating}
                  aria-label={`Set ${c.value} ${tokenSymbol}`}
                  className={`flex-1 inline-flex items-center justify-center h-7 px-2 rounded-full text-[11.5px] font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    active
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-black/[0.06] hover:border-black/[0.15]'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleMaxAmount}
              disabled={isCreating || !selectedToken}
              className="flex-1 inline-flex items-center justify-center h-7 px-2 rounded-full text-[11.5px] font-semibold border bg-white text-gray-700 border-black/[0.06] hover:border-black/[0.15] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>

          {/* Recipient mode toggle */}
          <div className="grid grid-cols-2 gap-0 bg-gray-50 border border-black/[0.06] rounded-[12px] p-1 mb-3">
            <button
              type="button"
              onClick={() => setRecipientMode('open')}
              className={`px-2.5 py-2 rounded-[9px] text-left transition ${
                recipientMode === 'open'
                  ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                  : 'hover:bg-white/60'
              }`}
            >
              <div
                className={`text-[12px] font-semibold leading-tight ${
                  recipientMode === 'open' ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                Open · anyone
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                first to claim wins
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                toast(
                  'Restricted blinks are coming soon — every blink is currently Open.',
                  { icon: 'ℹ️' },
                )
              }
              className="px-2.5 py-2 rounded-[9px] text-left transition hover:bg-white/60"
            >
              <div className="text-[12px] font-semibold text-gray-500 leading-tight">
                Restricted
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                specific $swop.id
              </div>
            </button>
          </div>

          {/* Claim limits — real input for max wallets */}
          <div className="rounded-[12px] border border-black/[0.06] bg-gray-50 p-3 mb-3">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-tight">
                  Claim limits
                </div>
                <div className="text-[10.5px] text-gray-400 mt-0.5">
                  Cap how many wallets and how much each gets
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-amber-700 bg-amber-100/80 px-[7px] py-[2px] rounded-[4px] tracking-[0.6px] font-mono shrink-0">
                {maxWalletsNum > 0 ? 'ON' : 'SET'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="bg-white border border-black/[0.06] rounded-[10px] px-2.5 py-2 cursor-text block">
                <div className="text-[9.5px] font-bold text-gray-500 uppercase tracking-[1.2px] font-mono">
                  Max wallets
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxWalletsStr}
                    onChange={(e) => handleMaxWalletsChange(e.target.value)}
                    placeholder={DEFAULT_MAX_WALLETS}
                    disabled={isCreating}
                    className="w-12 bg-transparent text-[18px] font-semibold font-mono leading-none outline-none disabled:opacity-50"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span className="text-[10.5px] text-gray-500 font-mono">
                    claimers
                  </span>
                </div>
              </label>
              <div className="bg-white border border-black/[0.06] rounded-[10px] px-2.5 py-2">
                <div className="text-[9.5px] font-bold text-gray-500 uppercase tracking-[1.2px] font-mono">
                  Max per wallet
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className="text-[18px] font-semibold font-mono leading-none text-gray-900"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {tokensPerWallet > 0
                      ? tokensPerWallet.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })
                      : '—'}
                  </span>
                  <span className="text-[10.5px] text-gray-500 font-mono">
                    {tokenSymbol}
                  </span>
                </div>
                {tokensPerWalletUsdLabel && (
                  <div className="text-[10px] text-gray-400 mt-1 font-mono">
                    ({tokensPerWalletUsdLabel})
                  </div>
                )}
              </div>
            </div>
            {amountNum > 0 && maxWalletsNum > 0 && (
              <div className="text-[10.5px] text-gray-500 mt-2 font-mono tracking-[-0.1px]">
                {amountNum} ÷ {maxWalletsNum} wallets ·{' '}
                {tokensPerWallet.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                {tokenSymbol} each
                {tokensPerWalletUsdLabel
                  ? ` (${tokensPerWalletUsdLabel})`
                  : ''}
                , first-come
              </div>
            )}
            {missingClaimLimit && (
              <div className="text-[10.5px] text-amber-700 mt-2 font-mono tracking-[-0.1px]">
                Set max wallets before creating a blink.
              </div>
            )}
          </div>

          {/* Validation hints */}
          {exceedsBalance && (
            <div className="flex items-start gap-2 text-[11.5px] text-red-600 bg-red-50 border border-red-100 rounded-[10px] px-2.5 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-[2px] shrink-0" />
              <span>
                Amount exceeds your {tokenSymbol} balance (
                {formatBalance(tokenBalance)}).
              </span>
            </div>
          )}
          {insufficientSol && (
            <div className="flex items-start gap-2 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-100 rounded-[10px] px-2.5 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-[2px] shrink-0" />
              <span>
                Need at least {RENT_PER_TOKEN_ACCOUNT.toFixed(5)} SOL for
                rent fees. Current SOL balance: {formatBalance(solBalance)}.
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full h-[44px] rounded-[12px] bg-gray-900 text-white text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating blink…
              </>
            ) : (
              <>
                <Shuffle className="w-3.5 h-3.5" />
                Create blink
                {amountNum > 0 &&
                  ` · ${amountNum} ${tokenSymbol}${
                    amountUsdLabel ? ` (${amountUsdLabel})` : ''
                  }`}
              </>
            )}
          </button>
        </div>

        {/* ── MY BLINKS list ──────────────────────────────────────────────── */}
        <div className="h-[460px] md:h-[560px] bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-black/[0.06] flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-[-0.01em]">
                My blinks
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {rows.length} total · {counts.open} unclaimed
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {(['all', 'open', 'claimed'] as BlinkFilter[]).map((f) => {
                const label =
                  f === 'all'
                    ? 'All'
                    : f === 'open'
                      ? `Open · ${counts.open}`
                      : `Claimed · ${counts.claimed}`;
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition ${
                      active
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-900 border-black/[0.06] hover:border-black/[0.15]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            {poolsLoading ? (
              <div className="p-5 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-gray-50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                <div className="text-[15px] font-semibold text-gray-900 mb-1">
                  {rows.length === 0
                    ? 'No blinks yet'
                    : 'Nothing matches that filter'}
                </div>
                <div className="text-[12.5px] text-gray-500 max-w-md">
                  {rows.length === 0
                    ? 'Lock tokens to a redeemable link and share with anyone.'
                    : 'Switch back to All to see every blink.'}
                </div>
              </div>
            ) : (
              filteredRows.map((row, i) => (
                <BlinkRowItem
                  key={row.pool.pool_id}
                  row={row}
                  isFirst={i === 0}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Token avatar (small) ─────────────────────────────────────────────────────

function TokenAvatar({ token }: { token: SolanaToken | null }) {
  if (!token) {
    return (
      <span className="w-[22px] h-[22px] rounded-full bg-gray-200 inline-flex items-center justify-center text-[10px] font-bold text-gray-500 font-mono">
        ?
      </span>
    );
  }
  const src = token.logoURI ?? token.logo;
  if (src) {
    return (
      <span className="w-[22px] h-[22px] rounded-full overflow-hidden inline-flex items-center justify-center bg-gray-100 shrink-0">
        <Image
          src={sanitizeNextImageSrc(src)}
          alt={token.symbol}
          width={22}
          height={22}
          className="w-[22px] h-[22px] object-cover"
        />
      </span>
    );
  }
  return (
    <span className="w-[22px] h-[22px] rounded-full bg-[#cfe3f7] inline-flex items-center justify-center text-[10px] font-bold text-[#1d4f88] font-mono">
      {token.symbol.slice(0, 1)}
    </span>
  );
}

// ── Inline token picker dropdown ─────────────────────────────────────────────

function TokenPickerDropdown({
  tokens,
  loading,
  search,
  onSearch,
  onSelect,
  selectedSymbol,
}: {
  tokens: SolanaToken[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (t: SolanaToken) => void;
  selectedSymbol?: string;
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q),
    );
  }, [tokens, search]);

  return (
    <div
      role="listbox"
      className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white rounded-[14px] border border-black/[0.08] shadow-[0_8px_28px_-8px_rgba(10,10,12,0.18)] p-2"
    >
      <div className="relative mb-1.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search Solana tokens"
          autoFocus
          className="w-full h-8 pl-8 pr-2.5 bg-gray-50 border border-black/[0.06] rounded-lg text-[12.5px] outline-none focus:border-black/[0.15] transition"
        />
      </div>

      <div className="max-h-[220px] overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="text-[12px] text-gray-400 text-center py-6">
            Loading tokens…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-[12px] text-gray-400 text-center py-6">
            {tokens.length === 0
              ? 'No Solana tokens in this wallet'
              : 'No matches'}
          </div>
        ) : (
          filtered.map((t) => {
            const isSelected = selectedSymbol === t.symbol;
            return (
              <button
                key={t.address ?? t.symbol}
                type="button"
                onClick={() => onSelect(t)}
                role="option"
                aria-selected={isSelected}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition ${
                  isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <TokenAvatar token={t} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {t.symbol}
                  </div>
                  <div className="text-[10.5px] text-gray-500 truncate">
                    {t.name}
                  </div>
                </div>
                <div className="text-[11.5px] font-medium text-gray-700 font-mono shrink-0">
                  {formatBalance(t.balance)}
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-gray-900 ml-1" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Blink list row ───────────────────────────────────────────────────────────

function BlinkPoolAvatar({ pool }: { pool: RedemptionPool }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed ? '' : getBlinkTokenImageSrc(pool);
  const fallbackText = (pool.token_symbol || 'TOK')
    .trim()
    .toUpperCase()
    .slice(0, 4);

  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={pool.token_symbol || 'Token'}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-[9.5px] font-semibold text-gray-700 font-mono leading-none">
          {fallbackText}
        </span>
      )}
    </div>
  );
}

function BlinkRowItem({
  row,
  isFirst,
  copiedId,
  onCopy,
}: {
  row: BlinkRowData;
  isFirst: boolean;
  copiedId: string | null;
  onCopy: (poolId: string, link: string) => void;
}) {
  const { pool, status, ageLabel, claimLabel, remainingLabel } = row;
  const tone = STATUS_TONE[status];
  const isCopied = copiedId === pool.pool_id;
  const linkLabel = `swop.id/blink/${pool.pool_id.slice(0, 6)}`;
  const headlineLabel = status === 'open' ? claimLabel : remainingLabel;
  const subText =
    status === 'open'
      ? `Open · ${remainingLabel} left`
      : status === 'claimed'
        ? `Claimed · ${pool.total_redemptions} wallet${
            pool.total_redemptions === 1 ? '' : 's'
          }`
        : 'Expired · funds returned';

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3.5 px-5 py-3 ${
        isFirst ? '' : 'border-t border-black/[0.06]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <BlinkPoolAvatar pool={pool} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-semibold font-mono">
              {headlineLabel}
            </span>
            <span
              className="text-[9.5px] font-bold tracking-[0.6px] px-1.5 py-[2px] rounded-[4px] font-mono"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {tone.label}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5 max-w-[280px]">
            {linkLabel}
          </div>
          <div className="text-[10.5px] text-gray-400 mt-0.5">{subText}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[10px] text-gray-400 font-mono">{ageLabel}</div>
      </div>

      <div className="flex gap-1">
        {status === 'open' && (
          <button
            type="button"
            onClick={() => onCopy(pool.pool_id, pool.redeemLink)}
            title="Copy link"
            className="w-7 h-7 rounded-lg border border-black/[0.06] bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-700" />
            )}
          </button>
        )}
        <a
          href={pool.redeemLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Open link"
          className="w-7 h-7 rounded-lg border border-black/[0.06] bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition"
        >
          <ArrowRight className="w-3.5 h-3.5 text-gray-700" />
        </a>
      </div>
    </div>
  );
}
