'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useHyperliquidCandles } from './hooks/useHyperliquidCandles';

interface CandleChartProps {
  /** HL coin symbol (e.g. "BTC", "ETH"). */
  coin: string | null;
  /** UI timeframe label (e.g. "1m", "15m", "1D"). */
  interval: string;
  /** Display height in px. */
  height?: number;
}

const UP = '#19a974';
const DOWN = '#e5484d';

/**
 * CandleChart — live TradingView-style candlestick chart powered by Hyperliquid
 * data and `lightweight-charts`. Loads a candle snapshot for the selected
 * (coin, interval) and streams live updates over the `candle` WS channel.
 *
 * Visual style follows the bento dashboard's Apple-clean look: white
 * background, hairline grid, mono price ticks, soft green/red candles with a
 * volume histogram underneath.
 */
export function CandleChart({ coin, interval, height = 380 }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const { bars, isLoading, connected } = useHyperliquidCandles(coin, interval, !!coin);

  // ── Initialise chart once the container is mounted ────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#6e6e76',
        fontFamily:
          'ui-monospace, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.04)' },
        horzLines: { color: 'rgba(0,0,0,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        textColor: '#6e6e76',
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: 'rgba(10,10,12,0.4)',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#0a0a0c',
        },
        horzLine: {
          color: 'rgba(10,10,12,0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0a0a0c',
        },
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceLineStyle: 3,
      priceLineColor: '#d97706',
      priceLineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
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
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // ── Push bars into the chart whenever they change ─────────────────────────
  useEffect(() => {
    const candle = candleSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candle || !volume || !chart) return;

    if (bars.length === 0) {
      candle.setData([]);
      volume.setData([]);
      return;
    }

    const candleData: CandlestickData[] = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    const volumeData: HistogramData[] = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      value: b.volume,
      color:
        b.close >= b.open
          ? 'rgba(25,169,116,0.35)'
          : 'rgba(229,72,77,0.35)',
    }));

    candle.setData(candleData);
    volume.setData(volumeData);

    // Pleasant "fit-to-content" zoom on first load / interval switch.
    chart.timeScale().fitContent();
  }, [bars]);

  // ── Refit price decimals when the price magnitude shifts (e.g. DOGE vs BTC)
  useEffect(() => {
    const candle = candleSeriesRef.current;
    if (!candle || bars.length === 0) return;
    const last = bars[bars.length - 1].close;
    const precision = priceFormatFor(last);
    candle.applyOptions({
      priceFormat: { type: 'price', precision: precision.precision, minMove: precision.minMove },
    });
  }, [bars]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {(!coin || (isLoading && bars.length === 0)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
            <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            {coin ? 'Loading candles…' : 'Select a market'}
          </div>
        </div>
      )}
      {coin && !isLoading && bars.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-400">
          No candle data for {coin} {interval}
        </div>
      )}
      {coin && bars.length > 0 && (
        <div className="absolute top-2.5 right-3 z-10 flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono text-gray-500 bg-white/80 backdrop-blur px-2 py-0.5 rounded-full border border-black/[0.04]">
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

