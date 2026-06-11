'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useMarketContext } from '@/components/wallet/perps/hooks/useHyperliquidMarkets';

type PerpsContent = {
  platform?: string;
  marketId?: string;
  marketName?: string;
  coin?: string;
  side?: 'LONG' | 'SHORT';
  orderType?: 'market' | 'limit' | 'tpsl' | 'close';
  marginMode?: 'cross' | 'isolated';
  leverage?: number;
  sizeCoins?: number;
  sizeUsd?: number;
  entryPrice?: number;
  limitPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  marginRequired?: number;
  estFees?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  orderId?: string;
};

interface PerpsFeedCardProps {
  content: PerpsContent;
  userName?: string;
  userImage?: string;
  createdAt?: string;
}

function formatUsd(value: unknown, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatNumber(value: unknown, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S'
  );
}

export default function PerpsFeedCard({
  content,
  userName,
  userImage,
  createdAt,
}: PerpsFeedCardProps) {
  const gradientId = useId().replace(/:/g, '');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const isLong = content.side !== 'SHORT';
  const copyTradeHref = useMemo(() => {
    const params = new URLSearchParams({ perps: '1' });
    if (content.coin) params.set('coin', content.coin);
    if (content.side) params.set('side', content.side.toLowerCase());
    if (content.leverage) params.set('leverage', String(content.leverage));
    if (content.marginMode) params.set('marginMode', content.marginMode);
    if (content.sizeUsd) params.set('sizeUsd', String(content.sizeUsd));
    if (content.sizeCoins) params.set('sizeCoins', String(content.sizeCoins));
    return `/wallet?${params.toString()}`;
  }, [
    content.coin,
    content.leverage,
    content.marginMode,
    content.side,
    content.sizeCoins,
    content.sizeUsd,
  ]);
  const { data: liveMarketContext } = useMarketContext(content.coin ?? null);
  const entryPrice = Number(content.entryPrice);
  const liveMarkPrice = Number(liveMarketContext?.context?.markPx);
  const snapshotPrice = Number(content.markPrice ?? content.entryPrice);
  const currentPrice =
    Number.isFinite(liveMarkPrice) && liveMarkPrice > 0
      ? liveMarkPrice
      : Number.isFinite(snapshotPrice) && snapshotPrice > 0
        ? snapshotPrice
        : entryPrice;
  const leverage = Number(content.leverage) || 1;
  const rawReturn =
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    Number.isFinite(currentPrice)
      ? ((isLong
          ? currentPrice - entryPrice
          : entryPrice - currentPrice) /
          entryPrice) *
        100 *
        leverage
      : undefined;
  const returnColor =
    rawReturn === undefined || rawReturn >= 0
      ? 'text-[#00c73c]'
      : 'text-rose-500';
  const pillClass = isLong
    ? 'bg-[#dcffe4] text-[#20b45a] border-[#bdf4cb]'
    : 'bg-[#ffe2e5] text-[#e24b5b] border-[#fac4ca]';
  const chartWidth = 360;
  const chartHeight = 160;
  const chartYs = useMemo(
    () =>
      isLong
        ? [116, 108, 112, 96, 100, 78, 74, 50, 28, 18, 6, 5, 5, 19, 19, 38, 56, 65, 55, 60]
        : [48, 54, 44, 62, 58, 82, 76, 98, 112, 122, 136, 138, 135, 120, 116, 104, 96, 106, 112, 118],
    [isLong],
  );
  const chartPoints = useMemo(() => {
    const createdTime = createdAt ? new Date(createdAt).getTime() : NaN;
    const startTime = Number.isFinite(createdTime)
      ? createdTime
      : Date.now() - (chartYs.length - 1) * 15 * 60 * 1000;
    const endTime = Date.now();
    const duration = Math.max(1, endTime - startTime);
    const startPrice = Number.isFinite(entryPrice) && entryPrice > 0
      ? entryPrice
      : currentPrice || 1;
    const endPrice = Number.isFinite(currentPrice) && currentPrice > 0
      ? currentPrice
      : startPrice;
    const minY = Math.min(...chartYs);
    const maxY = Math.max(...chartYs);
    const yRange = maxY - minY || 1;
    const span = Math.max(Math.abs(endPrice - startPrice), startPrice * 0.08);
    const direction = isLong ? 1 : -1;

    return chartYs.map((y, index) => {
      const x = (index / (chartYs.length - 1)) * chartWidth;
      const normalized = (maxY - y) / yRange;
      const price =
        startPrice +
        (normalized - 0.45) * span * direction +
        (index / (chartYs.length - 1)) * (endPrice - startPrice);
      return {
        x,
        y,
        price: Math.max(0.000001, price),
        timestamp:
          startTime +
          (index / (chartYs.length - 1)) * duration,
      };
    });
  }, [chartYs, chartWidth, createdAt, currentPrice, entryPrice, isLong]);
  const linePath = useMemo(() => {
    if (!chartPoints.length) return '';
    const [first, ...rest] = chartPoints;
    return rest.reduce((path, point, index) => {
      const prev = chartPoints[index];
      const midX = (prev.x + point.x) / 2;
      return `${path} C ${midX},${prev.y} ${midX},${point.y} ${point.x},${point.y}`;
    }, `M ${first.x},${first.y}`);
  }, [chartPoints]);
  const areaPath = `${linePath} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;
  const avatarIndex = Math.min(8, chartPoints.length - 1);
  const avatarPoint = chartPoints[avatarIndex];
  const tooltipPoint =
    tooltipIndex !== null ? chartPoints[tooltipIndex] : null;

  const handlePointerMove = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (!chartPoints.length) return;
      const boundedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const x = (boundedX / rect.width) * chartWidth;
      const index = Math.min(
        chartPoints.length - 1,
        Math.max(
          0,
          Math.round((x / chartWidth) * (chartPoints.length - 1)),
        ),
      );
      setTooltipIndex(index);
      setTooltipVisible(true);
    },
    [chartPoints.length, chartWidth],
  );

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 1800);
  }, []);

  return (
    <div className="w-full flex justify-start mt-1">
      <div className="w-full max-w-xl">
        <div
          className="rounded-[18px] bg-white overflow-hidden cursor-pointer"
          style={{
            boxShadow:
              '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0">
                <div
                  className={`inline-flex min-w-[98px] items-center justify-center rounded-md border px-3 py-2 text-sm font-medium ${pillClass}`}
                >
                  {content.side ?? 'LONG'}
                </div>
                <p className="mt-2 text-[15px] font-medium leading-none text-black">
                  {formatNumber(content.sizeCoins)}{' '}
                  {content.coin ?? ''}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-semibold text-gray-900 leading-tight">
                  {formatUsd(currentPrice)}
                </p>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  {content.coin ?? ''} PRICE
                </p>
              </div>
            </div>
          </div>

          <div className="relative h-[160px] overflow-hidden">
            {tooltipVisible && tooltipPoint && (
              <>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 border-l border-dashed border-gray-400/70"
                  style={{ left: `${(tooltipPoint.x / chartWidth) * 100}%` }}
                />
                <div
                  className="absolute z-20 flex h-7 min-w-[92px] -translate-x-1/2 items-center justify-center rounded-lg bg-white/95 px-2 shadow-[0_1px_6px_rgba(0,0,0,0.12)]"
                  style={{
                    left: `${(tooltipPoint.x / chartWidth) * 100}%`,
                    top: Math.max(8, tooltipPoint.y - 40),
                  }}
                >
                  <span className="text-[11px] font-bold text-gray-900">
                    {formatUsd(tooltipPoint.price, 3)}
                  </span>
                </div>
                <div
                  className="absolute z-20 flex h-6 min-w-[128px] -translate-x-1/2 items-center justify-center rounded border border-gray-200 bg-white/95 px-2"
                  style={{
                    left: `${(tooltipPoint.x / chartWidth) * 100}%`,
                    top: Math.min(chartHeight - 28, tooltipPoint.y + 14),
                  }}
                >
                  <span className="text-[10px] font-medium text-gray-400">
                    {dayjs(tooltipPoint.timestamp).format('MMM D, h:mm A')}
                  </span>
                </div>
              </>
            )}
            <svg
              viewBox="0 0 360 160"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              aria-hidden="true"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handlePointerMove(e.clientX, rect);
              }}
              onMouseLeave={startHideTimer}
              onTouchMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handlePointerMove(e.touches[0].clientX, rect);
              }}
              onTouchEnd={startHideTimer}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#000000"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="62%"
                    stopColor="#000000"
                    stopOpacity="0.08"
                  />
                  <stop
                    offset="100%"
                    stopColor="#000000"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
              />
              <path
                d={linePath}
                fill="none"
                stroke="#050505"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              {tooltipVisible && tooltipPoint && (
                <circle
                  cx={tooltipPoint.x}
                  cy={tooltipPoint.y}
                  r={6}
                  stroke="#8d8d8d"
                  strokeWidth={2}
                  fill="white"
                />
              )}
            </svg>

            <div
              className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-gray-200 shadow-[0_6px_14px_rgba(0,0,0,0.18)] ring-4 ring-white"
              style={{
                left: `${(avatarPoint.x / chartWidth) * 100}%`,
                top: avatarPoint.y,
              }}
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName || 'Trader'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-gray-600">
                  {getInitials(userName)}
                </span>
              )}
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="flex items-start justify-around mb-4">
              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: '#949494' }}
                >
                  Entry Price
                </span>
                <span className="text-[15px] font-bold text-gray-900">
                  {formatUsd(content.entryPrice)}
                </span>
              </div>

              <div className="w-px self-stretch bg-gray-100" />

              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: '#949494' }}
                >
                  Return
                </span>
                <span
                  className={`text-[15px] font-bold ${returnColor}`}
                >
                  {formatPercent(rawReturn)}
                </span>
              </div>
            </div>

            <div
              className="flex items-center justify-end pt-3 border-t border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={copyTradeHref}
                className="px-7 py-2 rounded-lg text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
              >
                Copy Trade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
