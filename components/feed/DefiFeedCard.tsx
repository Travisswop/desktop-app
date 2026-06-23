'use client';

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { AaveTokenIcon } from '@/components/wallet/defi/AaveTokenIcon';
import {
  DEFI_PROJECTION_YEARS,
  buildDefiProjection,
  finiteNumber,
  getBenchmarkForDefiAction,
  normalizeDefiAction,
  type DefiFeedContent,
  type DefiProjectionYears,
} from '@/lib/defi/defiFeed';

interface DefiFeedCardProps {
  content: DefiFeedContent;
}

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const exactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function normalizeRate(value: unknown, fallback = 0) {
  const rate = finiteNumber(value, fallback);
  return Math.abs(rate) > 1 ? rate / 100 : rate;
}

function formatTokenAmount(value: unknown) {
  const amount = finiteNumber(value);
  return amount.toLocaleString('en-US', {
    maximumFractionDigits: amount >= 1000 ? 2 : 6,
  });
}

function formatPercent(value: unknown) {
  return `${(normalizeRate(value) * 100).toFixed(2)}%`;
}

function titleCase(value: unknown) {
  const text = String(value || '').replace(/[-_]/g, ' ').trim();
  if (!text) return 'Ethereum';
  return text
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeDefiStatus(value: unknown, isBorrow: boolean) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'withdrawn' || status === 'withdraw') return 'withdrawn';
  if (status === 'repaid' || status === 'repay') return 'repaid';
  if (status === 'closed') return isBorrow ? 'repaid' : 'withdrawn';
  return 'open';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number) {
  return Number(value.toFixed(2));
}

