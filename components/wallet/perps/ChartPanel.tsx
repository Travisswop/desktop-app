'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CandleChart, type ChartType, type ChartReadout } from './CandleChart';

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1D', '1W'] as const;
const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

interface ChartPanelProps {
  coin: string | null;
  interval: string;
  onIntervalChange: (interval: string) => void;
}

/**
 * ChartPanel — the Fresh trading view's chart card. Owns the render-style
 * toggle (candles / line / area) and the live OHLC + EMA readout, and wraps the
 * data-driven CandleChart. Timeframe is owned by the parent so it can be shared.
 */
export function ChartPanel({ coin, interval, onIntervalChange }: ChartPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [readout, setReadout] = useState<ChartReadout | null>(null);

  return (
    <div className="bg-white border border-black/[0.06] rounded-[18px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-black/[0.06] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-0.5 p-0.5 bg-[#f4f4f1] rounded-lg">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onIntervalChange(tf)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  interval === tf
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-1 text-[11.5px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
            <Plus className="w-3 h-3" />
            Indicators
          </button>
        </div>

        {/* Render-style toggle */}
        <div className="flex gap-0.5 p-0.5 bg-[#f4f4f1] rounded-lg">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setChartType(ct.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                chartType === ct.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC + EMA readout */}
      <div className="px-4 py-1.5 flex items-center gap-3 text-[11px] font-mono font-semibold tracking-wide border-b border-black/[0.04] text-gray-500 flex-wrap">
        {readout ? (
          <>
            <span>
              O <span className="text-gray-900 tabular-nums">{fmt(readout.open)}</span>
            </span>
            <span>
              H <span className="text-emerald-600 tabular-nums">{fmt(readout.high)}</span>
            </span>
            <span>
              L <span className="text-red-500 tabular-nums">{fmt(readout.low)}</span>
            </span>
            <span>
              C <span className="text-gray-900 tabular-nums">{fmt(readout.close)}</span>
            </span>
            {readout.ema20 != null && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-0.5 rounded-full bg-[#9b6cf2]" />
                <span style={{ color: '#9b6cf2' }}>EMA20</span>
                <span className="text-gray-900 tabular-nums">{fmt(readout.ema20)}</span>
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>

      {/* Chart */}
      <div className="relative flex-1 min-h-0">
        <CandleChart
          coin={coin}
          interval={interval}
          chartType={chartType}
          onReadout={setReadout}
        />
      </div>
    </div>
  );
}

function fmt(value: number): string {
  if (value >= 1000)
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}
