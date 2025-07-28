import { useUser } from '@/lib/UserContext';
import {
  ArrowLeftRight,
  Eye,
  EyeIcon,
  EyeOff,
  EyeOffIcon,
  Wallet,
} from 'lucide-react';
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AddBankModal from './bank/AddBankModal';
import WalletAddressPopup from './wallet-address-popup';
import { Skeleton } from '../ui/skeleton';
import WalletChartButton from '../Button/WalletChartButton';
import { IoIosSend } from 'react-icons/io';
import { BsBank2, BsQrCodeScan } from 'react-icons/bs';
import { FaRegListAlt } from 'react-icons/fa';
import SwapButton from './SwapButton';
import logger from '../../utils/logger';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { WalletItem } from '@/types/wallet';
import clsx from 'clsx';

// Types
interface BalanceHistoryEntry {
  createdAt: string;
  amount: number;
}

interface Token {
  symbol: string;
  balance: string; // Changed from number to string to match TokenInfo
  // Add other token properties
}

interface BalanceChartProps {
  balanceHistory: BalanceHistoryEntry[];
  onSelectAsset: () => void;
  walletData: WalletItem[];
  totalTokensValue: number;
  accessToken: string;
  tokens: Token[];
  onTokenRefresh?: () => void;
}

interface WalletBalanceChartForWalletPageProps {
  walletData: WalletItem[];
  tokens: Token[];
  totalBalance: number;
  onSelectAsset: () => void;
  onQRClick: () => void;
  onTokenRefresh?: () => void;
}

// Constants
const TIME_RANGES = {
  ONE_DAY: '1day',
  SEVEN_DAYS: '7days',
  ONE_MONTH: '1month',
  SIX_MONTHS: '6months',
  ONE_YEAR: '1year',
} as const;

type TimeRange = (typeof TIME_RANGES)[keyof typeof TIME_RANGES];

