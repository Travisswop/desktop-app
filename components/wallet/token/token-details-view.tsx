'use client';

import { useState, useEffect } from 'react';
import { useTokenTimeSeries } from '@/lib/hooks/useTokenTimeSeries';
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
import { TimeSeriesData, TokenData } from '@/types/token';

const CustomTooltip = ({
  active,
  payload,
  label,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-sm">
        <p className="text-sm text-gray-600">
          {format(new Date(label * 1000), 'MMM d, h:mm a')}
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
  const [selectedPeriod, setSelectedPeriod] = useState('1H');
  const [chartData, setChartData] = useState(
    token.timeSeriesData['1H']
  );
  const [changePercentage, setChangePercentage] = useState(
    token.marketData.change
  );

  const day = useTokenTimeSeries(token.marketData.uuid, '24h');
  const week = useTokenTimeSeries(token.marketData.uuid, '7d');
  const month = useTokenTimeSeries(token.marketData.uuid, '30d');
  const year = useTokenTimeSeries(token.marketData.uuid, '1y');

  const strokeColor = token.marketData.color;

  // Update chart data when period changes or data is fetched
  useEffect(() => {
    const timeSeriesMap: TimeSeriesData = {
      '1H': token.timeSeriesData['1H'],
      '1D': day.data?.sparklineData,
      '1W': week.data?.sparklineData,
      '1M': month.data?.sparklineData,
      '1Y': year.data?.sparklineData,
    };

    const changePercentageMap = {
      '1H': token.marketData.change,
      '1D': day.data?.change,
      '1W': week.data?.change,
      '1M': month.data?.change,
      '1Y': year.data?.change,
    };

    const newData =
      timeSeriesMap[selectedPeriod as keyof typeof timeSeriesMap];
    const newChange =
      changePercentageMap[
        selectedPeriod as keyof typeof changePercentageMap
      ];

    if (newData) {
      setChartData(newData);
      setChangePercentage(newChange);
    }
  }, [selectedPeriod, day.data, week.data, month.data, year.data]);

  return (
    <Card className="w-full border-none rounded-xl">
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
              parseFloat(changePercentage) > 0
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            <span className="font-medium">
              {parseFloat(changePercentage) > 0 ? '+' : ''}
              {parseFloat(changePercentage).toFixed(2)}%
            </span>
            <div className="text-xs">{selectedPeriod}</div>
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
                  data={chartData}
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
                        stopColor={strokeColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={strokeColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="timestamp"
                    hide={true}
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
                    cursor={{
                      stroke: `${strokeColor}`,
                      strokeWidth: 1,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={strokeColor}
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Tabs value={selectedPeriod} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="1H"
                  onClick={() => setSelectedPeriod('1H')}
                >
                  1H
                </TabsTrigger>
                <TabsTrigger
                  value="1D"
                  onClick={() => setSelectedPeriod('1D')}
                >
                  1D
                </TabsTrigger>
                <TabsTrigger
                  value="1W"
                  onClick={() => setSelectedPeriod('1W')}
                >
                  1W
                </TabsTrigger>
                <TabsTrigger
                  value="1M"
                  onClick={() => setSelectedPeriod('1M')}
                >
                  1M
                </TabsTrigger>
                <TabsTrigger
                  value="1Y"
                  onClick={() => setSelectedPeriod('1Y')}
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
