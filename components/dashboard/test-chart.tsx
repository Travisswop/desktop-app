// import "./styles.css";
import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Page A",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page B",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page C",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page D",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page E",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page F",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
  {
    name: "Page G",
    uv: 0,
    pv: 0,
    amt: 0,
  },
];

export default function TestChart() {
  return (
    <div className="w-full h-[400px] bg-white mb-6 py-6">
      <ResponsiveContainer>
        {/* <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 1)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 1)" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
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
              domain={[0, 1]}
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
            /> */}
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="uv" stroke="#8884d8" fill="#8884d8" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
