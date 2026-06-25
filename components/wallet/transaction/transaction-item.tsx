import { Transaction } from '@/types/transaction';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { ArrowRight, ArrowLeftRight } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import TokenIcon from './token-icon';

interface TransactionItemProps {
  transaction: Transaction;
  isOutgoing: boolean;
  onSelect: (transaction: Transaction) => void;
}

const CHAIN_ICONS: Record<string, string> = {
  SOLANA: '/assets/icons/solana.png',
  ETHEREUM: '/images/IconShop/eTH@3x.png',
  POLYGON: '/images/IconShop/polygon@3x.png',
  ARBITRUM: '/assets/icons/arbitrum.png',
  BASE: '/assets/icons/base.png',
};

const getChainIcon = (chainName?: string): string | null =>
  chainName ? CHAIN_ICONS[chainName.toUpperCase()] ?? null : null;

const truncate = (address: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

const formatAmount = (value: string): string => {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n === 0) return '0';
  const abs = Math.abs(n);
  // Large/normal amounts: group thousands, cap at 4 decimals.
  if (abs >= 1) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
  // Small amounts: pick enough decimals to show 4 significant digits, but
  // render in plain decimal form (never scientific notation like 1e-7).
  const decimals = Math.min(18, Math.max(4, 3 - Math.floor(Math.log10(abs))));
  return n.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
};

const formatUsd = (value: number): string => {
  if (!Number.isFinite(value)) return '$0.00';
  const sign = value < 0 ? '−' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatTime = (timeStamp: string): string => {
  const ts = parseInt(timeStamp, 10);
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const isToday = d.getTime() >= today.getTime();
  const isYesterday =
    !isToday && d.getTime() >= today.getTime() - 86400000;

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} · ${time}`;
};

const TransactionItem = ({
  transaction: tx,
  isOutgoing,
  onSelect,
}: TransactionItemProps) => {
  const isPending =
    tx.status === 'pending' ||
    (tx.txreceipt_status === undefined && !tx.hash);

  const { title, subtitle, amount, usd, sideIn } = useMemo(() => {
    if (tx.isSwapped && tx.swapped) {
      const fromAmt = formatAmount(tx.swapped.from.value);
      const toAmt = formatAmount(tx.swapped.to.value);
      return {
        title: 'Swap',
        subtitle: `${tx.swapped.from.symbol} → ${tx.swapped.to.symbol} · ${formatTime(
          tx.timeStamp,
        )}`,
        amount: `−${fromAmt} ${tx.swapped.from.symbol}`,
        usd: `+${toAmt} ${tx.swapped.to.symbol}`,
        sideIn: false,
      } as const;
    }
    const native = tx.tokenSymbol || '';
    const amt = formatAmount(tx.value);
    const sign = isOutgoing ? '−' : '+';
    const counter = isOutgoing
      ? `To ${truncate(tx.to)}`
      : `From ${truncate(tx.from)}`;
    const usdNum = parseFloat(tx.value) * (tx.currentPrice || 0);
    return {
      title: isOutgoing ? 'Send' : 'Receive',
      subtitle: `${counter} · ${formatTime(tx.timeStamp)}`,
      amount: `${sign}${amt} ${native}`,
      usd: formatUsd(isOutgoing ? -usdNum : usdNum),
      sideIn: !isOutgoing,
    } as const;
  }, [tx, isOutgoing]);

  const iconBg = sideIn ? 'bg-emerald-50' : 'bg-zinc-50';
  const amountColor = sideIn ? 'text-emerald-600' : 'text-[#0a0a0c]';
  const chainIconSrc = getChainIcon(tx.network);

  return (
    <button
      type="button"
      onClick={() => onSelect(tx)}
      className="w-full grid grid-cols-[36px_1fr_auto] gap-3.5 items-center px-6 py-3 border-t border-black/[0.04] hover:bg-zinc-50/60 transition-colors text-left"
    >
      <div className="relative w-9 h-9 shrink-0" title={tx.network}>
        <div
          className={`w-9 h-9 rounded-[10px] ${iconBg} border border-black/[0.06] inline-flex items-center justify-center overflow-hidden`}
        >
          {tx.isSwapped && tx.swapped ? (
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#0a0a0c]" />
          ) : tx.tokenSymbol ? (
            <TokenIcon symbol={tx.tokenSymbol} logo={tx.tokenLogo} />
          ) : (
            <ArrowRight
              className={`w-3.5 h-3.5 ${
                sideIn
                  ? 'text-emerald-600 rotate-180'
                  : 'text-[#0a0a0c] rotate-45'
              }`}
            />
          )}
        </div>
        {chainIconSrc && (
          <span className="absolute -bottom-1 -right-1 w-[15px] h-[15px] rounded-full bg-white border border-black/[0.08] inline-flex items-center justify-center overflow-hidden shadow-sm">
            <Image
              src={sanitizeNextImageSrc(chainIconSrc)}
              alt={tx.network}
              width={11}
              height={11}
              className="object-contain"
            />
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold tracking-[-0.1px] text-[#0a0a0c]">
            {title}
          </span>
          <span className="text-[10.5px] text-zinc-500 font-mono">
            ·{' '}
            {tx.isSwapped && tx.swapped
              ? `${tx.swapped.from.symbol}→${tx.swapped.to.symbol}`
              : tx.tokenSymbol || tx.network}
          </span>
          {isPending && (
            <span className="text-[9.5px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-px rounded tracking-[0.5px] leading-none">
              PENDING
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">
          {subtitle}
        </div>
      </div>

      <div className="text-right">
        <div
          className={`text-[13px] font-semibold font-mono whitespace-nowrap ${amountColor}`}
        >
          {amount}
        </div>
        <div className="text-[10.5px] text-zinc-500 font-mono mt-0.5">
          {usd}
        </div>
      </div>
    </button>
  );
};

export default TransactionItem;
