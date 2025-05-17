'use client';

import React, { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrentCashFlow } from '@/actions/cashflow';
import { useUser } from '@/lib/UserContext';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-medium">{payload[0].payload.date}</p>
        <p className="text-green-600">
          ${payload[0].value.toLocaleString()}
        </p>
        <p className="text-gray-500 text-sm">
          {payload[0].payload.transactions} transactions
        </p>
      </div>
    );
  }
  return null;
};

export default function CashflowChartPrevious() {
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [percentageChange, setPercentageChange] = useState<any>(0);
  const [totalCashflow, setTotalCashflow] = useState<any>(0);
  const [dateRange, setDateRange] = useState<number>(30); // Default to 30 days
  const { accessToken } = useUser();

  // Placeholder data for loading state
  const placeholderData = Array.from({ length: 10 }, (_, index) => ({
    date: `Day ${index + 1}`,
    value: 0,
    transactions: 0,
  }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (accessToken) {
          setIsLoading(true); // Start loading
          const monthlyCashFlow = await getCurrentCashFlow(
            accessToken,
            dateRange
          );
          setCashflowData(monthlyCashFlow.data);
          setIsLoading(false); // End loading
        }
      } catch (err: any) {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchData();
    }
  }, [accessToken, dateRange]); // Fetch data only when dateRange changes

  useEffect(() => {
    const getTotalCashflow = cashflowData.reduce(
      (total, entry) => total + (entry.value || 0),
      0
    );
    setTotalCashflow(getTotalCashflow);

    const getCurrentValue =
      cashflowData[cashflowData.length - 1]?.value || 0;
    const getPreviousValue = cashflowData[0]?.value || 1; // Avoid division by zero
    const percentageChange =
      ((getCurrentValue - getPreviousValue) / getPreviousValue) * 100;
    setPercentageChange(percentageChange.toFixed(1));
  }, [cashflowData]);

  const handleDateRangeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setDateRange(Number(event.target.value)); // Update date range when the user selects a new option
  };

  return (
    <Card className="w-full border-none rounded-xl my-4 xl:my-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">
              Cashflow
            </CardTitle>
            <div className="text-2xl font-bold text-gray-700">
              ${totalCashflow}
            </div>
          </div>
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
      <div className="h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 bg-white z-10">
            <div className="loader border-t-4 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={isLoading ? placeholderData : cashflowData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
              tick={{ fontSize: 12 }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#9BEBB5"
              strokeWidth={2.5}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <CardFooter>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 ${
              Number(percentageChange) >= 0
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {Number(percentageChange) >= 0 ? '+' : ''}
            {percentageChange}%
          </span>
          <span className="text-muted-foreground">in the last</span>
          <span className="font-medium text-[#8A2BE2]">
            {dateRange} days
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
