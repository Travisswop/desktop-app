'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  CrosshairMode,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type AreaData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useHyperliquidCandles } from './hooks/useHyperliquidCandles';

export type ChartType = 'candles' | 'line' | 'area';

/** Snapshot of the bar the user is hovering (or the latest bar) + EMA value. */
export interface ChartReadout {
  open: number;
  high: number;
  low: number;
  close: number;
  changePct: number;
  ema20: number | null;
}

interface CandleChartProps {
  /** HL coin symbol (e.g. "BTC", "ETH"). */
  coin: string | null;
  /** UI timeframe label (e.g. "1m", "15m", "1D"). */
  interval: string;
  /** Render style — candlesticks, a close line, or a filled area. */
  chartType?: ChartType;
  /** Display height in px. */
  height?: number;
  theme?: 'light' | 'dark';
  historyBars?: number;
  /** Reports the hovered (or latest) bar's OHLC + EMA for the toolbar readout. */
  onReadout?: (readout: ChartReadout | null) => void;
}

const UP = '#19a974';
const DOWN = '#e5484d';
const DARK_UP = '#3fe08f';
const DARK_DOWN = '#ff5d63';
const EMA_COLOR = '#9b6cf2';
const EMA_PERIOD = 20;

/** Exponential moving average over the close series. */
function computeEma(
  bars: { time: number; close: number }[],
  period: number,
): LineData[] {
  if (bars.length === 0) return [];
  const k = 2 / (period + 1);
  const out: LineData[] = [];
  let ema = bars[0].close;
  bars.forEach((b, i) => {
    ema = i === 0 ? b.close : b.close * k + ema * (1 - k);
    out.push({ time: b.time as UTCTimestamp, value: ema });
  });
  return out;
}

/**
 * CandleChart — live TradingView-style chart powered by Hyperliquid data and
 * `lightweight-charts`. Supports candlestick, line, and area render modes with
 * an EMA-20 overlay and a volume histogram. Streams live updates over the
 * `candle` WS channel and reports OHLC/EMA back to the parent toolbar.
 */
