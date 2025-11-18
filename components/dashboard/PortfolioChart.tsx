"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

export interface PortfolioAsset {
  name: string;
  value: number;
  color: string;
  amount?: string; // Optional: actual token amount
}

interface PortfolioChartProps {
  assets: PortfolioAsset[];
  balance: string;
  title?: string;
  viewAction?: () => void;
  showViewButton?: boolean;
  className?: string;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-semibold text-sm">{data.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          ${data.value.toLocaleString()}
        </p>
        {data.amount && (
          <p className="text-xs text-muted-foreground mt-1">{data.amount}</p>
        )}
      </div>
    );
  }
  return null;
};

const PortfolioChart = ({
  assets,
  balance,
  title = "Portfolio",
  viewAction,
  showViewButton = true,
  className = "",
}: PortfolioChartProps) => {
  const handleViewClick = () => {
    if (viewAction) {
      viewAction();
    }
  };

  return (
    <div className={`w-full p-5 ${className}`}>
      <div className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {showViewButton && (
          <PrimaryButton onClick={handleViewClick} className="text-sm">
            View
          </PrimaryButton>
        )}
      </div>
      <div className="pt-6">
        <div className="flex items-center justify-center gap-8">
          {/* Chart Section */}
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={assets}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                  cursor="pointer"
                >
                  {assets.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 9999 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl font-semibold">{balance}</div>
              <div className="text-sm text-muted-foreground">Balance</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-4">
            {assets.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.amount && (
                    <span className="text-xs text-muted-foreground">
                      {item.amount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;

// Example usage:
//
// const assets = [
//   { name: "ETH", value: 12500, color: "#10b981", amount: "5.2 ETH" },
//   { name: "SWOP", value: 6004.59, color: "#d1fae5", amount: "12.5K SWOP" },
//   { name: "SOL", value: 9800, color: "#047857", amount: "450 SOL" },
// ];
//
// <PortfolioChart
//   assets={assets}
//   balance="$28,304.59"
//   viewAction={() => router.push('/portfolio')}
// />
