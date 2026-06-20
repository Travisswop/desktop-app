'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as shape from 'd3-shape';
import isUrl from '@/lib/isUrl';
import { useHyperliquidCandles } from '@/components/wallet/perps/hooks/useHyperliquidCandles';
import { useAllMids } from '@/components/wallet/perps/hooks/useHyperliquidWebSocket';
import {
  normalizePerpsCoin,
  useLivePerpsMarkPrice,
} from './useLivePerpsMarkPrice';
import {
  normalizePerpsEntryMarkers,
  type PerpsEntryMarker,
} from './perpsEntryMarkers';
import type { PerpsPositionFeedContent } from '@/lib/perps/perpsFeed';

export type { PerpsEntryMarker } from './perpsEntryMarkers';

interface PerpsPositionFeedCardProps {
  feed: {
    content?: Partial<PerpsPositionFeedContent> & {
      entries?: PerpsEntryMarker[];
    };
    smartsiteDetails?: { profilePic?: string | null; name?: string | null };
    smartsiteId?: { profilePic?: string | null; name?: string | null };
    smartsiteProfilePic?: string | null;
    smartsiteUserName?: string | null;
    createdAt?: string;
  };
}

interface ChartPoint {
  time?: number;
  price: number;
}

interface ChartMarkerPosition {
  x: number;
  y: number;
  entry: PerpsEntryMarker;
}

const PERIODS = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_MS: Partial<Record<Period, number>> = {
  '1D': 1 * 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
};

const PERIOD_INTERVAL: Record<Period, string> = {
  '1D': '15m',
  '1W': '1h',
  '1M': '4h',
  '1Y': '1D',
  ALL: '1D',
};

const FALLBACK_POINT_COUNT: Record<Period, number> = {
  '1D': 24,
  '1W': 28,
  '1M': 36,
  '1Y': 52,
  ALL: 60,
};

const CHART_HEIGHT = 160;
const AVATAR_RADIUS = 18;
const AVATAR_BORDER = AVATAR_RADIUS + 3;

dayjs.extend(relativeTime);

function finiteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function maybeFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstFiniteNumber(values: unknown[], fallback = 0) {
  for (const value of values) {
    const number = maybeFiniteNumber(value);
    if (number !== null) return number;
  }
  return fallback;
}

