'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer } from '@/components/ui/chart';
import { Wallet, Send, ArrowRightLeft } from 'lucide-react';
import Image from 'next/image';
import { type ChartConfig } from '@/components/ui/chart';
import { Token } from './token-list';

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: '#2563eb',
  },
  mobile: {
    label: 'Mobile',
    color: '#60a5fa',
  },
} satisfies ChartConfig;
// Sample data for the chart
const generateChartData = () => {
  return Array.from({ length: 100 }, (_, i) => ({
    date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
    value: 5 + Math.sin(i / 10) * 2 + i / 10,
  }));
};

interface TokenDetailsProps {
  token: Token;
  onBack: () => void;
}

export default function TokenDetails({
  token,
  onBack,
}: TokenDetailsProps) {
  const data = generateChartData();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full">
            <Image
              src={token.icon}
              alt={token.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              ${token.price.toFixed(2)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {token.name}
            </p>
          </div>
          <div
            className={`text-sm ${
              token.change > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            <span className="font-medium">
              {token.change > 0 ? '+' : ''}
              {token.change}%
            </span>
            <div className="text-xs">Today</div>
          </div>
        </div>

        {/* Chart */}
        <Card className="border-0 shadow-none">
          <CardContent className="pt-6 px-0 pb-4">
            <ChartContainer
              config={chartConfig}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient
                      id="colorValue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#4F46E5"
                        stopOpacity={0.1}
                      />
                      <stop
                        offset="95%"
                        stopColor="#4F46E5"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4F46E5"
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <Tabs defaultValue="1D" className="w-full mt-4 ">
              <TabsList className="grid w-full grid-cols-5 ">
                <TabsTrigger value="1H">1H</TabsTrigger>
                <TabsTrigger value="1D">1D</TabsTrigger>
                <TabsTrigger value="1W">1W</TabsTrigger>
                <TabsTrigger value="1M">1M</TabsTrigger>
                <TabsTrigger value="1Y">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <div className="border-t"></div>
        {/* Balance */}
        <div className="flex justify-between text-sm text-muted-foreground my-2">
          <span>Balance</span>
          <span>Value</span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full">
              <Image
                src={token.icon}
                alt={token.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            </div>
            <span>
              {token.amount} {token.symbol}
            </span>
          </div>
          <span>${(token.price * token.amount).toFixed(2)}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Wallet
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </Button>
        </div>

        {/* History */}
        <div className="mb-6">
          <h2 className="font-semibold mb-4">History</h2>
          <div className="flex items-center justify-between py-3 border-t">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">Swapped</div>
                <div className="text-sm text-muted-foreground">
                  The Graph
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-red-500">-$1780.13</div>
              <div className="text-sm text-muted-foreground">
                11,641,551 GRT
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={onBack}
        >
          Back to Wallet
        </Button>
      </div>
    </div>
  );
}
