'use client';

import { useMemo } from 'react';

interface CandleChartProps {
  /** Anchor price used to seed the synthetic walk. */
  basePrice: number;
  /** Display height in px. */
  height?: number;
  /** Show price ticks + current price tag on the right. */
  showAxis?: boolean;
  /** Render volume bars below the price plot. */
  showVolume?: boolean;
  /** Accent colour for the dashed mark line / price tag. */
  accent?: string;
}

/**
 * CandleChart — lightweight SVG candlestick visualization. Generates a
 * deterministic synthetic walk anchored on the live mark price so the chart
 * tracks the selected market without requiring a candles feed. Designed to
 * match the look of the Apple-clean perps bento dashboard.
 */
export function CandleChart({
  basePrice,
  height = 380,
  showAxis = true,
  showVolume = true,
  accent = '#d97706',
}: CandleChartProps) {
  const candles = useMemo(() => buildCandles(basePrice), [basePrice]);
  const last = candles[candles.length - 1].c;

  const allP = candles.flatMap((c) => [c.hi, c.lo]);
  const minP = Math.min(...allP) - basePrice * 0.001;
  const maxP = Math.max(...allP) + basePrice * 0.001;

  const W = 600;
  const H = height;
  const axisW = showAxis ? 56 : 0;
  const volH = showVolume ? Math.round(H * 0.22) : 0;
  const priceH = H - volH - (showAxis ? 18 : 0);
  const padTop = 12;
  const padBot = 8;
  const plotH = priceH - padTop - padBot;
  const plotW = W - axisW;
  const cw = plotW / candles.length;
  const y = (v: number) => ((maxP - v) / (maxP - minP)) * plotH + padTop;

  const maxVol = Math.max(...candles.map((c) => c.vol));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxP - t * (maxP - minP));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
    >
      {/* Horizontal grid */}
      {ticks.map((tv, i) => {
        const yy = y(tv);
        return (
          <line
            key={`hg-${i}`}
            x1="0"
            x2={plotW}
            y1={yy}
            y2={yy}
            stroke="rgba(0,0,0,0.04)"
            strokeWidth="1"
          />
        );
      })}

      {/* Vertical grid every 10 candles */}
      {[0, 10, 20, 30, 40, 50].map((i) => (
        <line
          key={`vg-${i}`}
          x1={i * cw}
          x2={i * cw}
          y1={padTop}
          y2={priceH - padBot}
          stroke="rgba(0,0,0,0.03)"
          strokeWidth="1"
        />
      ))}

      {/* Candles */}
      {candles.map((cd, i) => {
        const up = cd.c >= cd.o;
        const col = up ? '#19a974' : '#e5484d';
        const x = i * cw + cw / 2;
        return (
          <g key={`c-${i}`}>
            <line
              x1={x}
              x2={x}
              y1={y(cd.hi)}
              y2={y(cd.lo)}
              stroke={col}
              strokeWidth="1"
            />
            <rect
              x={i * cw + cw * 0.15}
              width={cw * 0.7}
              y={y(Math.max(cd.o, cd.c))}
              height={Math.max(1, Math.abs(y(cd.o) - y(cd.c)))}
              fill={col}
            />
          </g>
        );
      })}

      {/* Mark line */}
      <line
        x1="0"
        x2={plotW}
        y1={y(last)}
        y2={y(last)}
        stroke={accent}
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.55"
      />

      {showAxis && (
        <>
          {ticks.map((tv, i) => (
            <text
              key={`axt-${i}`}
              x={plotW + 6}
              y={y(tv) + 3}
              fontSize="9.5"
              fontFamily='ui-monospace, "JetBrains Mono", Menlo, monospace'
              fontWeight={500}
              fill="#6e6e76"
            >
              {tv.toFixed(2)}
            </text>
          ))}
          <g>
            <rect
              x={plotW + 2}
              y={y(last) - 8}
              width={50}
              height={16}
              rx={3}
              fill={accent}
            />
            <text
              x={plotW + 27}
              y={y(last) + 3}
              textAnchor="middle"
              fontSize="9.5"
              fontFamily='ui-monospace, "JetBrains Mono", Menlo, monospace'
              fontWeight={700}
              fill="#fff"
            >
              {last.toFixed(2)}
            </text>
          </g>
        </>
      )}

      {/* Volume bars */}
      {showVolume &&
        candles.map((cd, i) => {
          const up = cd.c >= cd.o;
          const col = up ? '#19a974' : '#e5484d';
          const vh = (cd.vol / maxVol) * (volH - 6);
          const vy = priceH + (volH - vh - 2);
          return (
            <rect
              key={`v-${i}`}
              x={i * cw + cw * 0.15}
              width={cw * 0.7}
              y={vy}
              height={vh}
              fill={col}
              opacity="0.35"
            />
          );
        })}

      {showAxis && (
        <>
          {[0, 12, 24, 36, 48, 59].map((i, k) => {
            const hour = 9 + Math.floor(i / 4);
            const min = (i % 4) * 15;
            const lbl = `${hour}:${String(min).padStart(2, '0')}`;
            return (
              <text
                key={`xt-${k}`}
                x={i * cw + cw / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize="9"
                fontFamily='ui-monospace, "JetBrains Mono", Menlo, monospace'
                fontWeight={500}
                fill="#a1a1a8"
              >
                {lbl}
              </text>
            );
          })}
        </>
      )}
    </svg>
  );
}

interface Candle {
  o: number;
  c: number;
  hi: number;
  lo: number;
  vol: number;
}

function buildCandles(basePrice: number): Candle[] {
  // Scale the synthetic noise to ~0.2% of the anchor so the walk feels right
  // for both BTC ($75k) and DOGE ($0.10).
  const amp = Math.max(basePrice * 0.002, 0.00001);
  const out: Candle[] = [];
  let p = basePrice;
  for (let i = 0; i < 60; i++) {
    const o = p;
    const c =
      p + Math.sin(i * 0.7) * amp + Math.cos(i * 0.4) * amp * 0.75 + (i === 30 ? amp * 2 : 0);
    const hi = Math.max(o, c) + Math.abs(Math.sin(i * 1.3)) * amp * 0.5;
    const lo = Math.min(o, c) - Math.abs(Math.cos(i * 1.1)) * amp * 0.5;
    const vol =
      30 + Math.abs(Math.sin(i * 0.9)) * 60 + Math.abs(Math.cos(i * 0.3)) * 30;
    out.push({ o, c, hi, lo, vol });
    p = c;
  }
  return out;
}
