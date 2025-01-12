"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Generate realistic cashflow data
const generateCashflowData = () => {
  const points = 30; // One month of data
  const data = [];
  const baseValue = 15000;
  const volatility = 0.15; // 15% volatility

  for (let i = 0; i < points; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (points - 1 - i));

    // Create more realistic fluctuations
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const trendFactor = 1 + (i / points) * 0.3; // Upward trend
    const value = baseValue * randomFactor * trendFactor;

    // Add weekly patterns
    const dayOfWeek = date.getDay();
    const weekendDip = dayOfWeek === 0 || dayOfWeek === 6 ? 0.85 : 1;

    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: Math.round(value * weekendDip),
      transactions: Math.floor(Math.random() * 15) + 5, // Random number of daily transactions
    });
  }

  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-medium">{label}</p>
        <p className="text-green-600">${payload[0].value.toLocaleString()}</p>
        <p className="text-gray-500 text-sm">
          {payload[0].payload.transactions} transactions
        </p>
      </div>
    );
  }
  return null;
};

export default function TestChart() {
  const data = generateCashflowData();
  const currentValue = data[data.length - 1].value;
  const previousValue = data[0].value;
  const percentageChange = (
    ((currentValue - previousValue) / previousValue) *
    100
  ).toFixed(1);

  console.log("test data", data);
  console.log("test currentValue", currentValue);
  console.log("test previousValue", previousValue);
  console.log("test percentageChange", percentageChange);

  return (
    <Card className="w-full border-none rounded-xl my-4 xl:my-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">Cashflow</CardTitle>
            <div className="text-3xl font-bold">
              ${currentValue.toLocaleString()}
            </div>
          </div>
          {/* <Button variant="outline" size="sm">
            Last 30 Days
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button> */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 1)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 1)" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 ${
              Number(percentageChange) >= 0
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {Number(percentageChange) >= 0 ? "+" : ""}
            {percentageChange}%
          </span>
          <span className="text-muted-foreground">in the last</span>
          <span className="font-medium text-[#8A2BE2]">30 days</span>
        </div>
      </CardFooter>
    </Card>
  );
}