function formatProjectionYears(value: number) {
  if (value <= 0.05) return 'Now';
  if (value < 1) return `${Math.max(1, Math.round(value * 12))} mo`;
  const roundedYears = value >= 10 ? Math.round(value) : Number(value.toFixed(1));
  return `${roundedYears}Y`;
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${rounded(point.x)} ${rounded(point.y)}`,
    )
    .join(' ');
}

function buildProjectionChart(
  points: Array<{ aaveDelta: number; benchmarkDelta: number }>,
  chartMax: number,
) {
  const width = 320;
  const height = 104;
  const left = 6;
  const right = 8;
  const top = 8;
  const bottom = 88;
  const plotWidth = width - left - right;
  const plotHeight = bottom - top;
  const safeMax = Math.max(1, chartMax);
  const lastIndex = Math.max(1, points.length - 1);

  const mapped = points.map((point, index) => {
    const x = left + (index / lastIndex) * plotWidth;
    return {
      index,
      x,
      aaveY: bottom - (point.aaveDelta / safeMax) * plotHeight,
      benchmarkY: bottom - (point.benchmarkDelta / safeMax) * plotHeight,
    };
  });
  const aavePoints = mapped.map((point) => ({ x: point.x, y: point.aaveY }));
  const benchmarkPoints = mapped.map((point) => ({
    x: point.x,
    y: point.benchmarkY,
  }));
  const aaveLine = linePath(aavePoints);
  const benchmarkLine = linePath(benchmarkPoints);
  const first = mapped[0] || { x: left, aaveY: bottom, benchmarkY: bottom };
  const last =
    mapped[mapped.length - 1] || {
      x: width - right,
      aaveY: bottom,
      benchmarkY: bottom,
    };
  return {
    width,
    height,
    top,
    bottom,
    aaveLine,
    benchmarkLine,
    aaveArea: `${aaveLine} L ${rounded(last.x)} ${bottom} L ${rounded(first.x)} ${bottom} Z`,
    lastAave: { x: last.x, y: last.aaveY },
    lastBenchmark: { x: last.x, y: last.benchmarkY },
    points: mapped,
  };
}

export default function DefiFeedCard({ content }: DefiFeedCardProps) {
  const [years, setYears] = useState<DefiProjectionYears>(5);
  const [selectedProjectionIndex, setSelectedProjectionIndex] = useState<
    number | null
  >(null);

  const action = normalizeDefiAction(content.action);
  const isBorrow = action === 'borrow';
  const status = normalizeDefiStatus(content.status, isBorrow);
  const isClosed = status !== 'open';
  const statusLabel = isBorrow
    ? isClosed
      ? 'Repaid'
      : 'Borrowed'
    : isClosed
      ? 'Withdrawn'
      : 'Supplied';
  const positionNoun = isBorrow ? 'debt' : 'deposit';
  const statusSubtitle = isBorrow
    ? isClosed
      ? 'Repaid to Aave'
      : 'Borrowed from Aave'
    : isClosed
      ? 'Withdrawn from Aave'
      : 'Supplied to Aave';
  const benchmark = getBenchmarkForDefiAction(action);
  const symbol = String(content.symbol || 'USDC').toUpperCase();
  const protocol = String(content.protocol || 'Aave v3');
  const chainLabel = titleCase(content.chain);
  const amount = finiteNumber(content.amount);
  const amountUsd =
    finiteNumber(content.amountUsd) ||
    amount * finiteNumber(content.priceUsd, symbol.includes('USD') ? 1 : 0);
  const principalUsd = amountUsd > 0 ? amountUsd : amount;
  const aaveRate = normalizeRate(
    content.aaveRate ??
      (isBorrow ? content.variableBorrowApy : content.supplyApy),
  );
  const benchmarkRate = normalizeRate(
    content.benchmarkRate,
    benchmark.rate,
  );
  const benchmarkLabel = String(content.benchmarkLabel || benchmark.label);
  const benchmarkSource = String(
    content.benchmarkSource || benchmark.source,
  );
  const benchmarkAsOf = String(content.benchmarkAsOf || benchmark.asOf);
  const projection = useMemo(
    () =>
      buildDefiProjection({
        action,
        principalUsd,
        aaveRate,
        benchmarkRate,
        years,
        pointCount: 37,
      }),
    [action, aaveRate, benchmarkRate, principalUsd, years],
  );
  const chartMax = Math.max(
    1,
    ...projection.points.flatMap((point) => [
      point.aaveDelta,
      point.benchmarkDelta,
    ]),
  );
  const chart = useMemo(
    () => buildProjectionChart(projection.points, chartMax),
    [chartMax, projection.points],
  );
  const lastProjectionIndex = Math.max(0, projection.points.length - 1);
  const selectedPointIndex = clamp(
    selectedProjectionIndex ?? lastProjectionIndex,
    0,
    lastProjectionIndex,
  );
  const selectedPoint =
    projection.points[selectedPointIndex] ||
    projection.points[lastProjectionIndex] ||
    projection.points[0];
  const selectedChartPoint =
    chart.points[selectedPointIndex] ||
    chart.points[chart.points.length - 1] ||
    chart.points[0];
  const selectedDurationLabel = formatProjectionYears(selectedPoint?.years || 0);
  const selectedDifference =
    selectedPoint && isBorrow
      ? selectedPoint.benchmarkDelta - selectedPoint.aaveDelta
      : (selectedPoint?.aaveDelta || 0) - (selectedPoint?.benchmarkDelta || 0);
  const selectedDifferencePositive = selectedDifference >= 0;
  const setProjectionFromClientX = useCallback(
    (clientX: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const progress = clamp((clientX - rect.left) / rect.width, 0, 1);
      setSelectedProjectionIndex(
        Math.round(progress * Math.max(0, projection.points.length - 1)),
      );
    },
    [projection.points.length],
  );
  const handleChartKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();
      setSelectedProjectionIndex((current) => {
        const fallback = current ?? lastProjectionIndex;
        if (event.key === 'Home') return 0;
        if (event.key === 'End') return lastProjectionIndex;
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        return clamp(fallback + direction, 0, lastProjectionIndex);
      });
    },
    [lastProjectionIndex],
  );
  const projectionHeading = isBorrow
    ? 'Aave APR vs card APR'
    : 'Aave APY vs bank APY';
  const aaveChartLabel = isBorrow ? 'Aave APR' : 'Aave APY';
  const benchmarkChartLabel = isBorrow ? 'Card APR' : 'Bank APY';
  const benchmarkLegendLabel = isBorrow ? benchmarkLabel : 'Avg bank APY';
  const differenceCopy = isBorrow
    ? selectedDifferencePositive
      ? `${exactUsd.format(selectedDifference)} saved vs avg card APR`
      : `${exactUsd.format(Math.abs(selectedDifference))} more than avg card APR`
    : selectedDifferencePositive
      ? `${exactUsd.format(selectedDifference)} more than avg bank APY`
      : `${exactUsd.format(Math.abs(selectedDifference))} less than avg bank APY`;
  const aaveBasisLabel = isBorrow
    ? 'variable debt APY'
    : 'on-chain APY accrual';
  const benchmarkBasisLabel = isBorrow
    ? 'card monthly APR'
    : 'bank monthly compound';
  const compoundingSummary = isBorrow
    ? 'Aave debt: variable APY · card: monthly compound APR'
    : 'Aave yield: on-chain APY accrual · bank: monthly compound';
  const selectedAaveDelta = selectedPoint?.aaveDelta || 0;
  const selectedBenchmarkDelta = selectedPoint?.benchmarkDelta || 0;
  const selectedX = selectedChartPoint?.x || chart.width;
  const selectedTooltipLeft = `${clamp(
    (selectedX / chart.width) * 100,
    19,
    81,
  )}%`;

  return (
    <div
      className="mx-auto mt-2 w-full max-w-[430px]"
      data-testid="defi-feed-card"
    >
      <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="px-3 pt-3 sm:px-3.5">
          <div className="flex items-start justify-between gap-3">
            <span
              className={`inline-flex rounded-[9px] border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                isClosed
                  ? 'border-gray-200 bg-gray-100 text-gray-700'
                  : isBorrow
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {statusLabel}
            </span>
            <div className="min-w-0 text-right font-mono text-[11px] font-black text-gray-500">
              <span>on </span>
              <span className="text-gray-900">{protocol}</span>
              <span> · {chainLabel}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative h-10 w-11 shrink-0">
                <AaveTokenIcon symbol={symbol} size={40} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#07100c] font-mono text-[8px] font-black text-[#00f59a] shadow-[0_2px_6px_rgba(0,0,0,0.20)]"
                  aria-label="Aave v3"
                >
                  A
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-[18px] font-black leading-tight text-gray-950">
                  {symbol}
                </p>
                <p className="truncate font-mono text-[10px] font-black text-gray-500">
                  {statusSubtitle}
                </p>
              </div>
            </div>
            <div className="min-w-[106px] text-right">
              <p className="font-mono text-[23px] font-black leading-none text-black sm:text-[25px]">
                {formatTokenAmount(amount)}
              </p>
              <p className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
                {symbol} {isClosed ? statusLabel.toLowerCase() : positionNoun}
              </p>
            </div>
          </div>

          <div
            className={`mt-3 flex items-center justify-between rounded-[12px] border px-3 py-2 ${
              isBorrow
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-300/40 bg-[#08150f] text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 font-mono text-[12px] font-black">
              {isBorrow ? (
                <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {isClosed
                  ? isBorrow
                    ? 'Position repaid'
                    : 'Position withdrawn'
                  : isBorrow
                    ? 'Variable borrow'
                    : 'Earning interest'}
              </span>
            </div>
            <div className="font-mono text-[15px] font-black">
              {formatPercent(aaveRate)}
              <span className="ml-1 text-[8px] font-black">APY</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              {projectionHeading}
            </p>
            <div className="inline-flex rounded-[10px] border border-black/[0.08] bg-gray-100 p-0.5">
              {DEFI_PROJECTION_YEARS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setYears(option)}
                  className={`h-6 min-w-7 rounded-[8px] px-1.5 font-mono text-[10px] font-black transition ${
                    years === option
                      ? 'bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.16)]'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {option}Y
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 px-3 sm:px-3.5">
          <div
            className="relative overflow-hidden rounded-[14px] border border-emerald-300/15 bg-[#07100c] px-3 pb-2.5 pt-2.5 shadow-inner"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-emerald-200/45">
                  {aaveChartLabel}
                </p>
                <p className="mt-0.5 truncate font-mono text-[17px] font-black leading-none text-[#00f59a]">
                  {isBorrow ? '' : '+'}
                  {exactUsd.format(selectedAaveDelta)}
                </p>
              </div>
              <div className="shrink-0 self-start rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-0.5 font-mono text-[7px] font-black uppercase tracking-[0.18em] text-emerald-100/55">
                {selectedDurationLabel}
              </div>
              <div className="min-w-0 text-right">
                <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-white/45">
                  {benchmarkChartLabel}
                </p>
                <p className="mt-0.5 truncate font-mono text-[16px] font-black leading-none text-white/70">
                  {isBorrow ? '' : '+'}
                  {exactUsd.format(selectedBenchmarkDelta)}
                </p>
              </div>
            </div>

            <div
              className="relative mt-1 cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-[#00f59a]/70"
              data-testid="defi-projection-chart"
              role="slider"
              tabIndex={0}
              aria-label={`${symbol} projection: ${aaveChartLabel} ${
                isBorrow ? 'variable debt projection' : 'on-chain APY accrual projection'
              } compared with ${benchmarkChartLabel} ${
                isBorrow ? 'monthly projection' : 'monthly compounded projection'
              }`}
              aria-valuemin={0}
              aria-valuemax={lastProjectionIndex}
              aria-valuenow={selectedPointIndex}
              aria-valuetext={`${selectedDurationLabel}: ${symbol} ${aaveChartLabel} ${exactUsd.format(
                selectedAaveDelta,
              )}; ${benchmarkChartLabel} ${exactUsd.format(
                selectedBenchmarkDelta,
              )}. ${compoundingSummary}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId);
                setProjectionFromClientX(event.clientX, event.currentTarget);
              }}
              onPointerMove={(event) => {
                if (event.pointerType === 'mouse' || event.buttons > 0) {
                  setProjectionFromClientX(event.clientX, event.currentTarget);
                }
              }}
              onClick={(event) =>
                setProjectionFromClientX(event.clientX, event.currentTarget)
              }
              onKeyDown={handleChartKeyDown}
            >
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="block h-[92px] w-full"
                aria-hidden="true"
              >
                {[chart.top, (chart.top + chart.bottom) / 2, chart.bottom].map(
                  (lineY) => (
                    <line
                      key={lineY}
                      x1="0"
                      x2={chart.width}
                      y1={rounded(lineY)}
                      y2={rounded(lineY)}
                      stroke="rgba(0,245,154,0.10)"
                      strokeWidth="1"
                    />
                  ),
                )}
                <path d={chart.aaveArea} fill="#00F59A" opacity="0.14" />
                <path
                  d={chart.benchmarkLine}
                  fill="none"
                  stroke="rgba(214,255,237,0.48)"
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d={chart.aaveLine}
                  fill="none"
                  stroke="#00F59A"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <line
                  x1={rounded(selectedX)}
                  x2={rounded(selectedX)}
                  y1={chart.top}
                  y2={chart.bottom}
                  stroke="rgba(0,245,154,0.42)"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                />
                <circle
                  cx={rounded(chart.lastBenchmark.x)}
                  cy={rounded(chart.lastBenchmark.y)}
                  r="2.75"
                  fill="#07100c"
                  stroke="rgba(214,255,237,0.72)"
                  strokeWidth="2"
                />
                <circle
                  cx={rounded(chart.lastAave.x)}
                  cy={rounded(chart.lastAave.y)}
                  r="3.25"
                  fill="#00F59A"
                  stroke="#07100c"
                  strokeWidth="2"
                />
                {selectedChartPoint && (
                  <>
                    <circle
                      cx={rounded(selectedChartPoint.x)}
                      cy={rounded(selectedChartPoint.benchmarkY)}
                      r="3.5"
                      fill="#07100c"
                      stroke="rgba(214,255,237,0.82)"
                      strokeWidth="2"
                    />
                    <circle
                      cx={rounded(selectedChartPoint.x)}
                      cy={rounded(selectedChartPoint.aaveY)}
                      r="4"
                      fill="#00F59A"
                      stroke="#07100c"
                      strokeWidth="2"
                    />
                  </>
                )}
                <text
                  x="0"
                  y={chart.height - 2}
                  fill="rgba(214,255,237,0.36)"
                  fontSize="8"
                  fontWeight="800"
                  letterSpacing="1.2"
                >
                  NOW
                </text>
                <text
                  x={chart.width}
                  y={chart.height - 2}
                  fill="rgba(214,255,237,0.36)"
                  fontSize="8"
                  fontWeight="800"
                  textAnchor="end"
                  letterSpacing="1.2"
                >
                  {years}Y PROJECTION
                </text>
              </svg>

              <div
                className="pointer-events-none absolute top-2 w-[164px] -translate-x-1/2 rounded-[10px] border border-emerald-300/20 bg-[#020805]/95 px-2 py-1.5 shadow-[0_10px_22px_rgba(0,0,0,0.30)]"
                style={{ left: selectedTooltipLeft }}
              >
                <p className="font-mono text-[7px] font-black uppercase tracking-[0.2em] text-emerald-100/45">
                  {selectedDurationLabel} selected
                </p>
                <p className="mt-1 truncate font-mono text-[9px] font-black text-[#00f59a]">
                  {symbol} {aaveBasisLabel} {isBorrow ? '' : '+'}
                  {exactUsd.format(selectedAaveDelta)}
                </p>
                <p className="mt-0.5 truncate font-mono text-[9px] font-black text-white/65">
                  {benchmarkBasisLabel}{' '}
                  {isBorrow ? '' : '+'}
                  {exactUsd.format(selectedBenchmarkDelta)}
                </p>
              </div>
            </div>

            <p className="mt-1 font-mono text-[7.5px] font-black uppercase leading-relaxed tracking-[0.13em] text-emerald-100/40">
              {compoundingSummary}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-mono text-[10px] font-black text-gray-600">
            <LegendItem
              color="bg-[#00f59a]"
              label="Aave"
              value={formatPercent(aaveRate)}
            />
            <LegendItem
              color="bg-gray-300"
              label={benchmarkLegendLabel}
              value={formatPercent(benchmarkRate)}
            />
          </div>
        </div>

        <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-[12px] border border-black/[0.04] bg-gray-50 px-3 py-2 sm:mx-3.5">
          {selectedDifferencePositive ? (
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <ArrowDownLeft
              className="h-3.5 w-3.5 shrink-0 text-rose-500"
              aria-hidden="true"
            />
          )}
          <p
            className={`truncate font-mono text-[11px] font-black ${
              selectedDifferencePositive ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {differenceCopy}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-0 px-3 py-2.5 sm:px-3.5">
          <StatCell
            label={statusLabel}
            value={compactUsd.format(principalUsd)}
          />
          <StatCell
            label={isBorrow ? 'Net APY' : 'Net APY'}
            value={formatPercent(aaveRate)}
            tone={isBorrow ? 'dark' : 'green'}
          />
          <StatCell
            label={
              isBorrow
                ? `${selectedDurationLabel} cost`
                : `${selectedDurationLabel} earned`
            }
            value={`${isBorrow ? '' : '+'}${compactUsd.format(selectedAaveDelta)}`}
            tone={isBorrow ? 'dark' : 'green'}
            last
          />
        </div>

        <div className="px-3.5 pb-3 sm:px-4">
          <p className="sr-only">{benchmarkSource}</p>
          <p className="sr-only">Benchmark as of {benchmarkAsOf}</p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-[3px] ${color}`} />
      <span>{label}</span>
      <span className="font-mono text-gray-500">{value}</span>
    </span>
  );
}

function StatCell({
  label,
  value,
  tone = 'dark',
  last = false,
}: {
  label: string;
  value: string;
  tone?: 'dark' | 'green';
  last?: boolean;
}) {
  return (
    <div className={`${last ? '' : 'border-r border-gray-100'} px-2`}>
      <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate font-mono text-[15px] font-black leading-tight ${
          tone === 'green' ? 'text-emerald-600' : 'text-gray-950'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
