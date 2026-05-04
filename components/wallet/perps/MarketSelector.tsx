'use client';

import { useState, useMemo } from 'react';
import { Search, Star } from 'lucide-react';
import type { HLMarket } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface MarketSelectorProps {
  markets: HLMarket[];
  selectedCoin: string | null;
  onSelect: (market: HLMarket) => void;
  liveMids?: Record<string, string>;
  isLoading?: boolean;
}

const FEATURED_COINS = [
  'BTC',
  'ETH',
  'SOL',
  'PAXG',
  'ARB',
  'OP',
  'DOGE',
  'AVAX',
];

const COIN_DISPLAY_NAMES: Record<string, string> = {
  PAXG: 'Gold',
};

/**
 * MarketSelector — searchable list of all Hyperliquid perpetual markets
 * styled for the bento dashboard. Renders as a borderless panel that lives
 * inside a parent card (PerpsPanel wraps it).
 */
export function MarketSelector({
  markets,
  selectedCoin,
  onSelect,
  liveMids = {},
  isLoading = false,
}: MarketSelectorProps) {
  const [search, setSearch] = useState('');

  const enrichedMarkets = useMemo(
    () =>
      markets.map((m) => ({
        ...m,
        markPrice: liveMids[m.coin] ?? m.markPrice,
      })),
    [markets, liveMids],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const base = enrichedMarkets.filter(
      (m) =>
        !q ||
        m.coin.includes(q) ||
        m.name.includes(q) ||
        (COIN_DISPLAY_NAMES[m.coin] ?? '').toUpperCase().includes(q),
    );

    return base.sort((a, b) => {
      const aFeat = FEATURED_COINS.indexOf(a.coin);
      const bFeat = FEATURED_COINS.indexOf(b.coin);
      if (aFeat !== -1 && bFeat !== -1) return aFeat - bFeat;
      if (aFeat !== -1) return -1;
      if (bFeat !== -1) return 1;
      return a.coin.localeCompare(b.coin);
    });
  }, [enrichedMarkets, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2.5 pt-1.5 pb-2 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search markets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-gray-400 text-gray-900"
        />
      </div>

      {/* Column headers */}
      <div className="flex justify-between px-2.5 py-1.5 text-[10px] font-bold text-gray-500 font-mono tracking-wider">
        <span>MARKET</span>
        <span>PRICE / 24H</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No markets found
          </div>
        ) : (
          filtered.map((market) => {
            const isSelected = market.coin === selectedCoin;
            const isFeatured = FEATURED_COINS.includes(market.coin);
            const change = market.change24h;
            const isUp = change >= 0;

            return (
              <button
                key={market.coin}
                onClick={() => onSelect(market)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                  isSelected ? 'bg-[#f6f6f3]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CoinDot
                    coin={market.coin}
                    selected={isSelected}
                    featured={isFeatured && !search}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold tracking-tight text-gray-900 truncate">
                      {COIN_DISPLAY_NAMES[market.coin] ?? market.coin}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 font-mono tracking-wider">
                      {market.maxLeverage}× MAX
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold font-mono tabular-nums text-gray-900">
                    ${formatPrice(market.markPrice)}
                  </div>
                  <div
                    className={`text-[10.5px] font-mono font-semibold tabular-nums ${
                      isUp ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {change.toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function CoinDot({
  coin,
  selected,
  featured,
}: {
  coin: string;
  selected: boolean;
  featured: boolean;
}) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold ${
          selected ? 'bg-gray-900 text-white' : 'bg-[#f2f2f0] text-gray-900'
        }`}
      >
        {coin.charAt(0)}
      </div>
      {featured && (
        <Star className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-400 fill-amber-400" />
      )}
    </div>
  );
}
