"use client";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useId,
} from "react";
import Image from "next/image";
import dayjs from "dayjs";
import * as shape from "d3-shape";
import { sanitizeNextImageSrc } from "@/lib/sanitizeNextImageSrc";
import {
  getNativeMarketId,
  getTokenFallbackPrice,
  getTokenMarketAddress,
  getTokenMarketChain,
  isNativeMarketToken,
  isStablecoinSymbol,
  parseMarketPrice,
} from "@/lib/utils/tokenMarketData";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PERIODS = ["1D", "1W", "1M", "1Y", "ALL"] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_MS: Record<string, number> = {
  "1D": 1 * 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransactionSwapGraphProps {
  setGrowth: (v: number) => void;
  createdAt: string;
  profilePic: string | null;
  chartWidth?: number;
  outputToken: any;
  authToken: string;
  apiBase: string; // pass VERSION_FIVE_API as prop (env vars differ in Next.js)
  livePrice?: number | null;
}

type PricePoint = { price: number; timestamp: number };

function resolveProfileImageSrc(profilePic?: string | null): string | null {
  const value = String(profilePic ?? "").trim();
  if (!value) return null;

  const isImageResource =
    value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("/") ||
    /^(https?:|data:|blob:|ipfs:\/\/)/i.test(value);

  if (isImageResource) {
    return sanitizeNextImageSrc(value) || null;
  }

  const fileName = /\.(png|jpe?g|gif|webp|svg)$/i.test(value)
    ? value
    : `${value}@3x.png`;

  return `/images/user_avator/${encodeURIComponent(fileName)}`;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
const SkeletonLoader: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="w-full animate-pulse rounded-lg bg-gray-100"
    style={{ height }}
  />
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const TransactionSwapGraph: React.FC<TransactionSwapGraphProps> = ({
  setGrowth,
  createdAt,
  profilePic,
  chartWidth: chartWidthProp,
  outputToken,
  authToken,
  apiBase,
  livePrice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const [containerWidth, setContainerWidth] = useState(chartWidthProp ?? 0);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("1W");
  const [chartData, setChartData] = useState<number[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [yDomain, setYDomain] = useState<[number, number]>([0, 0]);
  const [loading, setLoading] = useState(true);
  const chartDataRef = useRef<number[]>([]);
  const timestampsRef = useRef<number[]>([]);

  // Tooltip state
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [showCreatedAtTooltip, setShowCreatedAtTooltip] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chartHeight = 160;
  const PADDING = 0;
  const AVATAR_RADIUS = 18;
  const AVATAR_BORDER = AVATAR_RADIUS + 3;
  const profileImageSrc = useMemo(
    () => resolveProfileImageSrc(profilePic),
    [profilePic],
  );
  const livePriceRef = useRef<number | null>(parseMarketPrice(livePrice));

  useEffect(() => {
    livePriceRef.current = parseMarketPrice(livePrice);
  }, [livePrice]);

  // Observe container width
  useEffect(() => {
    if (chartWidthProp) {
      setContainerWidth(chartWidthProp);
      return;
    }
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [chartWidthProp]);

  const chartWidth = containerWidth;

  // ---------------------------------------------------------------------------
  const buildFallbackSeries = useCallback(
    (displayPeriod: Period, price: number): PricePoint[] => {
      const now = Date.now();
      const windowMs =
        displayPeriod === "ALL" ? PERIOD_MS["1Y"] : PERIOD_MS[displayPeriod];
      const count =
        displayPeriod === "1D" ? 24 : displayPeriod === "1W" ? 28 : 36;
      const start = now - windowMs;

      return Array.from({ length: count }, (_, index) => ({
        price,
        timestamp: start + (windowMs / Math.max(1, count - 1)) * index,
      }));
    },
    [],
  );

  const commitPriceSeries = useCallback(
    (incomingPrices: PricePoint[]) => {
      const prices = incomingPrices.filter(
        (p) => !isNaN(p.price) && isFinite(p.price) && p.price > 0,
      );

      if (prices.length < 2) {
        chartDataRef.current = [];
        timestampsRef.current = [];
        setChartData([]);
        setTimestamps([]);
        return;
      }

      const vals = prices.map((p) => p.price);
      const nextTimestamps = prices.map((p) => p.timestamp);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const diff = maxVal - minVal;
      const pad = diff === 0 ? maxVal * 0.1 : diff * 0.2;
      chartDataRef.current = vals;
      timestampsRef.current = nextTimestamps;
      setYDomain([Math.max(0, minVal - pad), maxVal + pad]);
      setChartData(vals);
      setTimestamps(nextTimestamps);

      const nonZero = vals.filter((d) => d > 0);
      if (nonZero.length >= 2) {
        const g = Number(
          (
            ((nonZero[nonZero.length - 1] - nonZero[0]) / nonZero[0]) *
            100
          ).toFixed(2),
        );
        setGrowth(g);
      }
    },
    [setGrowth],
  );

  // Data fetch
  // ---------------------------------------------------------------------------
  const fetchTokenPriceHistory = useCallback(
    async (displayPeriod: Period) => {
      if (!chartWidth) return;
      try {
        setLoading(true);

        const daysMap: Record<string, string | number> = {
          "1D": 1,
          "1W": 7,
          "1M": 30,
          "1Y": 365,
          ALL: "max",
        };
        const days = daysMap[displayPeriod];

        const headers: HeadersInit = {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        };

        const baseUrl = apiBase.replace(/\/$/, "");
        const contractAddress = getTokenMarketAddress(outputToken);
        const chain = getTokenMarketChain(outputToken) ?? "ethereum";
        const nativeMarketToken = isNativeMarketToken(outputToken);

        let prices: PricePoint[] = [];

        if (!baseUrl) throw new Error("Market API base URL is missing");

        if (nativeMarketToken) {
          const coinGeckoId = getNativeMarketId(chain);
          if (!coinGeckoId) throw new Error(`No mapping for ${chain}`);
          const res = await fetch(
            `${baseUrl}/market/history/${coinGeckoId}?days=${days}`,
            { method: "GET", headers },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          prices = (json.data?.prices ?? []).map((item: any) => ({
            price: parseFloat(item.price),
            timestamp: item.timestamp,
          }));
        } else {
          if (!contractAddress) throw new Error("Missing contract address");
          const res = await fetch(`${baseUrl}/market/chart-by-address`, {
            method: "POST",
            headers,
            body: JSON.stringify({ address: contractAddress, chain, days }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          prices = (json.data?.historical?.prices ?? []).map((item: any) => ({
            price: parseFloat(item.price),
            timestamp: item.timestamp,
          }));

          const responseLivePrice = parseMarketPrice(json.data?.marketData?.price);
          const latestPrice = livePriceRef.current ?? responseLivePrice;
          if (latestPrice && prices.length) {
            const last = prices[prices.length - 1];
            if (last && Date.now() - last.timestamp < 60_000) {
              last.price = latestPrice;
            } else {
              prices.push({ price: latestPrice, timestamp: Date.now() });
            }
          }
        }

        // Filter to window
        if (displayPeriod !== "ALL") {
          const windowMs = PERIOD_MS[displayPeriod];
          if (windowMs) {
            const cutoff = Date.now() - windowMs;
            prices = prices.filter((p) => p.timestamp >= cutoff);
          }
        }

        if (prices.length < 2) {
          const fallbackPrice =
            livePriceRef.current ?? getTokenFallbackPrice(outputToken);
          if (fallbackPrice && isStablecoinSymbol(outputToken?.symbol)) {
            commitPriceSeries(buildFallbackSeries(displayPeriod, fallbackPrice));
          } else {
            commitPriceSeries([]);
          }
          return;
        }

        commitPriceSeries(prices);
      } catch {
        const fallbackPrice =
          livePriceRef.current ?? getTokenFallbackPrice(outputToken);
        if (fallbackPrice && isStablecoinSymbol(outputToken?.symbol)) {
          commitPriceSeries(buildFallbackSeries(displayPeriod, fallbackPrice));
        } else {
          commitPriceSeries([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      authToken,
      outputToken,
      apiBase,
      chartWidth,
      buildFallbackSeries,
      commitPriceSeries,
    ],
  );

  useEffect(() => {
    if (outputToken && chartWidth > 0) fetchTokenPriceHistory(selectedPeriod);
  }, [selectedPeriod, outputToken, chartWidth, fetchTokenPriceHistory]);

  useEffect(() => {
    const latestPrice = parseMarketPrice(livePrice);
    const currentChartData = chartDataRef.current;
    const currentTimestamps = timestampsRef.current;
    if (
      !latestPrice ||
      currentChartData.length < 2 ||
      currentTimestamps.length < 2
    ) {
      return;
    }

    const nextPrices = currentChartData.map((price, index) => ({
      price: index === currentChartData.length - 1 ? latestPrice : price,
      timestamp:
        index === currentTimestamps.length - 1
          ? Date.now()
          : currentTimestamps[index],
    }));
    commitPriceSeries(nextPrices);
  }, [livePrice, commitPriceSeries]);

  // ---------------------------------------------------------------------------
  // SVG path helpers — mirrors RN d3-shape logic
  // ---------------------------------------------------------------------------
  const getPointPosition = useCallback(
    (index: number): { x: number; y: number } => {
      if (!chartData.length) return { x: 0, y: chartHeight / 2 };
      const [minPrice, maxPrice] = yDomain;
      const priceRange = maxPrice - minPrice;
      const xStep = (chartWidth - PADDING * 2) / (chartData.length - 1);
      const x = PADDING + index * xStep;
      if (!priceRange || !isFinite(priceRange))
        return { x, y: chartHeight / 2 };
      const point = chartData[index];
      if (point === undefined || isNaN(point) || !isFinite(point))
        return { x, y: chartHeight / 2 };
      const y =
        chartHeight -
        PADDING -
        ((point - minPrice) / priceRange) * (chartHeight - PADDING * 2);
      return { x, y: isNaN(y) || !isFinite(y) ? chartHeight / 2 : y };
    },
    [chartData, yDomain, chartWidth, chartHeight],
  );

  const linePath = useMemo(() => {
    if (!chartData.length || !chartWidth) return "";
    const [minPrice, maxPrice] = yDomain;
    const priceRange = maxPrice - minPrice;
    if (!priceRange || !isFinite(priceRange)) return "";
    const xStep = (chartWidth - PADDING * 2) / (chartData.length - 1);
    const points: [number, number][] = chartData
      .map((point, i) => {
        if (isNaN(point) || !isFinite(point)) return null;
        const x = PADDING + i * xStep;
        const y =
          chartHeight -
          PADDING -
          ((point - minPrice) / priceRange) * (chartHeight - PADDING * 2);
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null;
        return [x, y] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);

    const curve = points.length < 10 ? shape.curveLinear : shape.curveNatural;
    return shape.line<[number, number]>().curve(curve)(points) ?? "";
  }, [chartData, yDomain, chartWidth, chartHeight]);

  const areaPath = useMemo(() => {
    if (!linePath) return "";
    return `${linePath} L ${chartWidth - PADDING},${chartHeight} L ${PADDING},${chartHeight} Z`;
  }, [linePath, chartWidth, chartHeight]);

  // ---------------------------------------------------------------------------
  // createdAt marker (same logic as RN)
  // ---------------------------------------------------------------------------
  const createdAtX = useMemo(() => {
    if (!createdAt || !chartData.length) return null;
    if (selectedPeriod === "ALL") return PADDING + (chartWidth - PADDING * 2);
    const totalMs = PERIOD_MS[selectedPeriod];
    if (!totalMs) return null;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    if (elapsed < 0 || elapsed > totalMs) return null;
    return PADDING + (1 - elapsed / totalMs) * (chartWidth - PADDING * 2);
  }, [createdAt, chartData, selectedPeriod, chartWidth]);

  const getYForX = useCallback(
    (xPos: number) => {
      if (!chartData.length) return chartHeight / 2;
      const index = Math.round(
        ((xPos - PADDING) / (chartWidth - PADDING * 2)) *
          (chartData.length - 1),
      );
      return getPointPosition(
        Math.max(0, Math.min(chartData.length - 1, index)),
      ).y;
    },
    [chartData, chartHeight, chartWidth, getPointPosition],
  );

  const createdAtY = useMemo(
    () => (createdAtX !== null ? getYForX(createdAtX) : null),
    [createdAtX, getYForX],
  );

  const avatarCx = useMemo(() => {
    if (createdAtX === null) return null;
    return Math.max(
      AVATAR_BORDER,
      Math.min(chartWidth - AVATAR_BORDER, createdAtX),
    );
  }, [createdAtX, chartWidth, AVATAR_BORDER]);

  const avatarCy = createdAtY;

  // ---------------------------------------------------------------------------
  // Mouse / touch interaction
  // ---------------------------------------------------------------------------
  const handlePointerMove = useCallback(
    (clientX: number, rect: DOMRect) => {
      if (!chartData.length || !linePath) return;
      const locationX = clientX - rect.left;
      const boundedX = Math.max(0, Math.min(locationX, chartWidth));

      if (
        avatarCx !== null &&
        Math.abs(boundedX - avatarCx) < AVATAR_RADIUS + 8
      ) {
        setShowCreatedAtTooltip(true);
      } else {
        setShowCreatedAtTooltip(false);
      }

      const index = Math.min(
        Math.max(
          0,
          Math.round((boundedX / chartWidth) * (chartData.length - 1)),
        ),
        chartData.length - 1,
      );
      setTooltipIndex(index);
      setTooltipVisible(true);
    },
    [chartData, linePath, chartWidth, avatarCx, AVATAR_RADIUS],
  );

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setTooltipVisible(false);
      setShowCreatedAtTooltip(false);
    }, 2000);
  }, []);

  // ---------------------------------------------------------------------------
  // Tooltip position — mirrors RN layout logic
  // ---------------------------------------------------------------------------
  const tooltipPositions = useMemo(() => {
    if (!tooltipVisible || tooltipIndex === null) return null;
    const { x: xPos, y: yPos } = getPointPosition(tooltipIndex);
    const valueW = 90;
    const valueH = 28;
    const labelW = 130;
    const labelH = 26;
    const edge = 16;
    const gap = 10;

    const valueX = Math.max(
      valueW / 2 + edge,
      Math.min(chartWidth - valueW / 2 - edge, xPos),
    );
    let valueY = yPos - valueH - gap;
    let pos = "above";
    if (valueY < edge) {
      valueY = yPos + gap;
      pos = "below";
    }

    const labelX = Math.max(
      labelW / 2 + edge,
      Math.min(chartWidth - labelW / 2 - edge, xPos),
    );
    let labelY =
      pos === "above" ? yPos + gap + labelH / 2 : yPos + valueH + gap * 2;
    if (labelY + labelH / 2 > chartHeight) labelY = valueY - labelH - gap / 2;

    return {
      xPos,
      yPos,
      valueX,
      valueY,
      valueW,
      valueH,
      labelX,
      labelY,
      labelW,
      labelH,
    };
  }, [tooltipVisible, tooltipIndex, getPointPosition, chartWidth, chartHeight]);

  const getTooltipLabel = useCallback(() => {
    if (tooltipIndex === null || !timestamps.length) return "";
    const ts = timestamps[tooltipIndex];
    return ts ? dayjs(ts).format("MMM D, h:mm A") : "";
  }, [tooltipIndex, timestamps]);

  // ---------------------------------------------------------------------------
  // Period selector
  // ---------------------------------------------------------------------------
  const PeriodBar = () => (
    <div
      className="flex items-center justify-around px-4 py-2 border-t border-gray-100"
      onClick={(event) => event.stopPropagation()}
    >
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={selectedPeriod === p}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedPeriod(p);
          }}
          className={`rounded-full px-3 py-1 font-mono text-[11px] font-black transition-colors ${
            selectedPeriod === p
              ? "bg-black text-white"
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) return <SkeletonLoader height={chartHeight} />;

  if (!chartData.length) {
    return (
      <div className="w-full select-none">
        <div className="flex flex-col items-center justify-center gap-1 py-6">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
            No price data available
          </p>
          {createdAt && (
            <p className="font-mono text-[10px] font-bold text-gray-300">
              Swap made on {dayjs(createdAt).format("MMM D, h:mm A")}
            </p>
          )}
        </div>
        <PeriodBar />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full select-none">
      {/* SVG chart */}
      <div
        className="relative w-full"
        style={{ height: chartHeight }}
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
        {chartWidth > 0 && (
          <svg
            width={chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Line */}
            <path
              d={linePath}
              stroke="#000"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />

            {/* createdAt avatar marker */}
            {createdAtX !== null &&
              avatarCx !== null &&
              avatarCy !== null &&
              profileImageSrc && (
                <>
                  {showCreatedAtTooltip && (
                    <line
                      x1={createdAtX}
                      y1={0}
                      x2={createdAtX}
                      y2={chartHeight}
                      stroke="#000"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                  )}
                  {/* White backing circle */}
                  <circle
                    cx={avatarCx}
                    cy={avatarCy}
                    r={AVATAR_BORDER}
                    fill="white"
                  />
                </>
              )}

            {/* Tooltip crosshair */}
            {tooltipVisible && tooltipPositions && (
              <>
                <line
                  x1={tooltipPositions.xPos}
                  y1={0}
                  x2={tooltipPositions.xPos}
                  y2={chartHeight}
                  stroke="#8d8d8d"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <circle
                  cx={tooltipPositions.xPos}
                  cy={tooltipPositions.yPos}
                  r={5}
                  stroke="#8d8d8d"
                  strokeWidth={2}
                  fill="white"
                />
              </>
            )}
          </svg>
        )}

        {/* Avatar image — absolutely positioned over SVG */}
        {avatarCx !== null && avatarCy !== null && profileImageSrc && (
          <button
            className="absolute rounded-full overflow-hidden border-2 border-white shadow"
            style={{
              width: AVATAR_RADIUS * 2,
              height: AVATAR_RADIUS * 2,
              left: avatarCx - AVATAR_RADIUS,
              top: avatarCy - AVATAR_RADIUS,
              borderRadius: "50%",
            }}
            onClick={() => {
              setShowCreatedAtTooltip(true);
              if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
              hideTimerRef.current = setTimeout(
                () => setShowCreatedAtTooltip(false),
                2000,
              );
            }}
          >
            <Image
              src={profileImageSrc}
              alt="profile"
              width={AVATAR_RADIUS * 2}
              height={AVATAR_RADIUS * 2}
              className="w-full h-full object-cover"
            />
          </button>
        )}

        {/* createdAt tooltip bubble */}
        {showCreatedAtTooltip &&
          avatarCx !== null &&
          avatarCy !== null &&
          createdAt &&
          (() => {
            const tw = 140;
            const th = 26;
            const edge = 8;
            const gap = 6;
            const belowY = avatarCy + AVATAR_BORDER + gap;
            const aboveY = avatarCy - AVATAR_BORDER - gap - th;
            const ty =
              belowY + th <= chartHeight - edge
                ? belowY
                : aboveY >= edge
                  ? aboveY
                  : belowY;
            const tx = Math.max(
              edge,
              Math.min(
                (createdAtX ?? avatarCx) - tw / 2,
                chartWidth - tw - edge,
              ),
            );
            return (
              <div
                className="absolute pointer-events-none flex items-center justify-center rounded-lg"
                style={{
                  left: tx,
                  top: ty,
                  width: tw,
                  height: th,
                  background: "rgba(0,0,0,0.72)",
                }}
              >
                <span className="font-mono text-[10px] font-bold text-white">
                  {dayjs(createdAt).format("MMM D, h:mm A")}
                </span>
              </div>
            );
          })()}

        {/* Price + timestamp tooltip */}
        {tooltipVisible &&
          tooltipPositions &&
          tooltipIndex !== null &&
          (() => {
            const val = chartData[tooltipIndex];
            const {
              valueX,
              valueY,
              valueW,
              valueH,
              labelX,
              labelY,
              labelW,
              labelH,
            } = tooltipPositions;
            return (
              <>
                <div
                  className="absolute pointer-events-none flex items-center justify-center rounded-lg"
                  style={{
                    left: valueX - valueW / 2,
                    top: valueY - valueH / 2,
                    width: valueW,
                    height: valueH,
                    background: "rgba(255,255,255,0.92)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.10)",
                  }}
                >
                  <span className="font-mono text-[12px] font-black tabular-nums text-gray-900">
                    ${(val ?? 0).toFixed(3)}
                  </span>
                </div>
                <div
                  className="absolute pointer-events-none flex items-center justify-center rounded border border-gray-200"
                  style={{
                    left: labelX - labelW / 2,
                    top: labelY - labelH / 2,
                    width: labelW,
                    height: labelH,
                    background: "rgba(255,255,255,0.92)",
                  }}
                >
                  <span className="font-mono text-[10px] font-bold text-gray-400">
                    {getTooltipLabel()}
                  </span>
                </div>
              </>
            );
          })()}
      </div>

      {/* Period selector */}
      <PeriodBar />
    </div>
  );
};

export default React.memo(TransactionSwapGraph);