function firstMaybeFiniteNumber(values: unknown[]) {
  for (const value of values) {
    const number = maybeFiniteNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function liveMidPriceForCoin(
  mids: Record<string, string | number | null | undefined>,
  ...coins: Array<string | null | undefined>
) {
  const candidates = Array.from(
    new Set(
      coins.flatMap((coin) => {
        if (!coin) return [];
        const trimmed = coin.trim();
        const normalized = trimmed.toUpperCase();
        const displayCoin = normalized.includes(':')
          ? normalized.split(':').pop() || normalized
          : normalized;
        return [trimmed, normalized, displayCoin];
      }),
    ),
  );

  for (const key of candidates) {
    const direct = maybeFiniteNumber(mids[key]);
    if (direct !== null) return direct;

    const upper = maybeFiniteNumber(mids[key.toUpperCase()]);
    if (upper !== null) return upper;
  }

  return null;
}

function normalizePositionStatus(
  status: Partial<PerpsPositionFeedContent>['status'],
  event?: Partial<PerpsPositionFeedContent>['event'],
  content?: Partial<PerpsPositionFeedContent>,
) {
  const normalizedStatus = String(status || '').toLowerCase();
  const normalizedEvent = String(event || '').toLowerCase();
  if (
    normalizedStatus === 'liquidated' ||
    normalizedStatus === 'liquidate' ||
    normalizedEvent === 'liquidate'
  ) {
    return 'liquidated';
  }
  if (normalizedStatus === 'closed' || normalizedEvent === 'close') {
    return 'closed';
  }
  if (
    normalizedStatus === 'limit' ||
    normalizedEvent === 'limit' ||
    maybeFiniteNumber(content?.limitPrice) !== null
  ) {
    return 'limit';
  }
  return 'open';
}

function dateMs(value: unknown) {
  const milliseconds = Date.parse(String(value || ''));
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function terminalTimestampPredatesOpen(
  content: Partial<PerpsPositionFeedContent>,
  status: 'limit' | 'open' | 'closed' | 'liquidated',
) {
  if (status === 'limit' || status === 'open') return false;

  const openedAt = dateMs(content.openedAt);
  const terminalAt =
    status === 'liquidated'
      ? dateMs(content.liquidatedAt) ||
        dateMs(content.closedAt) ||
        dateMs(content.updatedAt)
      : dateMs(content.closedAt) || dateMs(content.updatedAt);

  return (
    openedAt !== null &&
    terminalAt !== null &&
    terminalAt < openedAt - 5 * 60 * 1000
  );
}

function hasCrossedLiquidationPrice({
  side,
  markPrice,
  liquidationPrice,
}: {
  side: 'long' | 'short';
  markPrice: unknown;
  liquidationPrice: unknown;
}) {
  const mark = maybeFiniteNumber(markPrice);
  const liquidation = maybeFiniteNumber(liquidationPrice);

  if (mark === null || liquidation === null || liquidation <= 0) return false;

  return side === 'long' ? mark <= liquidation : mark >= liquidation;
}

function formatUsd(value: unknown, digits = 2) {
  const number = finiteNumber(value);
  if (Math.abs(number) >= 1000) {
    return `$${number.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }
  return `$${number.toFixed(digits)}`;
}

function formatCompactNumber(value: unknown) {
  const number = finiteNumber(value);
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (Math.abs(number) >= 1_000) {
    return `${(number / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`;
  }
  if (Math.abs(number) >= 1) {
    return number.toFixed(4).replace(/\.?0+$/, '');
  }
  return number.toFixed(6).replace(/\.?0+$/, '');
}

function formatPercent(value: unknown) {
  const number = finiteNumber(value);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(2)}%`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPointTime(time?: number) {
  if (!time) return 'Feed snapshot';
  const milliseconds = time < 1_000_000_000_000 ? time * 1000 : time;
  return dayjs(milliseconds).format('MMM D, h:mm A');
}

function fallbackPoints(
  content: Partial<PerpsPositionFeedContent>,
  selectedPeriod: Period,
  liveMarkPrice?: number | null,
): ChartPoint[] {
  const entry = finiteNumber(content.entryPrice || content.markPrice, 1);
  const mark = firstFiniteNumber(
    [liveMarkPrice, content.markPrice, content.entryPrice],
    entry,
  );
  const direction = mark >= entry ? 1 : -1;
  const count = FALLBACK_POINT_COUNT[selectedPeriod];
  const now = Date.now();
  const windowMs = PERIOD_MS[selectedPeriod] || PERIOD_MS['1Y'] || 0;
  const start = now - windowMs;

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const wave = Math.sin(index * 1.45) * entry * 0.012;
    const drift = (mark - entry) * progress;
    const bend = direction * Math.sin(progress * Math.PI) * entry * 0.018;
    return {
      price: Math.max(0.000001, entry + drift + wave + bend),
      time: Math.floor((start + windowMs * progress) / 1000),
    };
  });
}

function pointsWithLiveMark(points: ChartPoint[], liveMarkPrice: number | null) {
  if (liveMarkPrice === null || liveMarkPrice <= 0) return points;

  const now = Math.floor(Date.now() / 1000);
  const livePoint = { time: now, price: liveMarkPrice };

  if (points.length === 0) return [livePoint];

  const last = points[points.length - 1];
  if (last?.time && now <= last.time) {
    return [...points.slice(0, -1), { ...last, price: liveMarkPrice }];
  }

  return [...points, livePoint];
}

function profileImageSrc(profilePic?: string | null) {
  if (!profilePic) return null;
  return isUrl(profilePic)
    ? profilePic
    : `/images/user_avator/${profilePic}@3x.png`;
}

export function selectPerpsChartMarkerEntries(
  entries: PerpsEntryMarker[],
): PerpsEntryMarker[] {
  if (entries.length === 0) return [];
  const primaryOpen = entries.find((entry) => entry.event !== 'add');
  return [primaryOpen ?? entries[0]];
}

export default function PerpsPositionFeedCard({
  feed,
}: PerpsPositionFeedCardProps) {
  const content = useMemo(() => feed.content || {}, [feed.content]);
  const rawCoin = String(content.coin || 'BTC');
  const coin = rawCoin.toUpperCase();
  const side = content.side === 'short' ? 'short' : 'long';
  const rawStoredStatus = normalizePositionStatus(
    content.status,
    content.event,
    content,
  );
  const storedStatus = terminalTimestampPredatesOpen(content, rawStoredStatus)
    ? 'open'
    : rawStoredStatus;
  const isLimitStatus = storedStatus === 'limit';
  const hasStoredTerminalStatus =
    storedStatus === 'closed' || storedStatus === 'liquidated';
  const leverage = Math.max(1, Math.round(finiteNumber(content.leverage, 1)));
  const storedMarkPrice = firstFiniteNumber([
    hasStoredTerminalStatus ? content.exitPrice : null,
    content.markPrice,
    content.entryPrice,
  ]);
  const profilePic =
    hasStoredTerminalStatus
      ? feed.smartsiteDetails?.profilePic ||
        feed.smartsiteId?.profilePic ||
        feed.smartsiteProfilePic
      : feed.smartsiteDetails?.profilePic ||
        feed.smartsiteId?.profilePic ||
        feed.smartsiteProfilePic;
  const profileSrc = profileImageSrc(profilePic);
  const userName =
    feed.smartsiteDetails?.name ||
    feed.smartsiteId?.name ||
    feed.smartsiteUserName ||
    'SW';

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1D');
  const candleInterval = PERIOD_INTERVAL[selectedPeriod];
  const normalizedCoin = normalizePerpsCoin(rawCoin);
  const marketCoin = normalizedCoin?.requestCoin || coin;
  const isBuilderDexCoin = Boolean(normalizedCoin?.dex);
  const liveBuilderMarkPrice = useLivePerpsMarkPrice(
    marketCoin,
    !hasStoredTerminalStatus && isBuilderDexCoin,
  );
  const liveMarketCoin = marketCoin;
  const candleCoin =
    !hasStoredTerminalStatus && Boolean(liveMarketCoin)
      ? liveMarketCoin
      : null;
  const { bars, isLoading } = useHyperliquidCandles(
    candleCoin,
    candleInterval,
    Boolean(candleCoin),
  );
  const { mids } = useAllMids(
    !hasStoredTerminalStatus && !isBuilderDexCoin && Boolean(liveMarketCoin),
  );
  const liveMarkPrice = useMemo(
    () =>
      hasStoredTerminalStatus
        ? null
        : firstMaybeFiniteNumber([
            liveMidPriceForCoin(mids, rawCoin, liveMarketCoin, coin),
            liveBuilderMarkPrice,
          ]),
    [
      coin,
      hasStoredTerminalStatus,
      liveBuilderMarkPrice,
      liveMarketCoin,
      mids,
      rawCoin,
    ],
  );
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width;
      if (nextWidth) setWidth(nextWidth);
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const points = useMemo<ChartPoint[]>(() => {
    const cutoff = PERIOD_MS[selectedPeriod]
      ? Date.now() - (PERIOD_MS[selectedPeriod] || 0)
      : null;
    const visibleBars = cutoff
      ? bars.filter((bar) => bar.time * 1000 >= cutoff)
      : bars;
    const live = visibleBars
      .map((bar) => ({ time: bar.time, price: bar.close }))
      .filter((point) => Number.isFinite(point.price) && point.price > 0);
    const livePoints = pointsWithLiveMark(live, liveMarkPrice);
    return livePoints.length >= 2
      ? livePoints
      : fallbackPoints(content, selectedPeriod, liveMarkPrice);
  }, [bars, content, liveMarkPrice, selectedPeriod]);

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= points.length) {
      setSelectedIndex(points.length > 0 ? points.length - 1 : null);
    }
  }, [points.length, selectedIndex]);

  const displayMarkPrice =
    !hasStoredTerminalStatus
      ? liveMarkPrice || points[points.length - 1]?.price || storedMarkPrice
      : storedMarkPrice;
  const status =
    storedStatus === 'open' &&
    hasCrossedLiquidationPrice({
      side,
      markPrice: displayMarkPrice,
      liquidationPrice: content.liquidationPrice,
    })
      ? 'liquidated'
      : storedStatus;

  const entries = useMemo(() => {
    const rawEntries = Array.isArray(content.entries) ? content.entries : [];
    return normalizePerpsEntryMarkers(rawEntries, content, feed.createdAt);
  }, [content, feed.createdAt]);
  const chartMarkerEntries = useMemo(
    () => (isLimitStatus ? [] : selectPerpsChartMarkerEntries(entries)),
    [entries, isLimitStatus],
  );

  const priceDomain = useMemo(() => {
    const prices = [
      ...points.map((point) => point.price),
      ...entries.map((entry) => finiteNumber(entry.price)),
      displayMarkPrice,
    ].filter((price) => Number.isFinite(price) && price > 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.18, max * 0.01);
    return [Math.max(0, min - pad), max + pad] as const;
  }, [displayMarkPrice, entries, points]);

  const getY = useCallback(
    (price: number) => {
      const [min, max] = priceDomain;
      const range = max - min || 1;
      return CHART_HEIGHT - ((price - min) / range) * CHART_HEIGHT;
    },
    [priceDomain],
  );

  const getXForIndex = useCallback(
    (index: number) => {
      if (points.length <= 1 || width <= 0) return 0;
      return (index / (points.length - 1)) * width;
    },
    [points.length, width],
  );

  const linePath = useMemo(() => {
    if (width <= 0 || points.length < 2) return '';
    const coordinates: [number, number][] = points.map((point, index) => [
      getXForIndex(index),
      getY(point.price),
    ]);
    return (
      shape
        .line<[number, number]>()
        .curve(points.length < 10 ? shape.curveLinear : shape.curveNatural)(
        coordinates,
      ) || ''
    );
  }, [getXForIndex, getY, points, width]);

  const areaPath = useMemo(() => {
    if (!linePath || width <= 0) return '';
    return `${linePath} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;
  }, [linePath, width]);

  const markerPositions = useMemo(() => {
    if (width <= 0 || points.length < 2) return [];
    const firstTime = points.find((point) => point.time)?.time;
    const lastTime = [...points].reverse().find((point) => point.time)?.time;

    return chartMarkerEntries.reduce<ChartMarkerPosition[]>(
      (markers, entry) => {
        const price = finiteNumber(entry.price || content.entryPrice);
        const timestamp = entry.timestamp ? dayjs(entry.timestamp).unix() : null;
        let x = width * 0.34;

        if (timestamp && firstTime && lastTime && lastTime > firstTime) {
          const ratio = (timestamp - firstTime) / (lastTime - firstTime);
          if (ratio >= 0 && ratio <= 1) {
            x = Math.max(0, Math.min(width, ratio * width));
          }
        }

        const marker = {
          x: Math.max(AVATAR_BORDER, Math.min(width - AVATAR_BORDER, x)),
          y: Math.max(
            AVATAR_BORDER,
            Math.min(CHART_HEIGHT - AVATAR_BORDER, getY(price)),
          ),
          entry,
        };

        if (Number.isFinite(marker.x) && Number.isFinite(marker.y)) {
          markers.push(marker);
        }

        return markers;
      },
      [],
    );
  }, [chartMarkerEntries, content.entryPrice, getY, points, width]);

  const selectedChartPoint = useMemo(() => {
    if (selectedIndex === null || width <= 0 || points.length < 2) return null;
    const index = clampNumber(selectedIndex, 0, points.length - 1);
    const point = points[index];
    if (!point) return null;
    return {
      index,
      point,
      x: getXForIndex(index),
      y: getY(point.price),
    };
  }, [getXForIndex, getY, points, selectedIndex, width]);

  const chartTooltip = useMemo(() => {
    if (!selectedChartPoint || width <= 0) return null;
    const tooltipWidth = 132;
    const tooltipHeight = 48;
    const maxLeft = Math.max(8, width - tooltipWidth - 8);
    return {
      width: tooltipWidth,
      height: tooltipHeight,
      left: clampNumber(
        selectedChartPoint.x - tooltipWidth / 2,
        8,
        maxLeft,
      ),
      top: clampNumber(
        selectedChartPoint.y - tooltipHeight - 10,
        8,
        CHART_HEIGHT - tooltipHeight - 8,
      ),
    };
  }, [selectedChartPoint, width]);

  const setSelectedFromClientX = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (width <= 0 || points.length < 2 || !rect.width) return;
      const x = clampNumber(clientX - rect.left, 0, width);
      const index = Math.round((x / width) * (points.length - 1));
      setSelectedIndex(clampNumber(index, 0, points.length - 1));
    },
    [points.length, width],
  );

  const handleChartKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (points.length < 2) return;

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(event.key === 'Home' ? 0 : points.length - 1);
        return;
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();
      event.stopPropagation();
      setSelectedIndex((current) => {
        const base = current ?? points.length - 1;
        const next = base + (event.key === 'ArrowRight' ? 1 : -1);
        return clampNumber(next, 0, points.length - 1);
      });
    },
    [points.length],
  );

  const entryPrice = firstFiniteNumber([content.entryPrice, displayMarkPrice]);
  const calculatedReturnPct =
    !isLimitStatus && entryPrice > 0
      ? ((side === 'long'
          ? displayMarkPrice - entryPrice
          : entryPrice - displayMarkPrice) /
          entryPrice) *
        leverage *
        100
      : finiteNumber(content.returnPct);
  const storedReturnPct = maybeFiniteNumber(content.returnPct);
  const returnPct =
    isLimitStatus
      ? null
      : hasStoredTerminalStatus && storedReturnPct !== null
      ? storedReturnPct
      : calculatedReturnPct;
  const isPositive = returnPct === null || returnPct >= 0;
  const returnText = returnPct === null ? '-' : formatPercent(returnPct);
  const badgeClasses =
    status === 'liquidated'
      ? 'border-red-200 bg-red-100 text-red-500'
      : status === 'closed'
      ? 'border-gray-200 bg-gray-100 text-gray-500'
      : status === 'limit'
      ? 'border-amber-200 bg-amber-50 text-amber-600'
      : side === 'long'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-600'
      : 'border-red-200 bg-red-100 text-red-500';
  const badgeLabel =
    status === 'liquidated'
      ? 'Liquidated'
      : status === 'closed'
      ? 'Closed'
      : status === 'limit'
      ? `Limit ${side}`
      : side;
  const statusLabel =
    status === 'liquidated'
      ? 'Liquidated'
      : status === 'closed'
      ? 'Closed'
      : status === 'limit'
      ? 'Limit'
      : 'Open';
  const statusVerb =
    status === 'liquidated'
      ? 'Liquidated'
      : status === 'closed'
      ? 'Closed'
      : status === 'limit'
      ? 'Limit set'
      : 'Opened';
  const statusPillClasses =
    status === 'liquidated'
      ? 'border-red-200 bg-red-50 text-red-500'
      : status === 'closed'
      ? 'border-gray-200 bg-gray-100 text-gray-500'
      : status === 'limit'
      ? 'border-amber-200 bg-amber-50 text-amber-600'
      : 'border-emerald-200 bg-emerald-50 text-emerald-600';
  const statusTimestamp =
    status === 'liquidated'
      ? content.liquidatedAt ||
        content.closedAt ||
        content.updatedAt ||
        feed.createdAt
      : status === 'closed'
      ? content.closedAt || content.updatedAt || feed.createdAt
      : status === 'limit'
      ? content.limitPlacedAt || content.updatedAt || feed.createdAt
      : content.openedAt || content.updatedAt || feed.createdAt;
  const takeProfitPrice = maybeFiniteNumber(content.takeProfitPrice);
  const stopLossPrice = maybeFiniteNumber(content.stopLossPrice);
  const riskPrices = [
    takeProfitPrice !== null
      ? { label: 'TP', value: takeProfitPrice, className: 'text-emerald-500' }
      : null,
    stopLossPrice !== null
      ? { label: 'SL', value: stopLossPrice, className: 'text-red-500' }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: number;
    className: string;
  }>;
  const href = `/wallet?perps=1&coin=${encodeURIComponent(coin)}&side=${side}&leverage=${leverage}`;
  const periodBar = (
    <div
      className="flex items-center justify-around border-t border-gray-100 px-4 py-2"
      onClick={(event) => event.stopPropagation()}
    >
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          aria-pressed={selectedPeriod === period}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedIndex(null);
            setSelectedPeriod(period);
          }}
          className={`rounded-full px-3 py-1 font-mono text-[11px] font-black transition-colors ${
            selectedPeriod === period
              ? 'bg-black text-white'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full flex justify-start mt-1">
      <div className="w-full max-w-xl">
        <div
          ref={cardRef}
          className="overflow-hidden rounded-[18px] bg-white"
          style={{
            boxShadow:
              '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={`inline-flex rounded-[10px] border px-4 py-2 font-mono text-[12px] font-black uppercase tracking-[0.18em] ${badgeClasses}`}
                >
                  {badgeLabel} {leverage}x
                </div>
                <div className="mt-2 font-mono text-[15px] font-black tabular-nums text-gray-950">
                  {formatCompactNumber(content.sizeCoins)} {coin}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[28px] font-black leading-none tabular-nums text-gray-950">
                  {formatUsd(displayMarkPrice)}
                </div>
                <div className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {coin} price
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative mt-2 cursor-crosshair overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{ height: CHART_HEIGHT }}
            tabIndex={points.length > 1 ? 0 : -1}
            role="slider"
            aria-label={`Interactive ${coin} perps price chart`}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, points.length - 1)}
            aria-valuenow={
              selectedChartPoint?.index ?? Math.max(0, points.length - 1)
            }
            aria-valuetext={
              selectedChartPoint
                ? `${formatPointTime(selectedChartPoint.point.time)} ${formatUsd(
                    selectedChartPoint.point.price,
                  )}`
                : `${coin} price chart`
            }
            onPointerDown={(event) => {
              event.stopPropagation();
              setSelectedFromClientX(
                event.clientX,
                event.currentTarget.getBoundingClientRect(),
              );
            }}
            onPointerMove={(event) => {
              event.stopPropagation();
              setSelectedFromClientX(
                event.clientX,
                event.currentTarget.getBoundingClientRect(),
              );
            }}
            onPointerLeave={() => setSelectedIndex(null)}
            onFocus={() =>
              setSelectedIndex((index) => index ?? points.length - 1)
            }
            onBlur={() => setSelectedIndex(null)}
            onKeyDown={handleChartKeyDown}
          >
            {isLoading && points.length === 0 ? (
              <div className="h-full w-full animate-pulse bg-gray-100" />
            ) : (
              width > 0 && (
                <svg
                  width={width}
                  height={CHART_HEIGHT}
                  viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
                  className="overflow-visible"
                  role="img"
                  aria-label={`${coin} perps price chart`}
                >
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#111111" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={areaPath}
                    fill={`url(#${gradientId})`}
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#000000"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  {selectedChartPoint && (
                    <g pointerEvents="none">
                      <line
                        x1={selectedChartPoint.x}
                        y1={0}
                        x2={selectedChartPoint.x}
                        y2={CHART_HEIGHT}
                        stroke="#8d8d8d"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <circle
                        cx={selectedChartPoint.x}
                        cy={selectedChartPoint.y}
                        r={5}
                        fill="white"
                        stroke="#8d8d8d"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
              )
            )}

            {markerPositions.map((marker, index) => (
              <button
                type="button"
                key={[
                  marker.entry.orderId || 'order',
                  marker.entry.timestamp || 'time',
                  marker.entry.event || 'entry',
                  index,
                ].join('-')}
                className="absolute flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow"
                style={{
                  width: AVATAR_RADIUS * 2,
                  height: AVATAR_RADIUS * 2,
                  left: marker.x - AVATAR_RADIUS,
                  top: marker.y - AVATAR_RADIUS,
                }}
                title={`${marker.entry.event === 'add' ? 'Added' : 'Opened'} at ${formatUsd(marker.entry.price)}`}
                onClick={(event) => event.stopPropagation()}
              >
                {profileSrc ? (
                  <Image
                    src={profileSrc}
                    alt={`${userName} entry`}
                    width={AVATAR_RADIUS * 2}
                    height={AVATAR_RADIUS * 2}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {String(userName).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            ))}

            {selectedChartPoint && chartTooltip && (
              <div
                className="pointer-events-none absolute flex flex-col justify-center rounded-lg bg-white/95 px-3 shadow-[0_1px_6px_rgba(0,0,0,0.10)]"
                style={{
                  width: chartTooltip.width,
                  height: chartTooltip.height,
                  left: chartTooltip.left,
                  top: chartTooltip.top,
                }}
              >
                <div className="truncate font-mono text-[10px] font-bold text-gray-400">
                  {formatPointTime(selectedChartPoint.point.time)}
                </div>
                <div className="mt-0.5 font-mono text-[14px] font-black leading-none tabular-nums text-gray-950">
                  {formatUsd(selectedChartPoint.point.price)}
                </div>
              </div>
            )}
          </div>

          {periodBar}

          <div className="px-4 pb-4 pt-3">
            <div className="mb-4 flex items-start justify-around">
              <div className="flex flex-col items-center">
                <span className="mb-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  {status === 'limit' ? 'Limit price' : 'Entry price'}
                </span>
                <div className="font-mono text-[16px] font-black tabular-nums text-gray-950">
                  {formatUsd(
                    status === 'limit'
                      ? content.limitPrice || content.entryPrice
                      : content.entryPrice,
                  )}
                </div>
              </div>

              <div className="w-px self-stretch bg-gray-100" />

              <div className="flex flex-col items-center">
                <span className="mb-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Return
                </span>
                <div
                  className={`font-mono text-[16px] font-black tabular-nums ${
                    isPositive ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {returnText}
                </div>
              </div>
            </div>

            {riskPrices.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {riskPrices.map((price) => (
                  <div
                    key={price.label}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                      {price.label}
                    </div>
                    <div
                      className={`mt-0.5 font-mono text-[13px] font-black tabular-nums ${price.className}`}
                    >
                      {formatUsd(price.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] ${statusPillClasses}`}
                >
                  {statusLabel}
                </span>
                <span className="truncate font-mono text-[11px] font-bold text-gray-400">
                  {statusVerb} {dayjs(statusTimestamp).fromNow()}
                </span>
              </div>
              <Link
                href={href}
                className="rounded-lg bg-gray-100 px-7 py-2 text-[13px] font-extrabold text-gray-950 transition-all hover:bg-gray-200 active:scale-95"
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
