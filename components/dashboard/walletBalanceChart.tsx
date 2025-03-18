import { getWalletCurrentBalance } from '@/actions/createWallet';
import { useUser } from '@/lib/UserContext';
import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '../ui/skeleton';

const SkeletonBalanceChart = () => (
  <div className="bg-white my-4 p-5 rounded-xl">
    <div className="">
      <h2 className="font-bold text-xl text-gray-700">
        <Skeleton className="h-10 w-40 rounded-full" />
      </h2>
      <p className="font-bold text-xl text-gray-700 my-2">
        <Skeleton className="h-10 w-40 rounded-full" />
      </p>
    </div>
    <ResponsiveContainer width="100%" height={400}>
      <Skeleton className="h-full rounded-lg" />
    </ResponsiveContainer>
  </div>
);

const BalanceChart = ({ balanceHistory, totalTokensValue }: any) => {
  const [timeRange, setTimeRange] = useState('7days');

  // Generate data with 0-filled missing dates
  // const filteredData = useMemo(() => {
  //   const now = new Date();
  //   let startDate = new Date(now.getTime());

  //   // Calculate start date based on time range
  //   switch (timeRange) {
  //     case "7days":
  //       startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "1month":
  //       startDate.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "6months":
  //       startDate.setTime(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "1year":
  //       startDate.setTime(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  //       break;
  //     default:
  //       startDate = new Date(0);
  //   }

  //   // Generate all dates in the range
  //   const datesInRange: Date[] = [];
  //   const currentDate = new Date(startDate);
  //   currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
  //   const endDate = new Date(now);
  //   endDate.setHours(23, 59, 59, 999); // Normalize to end of day

  //   while (currentDate <= endDate) {
  //     datesInRange.push(new Date(currentDate));
  //     currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  //   }

  //   // Create a map of date strings to the latest amount for that day
  //   const dateAmountMap = balanceHistory.reduce((acc: any, entry: any) => {
  //     const entryDate = new Date(entry.createdAt).toISOString().split("T")[0]; // Extract date part
  //     const existingEntry = acc[entryDate];

  //     // If no entry exists for this date, or the current entry is newer, update the map
  //     if (
  //       !existingEntry ||
  //       new Date(entry.createdAt) > new Date(existingEntry.createdAt)
  //     ) {
  //       acc[entryDate] = entry;
  //     }

  //     return acc;
  //   }, {});

  //   // Generate the final data with missing dates set to 0
  //   return datesInRange.map((date) => {
  //     const dateStr = date.toISOString().split("T")[0]; // Extract date part
  //     const entry = dateAmountMap[dateStr];

  //     return {
  //       createdAt: date.toISOString(),
  //       amount: entry ? entry.amount : 0, // Use the latest amount or 0 if no data exists
  //     };
  //   });
  // }, [balanceHistory, timeRange]);

  // const filteredData = useMemo(() => {
  //   const now = new Date();
  //   let startDate = new Date(now.getTime());

  //   // Calculate start date based on time range
  //   switch (timeRange) {
  //     case "7days":
  //       startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "1month":
  //       startDate.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "6months":
  //       startDate.setTime(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  //       break;
  //     case "1year":
  //       startDate.setTime(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  //       break;
  //     default:
  //       startDate = new Date(0);
  //   }

  //   // Generate all dates in the range
  //   const datesInRange: Date[] = [];
  //   const currentDate = new Date(startDate);
  //   currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
  //   const endDate = new Date(now);
  //   endDate.setHours(23, 59, 59, 999); // Normalize to end of day

  //   while (currentDate <= endDate) {
  //     datesInRange.push(new Date(currentDate));
  //     currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  //   }

  //   // Create a map of date strings to amounts
  //   const dateAmountMap = balanceHistory.reduce((acc: any, entry: any) => {
  //     const entryDate = new Date(entry.createdAt).toISOString().split("T")[0]; // Extract date part
  //     acc[entryDate] = entry.amount;
  //     return acc;
  //   }, {});

  //   // Generate the final data with missing dates set to 0
  //   return datesInRange.map((date) => {
  //     const dateStr = date.toISOString().split("T")[0]; // Extract date part
  //     return {
  //       createdAt: date.toISOString(),
  //       amount: dateAmountMap[dateStr] || 0, // Use 0 if no data exists for this date
  //     };
  //   });
  // }, [balanceHistory, timeRange]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now.getTime());

    // Calculate start date based on time range
    switch (timeRange) {
      case '7days':
        startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate.setTime(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate.setTime(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Generate all dates in the range (UTC)
    const datesInRange: Date[] = [];
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0); // Normalize to start of day (UTC)
    const endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999); // Normalize to end of day (UTC)

    while (currentDate <= endDate) {
      datesInRange.push(new Date(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Move to the next day (UTC)
    }

    // Create a map of date strings to the latest amount for that day (UTC)
    const dateAmountMap = balanceHistory.reduce(
      (acc: any, entry: any) => {
        const entryDate = new Date(entry.createdAt)
          .toISOString()
          .split('T')[0]; // Extract UTC date part
        const existingEntry = acc[entryDate];

        // If no entry exists for this date, or the current entry is newer, update the map
        if (
          !existingEntry ||
          new Date(entry.createdAt) >
            new Date(existingEntry.createdAt)
        ) {
          acc[entryDate] = entry;
        }

        return acc;
      },
      {}
    );

    // Generate the final data with missing dates set to 0 (UTC)
    return datesInRange.map((date) => {
      const dateStr = date.toISOString().split('T')[0]; // Extract UTC date part
      const entry = dateAmountMap[dateStr];

      return {
        createdAt: date.toISOString(), // Use UTC date
        amount: entry ? entry.amount : 0, // Use the latest amount or 0 if no data exists
      };
    });
  }, [balanceHistory, timeRange]);

  const calculateGrowthPercentage = () => {
    if (filteredData.length < 2) return 0;
    const oldestValue = filteredData[0].amount;
    const newestValue = filteredData[filteredData.length - 1].amount;
    if (oldestValue === 0) return 0;
    return Number(
      (((newestValue - oldestValue) / oldestValue) * 100).toFixed(1)
    );
  };

  const growthPercentage: any = calculateGrowthPercentage();

  return (
    <div className="bg-white my-4 p-5 rounded-xl">
      <div>
        <h2 className="font-bold text-xl text-gray-700">Cashflow</h2>
        <p className="font-bold text-xl text-gray-700">
          $
          {totalTokensValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient
              id="colorValue"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#CFFAD6" stopOpacity={1} />
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
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis
            dataKey="createdAt"
            tickLine={false}
            tick={false}
            axisLine={false}
            tickFormatter={(str) =>
              new Date(str).toLocaleDateString()
            }
          />
          <YAxis
            axisLine={false}
            tick={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            labelFormatter={(str) =>
              new Date(str).toLocaleDateString()
            }
            formatter={(value: number) => [
              `$${value.toLocaleString()}`,
              'Balance',
            ]}
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
      <div
        className="flex items-center"
        style={{ marginBottom: '20px' }}
      >
        <p
          className={`font-semibold p-2 rounded-lg mr-2 ${
            Number(growthPercentage) >= 0
              ? 'text-[#00E725] bg-[#7AE38B33]'
              : 'text-red-500 bg-red-100'
          }`}
        >
          {growthPercentage > 0 ? '+' : ''}
          {growthPercentage}%
        </p>
        <label>In the last</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[#8A2BE2] ml-2"
        >
          <option value="7days">7 Days</option>
          <option value="1month">1 Month</option>
          <option value="6months">6 Months</option>
          <option value="1year">1 Year</option>
        </select>
      </div>
    </div>
  );
};

// Example usage with the provided data
const WalletBalanceChart = ({ isFromWallet = false }) => {
  const { user } = useUser();
  const [balanceData, setBalanceData] = useState([]);
  const [totalTokensValue, setTotalTokensValue] = useState(0);
  const [walletList, setWalletList] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/getBalance/${user._id}`
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();

        setWalletList(result.balanceData.wallet);
        setBalanceData(result.balanceData.balanceHistory);
        setTotalTokensValue(result.totalTokensValue);
      } catch (error) {
        // setError(error);
        console.log('error', error);
      }
    };
    if (user?._id) {
      fetchData();
    }
  }, [user?._id]);

  return (
    <>
      {balanceData.length > 0 ? (
        <BalanceChart
          balanceHistory={balanceData}
          walletList={walletList}
          totalTokensValue={totalTokensValue}
        />
      ) : (
        <SkeletonBalanceChart /> // Render Skeleton while loading
      )}
    </>
  );
};

export default WalletBalanceChart;