const BalanceChart: React.FC<BalanceChartProps> = ({
  balanceHistory,
  onSelectAsset,
  walletData,
  totalTokensValue,
  accessToken,
  tokens,
  onTokenRefresh,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(
    TIME_RANGES.ONE_MONTH
  );
  const [showPopup, setShowPopup] = useState(false);
  const [bankShow, setBankShow] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const inputTokenParam = searchParams?.get('inputToken');
  const outputTokenParam = searchParams?.get('outputToken');
  const amountParam = searchParams?.get('amount');

  // Auto-hide balance after 3 seconds
  useEffect(() => {
    if (showBalance) {
      const timer = setTimeout(() => {
        setShowBalance(false);
      }, 5000); // 3 seconds
      return () => clearTimeout(timer); // cleanup
    }
  }, [showBalance]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now.getTime());

    switch (timeRange) {
      case TIME_RANGES.ONE_DAY:
        startDate.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TIME_RANGES.SEVEN_DAYS:
        startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TIME_RANGES.ONE_MONTH:
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case TIME_RANGES.SIX_MONTHS:
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case TIME_RANGES.ONE_YEAR:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = balanceHistory.filter((entry) => {
      return new Date(entry.createdAt) >= startDate;
    });

    if (timeRange === TIME_RANGES.ONE_DAY) {
      return filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      );
    }

    const dateAmountMap = filtered.reduce(
      (acc: Record<string, BalanceHistoryEntry>, entry) => {
        const dateStr = new Date(entry.createdAt)
          .toISOString()
          .split('T')[0];
        const existing = acc[dateStr];
        if (
          !existing ||
          new Date(entry.createdAt) > new Date(existing.createdAt)
        ) {
          acc[dateStr] = entry;
        }
        return acc;
      },
      {}
    );

    const result: BalanceHistoryEntry[] = [];
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(0, 0, 0, 0);

    let lastKnownAmount = 0;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dateAmountMap[dateStr]) {
        lastKnownAmount = dateAmountMap[dateStr].amount;
      }

      result.push({
        createdAt: currentDate.toISOString(),
        amount: lastKnownAmount,
      });

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return result;
  }, [balanceHistory, timeRange]);

  const calculateGrowthPercentage = useCallback(() => {
    const nonZeroData = filteredData.filter((d) => d.amount > 0);

    if (nonZeroData.length < 2) return 0;

    const oldestValue = nonZeroData[0].amount;
    const latestValue = nonZeroData[nonZeroData.length - 1].amount;

    if (oldestValue === 0) return 0;

    const growth = ((latestValue - oldestValue) / oldestValue) * 100;
    return Number(growth.toFixed(2));
  }, [filteredData]);

  const growthPercentage = calculateGrowthPercentage();

  const formatDate = useCallback(
    (date: string) => {
      return timeRange === TIME_RANGES.ONE_DAY
        ? new Date(date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        : new Date(date).toLocaleDateString();
    },
    [timeRange]
  );

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-xl text-gray-700">Balance</h2>
          <div className="flex items-center justify-center mt-1">
            <button
              onClick={() => setShowBalance((prev) => !prev)}
              className="group relative flex items-center gap-0 px-3 py-1 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 focus:outline-none"
              aria-label={
                showBalance ? 'Hide balance' : 'Show balance'
              }
            >
              <span
                className={`text-gray-600 ${showBalance && 'mr-2'}`}
              >
                $
              </span>
              {/* Balance Display */}
              <div className="relative">
                <div className="font-bold text-gray-900 tracking-tight min-w-[70px] text-left">
                  <span
                    className={`inline-block transition-all duration-700 ease-out ${showBalance
                      ? 'opacity-100 transform translate-y-0'
                      : 'opacity-0 transform translate-y-1'
                      }`}
                  >
                    {totalTokensValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Hidden State Overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out w-full ${!showBalance
                    ? 'opacity-100 transform translate-y-0'
                    : 'opacity-0 transform -translate-y-1 pointer-events-none'
                    }`}
                >
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle Icon */}
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 group-hover:border-gray-300 group-hover:shadow-sm transition-all duration-300">
                <div className="relative w-4 h-4">
                  <Eye
                    className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-500 ${showBalance
                      ? 'opacity-100 rotate-0 scale-100'
                      : 'opacity-0 rotate-180 scale-75'
                      }`}
                  />
                  <EyeOff
                    className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-500 ${!showBalance
                      ? 'opacity-100 rotate-0 scale-100'
                      : 'opacity-0 rotate-180 scale-75'
                      }`}
                  />
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WalletChartButton onClick={onSelectAsset}>
            <IoIosSend color="black" size={18} /> Send
          </WalletChartButton>
          <WalletChartButton onClick={() => setShowPopup(!showPopup)}>
            <Wallet size={16} /> Receive
          </WalletChartButton>
          <SwapButton
            tokens={tokens}
            accessToken={accessToken || ''}
            initialInputToken={inputTokenParam || ''}
            initialOutputToken={outputTokenParam || ''}
            initialAmount={amountParam || ''}
            onTokenRefresh={onTokenRefresh}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient
              id="colorValue"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#CFFAD6" stopOpacity={1} />
              <stop
                offset="100%"
                stopColor="#EFFDF1"
                stopOpacity={1}
              />
            </linearGradient>
            <linearGradient
              id="strokeGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#A2EFB9" />
              <stop offset="100%" stopColor="#A1C7E9" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis
            dataKey="createdAt"
            tickLine={false}
            tick={false}
            axisLine={false}
            tickFormatter={formatDate}
          />
          <YAxis
            axisLine={false}
            tick={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            labelFormatter={(str) =>
              timeRange === TIME_RANGES.ONE_DAY
                ? new Date(str).toLocaleString()
                : new Date(str).toLocaleDateString()
            }
            formatter={(value: number) => [
              `$${value.toLocaleString()}`,
              'Balance',
            ]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="url(#strokeGradient)"
            strokeWidth={4}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 justify-between">
        <div
          className="flex items-center"
          style={{ marginBottom: '20px' }}
        >
          <p
            className={`font-semibold p-2 rounded-lg mr-2 ${Number(growthPercentage) >= 0
              ? 'text-[#00E725] bg-[#7AE38B33]'
              : 'text-red-500 bg-red-100'
              }`}
          >
            {growthPercentage > 0 ? '+' : ''}
            {growthPercentage}%
          </p>
          <label>In the last</label>
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as TimeRange)
            }
            className="text-[#8A2BE2] ml-2"
          >
            <option value={TIME_RANGES.ONE_DAY}>1 Day</option>
            <option value={TIME_RANGES.SEVEN_DAYS}>7 Days</option>
            <option value={TIME_RANGES.ONE_MONTH}>1 Month</option>
            <option value={TIME_RANGES.SIX_MONTHS}>6 Months</option>
            <option value={TIME_RANGES.ONE_YEAR}>1 Year</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <button>
            <BsQrCodeScan size={19} />
          </button>
          <button onClick={() => setBankShow(true)}>
            <BsBank2 size={19} />
          </button>
          <button>
            <FaRegListAlt size={19} />
          </button>
        </div>
      </div>

      <WalletAddressPopup
        walletData={walletData}
        show={showPopup}
        onClose={() => setShowPopup(false)}
      />
      {bankShow && (
        <AddBankModal bankShow={bankShow} setBankShow={setBankShow} />
      )}
    </div>
  );
};

const SkeletonBalanceChart: React.FC = () => (
  <div className="bg-white my-4 p-5 rounded-xl">
    <div className="flex justify-between">
      <div>
        <h2 className="font-bold text-xl text-gray-700">
          <Skeleton className="h-10 w-40 rounded-full" />
        </h2>
        <div className="font-bold text-xl text-gray-700 my-2">
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
    <ResponsiveContainer width="100%" height={400}>
      <Skeleton className="h-full rounded-lg" />
    </ResponsiveContainer>
  </div>
);

const WalletBalanceChartForWalletPage: React.FC<
  WalletBalanceChartForWalletPageProps
> = ({
  walletData,
  tokens,
  totalBalance,
  onSelectAsset,
  onQRClick,
  onTokenRefresh,
}) => {
    const { user, accessToken } = useUser();
    const [balanceData, setBalanceData] = useState<
      BalanceHistoryEntry[]
    >([]);
    const [totalTokensValue, setTotalTokensValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchData = async () => {
        if (!user?._id) return;

        setIsLoading(true);

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/getBalance/${user._id}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          // Safely handle the response data
          if (result?.balanceData?.balanceHistory) {
            setBalanceData(result.balanceData.balanceHistory);
            setTotalTokensValue(result.totalTokensValue || 0);
          } else {
            // If data is not in expected format, set empty data
            setBalanceData([]);
            setTotalTokensValue(0);
          }
        } catch (error) {
          // Silently handle errors and set empty data
          setBalanceData([]);
          setTotalTokensValue(0);
          logger.error('Error fetching balance data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, [user?._id]);

    if (isLoading) {
      return <SkeletonBalanceChart />;
    }

    return (
      <BalanceChart
        balanceHistory={balanceData}
        onSelectAsset={onSelectAsset}
        walletData={walletData}
        totalTokensValue={totalTokensValue}
        accessToken={accessToken || ''}
        tokens={tokens}
        onTokenRefresh={onTokenRefresh}
      />
    );
  };

export default WalletBalanceChartForWalletPage;
