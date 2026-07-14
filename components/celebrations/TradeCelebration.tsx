'use client';

// Dopamine trade celebrations — web port of the Claude Design handoff
// "Dopamine Notifications.html" (dopamine-notifications.jsx), matching the
// mobile app's src/components/celebrations/TradeCelebration.tsx. Celebratory
// confirmation popups shown right after a transaction is signed, replacing the
// generic success toasts:
//   · perp-opened   — emerald "you're in" charge-up (bolt, confetti)
//   · perp-closed   — profit payoff (trophy, count-up, confetti) or a calm,
//                     honest loss variant (no confetti, forward-looking copy)
//   · bet-placed    — amber ticket with a to-win count-up
//   · bet-claimed   — gold coin burst + WON stamp, payout count-up
// Self-contained: own palette (the design's "fresh kit" tokens) and the
// design's dnPopIn/dnPop/dnRing/dnRays/dnConf/dnStamp/dnBlink keyframes.

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const DN = {
  paper: '#f6f6f6',
  card: '#ffffff',
  ink: '#0c0c0e',
  muted: '#73737c',
  faint: '#a3a3ab',
  hair: 'rgba(12,12,14,0.08)',
  green: '#1ba672',
  greenHi: '#3ad19a',
  red: '#e5484d',
  amber: '#d97706',
  amberHi: '#f59e0b',
  gold: '#e0a325',
  goldHi: '#f6cf6a',
} as const;

const LIGHTEN: Record<string, string> = {
  [DN.green]: '#3ad19a',
  [DN.red]: '#ff8a8e',
  [DN.amber]: '#f7b955',
  [DN.gold]: '#f6cf6a',
};

const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export type TradeCelebrationSpec =
  | {
      kind: 'perp-opened';
      coin: string;
      side: 'long' | 'short';
      leverage: number;
      sizeUsd: number;
      entryPrice: number;
      orderMode: 'market' | 'limit' | 'tpsl';
      /** Extra line under the live pill (e.g. "Exit triggers submitted."). */
      note?: string | null;
    }
  | {
      kind: 'perp-closed';
      coin: string;
      side: 'long' | 'short';
      leverage: number;
      pnlUsd: number;
      /** Return on equity %, when known. */
      pnlPct: number | null;
      entryPrice: number;
      exitPrice: number;
      partial?: boolean;
    }
  | {
      kind: 'bet-placed';
      question: string;
      outcomeLabel: string;
      side: 'BUY' | 'SELL';
      shares: number;
      priceCents: number;
      /** BUY: potential winnings. SELL: amount received. */
      toWinUsd: number;
      stakeUsd: number;
      /** Resting limit order — softens the "you're in" copy. */
      limit?: boolean;
    }
  | {
      kind: 'bet-claimed';
      title: string;
      payoutUsd: number;
      stakeUsd: number | null;
      profitUsd: number | null;
    };

/** Build a bet-placed spec from the shape of OrderSuccessNotification's
 *  OrderSuccessInfo (executed-value-adjusted), shared by the three
 *  prediction order modals. Winning shares settle at $1 each, so a BUY's
 *  potential payout equals its share count. */
export function betPlacedSpecFromOrderInfo(
  info: {
    side: 'BUY' | 'SELL';
    outcomeLabel: string;
    shares: number;
    priceCents: number;
    usd: number;
    isLimit: boolean;
  },
  question: string,
): TradeCelebrationSpec {
  return {
    kind: 'bet-placed',
    question,
    outcomeLabel: info.outcomeLabel,
    side: info.side,
    shares: info.shares,
    priceCents: info.priceCents,
    toWinUsd: info.side === 'BUY' ? info.shares : info.usd,
    stakeUsd: info.usd,
    limit: info.isLimit,
  };
}

