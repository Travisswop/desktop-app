'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useUser } from '@/lib/UserContext';
import { WalletItem } from '@/types/wallet';
import { useQuery } from '@tanstack/react-query';
import {
  getBalanceHistory,
  balanceHistoryQueryKey,
  type BalanceHistoryEntry,
  type TimePeriod as ServiceTimePeriod,
} from '@/services/balance-service';
import { PrimaryButton } from '../ui/Button/PrimaryButton';
import { BsBank2, BsSendFill, BsThreeDots } from 'react-icons/bs';
import { LuWallet } from 'react-icons/lu';
import SwapButton from '../wallet/SwapButton';
import { TbArrowsExchange2 } from 'react-icons/tb';
import { MoreHorizontal } from 'lucide-react';
import { BiQrScan } from 'react-icons/bi';
import { FaRegListAlt } from 'react-icons/fa';
import CustomModal from '../modal/CustomModal';
import WalletReceivePopup from '../wallet/WalletReceivePopup';
import WalletFundandSettingsPopup from '../wallet/WalletFundandSettingsPopup';
import { useBalanceVisibilityStore } from '@/zustandStore/useBalanceVisibilityStore';

interface BalanceChartProps {
  userId?: string;
  className?: string;
  currency?: string;
  onSelectAsset?: () => void;
  onQRClick?: () => void;
  walletData?: WalletItem[];
  tokens?: any[];
  accessToken?: string;
  onTokenRefresh?: () => void;
  totalBalance?: number; // Optional: if provided, will use this instead of fetching
  isButtonVisible?: boolean;
}

type TimePeriod =
  | '1day'
  | '7days'
  | '1month'
  | '6months'
  | '1year'
  | 'all';

const SkeletonBalanceChart = () => (
  <div className="w-full">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* Chart */}
      <Skeleton className="w-full h-[200px] mb-4 rounded-lg" />

      {/* Time Period Selector */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-md" />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  </div>
);

