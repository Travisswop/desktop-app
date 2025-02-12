"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import BalanceData from "@/utils/balance.json";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  ChevronDown,
  QrCode,
  Rocket,
  Wallet,
  AlertCircle,
} from "lucide-react";
import WalletManager from "./wallet-manager";
import { WalletItem } from "@/types/wallet";
import WalletAddressPopup from "./wallet-address-popup";
import { useUser } from "@/lib/UserContext";

type TimeFrame = "daily" | "weekly" | "monthly" | "6months" | "yearly";

interface WalletManagerProps {
  walletData: WalletItem[];
  totalBalance: number;
  onSelectAsset: () => void;
  onQRClick: () => void;
}

const formatDate = (date: Date, timeFrame: TimeFrame): string => {
  switch (timeFrame) {
    case "daily":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "weekly":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "monthly":
    case "6months":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    case "yearly":
      return date.toLocaleDateString("en-US", { year: "numeric" });
    default:
      return date.toLocaleDateString();
  }
};

const getDateRange = (timeFrame: TimeFrame): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (timeFrame) {
    case "daily":
      start.setDate(end.getDate() - 7); // Show last 7 days for daily view
      break;
    case "weekly":
      start.setDate(end.getDate() - 28); // Show last 4 weeks
      break;
    case "monthly":
      start.setMonth(end.getMonth() - 6); // Show last 6 months
      break;
    case "6months":
      start.setMonth(end.getMonth() - 12); // Show last 12 months
      break;
    case "yearly":
      start.setFullYear(end.getFullYear() - 2); // Show last 2 years
      break;
  }

  return { start, end };
};

const generateEmptyData = (timeFrame: TimeFrame) => {
  const { start, end } = getDateRange(timeFrame);
  const emptyData = [];
  const value = 0; // Constant value for the straight line

  const currentDate = new Date(start);
  while (currentDate <= end) {
    emptyData.push({
      date: formatDate(new Date(currentDate), timeFrame),
      value: value,
    });

    switch (timeFrame) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "monthly":
      case "6months":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "yearly":
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
    }
  }

  return emptyData;
};

const aggregateData = (timeFrame: TimeFrame, balanceData: any) => {
  const { start, end } = getDateRange(timeFrame);
  const aggregatedData: Map<string, number> = new Map();

  if (balanceData?.balanceData?.balanceHistory) {
    // Sort balance history by date
    const sortedHistory = [...balanceData?.balanceData?.balanceHistory].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // If there's no data or only one data point, return empty data
    if (sortedHistory.length <= 1) {
      return generateEmptyData(timeFrame);
    }

    // Initialize data points for the entire range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const key = formatDate(new Date(currentDate), timeFrame);
      if (!aggregatedData.has(key)) {
        // Use the last known balance or 0 if no previous balance
        const lastBalance = Array.from(aggregatedData.values()).pop() || 0;
        aggregatedData.set(key, lastBalance);
      }

      switch (timeFrame) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "monthly":
        case "6months":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
      }
    }

    // Aggregate actual balance data
    sortedHistory.forEach((item) => {
      const date = new Date(item.createdAt);
      if (date >= start && date <= end) {
        const key = formatDate(date, timeFrame);
        aggregatedData.set(key, item.amount);
      }
    });
  }

  // Convert to array and sort
  return Array.from(aggregatedData.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-medium">{label}</p>
        <p className="text-green-600">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function BalanceChart({
  walletData,
  totalBalance,
  onSelectAsset,
  onQRClick,
}: WalletManagerProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("daily");
  const [isWalletManagerOpen, setIsWalletManagerOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [balanceData, setBalanceData] = useState<any>(null);

  const { user } = useUser();

  console.log("user", user);
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
        setBalanceData(result);
        console.log("result", result);
      } catch (error) {
        // setError(error);
        console.log("error", error);
      } finally {
        // setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const chartData = useMemo(
    () => aggregateData(timeFrame, balanceData),
    [balanceData, timeFrame]
  );

  const hasData = useMemo(
    () =>
      balanceData?.balanceData?.balanceHistory?.length > 1 &&
      chartData.some((item) => item.value > 0),
    [balanceData?.balanceData?.balanceHistory?.length, chartData]
  );

  const calculateGrowth = () => {
    if (!hasData || chartData.length < 2) return 0;
    const oldValue = chartData[0].value;
    const newValue = chartData[chartData.length - 1].value;
    return oldValue ? ((newValue - oldValue) / oldValue) * 100 : 0;
  };

  const growth = calculateGrowth();

  return (
    <div className="relative">
      <Card className="w-full border-none rounded-xl">
        <CardHeader className="relative">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BadgeDollarSign />
                <CardTitle>Balance</CardTitle>
              </div>
              <div className="text-xl font-semibold ml-8 mt-2">
                ${totalBalance.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="black"
                size="icon"
                className={totalBalance === 0 ? "cursor-not-allowed" : ""}
                disabled={totalBalance === 0}
                onClick={onSelectAsset}
              >
                <Rocket />
              </Button>
              <Button
                variant="black"
                size="icon"
                onClick={() => setShowPopup(!showPopup)}
              >
                <Wallet />
              </Button>
              <Button
                variant="black"
                size="icon"
                className="cursor-not-allowed"
              >
                <ArrowLeftRight />
              </Button>
              <Button variant="black" size="icon" onClick={onQRClick}>
                <QrCode />
              </Button>
            </div>
          </div>
        </CardHeader>

        {false ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No Assets Found</h3>
                <p className="text-sm text-muted-foreground max-w-[300px]">
                  Start building your portfolio by depositing or receiving
                  assets to your wallet.
                </p>
              </div>
            </div>
          </CardContent>
        ) : (
          <>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  {hasData ? (
                    <AreaChart
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="colorGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="rgba(34, 197, 94, 1)" />
                          <stop
                            offset="100%"
                            stopColor="rgba(59, 130, 246, 1)"
                          />
                        </linearGradient>
                        <linearGradient
                          id="areaGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(34, 197, 94, 0.2)"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(59, 130, 246, 0.05)"
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${(value / 1000).toFixed(0)}k`
                        }
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="url(#colorGradient)"
                        fill="url(#areaGradient)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: "#22c55e" }}
                      />
                    </AreaChart>
                  ) : (
                    <ComposedChart
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${(value / 1000).toFixed(0)}k`
                        }
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#e5e7eb"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-2 text-sm">
                {hasData ? (
                  <>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 ${
                        growth >= 0
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {growth >= 0 ? "+" : ""}
                      {growth.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">in the last</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Show</span>
                )}
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-sm font-medium"
                  onClick={() => {
                    const timeFrames: TimeFrame[] = [
                      "daily",
                      "weekly",
                      "monthly",
                      "6months",
                      "yearly",
                    ];
                    const currentIndex = timeFrames.indexOf(timeFrame);
                    setTimeFrame(
                      timeFrames[(currentIndex + 1) % timeFrames.length]
                    );
                  }}
                >
                  {timeFrame === "daily"
                    ? "7 days"
                    : timeFrame === "weekly"
                    ? "4 weeks"
                    : timeFrame === "monthly"
                    ? "6 months"
                    : timeFrame === "6months"
                    ? "12 months"
                    : "2 years"}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>

      <WalletAddressPopup walletData={walletData} show={showPopup} />
      {walletData && (
        <WalletManager
          walletData={walletData}
          isOpen={isWalletManagerOpen}
          onClose={() => setIsWalletManagerOpen(false)}
        />
      )}
    </div>
  );
}
