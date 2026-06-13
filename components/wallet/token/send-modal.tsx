'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  CheckCircle,
  Copy,
  Gift,
  Link2,
  Loader2,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from 'use-debounce';

import CustomModal from '@/components/modal/CustomModal';
import TokenImage from './token-image';
import { TokenData } from '@/types/token';
import { ReceiverData } from '@/types/wallet';
import { SendFlowState } from '@/types/wallet-types';
import { truncateAddress } from '@/lib/utils';
import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import { getConnectionsUserData } from '@/actions/getEnsData';
import {
  RENT_PER_TOKEN_ACCOUNT,
  useCreateRedeemLink,
} from '@/lib/hooks/useCreateRedeemLink';
import { toast } from '@/hooks/use-toast';

interface SendTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenData;
  setSendFlow: React.Dispatch<React.SetStateAction<SendFlowState>>;
  // SOL balance used to validate that the user can cover the rent-exempt
  // deposit when creating a redemption pool. Only consulted in link mode.
  solBalance?: number;
}

const MAX_WALLET_PRESETS = [1, 10, 100] as const;

type SendMethod = 'address' | 'link';

const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const NETWORK_LABELS: Record<string, string> = {
  ETHEREUM: 'Ethereum mainnet',
  SOLANA: 'Solana mainnet',
  POLYGON: 'Polygon mainnet',
  BASE: 'Base mainnet',
  ARBITRUM: 'Arbitrum One',
};

const validateEthereumAddress = (a: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(a);

const validateSolanaAddress = (a: string) =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-gray-500 mb-2"
      style={{ fontFamily: MONO }}
    >
      {children}
    </div>
  );
}

// Coerces unknown values to a numeric string and strips trailing zeros after
// the decimal point. Some token providers return `balance` as a number, so we
// can't assume the input is a string at runtime.
const trimZeros = (raw: unknown): string => {
  if (raw == null) return '';
  const s = String(raw);
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
};