export function CandleChart({
  coin,
  interval,
  chartType = 'candles',
  height = 380,
  theme = 'light',
  historyBars,
  onReadout,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<
    'Candlestick' | 'Line' | 'Area'
  > | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const onReadoutRef = useRef(onReadout);
  onReadoutRef.current = onReadout;

  const isDark = theme === 'dark';
  const upColor = isDark ? DARK_UP : UP;
  const downColor = isDark ? DARK_DOWN : DOWN;

  const { bars, isLoading, connected } = useHyperliquidCandles(
    coin,
    interval,
    !!coin,
    historyBars,
  );

  // ── Initialise chart — recreated when render style / theme changes ────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#090b0e' : '#ffffff' },
        textColor: isDark ? '#8a8f9d' : '#6e6e76',
        fontFamily:
          'ui-monospace, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        textColor: isDark ? '#8a8f9d' : '#6e6e76',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: isDark ? 'rgba(236,238,242,0.35)' : 'rgba(10,10,12,0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#15171d' : '#0a0a0c',
        },
        horzLine: {
          color: isDark ? 'rgba(236,238,242,0.35)' : 'rgba(10,10,12,0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: isDark ? '#15171d' : '#0a0a0c',
        },
      },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    let priceSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'>;
    if (chartType === 'line') {
      priceSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#3fe08f' : '#0a0a0c',
        lineWidth: 2,
        priceLineStyle: LineStyle.Dashed,
        priceLineColor: isDark ? '#3fe08f' : '#d97706',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
    } else if (chartType === 'area') {
      priceSeries = chart.addSeries(AreaSeries, {
        lineColor: upColor,
        topColor: isDark ? 'rgba(63,224,143,0.28)' : 'rgba(25,169,116,0.20)',
        bottomColor: isDark ? 'rgba(63,224,143,0.0)' : 'rgba(25,169,116,0.0)',
        lineWidth: 2,
        priceLineStyle: LineStyle.Dashed,
        priceLineColor: isDark ? '#3fe08f' : '#d97706',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
    } else {
      priceSeries = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
        priceLineStyle: LineStyle.Dashed,
        priceLineColor: isDark ? '#3fe08f' : '#d97706',
        priceLineWidth: 1,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
    }

    const emaSeries = chart.addSeries(LineSeries, {
      color: EMA_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: 'rgba(110,110,118,0.35)',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;
    emaSeriesRef.current = emaSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      emaSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [chartType, downColor, height, isDark, upColor]);

  // ── Push bars into the chart whenever they change ─────────────────────────
  useEffect(() => {
    const price = priceSeriesRef.current;
    const ema = emaSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!price || !ema || !volume || !chart) return;

    if (bars.length === 0) {
      price.setData([]);
      ema.setData([]);
      volume.setData([]);
      onReadoutRef.current?.(null);
      return;
    }

    if (chartType === 'candles') {
      const candleData: CandlestickData[] = bars.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      (price as ISeriesApi<'Candlestick'>).setData(candleData);
    } else {
      const lineData: (LineData | AreaData)[] = bars.map((b) => ({
        time: b.time as UTCTimestamp,
        value: b.close,
      }));
      (price as ISeriesApi<'Line' | 'Area'>).setData(lineData);
    }

    ema.setData(computeEma(bars, EMA_PERIOD));

    const volumeData: HistogramData[] = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      value: b.volume,
      color:
        b.close >= b.open
          ? isDark
            ? 'rgba(63,224,143,0.28)'
            : 'rgba(25,169,116,0.35)'
          : isDark
          ? 'rgba(255,93,99,0.28)'
          : 'rgba(229,72,77,0.35)',
    }));
    volume.setData(volumeData);

    chart.timeScale().fitContent();

    // Default readout = latest bar.
    const last = bars[bars.length - 1];
    const emaVals = computeEma(bars, EMA_PERIOD);
    onReadoutRef.current?.({
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      changePct: last.open ? ((last.close - last.open) / last.open) * 100 : 0,
      ema20: (emaVals[emaVals.length - 1]?.value as number) ?? null,
    });
  }, [bars, chartType, isDark]);

  // ── Crosshair → report the hovered bar's OHLC + EMA ───────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    const price = priceSeriesRef.current;
    const ema = emaSeriesRef.current;
    if (!chart || !price || !ema) return;

    const handler = (param: Parameters<
      Parameters<IChartApi['subscribeCrosshairMove']>[0]
    >[0]) => {
      if (!param.time || !param.point) {
        // Fall back to the latest bar when the cursor leaves the chart.
        if (bars.length > 0) {
          const last = bars[bars.length - 1];
          const emaVals = computeEma(bars, EMA_PERIOD);
          onReadoutRef.current?.({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            changePct: last.open
              ? ((last.close - last.open) / last.open) * 100
              : 0,
            ema20: (emaVals[emaVals.length - 1]?.value as number) ?? null,
          });
        }
        return;
      }
      const bar = bars.find((b) => b.time === param.time);
      if (!bar) return;
      const emaData = param.seriesData.get(ema) as { value?: number } | undefined;
      onReadoutRef.current?.({
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        changePct: bar.open ? ((bar.close - bar.open) / bar.open) * 100 : 0,
        ema20: emaData?.value ?? null,
      });
    };

    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, [bars]);

  // ── Refit price decimals when the price magnitude shifts ──────────────────
  useEffect(() => {
    const price = priceSeriesRef.current;
    if (!price || bars.length === 0) return;
    const last = bars[bars.length - 1].close;
    const precision = priceFormatFor(last);
    price.applyOptions({
      priceFormat: {
        type: 'price',
        precision: precision.precision,
        minMove: precision.minMove,
      },
    });
  }, [bars]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {(!coin || (isLoading && bars.length === 0)) && (
        <div
          className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] ${
            isDark ? 'bg-black/45' : 'bg-white/60'
          }`}
        >
          <div
            className={`flex items-center gap-2 text-[12px] font-medium ${
              isDark ? 'text-[#8a8f9d]' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full border-2 animate-spin ${
                isDark
                  ? 'border-[#2a2f3a] border-t-[#3fe08f]'
                  : 'border-gray-300 border-t-gray-600'
              }`}
            />
            {coin ? 'Loading candles…' : 'Select a market'}
          </div>
        </div>
      )}
      {coin && !isLoading && bars.length === 0 && (
        <div
          className={`absolute inset-0 flex items-center justify-center text-[12px] ${
            isDark ? 'text-[#737783]' : 'text-gray-400'
          }`}
        >
          No candle data for {coin} {interval}
        </div>
      )}
      {coin && bars.length > 0 && (
        <div
          className={`absolute top-2.5 right-3 z-10 flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono backdrop-blur px-2 py-0.5 rounded-full border ${
            isDark
              ? 'border-white/[0.07] bg-black/65 text-[#8a8f9d]'
              : 'border-black/[0.04] bg-white/80 text-gray-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-gray-400'
            }`}
          />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
      )}
    </div>
  );
}

// Pick a sensible price format precision based on magnitude.
function priceFormatFor(price: number): { precision: number; minMove: number } {
  if (price >= 1000) return { precision: 2, minMove: 0.01 };
  if (price >= 10) return { precision: 3, minMove: 0.001 };
  if (price >= 1) return { precision: 4, minMove: 0.0001 };
  if (price >= 0.1) return { precision: 5, minMove: 0.00001 };
  return { precision: 6, minMove: 0.000001 };
}
