"use client";

import React, { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
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
import { getCurrentCashFlow } from "@/actions/cashflow";
import { useUser } from "@/lib/UserContext";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-medium">{payload[0].payload.date}</p>
        <p className="text-green-600">${payload[0].value.toLocaleString()}</p>
        <p className="text-gray-500 text-sm">
          {payload[0].payload.transactions} transactions
        </p>
      </div>
    );
  }
  return null;
};

export default function CashflowChart() {
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percentageChange, setPercentageChange] = useState<any>(0);
  const [previousValue, setPreviousValue] = useState<any>(0);
  const [currentValue, setCurrentValue] = useState<any>(0);
  const [totalCashflow, setTotalCashflow] = useState<any>(0);
  const [dateRange, setDateRange] = useState<number>(30); // Default to 30 days

  const { accessToken } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (accessToken) {
          const monthlyCashFlow = await getCurrentCashFlow(
            accessToken,
            dateRange
          );
          console.log("monthlyCashFlow", monthlyCashFlow);

          setCashflowData(monthlyCashFlow.data);
        }
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, dateRange]); // Re-fetch data when `dateRange` changes

  useEffect(() => {
    const getTotalCashflow = cashflowData.reduce(
      (total, entry) => total + (entry.value || 0),
      0
    );
    setTotalCashflow(getTotalCashflow);

    const getCurrentValue = cashflowData[cashflowData.length - 1]?.value || 0;
    setCurrentValue(getCurrentValue);
    const getPreviousValue = cashflowData[0]?.value || 1; // Avoid division by zero
    setPreviousValue(getPreviousValue);

    const percentageChange3 = (
      ((getCurrentValue - getPreviousValue) / getPreviousValue) *
      100
    ).toFixed(1);
    setPercentageChange(percentageChange3);
  }, [cashflowData]);

  const handleDateRangeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setDateRange(Number(event.target.value)); // Update date range when the user selects a new option
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Card className="w-full border-none rounded-xl my-4 xl:my-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">Cashflow</CardTitle>
            <div className="text-2xl font-bold text-gray-700">
              ${totalCashflow}
            </div>
          </div>
          {/* Dropdown for date range selection */}
          <div>
            <select
              value={dateRange}
              onChange={handleDateRangeChange}
              className="p-2 border rounded-md text-gray-700"
            >
              <option value={7}>Last 7 Days</option>
              <option value={15}>Last 15 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={cashflowData}
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
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                domain={[0, 1]} // Force the Y-axis to always have a visible range
                tickFormatter={(value) => `$${value}`}
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
          <span className="font-medium text-[#8A2BE2]">{dateRange} days</span>
        </div>
      </CardFooter>
    </Card>
  );
}
