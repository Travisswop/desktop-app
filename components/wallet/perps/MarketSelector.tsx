'use client';

import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Star } from 'lucide-react';
import type { HLMarket } from '@/services/hyperliquid/types';
import { formatPrice } from '@/services/hyperliquid/types';

interface MarketSelectorProps {
  markets: HLMarket[];
  selectedCoin: string | null;
  onSelect: (market: HLMarket) => void;
  liveMids?: Record<string, string>; // from useAllMids WebSocket
  isLoading?: boolean;
}

// Pinned / featured markets shown first
const FEATURED_COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'OP', 'DOGE', 'AVAX'];

/**
 * MarketSelector
 *
 * Searchable list of all Hyperliquid perpetual markets.
 * Shows live mark prices, 24h change, and funding rate.
 * Featured markets are pinned at the top.
 */
export function MarketSelector({
  markets,
  selectedCoin,
  onSelect,
  liveMids = {},
  isLoading = false,
}: MarketSelectorProps) {
  const [search, setSearch] = useState('');
  const [showFavourites] = useState(false);

  // Merge live WS prices into market data
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
        m.name.includes(q),
    );

    // Sort: featured first, then alphabetical
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
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-xs text-gray-400 font-medium border-b border-gray-100">
        <span>Market</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
      </div>

      {/* Market list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 rounded-lg animate-pulse"
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
                className={`w-full grid grid-cols-3 items-center px-3 py-2.5 text-sm transition-colors rounded-lg mx-1 my-0.5 ${
                  isSelected
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Market name */}
                <div className="flex items-center gap-2 text-left">
                  {isFeatured && !search && (
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 text-xs">
                      {market.coin}
                    </p>
                    <p className="text-xs text-gray-400">{market.maxLeverage}x max</p>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="font-medium text-gray-800 text-xs tabular-nums">
                    ${formatPrice(market.markPrice)}
                  </p>
                </div>

                {/* 24h change */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                      isUp ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
