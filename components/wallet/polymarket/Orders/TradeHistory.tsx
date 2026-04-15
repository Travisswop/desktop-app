'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import {
  useTradeActivity,
  type ActivityType,
  type TradeActivity,
} from '@/hooks/polymarket';

const PAGE_SIZE = 50;

const ACTIVITY_TYPES: { value: ActivityType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'TRADE', label: 'Trade' },
  { value: 'SPLIT', label: 'Split' },
  { value: 'MERGE', label: 'Merge' },
  { value: 'REDEEM', label: 'Redeem' },
  { value: 'REWARD', label: 'Reward' },
  { value: 'CONVERSION', label: 'Conversion' },
];

function formatRelativeTime(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function formatFullDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

interface TradeRowProps {
  trade: TradeActivity;
}

function TradeRow({ trade }: TradeRowProps) {
  const isBuy = trade.side === 'BUY';
  const price = (trade.price * 100).toFixed(0);
  const total = trade.usdcSize != null
    ? `$${Number(trade.usdcSize).toFixed(2)}`
    : `$${(trade.size * trade.price).toFixed(2)}`;

  const typeLabel = trade.type !== 'TRADE' ? trade.type : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      {/* Market header */}
      <div className="flex items-start gap-2 mb-2">
        {trade.icon ? (
          <img
            src={trade.icon}
            alt=""
            className="w-7 h-7 rounded-md flex-shrink-0 object-cover bg-gray-100"
          />
        ) : (
          <div className="w-7 h-7 rounded-md flex-shrink-0 bg-gray-200" />
        )}
        <div className="flex-1 min-w-0">
          {trade.eventSlug ? (
            <a
              href={`https://polymarket.com/event/${trade.eventSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug hover:text-blue-600 transition-colors"
            >
              {trade.title}
            </a>
          ) : (
            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">
              {trade.title}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Side badge */}
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            isBuy
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {trade.side}
        </span>

        {/* Outcome */}
        <span className="text-xs text-gray-600 font-medium">
          {trade.outcome}
        </span>

        {/* Type badge for non-trade */}
        {typeLabel && (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
            {typeLabel}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Time */}
        <span
          className="text-xs text-gray-400 cursor-default"
          title={formatFullDate(trade.timestamp)}
        >
          {formatRelativeTime(trade.timestamp)}
        </span>
      </div>

      {/* Numeric details */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-50">
        <div>
          <p className="text-[10px] text-gray-400">Price</p>
          <p className="text-xs font-semibold text-gray-800">{price}¢</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Shares</p>
          <p className="text-xs font-semibold text-gray-800">
            {Number(trade.size).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400">Total</p>
          <p className="text-xs font-semibold text-gray-800">{total}</p>
        </div>
      </div>

      {/* Tx hash */}
      {trade.transactionHash && (
        <div className="mt-2 pt-1">
          <a
            href={`https://polygonscan.com/tx/${trade.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {truncateHash(trade.transactionHash)}
          </a>
        </div>
      )}
    </div>
  );
}

interface TradeHistoryProps {
  walletAddress: string | undefined;
}

export default function TradeHistory({ walletAddress }: TradeHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | ''>('');
  const [sideFilter, setSideFilter] = useState<'BUY' | 'SELL' | ''>('');
  const [sort, setSort] = useState<'ASC' | 'DESC'>('DESC');
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Date range (unix timestamps)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const startTs = startDate
    ? Math.floor(new Date(startDate).getTime() / 1000)
    : undefined;
  const endTs = endDate
    ? Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000)
    : undefined;

  const { data: trades = [], isLoading } = useTradeActivity({
    user: walletAddress,
    limit: PAGE_SIZE,
    offset,
    type: typeFilter,
    side: sideFilter,
    start: startTs,
    end: endTs,
    sort,
  });

  const resetPagination = useCallback(() => setOffset(0), []);

  const handleTypeChange = (val: ActivityType | '') => {
    setTypeFilter(val);
    resetPagination();
  };

  const handleSideChange = (val: 'BUY' | 'SELL' | '') => {
    setSideFilter(val);
    resetPagination();
  };

  const handleSortToggle = () => {
    setSort((s) => (s === 'DESC' ? 'ASC' : 'DESC'));
    resetPagination();
  };

  const handleStartDate = (val: string) => {
    setStartDate(val);
    resetPagination();
  };

  const handleEndDate = (val: string) => {
    setEndDate(val);
    resetPagination();
  };

  const canGoBack = offset > 0;
  const canGoForward = trades.length === PAGE_SIZE;

  if (!walletAddress) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
          Connect a wallet to view trade history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {/* Type selector */}
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value as ActivityType | '')}
          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-gray-400"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Side toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {(['', 'BUY', 'SELL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSideChange(s)}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                sideFilter === s
                  ? s === 'BUY'
                    ? 'bg-green-500 text-white'
                    : s === 'SELL'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <button
          onClick={handleSortToggle}
          className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          title={sort === 'DESC' ? 'Newest first' : 'Oldest first'}
        >
          {sort === 'DESC' ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {/* Date range toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            showFilters || startDate || endDate
              ? 'bg-gray-800 border-gray-800 text-white'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
          title="Date range"
        >
          <Filter className="w-3 h-3" />
        </button>
      </div>

      {/* Date range inputs */}
      {showFilters && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 mb-0.5">From</p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDate(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 mb-0.5">To</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDate(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-gray-400"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                resetPagination();
              }}
              className="self-end mb-0.5 text-[10px] text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && trades.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No trades found.</p>
          {(typeFilter || sideFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setTypeFilter('TRADE');
                setSideFilter('');
                setStartDate('');
                setEndDate('');
                resetPagination();
              }}
              className="mt-2 text-xs text-blue-500 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Trade rows */}
      {!isLoading && trades.length > 0 && (
        <div className="space-y-2">
          {trades.map((trade, i) => (
            <TradeRow
              key={`${trade.transactionHash}-${trade.asset}-${i}`}
              trade={trade}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && (canGoBack || canGoForward) && (
        <div className="flex items-center justify-between pt-1">
          <button
            disabled={!canGoBack}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            {offset + 1}–{offset + trades.length}
          </span>
          <button
            disabled={!canGoForward}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