const BalanceChart: React.FC<BalanceChartProps> = ({
  userId,
  className = '',
  currency = '$',
  totalBalance: propTotalBalance, // Rename prop to avoid conflict
  isButtonVisible = false,
  onSelectAsset,
  onQRClick,
  walletData = [],
  tokens = [],
  accessToken = '',
  onTokenRefresh,
}) => {
  const { user } = useUser();
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimePeriod>('1day');
  // const [showBalance, setShowBalance] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [fundandSettings, setFundandSettings] = useState(false);
  const showBalance = useBalanceVisibilityStore(
    (state) => state.showBalance,
  );

  // Get the user ID (from prop or context)
  const effectiveUserId = userId || user?._id;

  // Helper function to convert component TimePeriod to service TimePeriod
  const getServicePeriod = (
    period: TimePeriod,
  ): ServiceTimePeriod => {
    const periodMap: Record<TimePeriod, ServiceTimePeriod> = {
      '1day': '1d',
      '7days': '7d',
      '1month': '30d',
      '6months': '6m',
      '1year': '1y',
      all: 'all',
    };
    return periodMap[period];
  };

  // Get snapshot type based on period (hourly for 1day, all for all, daily for others)
  const getSnapshotType = (
    period: TimePeriod,
  ): 'hourly' | 'daily' | 'all' => {
    const snapshotTypeMap: Record<
      TimePeriod,
      'hourly' | 'daily' | 'all'
    > = {
      '1day': 'hourly',
      '7days': 'daily',
      '1month': 'daily',
      '6months': 'daily',
      '1year': 'daily',
      all: 'all',
    };
    return snapshotTypeMap[period];
  };

  // NEW: Fetch balance history using optimized BalanceSnapshot API
  const {
    data: balanceHistoryData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: balanceHistoryQueryKey(
      effectiveUserId || '',
      getServicePeriod(selectedPeriod),
      getSnapshotType(selectedPeriod),
    ),
    queryFn: () =>
      getBalanceHistory({
        userId: effectiveUserId!,
        period: getServicePeriod(selectedPeriod),
        type: getSnapshotType(selectedPeriod),
      }),
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Extract balance history and current balance from query data
  const balanceHistory = balanceHistoryData?.balanceHistory || [];
  const fetchedBalance = balanceHistoryData?.currentBalance || 0;

  console.log('balanceHistoryData', balanceHistoryData);

  // Use prop balance if provided, otherwise use fetched balance
  const totalBalance =
    propTotalBalance !== undefined
      ? propTotalBalance
      : fetchedBalance;

  // Log any errors
  if (error) {
    console.error('Error fetching balance data:', error);
  }

  // Filter data based on selected time period
  const filteredData = useMemo((): BalanceHistoryEntry[] => {
    if (!balanceHistory.length) return [];

    // Sort all data by date (newest first)
    const sortedHistory = [...balanceHistory].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );

    if (selectedPeriod === 'all') {
      // Get the latest entry for each day
      const dateMap = sortedHistory.reduce(
        (acc: Record<string, BalanceHistoryEntry>, entry) => {
          const dateStr = new Date(entry.createdAt)
            .toISOString()
            .split('T')[0];
          if (!acc[dateStr]) {
            acc[dateStr] = entry;
          }
          return acc;
        },
        {},
      );

      // Convert back to array and sort chronologically
      return (Object.values(dateMap) as BalanceHistoryEntry[]).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime(),
      );
    }

    const now = new Date();
    let startDate = new Date(now.getTime());

    switch (selectedPeriod) {
      case '1day':
        startDate.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = balanceHistory.filter((entry) => {
      return new Date(entry.createdAt) >= startDate;
    });

    if (selectedPeriod === '1day') {
      return filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime(),
      );
    }

    // For other time ranges: reduce to latest entry per date
    const dateAmountMap = filtered.reduce(
      (acc: Record<string, BalanceHistoryEntry>, entry) => {
        const dateStr = new Date(entry.createdAt)
          .toISOString()
          .split('T')[0];
        const existing = acc[dateStr];
        if (
          !existing ||
          new Date(entry.createdAt) > new Date(existing.createdAt)
        ) {
          acc[dateStr] = entry;
        }
        return acc;
      },
      {},
    );

    const result: BalanceHistoryEntry[] = [];
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(0, 0, 0, 0);

    let lastKnownAmount = 0;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dateAmountMap[dateStr]) {
        lastKnownAmount = dateAmountMap[dateStr].amount;
      }

      result.push({
        createdAt: currentDate.toISOString(),
        amount: lastKnownAmount,
      });

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return result;
  }, [balanceHistory, selectedPeriod]);

  // Calculate growth percentage
  const calculateGrowthPercentage = () => {
    const nonZeroData = filteredData.filter((d) => d.amount > 0);

    if (nonZeroData.length < 2) return 0;

    const oldestValue = nonZeroData[0].amount;
    const latestValue = nonZeroData[nonZeroData.length - 1].amount;

    if (oldestValue === 0) return 0;

    const growth = ((latestValue - oldestValue) / oldestValue) * 100;
    return Number(growth.toFixed(2));
  };

  const growthPercentage = calculateGrowthPercentage();
  const isPositive = growthPercentage >= 0;

  const formatBalance = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // const formatYAxis = (value: number) => {
  //   if (value >= 1000000) {
  //     return `${currency}${(value / 1000000).toFixed(1)}M`;
  //   }
  //   if (value >= 1000) {
  //     return `${currency}${(value / 1000).toFixed(0)}k`;
  //   }
  //   return `${currency}${value}`;
  // };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-semibold">
            {currency}
            {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedPeriod === '1day'
              ? new Date(
                  payload[0].payload.createdAt,
                ).toLocaleString()
              : new Date(
                  payload[0].payload.createdAt,
                ).toLocaleDateString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: '1day', label: '1D' },
    { value: '7days', label: '1W' },
    { value: '1month', label: '1M' },
    { value: '6months', label: '6M' },
    { value: '1year', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  if (loading) {
    return <SkeletonBalanceChart />;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Balance
            </p>

            {/* Balance Display with Show/Hide Toggle */}
            {showBalance ? (
              <p className="text-lg font-semibold">
                ${formatBalance(totalBalance)}
              </p>
            ) : (
              <div className="flex items-center gap-0">
                <BsThreeDots size={24} color="gray" />
                <BsThreeDots
                  size={24}
                  color="gray"
                  className="-translate-x-0.5"
                />
              </div>
            )}
          </div>

          {isButtonVisible && (
            <div className="flex items-center gap-2">
              <PrimaryButton
                className="px-2 rounded"
                onClick={onSelectAsset}
              >
                <BsSendFill size={15} color="black" />
              </PrimaryButton>
              <PrimaryButton
                className="px-2 rounded"
                onClick={() => setShowPopup(!showPopup)}
              >
                <LuWallet size={16} color="black" />
              </PrimaryButton>
              {tokens.length > 0 ? (
                <SwapButton
                  tokens={tokens}
                  accessToken={accessToken}
                  initialInputToken=""
                  initialOutputToken=""
                  initialAmount=""
                  onTokenRefresh={onTokenRefresh}
                />
              ) : (
                <PrimaryButton className="px-2 rounded">
                  <TbArrowsExchange2 size={16} color="black" />
                </PrimaryButton>
              )}
              <PrimaryButton
                onClick={() => setFundandSettings(true)}
                className="px-2 rounded"
              >
                <MoreHorizontal size={16} color="black" />
              </PrimaryButton>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="w-full h-[200px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorValue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#CFFAD6"
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor="#EFFDF1"
                    stopOpacity={1}
                  />
                </linearGradient>
                <linearGradient
                  id="strokeGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#A2EFB9" />
                  <stop offset="100%" stopColor="#A1C7E9" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.1}
                vertical={false}
              />
              {/* X-Axis - Uncomment to show date/time labels at bottom */}
              <XAxis
                dataKey="createdAt"
                axisLine={false}
                tickLine={false}
                tick={false} // Set to false to hide labels - Change to: tick={{ fill: "#9ca3af", fontSize: 12 }}
                dy={10}
                // Uncomment below to show formatted dates
                // tickFormatter={(str) =>
                //   selectedPeriod === "1day"
                //     ? new Date(str).toLocaleTimeString([], {
                //         hour: "2-digit",
                //         minute: "2-digit",
                //       })
                //     : new Date(str).toLocaleDateString([], {
                //         month: "short",
                //         day: "numeric",
                //       })
                // }
              />

              {/* Y-Axis - Uncomment to show dollar amount labels on left */}
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={false} // Set to false to hide labels - Change to: tick={{ fill: "#9ca3af", fontSize: 12 }}
                width={0} // Remove Y-axis width to make chart start from leftmost position
                // Uncomment below to show formatted dollar amounts (and remove width={0} above)
                // tickFormatter={formatYAxis}
                // dx={-10}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#A2EFB9', strokeWidth: 1 }}
                wrapperStyle={{ outline: 'none', zIndex: 9999 }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="url(#strokeGradient)"
                strokeWidth={4}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {timePeriods.map((period) => (
            <Button
              key={period.value}
              variant={
                selectedPeriod === period.value
                  ? 'secondary'
                  : 'ghost'
              }
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className="h-8 text-xs"
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                isPositive
                  ? 'text-[#00E725] bg-[#7AE38B33]'
                  : 'text-red-500 bg-red-100 dark:bg-red-950'
              }`}
            >
              {growthPercentage > 0 ? '+' : ''}
              {growthPercentage}%
            </span>
            <span className="text-sm text-muted-foreground">
              in the last
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) =>
                setSelectedPeriod(e.target.value as TimePeriod)
              }
              className="text-sm font-medium text-[#8A2BE2] bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="1day">1 Day</option>
              <option value="7days">7 Days</option>
              <option value="1month">1 Month</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          {false && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onQRClick}
              >
                <BiQrScan className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <BsBank2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FaRegListAlt className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Address Popup */}
      {showPopup && (
        <CustomModal
          width="max-w-md"
          isOpen={showPopup}
          onCloseModal={setShowPopup}
        >
          <WalletReceivePopup />
        </CustomModal>
      )}

      {/* Wallet Fund and settings Popup */}
      {fundandSettings && (
        <CustomModal
          width="max-w-md"
          isOpen={fundandSettings}
          onCloseModal={setFundandSettings}
        >
          <WalletFundandSettingsPopup />
        </CustomModal>
      )}
    </div>
  );
};

export default BalanceChart;
