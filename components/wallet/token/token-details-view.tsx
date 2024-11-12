'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Send, ArrowRightLeft } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { useState } from 'react';
import { TokenData } from '@/types/token';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-sm">
        <p className="text-sm text-gray-600">
          {format(new Date(label), 'MMM d, h:mm a')}
        </p>
        <p className="text-sm font-bold">
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

interface TokenDetailsProps {
  token: TokenData;
  onBack: () => void;
}

export default function TokenDetails({
  token,
  onBack,
}: TokenDetailsProps) {
  const [dataPoint, setDataPoint] = useState('1H');
  const [chage, setChange] = useState(token.marketData.change);
  return (
    <Card className="w-full">
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full">
            <Image
              src={token.logoURI}
              alt={token.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              ${parseFloat(token.marketData.price).toFixed(4)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {token.name}
            </p>
          </div>
          <div
            className={`text-sm ${
              parseFloat(chage) > 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            <span className="font-medium">
              {parseFloat(chage) > 0 ? '+' : ''}
              {parseFloat(chage)}%
            </span>
            <div className="text-xs">Today</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <Card className="border-0 shadow-none">
          <CardContent className="pt-6 px-0 pb-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={
                    token.timeSeriesData[
                      dataPoint as keyof typeof token.timeSeriesData
                    ]
                  }
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
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) =>
                      format(new Date(timestamp), 'h:mm a')
                    }
                    type="number"
                    scale="time"
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    hide
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#4F46E5', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Tabs defaultValue={dataPoint} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="1H"
                  onClick={() => setDataPoint('1H')}
                >
                  1H
                </TabsTrigger>
                <TabsTrigger
                  value="1D"
                  onClick={() => setDataPoint('1D')}
                >
                  1D
                </TabsTrigger>
                <TabsTrigger
                  value="1W"
                  onClick={() => setDataPoint('1W')}
                >
                  1W
                </TabsTrigger>
                <TabsTrigger
                  value="1M"
                  onClick={() => setDataPoint('1M')}
                >
                  1M
                </TabsTrigger>
                <TabsTrigger
                  value="1Y"
                  onClick={() => setDataPoint('1Y')}
                >
                  1Y
                </TabsTrigger>
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
                src={token.logoURI}
                alt={token.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            </div>
            <span>
              {parseFloat(token.balance).toFixed(4)} {token.symbol}
            </span>
          </div>
          <span>
            $
            {(
              parseFloat(token.balance) *
              parseFloat(token.marketData.price)
            ).toFixed(2)}
          </span>
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
      </CardContent>
    </Card>
  );
}
