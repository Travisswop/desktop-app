// import { getWalletCurrentBalance } from "@/actions/createWallet";
import { useUser } from "@/lib/UserContext";
import React, { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "../ui/skeleton";
import { Eye, EyeOff } from "lucide-react";

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
    <ResponsiveContainer width="100%" height={200}>
      <Skeleton className="h-full rounded-lg" />
    </ResponsiveContainer>
  </div>
);

const BalanceChart = ({ balanceHistory, totalTokensValue }: any) => {
  const [timeRange, setTimeRange] = useState("1month");
  const [showBalance, setShowBalance] = useState(false);

  const filteredData = useMemo(() => {
    // First, sort all data by date (newest first)
    const sortedHistory = [...balanceHistory].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (timeRange === "all") {
      // For "All" option, get the latest entry for each day
      const dateMap = sortedHistory.reduce((acc: any, entry: any) => {
        const dateStr = new Date(entry.createdAt).toISOString().split("T")[0];
        if (!acc[dateStr]) {
          acc[dateStr] = entry;
        }
        return acc;
      }, {});

      // Convert back to array and sort chronologically
      return Object.values(dateMap).sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    const now = new Date();
    let startDate = new Date(now.getTime());

    switch (timeRange) {
      case "1day":
        startDate.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "6months":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = balanceHistory.filter((entry: any) => {
      return new Date(entry.createdAt) >= startDate;
    });

    if (timeRange === "1day") {
      return filtered.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    // For other time ranges: reduce to latest entry per date
    const dateAmountMap = filtered.reduce((acc: any, entry: any) => {
      const dateStr = new Date(entry.createdAt).toISOString().split("T")[0];
      const existing = acc[dateStr];
      if (
        !existing ||
        new Date(entry.createdAt) > new Date(existing.createdAt)
      ) {
        acc[dateStr] = entry;
      }
      return acc;
    }, {});

    const result: { createdAt: string; amount: number }[] = [];
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(0, 0, 0, 0);

    let lastKnownAmount = 0;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
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
  }, [balanceHistory, timeRange]);

  const calculateGrowthPercentage = () => {
    const nonZeroData = filteredData.filter((d: any) => d.amount > 0);

    if (nonZeroData.length < 2) return 0;

    const oldestValue = nonZeroData[0].amount;
    const latestValue = nonZeroData[nonZeroData.length - 1].amount;

    if (oldestValue === 0) return 0;

    const growth = ((latestValue - oldestValue) / oldestValue) * 100;
    return Number(growth.toFixed(2));
  };

  const growthPercentage: any = calculateGrowthPercentage();

  return (
    <div className="bg-white p-5 rounded-xl">
      <div>
        <h2 className="font-bold text-xl text-gray-700">Cashflow</h2>
        {/* <div className="flex items-center justify-center mt-1"> */}
        <button
          onClick={() => setShowBalance((prev) => !prev)}
          className="mt-1 group relative flex items-center gap-0 px-3 py-1 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 focus:outline-none"
          aria-label={showBalance ? "Hide balance" : "Show balance"}
        >
          <span className={`text-gray-600 ${showBalance && "mr-2"}`}>$</span>
          {/* Balance Display */}
          <div className="relative">
            <div className="font-bold text-gray-900 tracking-tight min-w-[70px] text-left">
              <span
                className={`inline-block transition-all duration-700 ease-out ${
                  showBalance
                    ? "opacity-100 transform translate-y-0"
                    : "opacity-0 transform translate-y-1"
                }`}
              >
                {totalTokensValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Hidden State Overlay */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out w-full ${
                !showBalance
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform -translate-y-1 pointer-events-none"
              }`}
            >
              <div className="flex items-center gap-2 text-gray-500">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Icon */}
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 group-hover:border-gray-300 group-hover:shadow-sm transition-all duration-300">
            <div className="relative w-4 h-4">
              <Eye
                className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-500 ${
                  showBalance
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-180 scale-75"
                }`}
              />
              <EyeOff
                className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-500 ${
                  !showBalance
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-180 scale-75"
                }`}
              />
            </div>
          </div>
        </button>
        {/* </div> */}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CFFAD6" stopOpacity={1} />
              <stop offset="100%" stopColor="#EFFDF1" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
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
              timeRange === "1day"
                ? new Date(str).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(str).toLocaleDateString()
            }
          />
          <YAxis
            axisLine={false}
            tick={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={(str) =>
              timeRange === "1day"
                ? new Date(str).toLocaleString()
                : new Date(str).toLocaleDateString()
            }
            formatter={(value: number) => [
              `$${value.toLocaleString()}`,
              "Balance",
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
      <div className="flex items-center" style={{ marginBottom: "20px" }}>
        <p
          className={`font-semibold p-2 rounded-lg mr-2 ${
            Number(growthPercentage) >= 0
              ? "text-[#00E725] bg-[#7AE38B33]"
              : "text-red-500 bg-red-100"
          }`}
        >
          {growthPercentage > 0 ? "+" : ""}
          {growthPercentage}%
        </p>
        <label>In the last</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[#8A2BE2] ml-2"
        >
          <option value="1day">1 Day</option>
          <option value="7days">7 Days</option>
          <option value="1month">1 Month</option>
          <option value="6months">6 Months</option>
          <option value="1year">1 Year</option>
          <option value="all">All</option>
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
          throw new Error("Network response was not ok");
        }
        const result = await response.json();

        setWalletList(result.balanceData.wallet);
        setBalanceData(result.balanceData.balanceHistory);
        setTotalTokensValue(result.totalTokensValue);
      } catch (error) {
        // setError(error);
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
