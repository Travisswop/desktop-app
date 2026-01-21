'use client';

/**
 * MarketList Component
 *
 * Displays a list or grid of prediction markets with filtering and search.
 */

import React, { useState } from 'react';
import { Input, Select, SelectItem, Spinner, Button, Tabs, Tab } from '@nextui-org/react';
import { Search, SlidersHorizontal, TrendingUp, Clock, Activity } from 'lucide-react';
import { MarketCard } from './MarketCard';
import { useMarkets, useTrendingMarkets } from '@/lib/hooks/usePredictionMarkets';
import { usePredictionMarketsStore } from '@/zustandStore/predictionMarketsStore';
import { Market, MarketFilters } from '@/types/prediction-markets';

export const MarketList: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'trending'>('all');

  const {
    marketFilters,
    setMarketSearch,
    setMarketCategory,
    setMarketStatus,
    setMarketSortBy,
    resetFilters,
    setSelectedMarket,
  } = usePredictionMarketsStore();

  // Build filters for React Query
  const queryFilters: MarketFilters = {
    search: marketFilters.search || undefined,
    category: marketFilters.category || undefined,
    status: marketFilters.status === 'all' ? undefined : (marketFilters.status as any),
    sortBy: marketFilters.sortBy,
    sortOrder: 'desc',
    limit: 20,
  };

  // Fetch markets
  const {
    data: marketsData,
    isLoading: marketsLoading,
    error: marketsError,
    refetch: refetchMarkets,
  } = useMarkets(queryFilters, activeTab === 'all');

  // Fetch trending markets
  const {
    data: trendingMarkets,
    isLoading: trendingLoading,
    error: trendingError,
  } = useTrendingMarkets(10);

  const markets = activeTab === 'all' ? marketsData?.items || [] : trendingMarkets || [];
  const isLoading = activeTab === 'all' ? marketsLoading : trendingLoading;
  const error = activeTab === 'all' ? marketsError : trendingError;

  const handleMarketClick = (market: Market) => {
    setSelectedMarket(market);
    // Could navigate to market details page or open modal
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'sports', label: 'Sports' },
    { value: 'politics', label: 'Politics' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'finance', label: 'Finance' },
    { value: 'technology', label: 'Technology' },
  ];

  const sortOptions = [
    { value: 'volume', label: 'Volume' },
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'createdAt', label: 'Recently Created' },
    { value: 'endDate', label: 'Ending Soon' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'settled', label: 'Settled' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Prediction Markets</h2>
        <Button
          size="sm"
          variant="flat"
          startContent={<SlidersHorizontal className="w-4 h-4" />}
          onPress={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        aria-label="Market view tabs"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as 'all' | 'trending')}
        color="success"
        variant="underlined"
      >
        <Tab
          key="all"
          title={
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>All Markets</span>
            </div>
          }
        />
        <Tab
          key="trending"
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Trending</span>
            </div>
          }
        />
      </Tabs>

      {/* Search Bar */}
      <Input
        placeholder="Search markets..."
        aria-label="Search prediction markets"
        value={marketFilters.search}
        onValueChange={setMarketSearch}
        startContent={<Search className="w-4 h-4 text-gray-400" />}
        variant="bordered"
        size="lg"
        classNames={{
          input: 'text-sm',
          inputWrapper: 'border-gray-300',
        }}
      />

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <Select
            label="Category"
            aria-label="Filter by category"
            placeholder="Select category"
            selectedKeys={marketFilters.category ? [marketFilters.category] : []}
            onChange={(e) => setMarketCategory(e.target.value || null)}
            size="sm"
            variant="bordered"
          >
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Status"
            aria-label="Filter by status"
            placeholder="Select status"
            selectedKeys={[marketFilters.status]}
            onChange={(e) => setMarketStatus(e.target.value as any)}
            size="sm"
            variant="bordered"
          >
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Sort By"
            aria-label="Sort markets by"
            placeholder="Sort by"
            selectedKeys={[marketFilters.sortBy]}
            onChange={(e) => setMarketSortBy(e.target.value as any)}
            size="sm"
            variant="bordered"
          >
            {sortOptions.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </Select>

          <div className="col-span-full flex justify-end">
            <Button size="sm" variant="flat" onPress={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" color="success" aria-label="Loading markets" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-800 font-semibold">Failed to load markets</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="mt-3"
            onPress={() => refetchMarkets()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && markets.length === 0 && (
        <div className="p-12 text-center bg-gray-50 rounded-lg">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No markets found</p>
          <p className="text-gray-500 text-sm mt-1">
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {/* Markets Grid */}
      {!isLoading && !error && markets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} onClick={handleMarketClick} />
          ))}
        </div>
      )}

      {/* Load More (if needed) */}
      {!isLoading &&
        !error &&
        marketsData?.hasMore &&
        activeTab === 'all' && (
          <div className="flex justify-center py-4">
            <Button variant="flat" color="success">
              Load More
            </Button>
          </div>
        )}
    </div>
  );
};

export default MarketList;
