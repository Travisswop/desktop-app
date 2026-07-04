'use client';

// Swop desktop transaction-success celebration modal.
//
// A faithful React/Tailwind port of the "Wallet Success Desktop" design: an
// animated check seal, a window-wide confetti burst, the coin drops in and the
// amount counts up ("value bloom"), then a two-column recap + fee card, a random
// AI joke, and Done / View details / Share actions. The same shell drives both
// Swap and Send — the caller supplies the copy, coins and numbers via props.
//
// Shown after a swap or send confirms; the transaction itself has already
// settled in the background, so this is purely the reward moment.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import CustomModal from '@/components/modal/CustomModal';
import { AI_JOKES } from './tx-success-jokes';

// ── palette (from the desktop mock) ──
const GREEN = '#19a974';
const GREEN_DEEP = '#0f7d55';
const GREEN_SOFT = 'rgba(25,169,116,0.10)';
const GREEN_BORDER = 'rgba(25,169,116,0.22)';

// Coinbase 1%, Phantom 0.85%, Swop 0.5% — the swap fee comparison.
const CB_RATE = 0.01;
const PH_RATE = 0.0085;
const SWOP_RATE = 0.005;

export interface TxCoin {
  label: string; // letter fallback when there's no logo
  uri?: string;
}
export interface TxRecapRow {
  label: string;
  value: string;
  coin: TxCoin;
  positive?: boolean;
  mono?: boolean; // render value in the mono face (addresses / handles)
  sign?: string; // '+' / '−'
}
export interface TransactionSuccessCelebrationProps {
  open: boolean;
  onClose: () => void;
  type: 'swap' | 'send';
  eyebrow: string; // 'Swap complete' / 'Payment sent'
  heroLabel: string; // 'You got' / 'You sent'
  heroAmount: number; // count-up target
  heroDecimals?: number;
  heroSymbol: string;
  heroCoin: TxCoin;
  heroSub: string;
  recap: TxRecapRow[];
  conf: string; // 'Confirmed'
  hashLabel?: string;
  explorerUrl?: string | null;
  notionalUsd: number; // drives the swap fee-savings maths
  gasUsd?: number; // original (un-sponsored) gas for the send card's strike
  shareText: string;
  confetti?: boolean;
  joke?: boolean;
}

const fmt = (n: number, dp = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// One-time keyframes for the whole celebration (seal, confetti, rise, coin drop).
const KEYFRAMES = `
@keyframes swopTxPulse { 0%{transform:scale(.8);opacity:.55} 100%{transform:scale(2.3);opacity:0} }
@keyframes swopTxSealPop { 0%{transform:scale(.3);opacity:0} 55%{transform:scale(1.12);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes swopTxDraw { to { stroke-dashoffset: 0; } }
@keyframes swopTxRise { 0%{transform:translateY(14px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes swopTxCoinDrop { 0%{transform:translateY(-26px) scale(.4);opacity:0} 60%{transform:translateY(4px) scale(1.08);opacity:1} 80%{transform:translateY(-2px) scale(.98)} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes swopTxFall { 0%{transform:translateY(-16px) rotate(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(var(--fall)) rotate(var(--spin));opacity:0} }
@media (prefers-reduced-motion: reduce){ .swopTxAnim { animation: none !important; opacity: 1 !important; transform: none !important; } }
`;

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;
}

const rise = (d: number): React.CSSProperties => ({
  animation: `swopTxRise .55s cubic-bezier(.2,.8,.3,1) ${d}s both`,
});

// ── count-up: springs a number to target ──
function useCountUp(target: number, dur: number, deps: unknown[]) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | undefined;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setV(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const settle = setTimeout(() => setV(target), dur + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}

// ── token coin: logo when available, gradient + letter fallback ──
function Coin({ coin, size }: { coin: TxCoin; size: number }) {
  const [failed, setFailed] = useState(false);
  const show = coin.uri && !failed;
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: show ? '#fff' : 'linear-gradient(135deg,#3b8ef0,#2775ca)',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.44,
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
      }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coin.uri}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        coin.label
      )}
    </span>
  );
}

