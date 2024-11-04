'use client';

import { Card } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import Image from 'next/image';

interface Token {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  price: number;
  amount: number;
  change: number;
  color: string;
  data: { value: number }[];
}

const generateChartData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    value: 50 + Math.random() * 20 + i,
  }));
};

const tokens: Token[] = [
  {
    id: 'swop',
    name: 'SWOP',
    symbol: 'Swopple',
    icon: '/assets/crypto-icons/Swop.png?height=32&width=32',
    price: 29.8799,
    amount: 2.29,
    change: 20,
    color: '#00BCD4',
    data: generateChartData(),
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '/assets/crypto-icons/BTC.png?height=32&width=32',
    price: 70000,
    amount: 2.29,
    change: 20,
    color: '#F7931A',
    data: generateChartData(),
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '/assets/crypto-icons/ETH.png?height=32&width=32',
    price: 26500,
    amount: 2.29,
    change: 20,
    color: '#627EEA',
    data: generateChartData(),
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'Polygon',
    icon: '/assets/crypto-icons/MATIC.png?height=32&width=32',
    price: 0.5,
    amount: 2.29,
    change: 20,
    color: '#8247E5',
    data: generateChartData(),
  },
  {
    id: 'usdt',
    name: 'USDT',
    symbol: 'tetherUS',
    icon: '/assets/crypto-icons/USDT.png?height=32&width=32',
    price: 1,
    amount: 2.29,
    change: 20,
    color: '#26A17B',
    data: generateChartData(),
  },
  {
    id: 'usdc',
    name: 'USDC',
    symbol: 'USDC',
    icon: '/assets/crypto-icons/USDC.png?height=32&width=32',
    price: 1,
    amount: 100.29,
    change: 0,
    color: '#2775CA',
    data: generateChartData(),
  },
];

interface TokenListProps {
  onSelectToken: (token: Token) => void;
}

export default function TokenList({ onSelectToken }: TokenListProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Tokens
        </h2>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {tokens.map((token) => (
          <TokenCard
            key={token.id}
            token={token}
            onClick={() => onSelectToken(token)}
          />
        ))}
      </div>
    </div>
  );
}

function TokenCard({
  token,
  onClick,
}: {
  token: Token;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-4 rounded-3xl shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Image
            src={token.icon}
            alt={token.name}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <h3 className="font-medium">{token.name}</h3>
            <p className="text-sm text-muted-foreground">
              {token.symbol}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[60px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={token.data}>
            <defs>
              <linearGradient
                id={`gradient-${token.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={token.color}
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor={token.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={token.color}
              fill={`url(#gradient-${token.id})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-semibold">
            ${token.price.toFixed(4)}
          </p>
          <p className="text-sm text-muted-foreground">
            {token.amount.toFixed(2)}{' '}
            {token.symbol === 'USDC' ? 'USDC' : 'BTC'}
          </p>
        </div>
        <div
          className={`text-sm ${
            token.change > 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {token.change > 0 ? '+' : ''}
          {token.change}%
        </div>
      </div>
    </Card>
  );
}

// Export tokens for use in other components
export { tokens, type Token };
