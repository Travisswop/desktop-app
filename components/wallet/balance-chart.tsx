'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { ChevronDown, QrCode, Rocket, Wallet } from 'lucide-react';
import { type ChartConfig } from '@/components/ui/chart';

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

// Generate more data points for smoother curve
const generateSmoothData = () => {
  // Generate 100 points instead of 30 for smoother curve
  const points = 100;
  const data = [];

  for (let i = 0; i < points; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (points - 1 - i));

    // Create a smooth curve using sine wave for natural looking data
    const progress = i / (points - 1);
    const wave = Math.sin(progress * Math.PI);
    const baseValue = 12394;
    const maxValue = 28304;

    // Combine linear progression with wave for natural curve
    const value =
      baseValue + (maxValue - baseValue) * (0.5 + wave * 0.5);

    data.push({
      date: date.toISOString(),
      value: Math.round(value),
    });
  }

  return data;
};

export default function BalanceChart() {
  return (
    <Card className="w-full rounded-xl border-0">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Balance
              </h2>
              <div className="text-xl font-semibold">$28,304.59</div>
            </div>

            <div className="flex gap-2">
              <Button variant="black" size="icon">
                <Rocket />
              </Button>
              <Button variant="black" size="icon">
                <Wallet />
              </Button>
              <Button variant="black" size="icon">
                <QrCode />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={generateSmoothData()}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="colorGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(132, 204, 22, 1)"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(96, 165, 250, 1)"
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
                    stopColor="rgba(132, 204, 22, 0.2)"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(96, 165, 250, 0.05)"
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                hide
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                hide
                domain={['dataMin', 'dataMax']}
                padding={{ top: 20, bottom: 20 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#colorGradient)"
                fill="url(#areaGradient)"
                strokeWidth={2}
                isAnimationActive={false}
                baseLine={8000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-green-600">
            + 24%
          </span>
          <span className="text-muted-foreground">in the last</span>
          <Button
            variant="ghost"
            className="h-auto p-0 text-sm font-medium"
          >
            30 days
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
