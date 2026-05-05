'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
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

interface SendTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenData;
  setSendFlow: React.Dispatch<React.SetStateAction<SendFlowState>>;
}

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
    }
  }, [open]);

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
  const priceNum = hasPrice
    ? parseFloat(token.marketData.price)
    : 0;

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
          setAmount(
            trimZeros(balanceNum.toFixed(decimals)) || '0',
          );
        }
      }
      return;
    }
    if (isUSD && priceNum > 0) {
      setAmount(
        floorToDecimals((balanceNum * priceNum * p) / 100, 2).toFixed(2),
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
            ? trimZeros(floorToDecimals(n / priceNum, 8).toFixed(8)) ||
                '0'
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
  const canReview = amountReady && recipientReady;

  const handleReview = () => {
    if (!canReview || !recipient) return;
    setSendFlow((prev) => ({
      ...prev,
      amount,
      isUSD,
      recipient,
      step: 'confirm',
    }));
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
    : !recipientReady
    ? 'Add recipient'
    : `Review send · ${tokenAmountStr}`;

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
              Transfer crypto to a wallet, ENS, or Swop user
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

        {/* From — current asset */}
        <div className="px-6 pt-5 pb-2">
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

        {/* To */}
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
                      {(r.name?.[0] || r.ens?.[0] || '?').toUpperCase()}
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

        {/* Recents */}
        {!recipient && connections.length > 0 && (
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
                      {(c.name?.[0] || c.ens?.[0] || '?').toUpperCase()}
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
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[11.5px] text-gray-500">
                Network fee
              </span>
              <span
                className="text-[11.5px] text-emerald-600 font-medium"
                style={{ fontFamily: MONO }}
              >
                Sponsored by Swop
              </span>
            </div>
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

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 grid grid-cols-[1fr_1.6fr] gap-2 border-t border-black/[0.04]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="py-3 rounded-xl bg-[#fafafa] border border-black/[0.06] text-[14px] font-semibold text-gray-900 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReview}
            disabled={!canReview}
            className="py-3 rounded-xl bg-gray-900 text-white text-[14px] font-bold tracking-tight hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