const formatAmountForTotal = (n: number, frac = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

export default function SendTokenModal({
  open,
  onOpenChange,
  token,
  setSendFlow,
  solBalance = 0,
}: SendTokenModalProps) {
  const hasPrice = parseFloat(token?.marketData?.price || '0') > 0;
  const [isUSD, setIsUSD] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<ReceiverData | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 350);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [connections, setConnections] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [method, setMethod] = useState<SendMethod>('address');
  const [maxWalletsInput, setMaxWalletsInput] =
    useState<string>('10');
  const [customWalletsActive, setCustomWalletsActive] =
    useState(false);

  const isSolana = (token?.chain || '').toUpperCase() === 'SOLANA';
  const linkAvailable = isSolana;

  const {
    createLink,
    status: linkStatus,
    redeemLink,
    error: linkError,
    reset: resetLink,
  } = useCreateRedeemLink();

  const { user, accessToken } = useUser();

  // Reset on close so re-opening doesn't carry stale state.
  useEffect(() => {
    if (!open) {
      setAmount('');
      setIsUSD(false);
      setRecipient(null);
      setSearchQuery('');
      setSearchResults([]);
      setSearching(false);
      setMethod('address');
      setMaxWalletsInput('10');
      setCustomWalletsActive(false);
      resetLink();
    }
  }, [open, resetLink]);

  // If the user opens send for a non-Solana token while a previous session
  // had "link" selected, snap back to address mode.
  useEffect(() => {
    if (!linkAvailable && method === 'link') setMethod('address');
  }, [linkAvailable, method]);

  // Fetch connections (used for the "Recent" row)
  useEffect(() => {
    if (!open || !user?._id) return;
    let cancelled = false;
    (async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/following/${user._id}?page=1&limit=10`;
        const data = await getConnectionsUserData(
          url,
          accessToken || '',
        );
        if (!cancelled && data.state === 'success') {
          setConnections(data.data.following || []);
        }
      } catch {
        // Silent — recents are optional.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?._id, accessToken]);

  // Search Swop users by query (ENS / handle / name)
  useEffect(() => {
    if (
      !open ||
      !debouncedQuery ||
      debouncedQuery.length < 1 ||
      recipient
    ) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    (async () => {
      try {
        const url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/v1/user/search?q=${encodeURIComponent(
          debouncedQuery,
        )}&userId=${user?._id || ''}&filter=all&page=1&limit=10`;
        const data = await getConnectionsUserData(
          url,
          accessToken || '',
        );
        if (!cancelled && data.state === 'success') {
          setSearchResults(data.data.results || []);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, user?._id, accessToken, recipient]);

  // ── Derived numeric helpers ─────────────────────────────────────────────
  const balanceNum = parseFloat(token?.balance || '0') || 0;
  const priceNum = hasPrice ? parseFloat(token.marketData.price) : 0;

  const tokenEquivalent = useMemo(() => {
    if (!amount) return 0;
    const n = parseFloat(amount);
    if (!Number.isFinite(n)) return 0;
    return isUSD && priceNum > 0 ? n / priceNum : n;
  }, [amount, isUSD, priceNum]);

  const usdEquivalent = useMemo(() => {
    if (!amount) return 0;
    const n = parseFloat(amount);
    if (!Number.isFinite(n)) return 0;
    return isUSD ? n : n * priceNum;
  }, [amount, isUSD, priceNum]);

  const handleInput = (value: string) => {
    const sanitized = value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    if (sanitized === '' || sanitized === '.') {
      setAmount('');
      return;
    }
    const normalized = sanitized.replace(/^0+(?=\d)/, '');
    setAmount(normalized);
  };

  // Floor-truncate to N decimals. Using `.toFixed(N)` rounds, which can push
  // the displayed amount one ulp ABOVE the real balance and trip the
  // "Exceeds your balance" check after Max.
  const floorToDecimals = (n: number, dec: number) => {
    if (!Number.isFinite(n)) return 0;
    const f = Math.pow(10, dec);
    return Math.floor(n * f) / f;
  };

  const setPercent = (p: number) => {
    if (!balanceNum) {
      setAmount('0');
      return;
    }
    // Max — pass the original balance through in token mode so we never gain
    // precision through float math; in USD mode floor to 2dp.
    if (p >= 100) {
      if (isUSD && priceNum > 0) {
        setAmount(
          floorToDecimals(balanceNum * priceNum, 2).toFixed(2),
        );
      } else {
        // Prefer the raw balance string when it's already in plain decimal
        // form. Otherwise (e.g. scientific notation, number value) fall back
        // to a fixed-decimal rendering of the parsed number.
        const raw =
          typeof token.balance === 'string' ? token.balance : '';
        const looksClean = /^\d+(\.\d+)?$/.test(raw);
        if (looksClean) {
          setAmount(trimZeros(raw) || '0');
        } else {
          const decimals = Math.min(token.decimals || 8, 18);
          setAmount(trimZeros(balanceNum.toFixed(decimals)) || '0');
        }
      }
      return;
    }
    if (isUSD && priceNum > 0) {
      setAmount(
        floorToDecimals((balanceNum * priceNum * p) / 100, 2).toFixed(
          2,
        ),
      );
    } else {
      const v = floorToDecimals((balanceNum * p) / 100, 8);
      setAmount(trimZeros(v.toFixed(8)) || '0');
    }
  };

  const toggleCurrency = () => {
    if (!hasPrice) return;
    const n = parseFloat(amount || '0');
    setIsUSD((prev) => {
      if (prev) {
        // USD → token (floor so we don't overshoot the balance after toggle)
        setAmount(
          priceNum > 0
            ? trimZeros(
                floorToDecimals(n / priceNum, 8).toFixed(8),
              ) || '0'
            : '0',
        );
      } else {
        // token → USD (floor so the displayed USD never exceeds wallet value)
        setAmount(floorToDecimals(n * priceNum, 2).toFixed(2));
      }
      return !prev;
    });
  };

  // ── Recipient detection ────────────────────────────────────────────────
  const network = (token?.chain || 'ETHEREUM').toUpperCase();
  const isValidAddress = useMemo(() => {
    if (!searchQuery) return false;
    if (network === 'SOLANA')
      return validateSolanaAddress(searchQuery.trim());
    return validateEthereumAddress(searchQuery.trim());
  }, [searchQuery, network]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePickResult = (result: any) => {
    const addr =
      network === 'SOLANA'
        ? result.ensData?.solanaAddress
        : result.ensData?.evmAddress;
    if (!addr) return;
    setRecipient({
      address: addr,
      ensName: result.ens,
      isEns: true,
      avatar: result.profilePic,
    });
    setSearchQuery(result.ens || addr);
    setSearchResults([]);
  };

  const handlePickAddress = () => {
    setRecipient({
      address: searchQuery.trim(),
      isEns: false,
    });
    setSearchResults([]);
  };

  const clearRecipient = () => {
    setRecipient(null);
    setSearchQuery('');
  };

  const overBalance = tokenEquivalent > balanceNum + 1e-9;
  const amountReady = tokenEquivalent > 0 && !overBalance;
  const recipientReady = !!recipient;

  // Link-mode helpers
  const maxWalletsNum = parseInt(maxWalletsInput || '0', 10) || 0;
  const tokensPerWallet =
    maxWalletsNum > 0 && tokenEquivalent > 0
      ? tokenEquivalent / maxWalletsNum
      : 0;
  // Each unique claimant needs a token account funded with rent — same cost
  // model used inside <RedeemModal>.
  const requiredSol =
    maxWalletsNum > 0 && tokenEquivalent > 0
      ? maxWalletsNum * RENT_PER_TOKEN_ACCOUNT
      : 0;
  const hasInsufficientSol =
    requiredSol > 0 && solBalance < requiredSol;
  const linkReady =
    amountReady && maxWalletsNum > 0 && !hasInsufficientSol;
  const isCreatingLink = linkStatus === 'processing';

  const canReview =
    method === 'link'
      ? linkReady && !isCreatingLink
      : amountReady && recipientReady;

  const handleReview = () => {
    if (method === 'link') {
      if (!linkReady || isCreatingLink) return;
      createLink({
        token: {
          name: token.name,
          symbol: token.symbol,
          address: token.address,
          decimals: token.decimals,
          logo: token.logoURI,
          logoURI: token.logoURI,
          isNative: token.isNative,
        },
        totalAmount: tokenEquivalent,
        maxWallets: maxWalletsNum,
        tokensPerWallet,
      });
      return;
    }
    if (!amountReady || !recipient) return;
    setSendFlow((prev) => ({
      ...prev,
      amount,
      isUSD,
      recipient,
      step: 'confirm',
    }));
  };

  const presetIsActive = (preset: number) =>
    !customWalletsActive && maxWalletsNum === preset;

  const handlePickPreset = (preset: number) => {
    setCustomWalletsActive(false);
    setMaxWalletsInput(String(preset));
  };

  const handlePickCustom = () => {
    setCustomWalletsActive(true);
    setMaxWalletsInput('');
  };

  const handleMaxWalletsChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setMaxWalletsInput(cleaned);
  };

  const handleCopyLink = async () => {
    if (!redeemLink) return;
    try {
      await navigator.clipboard.writeText(redeemLink);
      toast({ title: 'Link copied' });
    } catch {
      // Clipboard can fail (e.g. permissions / non-secure ctx) — fall through.
    }
  };

  if (!token) return null;

  const networkLabel = NETWORK_LABELS[network] || token.chain;
  const tokenAmountStr = `${
    trimZeros(tokenEquivalent.toFixed(6)) || '0'
  } ${token.symbol}`;
  const usdAmountStr = `$${formatAmountForTotal(usdEquivalent, 2)}`;

  const ctaLabel = !amountReady
    ? overBalance
      ? 'Insufficient balance'
      : 'Enter amount'
    : method === 'link'
      ? isCreatingLink
        ? 'Creating link…'
        : maxWalletsNum <= 0
          ? 'Set claim count'
          : hasInsufficientSol
            ? 'Not enough SOL for rent'
            : `Create link · ${tokenAmountStr}`
      : !recipientReady
        ? 'Add recipient'
        : `Review send · ${tokenAmountStr}`;

  // ── Success view (link mode) — replaces the form once the pool is created.
  if (linkStatus === 'success' && redeemLink) {
    const perWalletStr = tokensPerWallet
      ? `${tokensPerWallet.toFixed(4)} ${token.symbol}`
      : `${token.symbol}`;
    return (
      <CustomModal
        isOpen={open}
        onCloseModal={onOpenChange}
        removeCloseButton
        width="max-w-[540px]"
      >
        <div className="bg-white p-7 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your link is ready
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              Share it with anyone — each claim is{' '}
              <span className="font-medium text-gray-700">
                {perWalletStr}
              </span>
              {maxWalletsNum > 0 && (
                <>
                  {' '}
                  up to{' '}
                  <span className="font-medium text-gray-700">
                    {maxWalletsNum} wallets
                  </span>
                </>
              )}
              .
            </p>
          </div>

          <div className="w-full flex items-center gap-2 bg-[#fafafa] border border-black/[0.06] rounded-xl px-3 py-2.5">
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span
              className="flex-1 text-[12.5px] text-gray-700 truncate"
              style={{ fontFamily: MONO }}
            >
              {redeemLink}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-gray-900 px-2 py-1 rounded-md hover:bg-white transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                'Claim your tokens here: ' + redeemLink,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/[0.06] text-[13px] font-semibold text-gray-900 hover:bg-gray-50 transition"
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                'Claim your tokens: ' + redeemLink,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-black/[0.06] text-[13px] font-semibold text-gray-900 hover:bg-gray-50 transition"
            >
              Share on X
            </a>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-[14px] font-bold hover:bg-gray-800 transition"
          >
            Done
          </button>
        </div>
      </CustomModal>
    );
  }

  return (
    <CustomModal
      isOpen={open}
      onCloseModal={onOpenChange}
      removeCloseButton
      width="max-w-[540px]"
    >
      <div className="bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              SEND
            </span>
            <span className="text-[11.5px] text-gray-500 truncate">
              {linkAvailable
                ? 'Send via address or shareable link'
                : 'Transfer crypto to a wallet, ENS, or Swop user'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="w-7 h-7 rounded-lg border border-black/[0.06] bg-[#fafafa] flex items-center justify-center hover:bg-gray-100 transition flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Method tabs — Solana only */}
        {linkAvailable && (
          <div className="px-6 pt-5 pb-1">
            <div
              className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-black/[0.06] bg-[#fafafa]"
              role="tablist"
              aria-label="Send method"
            >
              {[
                {
                  id: 'address' as const,
                  label: 'To address',
                  sub: 'wallet · ENS · @user',
                  Icon: Search,
                },
                {
                  id: 'link' as const,
                  label: 'Send via link',
                  sub: 'claim from anywhere',
                  Icon: Gift,
                },
              ].map(({ id, label, sub, Icon }) => {
                const active = method === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMethod(id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                      active
                        ? 'bg-white shadow-sm'
                        : 'bg-transparent hover:bg-white/60'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-lg border border-black/[0.06] bg-[#fafafa] inline-flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-900" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-gray-900 leading-tight truncate">
                        {label}
                      </span>
                      <span
                        className="block text-[10px] text-gray-500 mt-0.5 truncate"
                        style={{ fontFamily: MONO }}
                      >
                        {sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* From — current asset */}
        <div
          className={
            linkAvailable ? 'px-6 pt-3 pb-2' : 'px-6 pt-5 pb-2'
          }
        >
          <SectionLabel>From</SectionLabel>
          <div className="w-full flex items-center justify-between p-3 rounded-xl border border-black/[0.06] bg-[#fafafa]">
            <div className="flex items-center gap-3 min-w-0">
              <TokenImage token={token} width={32} height={32} />
              <div className="text-left min-w-0">
                <div className="text-[13.5px] font-semibold text-gray-900 truncate">
                  {token.name}
                </div>
                <div
                  className="text-[11px] text-gray-500 mt-0.5 tabular-nums truncate"
                  style={{ fontFamily: MONO }}
                >
                  {balanceNum.toLocaleString('en-US', {
                    maximumFractionDigits: 4,
                  })}{' '}
                  {token.symbol}
                  {hasPrice
                    ? ` · $${formatAmountForTotal(
                        balanceNum * priceNum,
                        2,
                      )}`
                    : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="px-6 pt-3 pb-2">
          <div className="flex justify-between items-center mb-2">
            <SectionLabel>Amount</SectionLabel>
            <div className="flex gap-1.5">
              {[25, 50, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium border border-black/[0.06] bg-white text-gray-900 hover:border-black/[0.15] transition"
                >
                  {p === 100 ? 'Max' : `${p}%`}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-black/[0.06] bg-[#fafafa] flex items-baseline justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                {isUSD && hasPrice && (
                  <span
                    className="text-[32px] font-semibold text-gray-900 leading-none"
                    style={{ fontFamily: MONO }}
                  >
                    $
                  </span>
                )}
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="text-[32px] font-semibold tracking-[-1px] text-gray-900 bg-transparent w-full outline-none tabular-nums"
                  style={{ fontFamily: MONO }}
                />
              </div>
              <div
                className="text-[11.5px] text-gray-500 mt-0.5 tabular-nums"
                style={{ fontFamily: MONO }}
              >
                ≈ {isUSD ? tokenAmountStr : usdAmountStr}
              </div>
            </div>
            <button
              onClick={toggleCurrency}
              type="button"
              disabled={!hasPrice}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/[0.06] bg-white text-[11.5px] font-semibold text-gray-900 hover:border-black/[0.15] transition disabled:opacity-50"
            >
              {isUSD ? 'USD' : token.symbol}
              <ArrowUpDown size={11} className="text-gray-400" />
            </button>
          </div>
          {overBalance && (
            <div className="text-[11.5px] text-red-600 mt-1.5">
              Exceeds your balance.
            </div>
          )}
        </div>

        {/* Claim-link preview — link-mode only */}
        {method === 'link' && (
          <>
            <div className="px-6 pt-3 pb-2">
              <SectionLabel>Claim link</SectionLabel>
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-black/[0.15] bg-white">
                <div className="w-9 h-9 rounded-xl bg-gray-900 inline-flex items-center justify-center flex-shrink-0">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-gray-500">
                    Generated on create · share with anyone
                  </div>
                  <div
                    className="text-[12.5px] font-semibold text-gray-900 mt-0.5 truncate"
                    style={{
                      fontFamily: MONO,
                      letterSpacing: '-0.1px',
                    }}
                  >
                    redeem.swopme.app/
                    <span className="text-gray-400">…</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Max wallets that can claim — link-mode only */}
            <div className="px-6 pt-3 pb-2">
              <SectionLabel>Options</SectionLabel>
              <div className="p-3.5 rounded-xl border border-black/[0.06] bg-[#fafafa]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12.5px] font-semibold text-gray-900">
                    Max wallets that can claim
                  </span>
                  <span
                    className="text-[11px] text-gray-500"
                    style={{ fontFamily: MONO }}
                  >
                    cap the link
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {MAX_WALLET_PRESETS.map((preset) => {
                    const active = presetIsActive(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePickPreset(preset)}
                        className={`py-2 rounded-lg text-[12px] font-semibold text-gray-900 text-center transition bg-white ${
                          active
                            ? 'border-[1.5px] border-gray-900'
                            : 'border border-black/[0.06] hover:border-black/[0.2]'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handlePickCustom}
                    className={`py-2 rounded-lg text-[12px] font-semibold text-gray-900 text-center transition bg-white ${
                      customWalletsActive
                        ? 'border-[1.5px] border-gray-900'
                        : 'border border-black/[0.06] hover:border-black/[0.2]'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {customWalletsActive && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxWalletsInput}
                    onChange={(e) =>
                      handleMaxWalletsChange(e.target.value)
                    }
                    placeholder="Number of wallets"
                    className="mt-2.5 w-full px-3 py-2 rounded-lg border border-black/[0.06] bg-white text-[13px] tabular-nums outline-none focus:border-gray-900 transition"
                    style={{ fontFamily: MONO }}
                  />
                )}
                {maxWalletsNum > 0 && tokenEquivalent > 0 && (
                  <div
                    className="mt-2.5 flex justify-between text-[11px] text-gray-500 tabular-nums"
                    style={{ fontFamily: MONO }}
                  >
                    <span>
                      Each claim · {tokensPerWallet.toFixed(4)}{' '}
                      {token.symbol}
                    </span>
                    <span>SOL rent · {requiredSol.toFixed(5)}</span>
                  </div>
                )}
                {hasInsufficientSol && (
                  <div className="text-[11.5px] text-red-600 mt-1.5">
                    Need {requiredSol.toFixed(5)} SOL to cover rent
                    for {maxWalletsNum} claim accounts (you have{' '}
                    {solBalance.toFixed(5)}).
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* To — address-mode only */}
        {method === 'address' && (
          <div className="px-6 pt-3 pb-2 relative">
            <SectionLabel>To</SectionLabel>
            {recipient ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-black/[0.06] bg-[#fafafa]">
                {recipient.avatar ? (
                  <Image
                    src={
                      isUrl(recipient.avatar)
                        ? recipient.avatar
                        : `/images/user_avator/${recipient.avatar}@3x.png`
                    }
                    alt={recipient.ensName || ''}
                    width={32}
                    height={32}
                    className="rounded-full w-8 h-8 object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-gray-900 truncate">
                    {recipient.ensName || 'Wallet address'}
                  </div>
                  <div
                    className="text-[11px] text-gray-500 mt-0.5 truncate"
                    style={{ fontFamily: MONO }}
                  >
                    {truncateAddress(recipient.address)}
                  </div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-[10.5px] font-semibold text-emerald-700 bg-emerald-50"
                  style={{ fontFamily: MONO }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  verified
                </span>
                <button
                  type="button"
                  onClick={clearRecipient}
                  aria-label="Clear recipient"
                  className="p-1 hover:bg-gray-200 rounded-md flex-shrink-0"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-black/[0.06] bg-[#fafafa]">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ENS, Swop user, or wallet address"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-gray-900 placeholder:text-gray-400"
                />
                {searching && (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
                )}
                {isValidAddress && !searching && (
                  <button
                    type="button"
                    onClick={handlePickAddress}
                    className="inline-flex items-center px-2 py-1 rounded-full text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex-shrink-0"
                    style={{ fontFamily: MONO }}
                  >
                    use
                  </button>
                )}
              </div>
            )}

            {/* Search results dropdown */}
            {!recipient && searchResults.length > 0 && (
              <div className="absolute left-6 right-6 mt-2 bg-white border border-black/[0.06] rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {searchResults.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 border-b border-black/[0.04] last:border-b-0 text-left"
                  >
                    {r.profilePic ? (
                      <Image
                        src={
                          isUrl(r.profilePic)
                            ? r.profilePic
                            : `/images/user_avator/${r.profilePic}@3x.png`
                        }
                        alt={r.ens || ''}
                        width={32}
                        height={32}
                        className="rounded-full w-8 h-8 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                        {(
                          r.name?.[0] ||
                          r.ens?.[0] ||
                          '?'
                        ).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {r.ens}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recents — address-mode only */}
        {method === 'address' &&
          !recipient &&
          connections.length > 0 && (
            <div className="px-6 pt-3 pb-2">
              <SectionLabel>Recent</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {connections.slice(0, 4).map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handlePickResult(c)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-black/[0.06] bg-white hover:bg-gray-50 transition min-w-0"
                  >
                    {c.profilePic ? (
                      <Image
                        src={
                          isUrl(c.profilePic)
                            ? c.profilePic
                            : `/images/user_avator/${c.profilePic}@3x.png`
                        }
                        alt={c.ens || ''}
                        width={28}
                        height={28}
                        className="rounded-full w-7 h-7 object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11.5px] font-semibold">
                        {(
                          c.name?.[0] ||
                          c.ens?.[0] ||
                          '?'
                        ).toUpperCase()}
                      </div>
                    )}
                    <div className="text-[11.5px] font-semibold truncate w-full text-center">
                      {c.name || c.ens}
                    </div>
                    <div
                      className="text-[9.5px] text-gray-500 truncate w-full text-center"
                      style={{ fontFamily: MONO }}
                    >
                      {c.ens || ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Fees */}
        <div className="px-6 pt-3 pb-4">
          <div className="p-3 rounded-xl border border-black/[0.06] bg-[#fafafa] divide-y divide-black/[0.05]">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[11.5px] text-gray-500">
                Network
              </span>
              <span
                className="text-[11.5px] text-gray-900 font-medium"
                style={{ fontFamily: MONO }}
              >
                {networkLabel}
              </span>
            </div>
            {/* <div className="flex justify-between items-center py-1.5">
              <span className="text-[11.5px] text-gray-500">
                Network fee
              </span>
              <span
                className="text-[11.5px] text-emerald-600 font-medium"
                style={{ fontFamily: MONO }}
              >
                Sponsored by Swop
              </span>
            </div> */}
            {method === 'link' && (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[11.5px] text-gray-500">
                  Escrow
                </span>
                <span
                  className="text-[11.5px] text-gray-900 font-medium"
                  style={{ fontFamily: MONO }}
                >
                  Swop vault · non-custodial
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[11.5px] text-gray-500">
                Total
              </span>
              <span
                className="text-[11.5px] text-gray-900 font-semibold tabular-nums"
                style={{ fontFamily: MONO }}
              >
                {usdAmountStr}
              </span>
            </div>
          </div>
        </div>

        {/* Link error inline */}
        {method === 'link' && linkStatus === 'error' && linkError && (
          <div className="px-6 -mt-1 pb-2">
            <div className="text-[11.5px] text-red-600 leading-snug">
              {linkError}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 grid grid-cols-[1fr_1.6fr] gap-2 border-t border-black/[0.04]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isCreatingLink}
            className="py-3 rounded-xl bg-[#fafafa] border border-black/[0.06] text-[14px] font-semibold text-gray-900 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReview}
            disabled={!canReview}
            className="py-3 rounded-xl bg-gray-900 text-white text-[14px] font-bold tracking-tight hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isCreatingLink && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {ctaLabel}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
