import { getWalletCurrentBalance } from "@/actions/createWallet";
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

const BalanceChart = ({ balanceHistory, walletList }: any) => {
  const [timeRange, setTimeRange] = useState("7days");
  const [currentWalletBalace, setCurrentWalletBalace] = useState(0);
  // console.log("currentWalletBalalce", currentWalletBalace);

  // Generate data with 0-filled missing dates
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now.getTime());

    // Calculate start date based on time range
    switch (timeRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "1month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "6months":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Generate all dates in range
    const datesInRange: Date[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      datesInRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create date-to-amount map
    const dateAmountMap = balanceHistory.reduce((acc: any, entry: any) => {
      const entryDate = new Date(entry.createdAt).toISOString().split("T")[0];
      acc[entryDate] = entry.amount;
      return acc;
    }, {});

    // Fill missing dates with 0
    return datesInRange.map((date) => {
      const dateStr = date.toISOString().split("T")[0];
      return {
        createdAt: date.toISOString(),
        amount: dateAmountMap[dateStr] || 0,
      };
    });
  }, [balanceHistory, timeRange]);

  useEffect(() => {
    const walletBalance = async () => {
      const data = await getWalletCurrentBalance(walletList);
      console.log("resffsfsfsf data", data);

      setCurrentWalletBalace(data.totalWalletValue);
    };
    if (walletList) {
      walletBalance();
    }
  }, [walletList]);

  return (
    <div className="bg-white my-4 p-5">
      <div>
        <h2 className="font-bold text-xl text-gray-700">Cashflow</h2>
        <p className="font-bold text-xl text-gray-700">
          ${currentWalletBalace}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
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
            tickFormatter={(str) => new Date(str).toLocaleDateString()}
          />
          <YAxis axisLine={false} tick={false} tickLine={false} />
          <Tooltip
            labelFormatter={(str) => new Date(str).toLocaleDateString()}
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
        <p className="text-[#00E725] font-semibold bg-[#7AE38B33] p-2 rounded-lg mr-2">
          +24%
        </p>
        <label>In the last</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-[#8A2BE2]"
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
const App = () => {
  const { user } = useUser();
  const [balanceData, setBalanceData] = useState([]);
  const [walletList, setWalletList] = useState({});

  console.log("users", user);
  console.log("balanceData", balanceData);

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
        console.log("result", result);
      } catch (error) {
        // setError(error);
        console.log("error", error);
      }
    };
    if (user?._id) {
      fetchData();
    }
  }, [user?._id]);

  return (
    <>
      {balanceData.length > 0 && (
        <BalanceChart balanceHistory={balanceData} walletList={walletList} />
      )}
    </>
  );
};

export default App;
