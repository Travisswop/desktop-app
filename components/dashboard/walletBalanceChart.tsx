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

const BalanceChart = ({ balanceHistory }: any) => {
  const [timeRange, setTimeRange] = useState("7days"); // Default to last 7 days

  // Function to filter data based on the selected time range
  const filteredData = useMemo(() => {
    const now: any = new Date();
    return balanceHistory.filter((entry: any) => {
      const entryDate: any = new Date(entry.createdAt);
      switch (timeRange) {
        case "7days":
          return now - entryDate <= 7 * 24 * 60 * 60 * 1000;
        case "1month":
          return now - entryDate <= 30 * 24 * 60 * 60 * 1000;
        case "6months":
          return now - entryDate <= 6 * 30 * 24 * 60 * 60 * 1000;
        case "1year":
          return now - entryDate <= 365 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  }, [balanceHistory, timeRange]);

  return (
    <div className="bg-white my-4 p-5">
      <div>
        <h2 className="font-bold text-xl text-gray-700">Cashflow</h2>
        <p className="font-bold text-xl text-gray-700">$100</p>
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
            tickLine={false}
            tick={false}
            axisLine={false}
            dataKey="createdAt"
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
      <div className="flex items-center " style={{ marginBottom: "20px" }}>
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
  const balanceHistory = [
    {
      amount: 40,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-01-02T10:46:07.881Z",
    },
    {
      amount: 100,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-01-03T10:46:07.881Z",
    },
    {
      amount: 90,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-01-04T10:46:07.881Z",
    },
    {
      amount: 100,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-05T10:46:07.881Z",
    },
    {
      amount: 50,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-06T10:46:07.881Z",
    },
    {
      amount: 30,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-07T10:46:07.881Z",
    },
    {
      amount: 90,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-08T10:46:07.881Z",
    },
    {
      amount: 60,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-09T10:46:07.881Z",
    },
    {
      amount: 70,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-10T10:46:07.881Z",
    },
    {
      amount: 140,
      _id: "67ab2a6fea26089ba39b8dd8",
      createdAt: "2025-02-11T10:46:07.881Z",
    },
    {
      amount: 120,
      _id: "67abe48678c8301cf9a0e0d7",
      createdAt: "2025-02-12T00:00:06.489Z",
    },
    {
      amount: 100,
      _id: "67ad360659f74a114219e378",
      createdAt: "2025-02-13T00:00:06.258Z",
    },
  ];

  const { user } = useUser();
  const [balanceData, setBalanceData] = useState([]);

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
      {balanceData.length > 0 && <BalanceChart balanceHistory={balanceData} />}
    </>
  );
};

export default App;
