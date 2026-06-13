'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import type { HLMarket } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';
import { MarketIcon } from './MarketIcon';

const FEATURED_COINS = [
  'BTC',
  'ETH',
  'SOL',
  'SPCX',
  'BRENTOIL',
  'PAXG',
  'ARB',
  'OP',
  'DOGE',
  'AVAX',
];

const COIN_DISPLAY_NAMES: Record<string, string> = {
  PAXG: 'Gold',
  BRENTOIL: 'Oil',
  SPCX: 'SpaceX',
};

type Tab = 'trending' | 'favorites' | 'gainers' | 'all';

const TABS: { id: Tab; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'all', label: 'All markets' },
];

interface MarketSearchModalProps {
  open: boolean;
  markets: HLMarket[];
  selectedCoin: string | null;
  liveMids?: Record<string, string>;
  onSelect: (market: HLMarket) => void;
  onClose: () => void;
}

function displayCoinFor(market: HLMarket) {
  return market.displayCoin ?? market.coin.split(':').pop() ?? market.coin;
}

/**
 * MarketSearchModal — the Fresh design's command-palette market switcher.
 * Replaces the old left-rail MarketSelector. Opens over a dimmed backdrop with
 * a search box, Trending/Favorites/Gainers/All tabs, keyboard navigation, and a
 * "N perpetual markets" footer.
 */
export function MarketSearchModal({
  open,
  markets,
  selectedCoin,
  liveMids = {},
  onSelect,
  onClose,
}: MarketSearchModalProps) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('trending');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const enriched = useMemo(
    () =>
      markets.map((m) => ({
        ...m,
        markPrice: liveMids[m.coin] ?? m.markPrice,
      })),
    [markets, liveMids],
  );

  const results = useMemo(() => {
    const q = search.trim().toUpperCase();

    const matches = enriched.filter((m) => {
      if (!q) return true;
      const dc = displayCoinFor(m);
      return (
        m.coin.toUpperCase().includes(q) ||
        m.name.toUpperCase().includes(q) ||
        dc.toUpperCase().includes(q) ||
        (m.dexName ?? '').toUpperCase().includes(q) ||
        (COIN_DISPLAY_NAMES[dc] ?? '').toUpperCase().includes(q)
      );
    });

    // When the user is searching, ignore the tab and rank by relevance.
    if (q) {
      return matches.sort((a, b) => {
        const aDc = displayCoinFor(a).toUpperCase();
        const bDc = displayCoinFor(b).toUpperCase();
        const aExact = aDc === q ? 0 : aDc.startsWith(q) ? 1 : 2;
        const bExact = bDc === q ? 0 : bDc.startsWith(q) ? 1 : 2;
        if (aExact !== bExact) return aExact - bExact;
        return aDc.localeCompare(bDc);
      });
    }

    if (tab === 'favorites') {
      return matches
        .filter((m) => FEATURED_COINS.includes(displayCoinFor(m)))
        .sort(
          (a, b) =>
            FEATURED_COINS.indexOf(displayCoinFor(a)) -
            FEATURED_COINS.indexOf(displayCoinFor(b)),
        );
    }

    if (tab === 'gainers') {
      return [...matches].sort((a, b) => b.change24h - a.change24h);
    }

    if (tab === 'trending') {
      return [...matches].sort((a, b) => {
        const aVol = parseFloat(a.dayVolume) || 0;
        const bVol = parseFloat(b.dayVolume) || 0;
        return bVol - aVol;
      });
    }

    // all markets
    return [...matches].sort((a, b) => {
      const aDc = displayCoinFor(a);
      const bDc = displayCoinFor(b);
      const aFeat = FEATURED_COINS.indexOf(aDc);
      const bFeat = FEATURED_COINS.indexOf(bDc);
      if (aFeat !== -1 && bFeat !== -1) return aFeat - bFeat;
      if (aFeat !== -1) return -1;
      if (bFeat !== -1) return 1;
      return aDc.localeCompare(bDc);
    });
  }, [enriched, search, tab]);

  // Reset transient UI state each time the modal opens, and focus the input.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setTab('trending');
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  // Keep the highlighted row in range as the result set changes.
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  const commit = useCallback(
    (market: HLMarket) => {
      onSelect(market);
      onClose();
    },
    [onSelect, onClose],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const m = results[activeIdx];
        if (m) commit(m);
      }
    },
    [results, activeIdx, commit, onClose],
  );

  // Scroll the active row into view on keyboard navigation.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[8vh]"
      onMouseDown={onClose}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        className="relative w-full max-w-[560px] bg-white rounded-[20px] border border-black/[0.08] shadow-[0_24px_80px_-12px_rgba(10,10,12,0.4)] overflow-hidden flex flex-col max-h-[80vh]"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-black/[0.06]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400 text-gray-900"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {!search && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-black/[0.04]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  tab === t.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Section label */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-gray-400 font-mono uppercase">
            {!search && tab === 'trending' && (
              <TrendingUp className="w-3 h-3" />
            )}
            {search
              ? 'Results'
              : tab === 'trending'
                ? 'Trending now'
                : tab === 'favorites'
                  ? 'Favorites'
                  : tab === 'gainers'
                    ? 'Top gainers'
                    : 'All markets'}
          </span>
          <span className="text-[10px] font-bold tracking-[0.14em] text-gray-400 font-mono uppercase">
            Price / 24h
          </span>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-1.5 pb-1.5">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No markets found
            </div>
          ) : (
            results.map((market, idx) => {
              const dc = displayCoinFor(market);
              const isSelected = market.coin === selectedCoin;
              const isActive = idx === activeIdx;
              const isFav = FEATURED_COINS.includes(dc);
              const up = market.change24h >= 0;
              const vol = parseFloat(market.dayVolume) || 0;

              return (
                <button
                  key={market.coin}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => commit(market)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[12px] text-left transition-colors ${
                    isActive ? 'bg-[#f4f4f1]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MarketIcon
                      coin={market.coin}
                      favorite={isFav}
                      selected={isSelected}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold tracking-tight text-gray-900">
                          {dc}-PERP
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wide">
                          {market.maxLeverage}× max
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {COIN_DISPLAY_NAMES[dc] ?? market.name.replace(/-PERP$/i, '')}
                        {vol > 0 && (
                          <span className="text-gray-400">
                            {' · '}
                            {formatNotional(vol)} vol
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[12.5px] font-semibold font-mono tabular-nums text-gray-900">
                      ${formatPrice(market.markPrice)}
                    </div>
                    <div
                      className={`text-[11px] font-mono font-semibold tabular-nums ${
                        up ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {up ? '+' : ''}
                      {market.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-black/[0.06] flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>{markets.length} perpetual markets</span>
          <span className="hidden sm:flex items-center gap-2">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
            <Kbd>↵</Kbd>
            select
            <Kbd>esc</Kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-black/[0.08] bg-[#f7f7f5] text-[10px] font-semibold text-gray-500">
      {children}
    </kbd>
  );
}

function formatNotional(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
