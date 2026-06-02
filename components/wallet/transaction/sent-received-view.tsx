'use client';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import Link from 'next/link';
import CustomModal from '@/components/modal/CustomModal';

const CHAINS = {
  ETHEREUM: {
    name: 'Ethereum mainnet',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
  },
  POLYGON: {
    name: 'Polygon mainnet',
    symbol: 'POL',
    explorer: 'https://polygonscan.com',
  },
  BASE: {
    name: 'Base mainnet',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
  },
  SOLANA: {
    name: 'Solana mainnet',
    symbol: 'SOL',
    explorer: 'https://solscan.io',
  },
} as const;

interface TransactionDetailsProps {
  transaction: Transaction | null;
  userAddress: string;
  network: keyof typeof CHAINS;
  isOpen: boolean;
  onClose: () => void;
}

const truncateAddress = (address: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

const formatAmount = (value: string, decimals = 6): string => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 0.01) return n.toFixed(decimals).replace(/\.?0+$/, '');
  return n.toPrecision(6);
};

const formatUsd = (value: number): string =>
  `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Avatar = ({
  children,
  bg = '#e8e8e6',
}: {
  children: React.ReactNode;
  bg?: string;
}) => (
  <div
    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-[#0a0a0c] shrink-0"
    style={{ background: bg }}
  >
    {children}
  </div>
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10.5px] font-bold tracking-[1.4px] uppercase text-zinc-500 font-mono">
    {children}
  </span>
);

const SentReceivedView = ({
  transaction,
  userAddress,
  network,
  isOpen,
  onClose,
}: TransactionDetailsProps) => {
  if (!transaction) return null;

  const chain = CHAINS[network] || CHAINS.SOLANA;

  const ts = parseInt(transaction.timeStamp, 10) * 1000;
  const d = new Date(ts);
  const dateLabel = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  const submittedLabel = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const isOutgoing =
    transaction.from?.toLowerCase() === userAddress?.toLowerCase();
  const amount = formatAmount(
    transaction.value,
    !isNaN(transaction.tokenDecimal as number)
      ? transaction.tokenDecimal
      : 6,
  );
  const usd = formatUsd(
    parseFloat(transaction.value) * (transaction.currentPrice || 0),
  );
  const feeUsd = formatUsd(
    parseFloat(transaction.networkFee) *
      (transaction.nativeTokenPrice || 0),
  );

  const isConfirmed =
    transaction.txreceipt_status === '1' ||
    (!!transaction.hash && transaction.status !== 'pending');
  const statusLabel = isConfirmed ? 'CONFIRMED' : 'PENDING';

  const timeline = [
    { l: 'Submitted', when: submittedLabel, done: true },
    { l: 'Pending', when: submittedLabel, done: true },
    {
      l: 'Confirmed',
      when: submittedLabel,
      done: isConfirmed,
      sub: 'On-chain',
    },
  ];

  const explorerUrl = `${chain.explorer}/tx/${transaction.hash}`;

  return (
    <CustomModal isOpen={isOpen} onCloseModal={onClose} width="max-w-xl">
      <div className="bg-white px-1 pb-2">
        <div className="px-5 pb-1">
          <Tag>Receipt</Tag>
          <div className="text-[17px] font-semibold tracking-[-0.3px] mt-1 text-[#0a0a0c]">
            Transaction detail
          </div>
        </div>

        {/* Hero card */}
        <div className="mx-5 mt-4 p-6 rounded-[22px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_20px_48px_-20px_rgba(10,10,12,0.18)]">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] font-bold tracking-[0.4px] ${
                  isConfirmed
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                }`}
              >
                ● {statusLabel}
              </span>
              <div className="text-[13px] text-zinc-500 mt-3 font-medium">
                {isOutgoing ? 'You sent' : 'You received'}
              </div>
              <div className="text-[34px] font-semibold tracking-[-1.2px] mt-1 font-mono leading-none text-[#0a0a0c]">
                {isOutgoing ? '−' : '+'}
                {amount}{' '}
                <span className="text-zinc-400 text-[20px]">
                  {transaction.tokenSymbol}
                </span>
              </div>
              <div className="text-[12px] text-zinc-500 mt-2 font-mono">
                ≈ {usd} · {dateLabel} · {timeLabel}
              </div>
            </div>
            <Link
              href={explorerUrl}
              target="_blank"
              className="shrink-0 h-7 px-2.5 rounded-full text-[12px] font-medium bg-white text-[#0a0a0c] border border-black/[0.06] inline-flex items-center gap-1.5 hover:bg-zinc-50"
            >
              Explorer
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* From / to panel */}
          <div className="mt-5 px-4 py-3.5 rounded-[14px] border border-black/[0.06] bg-zinc-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar>
                  {(isOutgoing ? 'Y' : truncateAddress(transaction.from).slice(
                    0,
                    1,
                  )).toUpperCase()}
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[10.5px] text-zinc-500 font-semibold">
                    From
                  </div>
                  <div className="text-[12.5px] font-semibold text-[#0a0a0c] truncate">
                    {isOutgoing ? 'your wallet' : truncateAddress(transaction.from)}
                  </div>
                  <div className="text-[10.5px] text-zinc-500 font-mono">
                    {truncateAddress(transaction.from)}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex items-center gap-3 min-w-0">
                <Avatar bg="#e8f5e9">
                  {(isOutgoing
                    ? truncateAddress(transaction.to).slice(0, 1)
                    : 'Y'
                  ).toUpperCase()}
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[10.5px] text-zinc-500 font-semibold">
                    To
                  </div>
                  <div className="text-[12.5px] font-semibold text-[#0a0a0c] truncate">
                    {isOutgoing
                      ? truncateAddress(transaction.to)
                      : 'your wallet'}
                  </div>
                  <div className="text-[10.5px] text-zinc-500 font-mono">
                    {truncateAddress(transaction.to)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mx-5 mt-4 p-5 rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
          <Tag>Status</Tag>
          <div className="mt-3 relative">
            <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-black/[0.04]" />
            {timeline.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 py-2 relative"
              >
                <div
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5 ${
                    s.done
                      ? 'bg-emerald-600 border-2 border-emerald-600'
                      : 'bg-white border-2 border-zinc-400'
                  }`}
                >
                  {s.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[#0a0a0c]">
                      {s.l}
                    </span>
                    <span className="text-[11.5px] text-zinc-500 font-mono">
                      {s.when}
                    </span>
                  </div>
                  {s.sub && (
                    <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                      {s.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div className="mx-5 mt-4 p-5 rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
          <Tag>Receipt</Tag>
          <div className="mt-3">
            {[
              ['Network', chain.name],
              ['Type', `Transfer · ${transaction.tokenSymbol || chain.symbol}`],
              [
                'Tx hash',
                <Link
                  key="hash"
                  href={explorerUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {truncateAddress(transaction.hash)}
                  <ExternalLink className="w-3 h-3" />
                </Link>,
              ],
              [
                'Network fee',
                `${parseFloat(transaction.networkFee).toFixed(6)} ${chain.symbol} · ${feeUsd}`,
              ],
            ].map(([k, v], i, arr) => (
              <div
                key={k as string}
                className={`flex justify-between items-center py-2 gap-3 ${
                  i === arr.length - 1
                    ? ''
                    : 'border-b border-dashed border-black/[0.04]'
                }`}
              >
                <span className="text-[12.5px] text-zinc-500">{k}</span>
                <span className="text-[12.5px] font-medium text-[#0a0a0c] font-mono text-right truncate">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CustomModal>
  );
};

export default SentReceivedView;
