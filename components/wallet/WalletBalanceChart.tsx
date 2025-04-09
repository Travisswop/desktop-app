import { useUser } from '@/lib/UserContext';
import {
  ArrowLeftRight,
  // BadgeDollarSign,
  // QrCode,
  // Rocket,
  Wallet,
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
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

const BalanceChart = ({
  balanceHistory,
  // walletList,
  onSelectAsset,
  // onQRClick,
  walletData,
  totalTokensValue,
}: any) => {
  const [timeRange, setTimeRange] = useState('7days');
  const [showPopup, setShowPopup] = useState(false);
  const [bankShow, setBankShow] = useState(false);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(now.getTime());

    switch (timeRange) {
      case '1day':
        startDate.setTime(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = balanceHistory.filter((entry: any) => {
      return new Date(entry.createdAt) >= startDate;
    });

    if (timeRange === '1day') {
      // Use raw data for 1 day: multiple points, full timestamps
      return filtered.sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      );
    }

    // For longer ranges: reduce to latest entry per date
    const dateAmountMap = filtered.reduce((acc: any, entry: any) => {
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
    }, {});

    console.log('dateamountmap', dateAmountMap);

    const result: { createdAt: string; amount: number }[] = [];
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

  const calculateGrowthPercentage = () => {
    const nonZeroData = filteredData.filter((d: any) => d.amount > 0);

    if (nonZeroData.length < 2) return 0;

    const oldestValue = nonZeroData[0].amount;
    const latestValue = nonZeroData[nonZeroData.length - 1].amount;

    if (oldestValue === 0) return 0;

    const growth = ((latestValue - oldestValue) / oldestValue) * 100;
    return Number(growth.toFixed(2));
  };

  const growthPercentage: any = calculateGrowthPercentage();
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-xl text-gray-700">Balance</h2>
          <p className="font-bold text-xl text-gray-700 ">
            $
            {totalTokensValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <WalletChartButton
            // variant="black"
            // size="icon"
            // className={totalBalance === 0 ? "cursor-not-allowed" : ""}
            disabled={totalTokensValue === 0}
            onClick={onSelectAsset}
          >
            <IoIosSend color="black" size={18} /> Send
          </WalletChartButton>
          <WalletChartButton onClick={() => setShowPopup(!showPopup)}>
            <Wallet size={16} /> Receive
          </WalletChartButton>
          <WalletChartButton
          // onClick={() => setShowPopup(!showPopup)}
          // disabled={totalBalance === 0}
          >
            <ArrowLeftRight size={16} /> Swap
          </WalletChartButton>
          {/* <Button
            variant="black"
            size="icon"
            onClick={() => setShowPopup(!showPopup)}
          >
            <Wallet />
          </Button>
          <Button variant="black" size="icon" className="cursor-not-allowed">
            <ArrowLeftRight />
          </Button>
          <Button variant="black" size="icon" onClick={onQRClick}>
            <QrCode />
          </Button> */}
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
            tickFormatter={(str) =>
              timeRange === '1day'
                ? new Date(str).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date(str).toLocaleDateString()
            }
          />
          <YAxis
            axisLine={false}
            tick={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            labelFormatter={(str) =>
              timeRange === '1day'
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
            className={`font-semibold p-2 rounded-lg mr-2 ${
              Number(growthPercentage) >= 0
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
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-[#8A2BE2] ml-2"
          >
            <option value="1day">1 Day</option>
            <option value="7days">7 Days</option>
            <option value="1month">1 Month</option>
            <option value="6months">6 Months</option>
            <option value="1year">1 Year</option>
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
      <WalletAddressPopup walletData={walletData} show={showPopup} />
      {bankShow && (
        <AddBankModal bankShow={bankShow} setBankShow={setBankShow} />
      )}
    </div>
  );
};

const SkeletonBalanceChart = () => (
  <div className="bg-white my-4 p-5 rounded-xl">
    <div className="flex justify-between">
      <div>
        <h2 className="font-bold text-xl text-gray-700">
          <Skeleton className="h-10 w-40 rounded-full" />
        </h2>
        <p className="font-bold text-xl text-gray-700 my-2">
          <Skeleton className="h-10 w-40 rounded-full" />
        </p>
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

// Example usage with the provided data
const WalletBalanceChartForWalletPage = ({
  walletData,
  totalBalance,
  onSelectAsset,
  onQRClick,
}: any) => {
  const { user } = useUser();
  const [balanceData, setBalanceData] = useState([]);
  const [totalTokensValue, setTotalTokensValue] = useState(0);
  const [walletList, setWalletList] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/getBalance/${user._id}`
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        setWalletList(result.balanceData.wallet);
        setBalanceData(result.balanceData.balanceHistory);
        setTotalTokensValue(result.totalTokensValue);
      } catch (error) {
        // setError(error);
        console.log('error', error);
      }
    };
    if (user?._id) {
      fetchData();
    }
  }, [user?._id]);

  return (
    <>
      {balanceData.length > 0 ? (
        <BalanceChart
          balanceHistory={balanceData}
          walletList={walletList}
          onSelectAsset={onSelectAsset}
          onQRClick={onQRClick}
          walletData={walletData}
          totalTokensValue={totalTokensValue}
        />
      ) : (
        <SkeletonBalanceChart /> // Render Skeleton while loading
      )}
    </>
  );
};

export default WalletBalanceChartForWalletPage;
