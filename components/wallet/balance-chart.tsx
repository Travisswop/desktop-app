'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
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

import {
  ArrowLeftRight,
  BadgeDollarSign,
  ChevronDown,
  QrCode,
  Rocket,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import WalletManager from './wallet-manager';
import { WalletItem } from '@/types/wallet';
import { useState } from 'react';
interface WalletManagerProps {
  walletData: WalletItem[];
  totalBalance: number;
}

const generateWalletData = () => {
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
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
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

export default function BalanceChart({
  walletData,
  totalBalance,
}: WalletManagerProps) {
  const data = generateWalletData();

  const currentValue = data[data.length - 1].value;
  const previousValue = data[0].value;
  const percentageChange = (
    ((currentValue - previousValue) / previousValue) *
    100
  ).toFixed(1);

  const [isWalletManagerOpen, setIsWalletManagerOpen] =
    useState(false);

  if (totalBalance === 0) {
    return (
      <Card className="w-full border-none rounded-xl">
        <CardHeader className="relative">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BadgeDollarSign />
                <CardTitle>Balance</CardTitle>
              </div>
              <div className="text-xl font-semibold ml-8 mt-2">
                ${currentValue.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="black" size="icon">
                <Rocket />
              </Button>
              <Button
                variant="black"
                size="icon"
                onClick={() => setIsWalletManagerOpen(true)}
              >
                <Wallet />
              </Button>
              <Button variant="black" size="icon">
                <ArrowLeftRight />
              </Button>
              <Button variant="black" size="icon">
                <QrCode />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No Assets Found</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Start building your portfolio by depositing or
                receiving assets to your wallet.
              </p>
            </div>
            <Button variant="outline" className="mt-4">
              <Rocket className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full border-none rounded-xl">
        <CardHeader className="relative">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BadgeDollarSign />
                <CardTitle>Balance</CardTitle>
              </div>
              <div className="text-xl font-semibold ml-8 mt-2">
                $28,304.59
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="black"
                size="icon"
                className="cursor-not-allowed"
              >
                <Rocket />
              </Button>
              <Button
                variant="black"
                size="icon"
                onClick={() => setIsWalletManagerOpen(true)}
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
              <Button
                variant="black"
                size="icon"
                className="cursor-not-allowed"
              >
                <QrCode />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
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
                      stopColor="rgba(34, 197, 94, 1)"
                    />
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
                  activeDot={{ r: 6, fill: '#22c55e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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

      {walletData && (
        <WalletManager
          walletData={walletData}
          isOpen={isWalletManagerOpen}
          onClose={() => setIsWalletManagerOpen(false)}
        />
      )}
    </>
  );
}
