'use client';

// Web port of the mobile "Swop Swap Dial" — a 270° rotary gauge the user drags
// to size an order as a percentage of their available balance. The arc opens at
// the bottom (135° → 45° clockwise through 12 o'clock); the knob tracks the
// progress end and the center shows % / amount / detail. Geometry and tokens
// mirror Expo-Moon-App/src/components/swap/AmountDial.tsx.
import { useRef } from 'react';

const SWEEP_DEG = 270;
const START_DEG = 135; // screen coords, y-down: down-left, sweeping clockwise

const INK = '#0b0b0d';
const MUTED = '#6c6c74';
const ACCENT = '#15a47a';
const DIAL_TRACK = 'rgba(11,11,13,0.09)';
const TICK_MINOR = 'rgba(11,11,13,0.2)';
const TICK_MAJOR = '#0b0b0d';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// Coordinates are rounded so SSR and client serialize identically — raw
// Math.cos/sin results differ in the last float digit across engines, which
// trips React's hydration diff.
function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: round3(cx + r * Math.cos(rad)),
    y: round3(cy + r * Math.sin(rad)),
  };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  sweep: number,
) {
  const from = polar(cx, cy, r, fromDeg);
  const to = polar(cx, cy, r, fromDeg + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

interface AmountDialProps {
  /** 0–100 */
  percent: number;
  onPercentChange: (percent: number) => void;
  /** e.g. "$20.00" */
  primaryText: string;
  /** e.g. "≈ 13 shares" */
  secondaryText: string;
  /** Rendered square, defaults to 232px */
  size?: number;
  disabled?: boolean;
}

export default function AmountDial({
  percent,
  onPercentChange,
  primaryText,
  secondaryText,
  size = 232,
  disabled,
}: AmountDialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // A drag only engages the dial when it STARTS on the ring band — a click on
  // the center readout must not teleport the amount.
  const engagedRef = useRef(false);

  // Proportions match the mobile dial (stroke 30 on a 560 canvas).
  const stroke = (size * 30) / 560;
  const c = size / 2;
  const r = c - stroke * 1.6;
  const clamped = Math.min(100, Math.max(0, percent));
  const knob = polar(c, c, r, START_DEG + (SWEEP_DEG * clamped) / 100);
  const scale = (v: number) => (v * size) / 560;

  const pointFromEvent = (e: React.PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * size,
      y: ((e.clientY - rect.top) / rect.height) * size,
    };
  };

  const setFromPoint = (x: number, y: number) => {
    const deg = (Math.atan2(y - c, x - c) * 180) / Math.PI; // -180..180
    const t = (deg - START_DEG + 720) % 360;
    // Inside the sweep → map to %; in the bottom gap → snap to nearest end.
    const pct =
      t <= SWEEP_DEG ? (t / SWEEP_DEG) * 100 : t < SWEEP_DEG + 45 ? 100 : 0;
    onPercentChange(Math.round(pct));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const point = pointFromEvent(e);
    if (!point) return;
    const dist = Math.hypot(point.x - c, point.y - c);
    // Tight inner bound so grabbing the center text never engages the ring.
    engagedRef.current = dist >= r - stroke * 1.2 && dist <= c + stroke;
    if (engagedRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setFromPoint(point.x, point.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!engagedRef.current || disabled) return;
    const point = pointFromEvent(e);
    if (point) setFromPoint(point.x, point.y);
  };

  const endDrag = () => {
    engagedRef.current = false;
  };

  // Dense minor-tick ring just outside the track with bold ink notches marking
  // the two ends of the sweep.
  const ticks = Array.from({ length: 61 }, (_, i) => {
    const deg = START_DEG + (SWEEP_DEG * i) / 60;
    const end = i === 0 || i === 60;
    const quarter = !end && i % 15 === 0;
    const inner = polar(c, c, r + stroke * 0.8, deg);
    const outer = polar(
      c,
      c,
      r + stroke * 0.8 + scale(end ? 20 : quarter ? 14 : 9),
      deg,
    );
    return { inner, outer, end, key: i };
  });

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        touchAction: 'none',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ display: 'block', cursor: disabled ? 'default' : 'pointer' }}
      >
        {ticks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.end ? TICK_MAJOR : TICK_MINOR}
            strokeWidth={scale(tick.end ? 5 : 2.5)}
            strokeLinecap="round"
          />
        ))}
        <path
          d={arcPath(c, c, r, START_DEG, SWEEP_DEG)}
          stroke={DIAL_TRACK}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {clamped > 0 && (
          <path
            d={arcPath(
              c,
              c,
              r,
              START_DEG,
              Math.max((SWEEP_DEG * clamped) / 100, 0.5),
            )}
            stroke={ACCENT}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        )}
        <circle
          cx={knob.x}
          cy={knob.y}
          r={stroke * 0.82}
          fill="#ffffff"
          stroke={ACCENT}
          strokeWidth={scale(6)}
        />
        <circle cx={knob.x} cy={knob.y} r={stroke * 0.3} fill={ACCENT} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: scale(104),
              lineHeight: `${scale(112)}px`,
              color: INK,
            }}
          >
            {Math.round(clamped)}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: scale(42),
              color: MUTED,
              marginTop: scale(16),
            }}
          >
            %
          </span>
        </div>
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: scale(36),
            color: INK,
            marginTop: scale(4),
            maxWidth: scale(330),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primaryText}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: scale(28),
            color: MUTED,
            marginTop: scale(4),
            maxWidth: scale(330),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {secondaryText}
        </span>
      </div>
    </div>
  );
}