const money = (n: number, dec = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

const compactUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`;

const priceUsd = (n: number) =>
  `$${n.toLocaleString('en-US', {
    minimumFractionDigits: n >= 100 ? 0 : 2,
    maximumFractionDigits: n >= 100 ? 0 : n >= 1 ? 2 : 4,
  })}`;

/* ── design keyframes (dnPopIn/dnPop/dnRing/dnRays/dnConf/dnStamp/dnBlink) ── */
const KEYFRAMES = `
@keyframes swopDnFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes swopDnPopIn {
  0% { opacity: 0; transform: translateY(40px) scale(0.92); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes swopDnPop {
  0% { opacity: 0; transform: scale(0); }
  55% { opacity: 1; transform: scale(1.12); }
  78% { transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes swopDnRing {
  0% { transform: scale(0.55); opacity: 0.65; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes swopDnRays {
  0% { transform: scale(0.4); opacity: 0; }
  45% { opacity: 0.9; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes swopDnConf {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 1; }
  75% { opacity: 1; }
  100% {
    transform: translate(var(--dn-tx), var(--dn-ty)) rotate(var(--dn-rot));
    opacity: 0;
  }
}
@keyframes swopDnStamp {
  0% { opacity: 0; transform: rotate(9deg) scale(2.4); }
  100% { opacity: 1; transform: rotate(9deg) scale(1); }
}
@keyframes swopDnBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) {
  .swopDnAnim, .swopDnAnim * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`;

/* ── count-up (design useCountUp: easeOut cubic, rAF) ── */
function useCountUp(
  target: number,
  { dur = 1100, delay = 220, decimals = 2 } = {},
) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const to = setTimeout(() => {
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3.2);
        setV(target * e);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    // Ensure the final value lands even if frames are dropped.
    const done = setTimeout(() => setV(target), delay + dur + 60);
    return () => {
      clearTimeout(to);
      clearTimeout(done);
      cancelAnimationFrame(raf);
    };
  }, [target, dur, delay]);
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

/* ── confetti burst (design dnConf: radial launch + gravity, fade out) ── */
function Confetti({
  colors,
  count = 46,
  coin = false,
}: {
  colors: string[];
  count?: number;
  coin?: boolean;
}) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 90 + Math.random() * 190;
      const tx = Math.cos(ang) * dist;
      const ty = Math.sin(ang) * dist - 40 + (120 + Math.random() * 260); // upward bias + gravity
      const w = coin ? 12 + Math.random() * 8 : 6 + Math.random() * 5;
      return {
        tx,
        ty,
        rot: Math.floor(Math.random() * 720 - 360),
        c: colors[i % colors.length],
        w,
        h: coin ? w : 10 + Math.random() * 14,
        delay: Math.random() * 120,
        dur: 1150 + Math.random() * 900,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60 }}
    >
      <div style={{ position: 'absolute', left: '50%', top: '30%' }}>
        {pieces.map((p, i) => (
          <span
            key={i}
            style={
              {
                position: 'absolute',
                width: p.w,
                height: p.h,
                background: p.c,
                borderRadius: coin ? p.w / 2 : 2,
                opacity: 0,
                '--dn-tx': `${p.tx}px`,
                '--dn-ty': `${p.ty}px`,
                '--dn-rot': `${p.rot}deg`,
                animation: `swopDnConf ${p.dur}ms cubic-bezier(0.18,0.7,0.32,1) ${p.delay}ms both`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ── radiating rays behind the emblem (design dnRays) ── */
function Rays({ color }: { color: string }) {
  const n = 12;
  return (
    <svg
      width={220}
      height={220}
      viewBox="0 0 220 220"
      aria-hidden
      style={{
        position: 'absolute',
        left: -62,
        top: -62,
        pointerEvents: 'none',
        animation: 'swopDnRays 900ms cubic-bezier(0.2,0.8,0.2,1) 100ms both',
      }}
    >
      {Array.from({ length: n }).map((_, i) => {
        const a = (Math.PI * 2 * i) / n;
        return (
          <line
            key={i}
            x1={110 + Math.cos(a) * 56}
            y1={110 + Math.sin(a) * 56}
            x2={110 + Math.cos(a) * 96}
            y2={110 + Math.sin(a) * 96}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.55}
          />
        );
      })}
    </svg>
  );
}

/* ── expanding ring (design dnRing) ── */
function Ring({ color, delay }: { color: string; delay: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        opacity: 0,
        pointerEvents: 'none',
        animation: `swopDnRing 1500ms ease-out ${delay}ms both`,
      }}
    />
  );
}

/* ── emblem: glow + rings + rays + gradient badge (design dnPop) ── */
function Emblem({
  color,
  coin = false,
  muted = false,
  children,
}: {
  color: string;
  coin?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  const hi = coin ? DN.amberHi : LIGHTEN[color] ?? '#ffffff';
  return (
    <div
      style={{
        position: 'relative',
        width: 96,
        height: 96,
        margin: '2px auto 0',
      }}
    >
      {/* soft glow */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -26,
          top: -26,
          width: 148,
          height: 148,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}${muted ? '47' : '80'} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {!muted && (
        <>
          <Ring color={color} delay={150} />
          <Ring color={color} delay={330} />
          <Rays color={color} />
        </>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation:
            'swopDnPop 620ms cubic-bezier(0.34,1.56,0.64,1) 50ms both',
          ...(muted
            ? {
                border: `2px solid ${color}`,
                background: 'rgba(229,72,77,0.10)',
              }
            : {
                background: `radial-gradient(circle at 34% 28%, ${hi} 0%, ${color} 72%, ${color} 100%)`,
              }),
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── icon glyphs (design Glyph) ── */
function Glyph({
  name,
  color = '#fff',
  size = 42,
}: {
  name: 'bolt' | 'trophy' | 'ticket' | 'trend-down';
  color?: string;
  size?: number;
}) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'bolt') {
    return (
      <svg {...p}>
        <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" fill={color} stroke="none" />
      </svg>
    );
  }
  if (name === 'trophy') {
    return (
      <svg {...p}>
        <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3" />
        <path d="M17 6h3v1a3 3 0 0 1-3 3" />
        <line x1={12} y1={13} x2={12} y2={17} />
        <path d="M8.5 20h7" />
        <path d="M9.5 17h5" />
      </svg>
    );
  }
  if (name === 'ticket') {
    return (
      <svg {...p}>
        <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
        <line x1={14} y1={6} x2={14} y2={18} strokeDasharray="1.5 2.5" />
      </svg>
    );
  }
  // trend-down (loss variant)
  return (
    <svg {...p}>
      <line x1={7} y1={8} x2={17} y2={16} />
      <path d="M17 10 L17 16 L11 16" />
    </svg>
  );
}

/* ── small pieces ── */
function Kicker({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        textAlign: 'center',
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color,
      }}
    >
      {children}
    </div>
  );
}

function StatRow({ items }: { items: [string, string, string?][] }) {
  return (
    <div
      style={{
        display: 'flex',
        marginTop: 20,
        borderTop: `1px solid ${DN.hair}`,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: '14px 6px 2px',
            textAlign: 'center',
            borderLeft: i > 0 ? `1px solid ${DN.hair}` : 'none',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: DN.faint,
            }}
          >
            {it[0]}
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: MONO,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: it[2] ?? DN.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {it[1]}
          </div>
        </div>
      ))}
    </div>
  );
}

function CTA({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-opacity hover:opacity-85 active:opacity-75"
      style={{
        marginTop: 22,
        width: '100%',
        borderRadius: 14,
        border: 'none',
        padding: '15px 0',
        background: color,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 0.2,
        cursor: 'pointer',
        boxShadow: `0 10px 12px -4px ${color}73`,
      }}
    >
      {label}
    </button>
  );
}

/* ── blinking live dot (design dnBlink) ── */
function LivePill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        margin: '12px auto 0',
        width: 'fit-content',
        padding: '5px 12px',
        borderRadius: 999,
        background: DN.paper,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          background: color,
          animation: 'swopDnBlink 1.3s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11.5,
          fontWeight: 600,
          color: DN.muted,
        }}
      >
        {children}
      </span>
    </div>
  );
}

/* ── WON stamp (design dnStamp) ── */
function WonStamp() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 18,
        border: `2.5px solid ${DN.green}`,
        borderRadius: 8,
        padding: '3px 9px',
        fontFamily: MONO,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 2,
        color: DN.green,
        animation: 'swopDnStamp 420ms cubic-bezier(0.34,1.56,0.64,1) 450ms both',
      }}
    >
      WON
    </div>
  );
}

const bigNumberStyle: CSSProperties = {
  marginTop: 8,
  textAlign: 'center',
  fontSize: 44,
  fontWeight: 800,
  letterSpacing: -1.5,
  fontVariantNumeric: 'tabular-nums',
};

const subLineStyle: CSSProperties = {
  marginTop: 10,
  textAlign: 'center',
  fontFamily: MONO,
  fontSize: 14,
  fontWeight: 700,
};

/* ══════════════ variant bodies ══════════════ */

function PerpOpenedBody({
  spec,
  onDone,
}: {
  spec: Extract<TradeCelebrationSpec, { kind: 'perp-opened' }>;
  onDone: () => void;
}) {
  const c = DN.green;
  const resting = spec.orderMode === 'limit' || spec.orderMode === 'tpsl';
  const sideLabel = spec.side === 'long' ? 'Long' : 'Short';
  return (
    <>
      <Confetti colors={['#1ba672', '#23c184', '#8ff0c8', '#ffffff']} count={30} />
      <Emblem color={c}>
        <Glyph name="bolt" />
      </Emblem>
      <Kicker color={c}>{resting ? 'Order placed' : 'Position opened'}</Kicker>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -1,
            color: DN.ink,
          }}
        >
          {sideLabel} {spec.coin}
        </span>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: 8,
            background: 'rgba(27,166,114,0.12)',
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: 700,
            color: c,
          }}
        >
          {spec.leverage}×
        </span>
      </div>
      <LivePill color={c}>
        {resting
          ? 'Resting · fills at your limit price'
          : 'Live · tracking PnL in real time'}
      </LivePill>
      {spec.note ? (
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontSize: 12.5,
            fontWeight: 600,
            color: DN.muted,
          }}
        >
          {spec.note}
        </div>
      ) : null}
      <StatRow
        items={[
          ['Size', compactUsd(spec.sizeUsd)],
          [resting ? 'Limit' : 'Entry', priceUsd(spec.entryPrice)],
          ['Leverage', `${spec.leverage}×`],
        ]}
      />
      <CTA label="View position" color={c} onClick={onDone} />
    </>
  );
}

function PerpClosedProfitBody({
  spec,
  onDone,
}: {
  spec: Extract<TradeCelebrationSpec, { kind: 'perp-closed' }>;
  onDone: () => void;
}) {
  const c = DN.green;
  const pnl = useCountUp(spec.pnlUsd, { delay: 260, dur: 1300 });
  const sideLabel = spec.side === 'long' ? 'Long' : 'Short';
  return (
    <>
      <Confetti
        colors={['#1ba672', '#23c184', '#8ff0c8', '#ffd54a', '#ffffff']}
        count={54}
      />
      <Emblem color={c}>
        <Glyph name="trophy" />
      </Emblem>
      <Kicker color={c}>
        {spec.partial ? 'Position reduced · Profit' : 'Position closed · Profit'}
      </Kicker>
      <div style={{ ...bigNumberStyle, color: c }}>+${money(pnl)}</div>
      <div style={{ ...subLineStyle, color: c }}>
        {spec.pnlPct != null ? `+${money(Math.abs(spec.pnlPct), 1)}% ` : ''}
        <span style={{ fontWeight: 600, color: DN.muted }}>
          {spec.pnlPct != null ? '· ' : ''}
          {spec.coin} {sideLabel} {spec.leverage}×
        </span>
      </div>
      <StatRow
        items={[
          ['Entry', priceUsd(spec.entryPrice)],
          ['Exit', priceUsd(spec.exitPrice), c],
          ['Leverage', `${spec.leverage}×`],
        ]}
      />
      <CTA label="Done" color={c} onClick={onDone} />
    </>
  );
}

/* Calm, honest, forward-looking — no confetti, no burst rays. */
function PerpClosedLossBody({
  spec,
  onDone,
}: {
  spec: Extract<TradeCelebrationSpec, { kind: 'perp-closed' }>;
  onDone: () => void;
}) {
  const c = DN.red;
  const pnl = useCountUp(Math.abs(spec.pnlUsd), { delay: 220, dur: 900 });
  const sideLabel = spec.side === 'long' ? 'Long' : 'Short';
  return (
    <>
      <Emblem color={c} muted>
        <Glyph name="trend-down" color={c} size={40} />
      </Emblem>
      <Kicker color={c}>
        {spec.partial ? 'Position reduced' : 'Position closed'}
      </Kicker>
      <div style={{ ...bigNumberStyle, color: c }}>−${money(pnl)}</div>
      <div style={{ ...subLineStyle, color: c }}>
        {spec.pnlPct != null ? `−${money(Math.abs(spec.pnlPct), 1)}% ` : ''}
        <span style={{ fontWeight: 600, color: DN.muted }}>
          {spec.pnlPct != null ? '· ' : ''}
          {spec.coin} {sideLabel} {spec.leverage}×
        </span>
      </div>
      <div
        style={{
          marginTop: 14,
          textAlign: 'center',
          fontSize: 13.5,
          fontWeight: 600,
          color: DN.muted,
          lineHeight: '19px',
        }}
      >
        Closed to protect your balance.
        <br />
        Next setup&apos;s on the chart.
      </div>
      <StatRow
        items={[
          ['Entry', priceUsd(spec.entryPrice)],
          ['Exit', priceUsd(spec.exitPrice), c],
          ['Leverage', `${spec.leverage}×`],
        ]}
      />
      <CTA label="Back to markets" color={DN.ink} onClick={onDone} />
    </>
  );
}

function BetPlacedBody({
  spec,
  onDone,
}: {
  spec: Extract<TradeCelebrationSpec, { kind: 'bet-placed' }>;
  onDone: () => void;
}) {
  const c = DN.amber;
  const win = useCountUp(spec.toWinUsd, { delay: 300, dur: 1200 });
  const selling = spec.side === 'SELL';
  const kicker = selling
    ? spec.limit
      ? 'Limit sell placed'
      : 'Sell order placed'
    : spec.limit
      ? 'Limit buy placed'
      : "Bet placed · You're in";
  return (
    <>
      <Confetti colors={['#d97706', '#f59e0b', '#ffd54a', '#ffffff']} count={30} />
      <Emblem color={c}>
        <Glyph name="ticket" />
      </Emblem>
      <Kicker color={c}>{kicker}</Kicker>
      <div
        style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: -0.4,
          color: DN.ink,
          lineHeight: '25px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {spec.question}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 14,
        }}
      >
        <span
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            background: 'rgba(27,166,114,0.12)',
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            color: DN.green,
          }}
        >
          {spec.outcomeLabel}
        </span>
        <span
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            background: DN.paper,
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 600,
            color: DN.muted,
          }}
        >
          {money(spec.shares, spec.shares >= 100 ? 0 : 1)} shares @{' '}
          {spec.priceCents}¢
        </span>
      </div>
      {/* ticket to-win block with perforation notches */}
      <div
        style={{
          position: 'relative',
          marginTop: 20,
          borderRadius: 18,
          background: 'rgba(217,119,6,0.07)',
          padding: '16px 0',
          textAlign: 'center',
        }}
      >
        {(['left', 'right'] as const).map((sideKey) => (
          <span
            key={sideKey}
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              [sideKey]: -10,
              width: 20,
              height: 20,
              marginTop: -10,
              borderRadius: '50%',
              background: DN.card,
            }}
          />
        ))}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: c,
          }}
        >
          {selling ? 'You receive' : 'To win'}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: -1.4,
            color: c,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${money(win)}
        </div>
        <div
          style={{
            marginTop: 2,
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 600,
            color: DN.muted,
          }}
        >
          {selling
            ? 'once the order fills'
            : spec.limit
              ? `if it fills and hits · staked $${money(spec.stakeUsd)}`
              : `if it hits · staked $${money(spec.stakeUsd)}`}
        </div>
      </div>
      <CTA label="Done" color={c} onClick={onDone} />
    </>
  );
}

function BetClaimedBody({
  spec,
  onDone,
}: {
  spec: Extract<TradeCelebrationSpec, { kind: 'bet-claimed' }>;
  onDone: () => void;
}) {
  const c = DN.gold;
  const pay = useCountUp(spec.payoutUsd, { delay: 280, dur: 1350 });
  return (
    <>
      <Confetti
        colors={['#e0a325', '#f6cf6a', '#f59e0b', '#fff3cf']}
        count={44}
        coin
      />
      <Emblem color={c} coin>
        <Glyph name="trophy" />
      </Emblem>
      <WonStamp />
      <Kicker color={c}>Winnings claimed</Kicker>
      <div style={{ ...bigNumberStyle, color: c }}>+${money(pay)}</div>
      <div
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 13,
          fontWeight: 600,
          color: DN.muted,
          lineHeight: '18px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {spec.title}
        <br />
        paid to your balance
      </div>
      {spec.stakeUsd != null && spec.profitUsd != null ? (
        <StatRow
          items={[
            ['Stake', `$${money(spec.stakeUsd)}`],
            ['Payout', `$${money(spec.payoutUsd)}`, c],
            [
              'Profit',
              `${spec.profitUsd >= 0 ? '+' : '−'}$${money(Math.abs(spec.profitUsd))}`,
              DN.green,
            ],
          ]}
        />
      ) : null}
      <CTA label="Done" color={c} onClick={onDone} />
    </>
  );
}

/* ── card scaffold on a dimmed backdrop (design Popup + dnPopIn) ── */
export function TradeCelebrationOverlay({
  spec,
  onDone,
}: {
  spec: TradeCelebrationSpec;
  onDone: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  let body: ReactNode;
  if (spec.kind === 'perp-opened') body = <PerpOpenedBody spec={spec} onDone={onDone} />;
  else if (spec.kind === 'perp-closed')
    body =
      spec.pnlUsd >= 0 ? (
        <PerpClosedProfitBody spec={spec} onDone={onDone} />
      ) : (
        <PerpClosedLossBody spec={spec} onDone={onDone} />
      );
  else if (spec.kind === 'bet-placed') body = <BetPlacedBody spec={spec} onDone={onDone} />;
  else body = <BetClaimedBody spec={spec} onDone={onDone} />;

  return (
    <div
      className="swopDnAnim fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        onClick={onDone}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(6,6,9,0.5)',
          animation: 'swopDnFade 400ms ease both',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          borderRadius: 28,
          background: DN.card,
          padding: '26px 24px 22px',
          boxShadow: '0 20px 35px rgba(0,0,0,0.45)',
          animation: 'swopDnPopIn 520ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {body}
      </div>
    </div>
  );
}

/** Standalone portal wrapper — mount once per screen, drive with `spec`. */
export function TradeCelebration({
  spec,
  onDone,
}: {
  spec: TradeCelebrationSpec | null;
  onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!spec || !mounted) return null;
  return createPortal(
    <TradeCelebrationOverlay spec={spec} onDone={onDone} />,
    document.body,
  );
}