// ── confetti burst over the whole window (portalled out of the transformed modal) ──
interface Piece {
  id: number;
  left: number;
  fall: number;
  spin: number;
  dur: number;
  delay: number;
  size: number;
  col: string;
  round: boolean;
}
function Confetti({ runKey }: { runKey: string }) {
  const pieces = useMemo<Piece[]>(() => {
    const cols = [GREEN, '#2a6fdb', '#f0b34a', '#ff8a5c', GREEN_DEEP, '#7c5cf0'];
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      fall: 520 + Math.random() * 460,
      spin: Math.random() * 720 - 360,
      dur: 1.9 + Math.random() * 1.7,
      delay: Math.random() * 0.5,
      size: 7 + Math.random() * 8,
      col: cols[i % cols.length],
      round: Math.random() > 0.55,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[130] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="swopTxAnim absolute"
          style={
            {
              top: -16,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.col,
              borderRadius: p.round ? '50%' : 2,
              '--fall': `${p.fall}px`,
              '--spin': `${p.spin}deg`,
              animation: `swopTxFall ${p.dur}s cubic-bezier(.3,.7,.4,1) ${p.delay}s forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  );
}

// ── animated check seal ──
function CheckSeal({ runKey }: { runKey: string }) {
  return (
    <div key={runKey} className="relative mx-auto h-[84px] w-[84px]">
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: GREEN, animation: 'swopTxPulse 1.2s ease-out 0.15s forwards' }}
      />
      <div
        className="swopTxAnim relative flex h-[84px] w-[84px] items-center justify-center rounded-full"
        style={{
          background: `linear-gradient(160deg, ${GREEN}, ${GREEN_DEEP})`,
          boxShadow: `0 12px 30px -8px ${GREEN}88`,
          animation: 'swopTxSealPop 0.6s cubic-bezier(.2,1.3,.4,1) forwards',
        }}
      >
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 12.5 10 17.5 19 7"
            style={{
              strokeDasharray: 26,
              strokeDashoffset: 26,
              animation: 'swopTxDraw .5s ease .35s forwards',
            }}
          />
        </svg>
      </div>
    </div>
  );
}

export default function TransactionSuccessCelebration({
  open,
  onClose,
  type,
  eyebrow,
  heroLabel,
  heroAmount,
  heroDecimals,
  heroSymbol,
  heroCoin,
  heroSub,
  recap,
  conf,
  hashLabel,
  explorerUrl,
  notionalUsd,
  gasUsd = 0,
  shareText,
  confetti = true,
  joke = true,
}: TransactionSuccessCelebrationProps) {
  const [run, setRun] = useState(0);
  const [shared, setShared] = useState(false);
  const runKey = `${type}-${run}`;

  const dp = heroDecimals ?? (heroAmount >= 1 ? 2 : 6);
  const bloomVal = useCountUp(heroAmount, 1200, [runKey, open]);

  const cbFee = notionalUsd * CB_RATE;
  const phFee = notionalUsd * PH_RATE;
  const swopFee = notionalUsd * SWOP_RATE;
  const saved = cbFee - swopFee;
  const savedVal = useCountUp(saved, 1400, [runKey, open]);

  const [jokeIdx, setJokeIdx] = useState(() => Math.floor(Math.random() * AI_JOKES.length));
  const rollJoke = () => setJokeIdx(Math.floor(Math.random() * AI_JOKES.length));
  const nextJoke = () =>
    setJokeIdx((i) => (i + 1 + Math.floor(Math.random() * (AI_JOKES.length - 1))) % AI_JOKES.length);
  const replay = () => {
    setRun((r) => r + 1);
    rollJoke();
  };

  const onShare = async () => {
    setShared(true);
    setTimeout(() => setShared(false), 1600);
    const text = explorerUrl ? `${shareText}\n${explorerUrl}` : shareText;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled share / clipboard blocked — the check tick is enough */
    }
  };

  return (
    <CustomModal
      isOpen={open}
      onCloseModal={onClose}
      ariaLabel="Transaction complete"
      width="max-w-[640px]"
      removeCloseButton
      contentClassName="overflow-y-auto"
    >
      <Styles />
      {open && confetti ? <Confetti runKey={runKey} /> : null}

      {/* header controls */}
      <div className="flex items-center justify-between px-[18px] pt-4">
        <button
          type="button"
          onClick={replay}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/[0.07] bg-[#fafaf8] px-3 text-[12.5px] font-semibold text-[#6e6e76] hover:bg-gray-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" />
          </svg>
          Replay
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-[#fafaf8] hover:bg-gray-100"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6e6e76" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* hero */}
      <div className="px-8 pt-1 text-center">
        <CheckSeal runKey={runKey} />
        <div style={{ ...rise(0.35), marginTop: 16 }} className="swopTxAnim">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[1.6px]" style={{ color: GREEN }}>
            {eyebrow}
          </div>
          <div className="mt-1.5 text-[23px] font-extrabold -tracking-[0.02em] text-[#0a0a0c]">
            {heroLabel}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <div key={`coin-${runKey}`} className="swopTxAnim" style={{ animation: 'swopTxCoinDrop .8s cubic-bezier(.2,1.2,.4,1) .3s both' }}>
            <Coin coin={heroCoin} size={48} />
          </div>
          <div className="text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[42px] font-extrabold -tracking-[0.04em] text-[#0a0a0c]">{fmt(bloomVal, dp)}</span>
              <span className="text-[19px] font-bold text-[#6e6e76]">{heroSymbol}</span>
            </div>
            <div className="swopTxAnim mt-0.5 text-[13px] text-[#6e6e76]" style={rise(0.5)}>
              {heroSub}
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-col gap-3 px-[22px] pb-[22px] pt-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* recap */}
          <div className="swopTxAnim self-start overflow-hidden rounded-[14px] border border-black/[0.07]" style={rise(0.6)}>
            {recap.map((r, i) => (
              <div
                key={r.label}
                className={`flex items-center gap-3 px-[15px] py-[13px] ${i ? 'border-t border-black/[0.045]' : ''}`}
              >
                <Coin coin={r.coin} size={28} />
                <span className="flex-1 text-[13px] text-[#6e6e76]">{r.label}</span>
                {r.mono ? (
                  <span className="font-mono text-[13.5px] font-bold text-[#0a0a0c]">{r.value}</span>
                ) : (
                  <span className="font-mono text-[14px] font-bold" style={{ color: r.positive ? GREEN : '#0a0a0c' }}>
                    {r.sign ?? ''}
                    {r.value}
                  </span>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-black/[0.07] bg-[#fafaf8] px-[15px] py-[11px]">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.3px] text-[#6e6e76]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {conf}
              </span>
              {hashLabel ? <span className="font-mono text-[11.5px] text-[#a1a1a8]">{hashLabel}</span> : null}
            </div>
          </div>

          {/* fees */}
          {type === 'send' ? (
            <div className="swopTxAnim self-start rounded-[14px] border border-black/[0.07] p-4" style={rise(0.82)}>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.7px] text-[#a1a1a8]">Gas fee</span>
                  </div>
                  <div className="mt-[7px] flex items-baseline gap-2">
                    <span className="text-[27px] font-extrabold -tracking-[0.03em] text-[#0a0a0c]">$0.00</span>
                    {gasUsd > 0 ? (
                      <span className="font-mono text-[13px] font-semibold text-[#a1a1a8] line-through">${fmt(gasUsd)}</span>
                    ) : null}
                  </div>
                </div>
                <span
                  className="whitespace-nowrap rounded-full px-[9px] py-1 font-mono text-[10.5px] font-bold"
                  style={{ color: GREEN, background: GREEN_SOFT, border: `1px solid ${GREEN_BORDER}` }}
                >
                  Sponsored
                </span>
              </div>
              <div
                className="mt-[13px] flex items-center gap-2.5 rounded-xl px-[13px] py-[11px]"
                style={{ background: GREEN_SOFT, border: `1px solid ${GREEN_BORDER}` }}
              >
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-white"
                  style={{ border: `1px solid ${GREEN_BORDER}` }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="text-[13px] leading-[1.42] text-[#0a0a0c]">
                  Swop covered the network gas on this send.{' '}
                  <span className="text-[#6e6e76]">
                    Gasless sends most self-custody wallets can’t pull off — yours just did.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="swopTxAnim self-start rounded-[14px] border border-black/[0.07] p-4" style={rise(0.82)}>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.7px] text-[#a1a1a8]">Fees</span>
                  </div>
                  <div className="mt-[7px] flex items-baseline gap-[7px]">
                    <span className="text-[27px] font-extrabold -tracking-[0.03em]" style={{ color: GREEN }}>${fmt(savedVal)}</span>
                    <span className="text-[13.5px] font-semibold text-[#0a0a0c]">saved</span>
                  </div>
                </div>
                <span
                  className="whitespace-nowrap rounded-full px-[9px] py-1 font-mono text-[10.5px] font-bold"
                  style={{ color: GREEN, background: GREEN_SOFT, border: `1px solid ${GREEN_BORDER}` }}
                >
                  ½ the fee
                </span>
              </div>
              <div className="mt-[13px] flex flex-col gap-[9px]">
                {[
                  { name: 'Coinbase', rate: '1.0%', fee: cbFee, w: 100, track: false },
                  { name: 'Phantom', rate: '0.85%', fee: phFee, w: 85, track: false },
                  { name: 'Swop', rate: '0.5%', fee: swopFee, w: 50, track: true },
                ].map((r) => (
                  <div key={r.name} className="flex items-center gap-[11px]">
                    <div className="flex w-[108px] flex-shrink-0 items-center gap-1.5">
                      <span className="text-[13px]" style={{ fontWeight: r.track ? 700 : 600, color: r.track ? '#0a0a0c' : '#6e6e76' }}>
                        {r.name}
                      </span>
                      <span
                        className="rounded-[5px] px-[5px] font-mono text-[9.5px] font-bold"
                        style={{
                          color: r.track ? GREEN : '#a1a1a8',
                          background: r.track ? GREEN_SOFT : '#f2f2ef',
                        }}
                      >
                        {r.rate}
                      </span>
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full border border-black/[0.07] bg-[#f2f2ef]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.w}%`,
                          background: r.track ? `linear-gradient(90deg, ${GREEN}, #3fca92)` : '#a1a1a8',
                          opacity: r.track ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <span
                      className="w-14 flex-shrink-0 text-right font-mono text-[12.5px] font-bold"
                      style={{ color: r.track ? '#0a0a0c' : '#6e6e76' }}
                    >
                      ${fmt(r.fee)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI joke (full width) */}
        {joke ? (
          <div
            className="swopTxAnim rounded-[14px] p-[15px]"
            style={{ ...rise(0.72), background: `linear-gradient(140deg, ${GREEN_SOFT}, #fff 60%)`, border: `1px solid ${GREEN_BORDER}` }}
          >
            <div className="flex items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[17px]"
                  style={{ border: `1px solid ${GREEN_BORDER}` }}
                >
                  🤖
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: GREEN }}>
                  While you wait…
                </span>
              </span>
              <button
                type="button"
                onClick={nextJoke}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-[11px] text-[12px] font-semibold text-[#6e6e76] hover:bg-gray-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" />
                </svg>
                Another
              </button>
            </div>
            <div className="mt-2.5 text-[15px] font-semibold leading-[1.4] -tracking-[0.01em] text-[#0a0a0c]">
              {AI_JOKES[jokeIdx]}
            </div>
          </div>
        ) : null}

        {/* actions */}
        <div className="swopTxAnim mt-[3px] flex gap-2.5" style={rise(0.9)}>
          {explorerUrl ? (
            <Link
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-black/[0.07] bg-white text-[14px] font-semibold text-[#0a0a0c] hover:border-black/[0.15]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6e6e76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
              View details
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-black/[0.07] bg-white text-[14px] font-semibold text-[#0a0a0c] opacity-50"
            >
              View details
            </button>
          )}
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[13px] text-[14px] font-bold"
            style={{ color: GREEN, background: GREEN_SOFT, border: `1px solid ${shared ? GREEN : GREEN_BORDER}`, transition: 'all .2s' }}
          >
            {shared ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="M16 6l-4-4-4 4M12 2v13" />
              </svg>
            )}
            {shared ? 'Copied!' : 'Share'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-[46px] flex-[1.2] rounded-[13px] bg-[#0a0a0c] text-[14.5px] font-bold -tracking-[0.01em] text-white hover:bg-black/90"
          >
            Done
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
