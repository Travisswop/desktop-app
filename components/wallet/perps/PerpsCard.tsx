'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Loader2,
  Share2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHyperliquidMarkets } from './hooks/useHyperliquidMarkets';
import { useHyperliquidPortfolio } from './hooks/useHyperliquidPortfolio';
import { useAllMids } from './hooks/useHyperliquidWebSocket';
import {
  formatPrice,
  getLiquidationRisk,
} from '@/services/hyperliquid/types';
import type { HLPosition } from '@/services/hyperliquid/types';
import {
  PerpsActionsModal,
  type PerpsActionTab,
} from './PerpsActionsModal';

interface PerpsCardProps {
  /** Selected EVM wallet address used as the Hyperliquid master account. */
  masterAddress: string | undefined;
  /** True while silently reconnecting after a brief disconnect */
  isReconnecting?: boolean;
  /**
   * Open the full trading panel. The optional `coin` arg lets the panel land
   * on the market the user clicked (position row, market row) instead of the
   * default BTC.
   */
  onOpenTrading: (coin?: string) => void;
  /** Optional: hand off the user to the Arbitrum bridge flow. */
  onBridgeToArbitrum?: () => void;
  /** Optional: called after a deposit tx is submitted — used by the parent to
   *  start polling the Hyperliquid balance for agent-approval readiness. */
  onDepositSubmitted?: () => void;
}

const POS_GREEN = '#19a974';
const POS_GREEN_SOFT = 'rgba(25,169,116,0.10)';
const NEG_RED = '#e5484d';
const HAIR = 'rgba(0,0,0,0.06)';
const SURFACE_2 = '#fafafa';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SHARE_POSTER_WIDTH = 420;
const SHARE_POSTER_HEIGHT = 640;
const SWOP_SHARE_URL = 'https://swopme.app';

interface PositionShareDetails {
  coin: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  pnlLabel: string;
  roeLabel: string;
  pnlPositive: boolean;
  sizeLabel: string;
  entryLabel: string;
  markLabel: string;
  marginLabel: string;
  liqDistanceLabel: string;
  liqPriceLabel: string;
  markPriceLabel: string;
  liqPercent: number | null;
}

const formatBalance = (n: number, frac = 2): string =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const formatSignedUsd = (raw: string | number): string => {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return '$0.00';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${formatBalance(Math.abs(n), 2)}`;
};

const formatTokenSize = (raw: string, dp = 4): string => {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return formatBalance(abs, 2);
  if (abs >= 1) return abs.toFixed(dp).replace(/\.?0+$/, '');
  return abs.toFixed(6).replace(/\.?0+$/, '');
};

function pickPrimaryPosition(positions: HLPosition[]): HLPosition | null {
  if (!positions.length) return null;
  // Highest absolute notional value first, then largest |unrealized PnL|.
  return [...positions].sort((a, b) => {
    const av = Math.abs(parseFloat(a.positionValue || '0'));
    const bv = Math.abs(parseFloat(b.positionValue || '0'));
    return bv - av;
  })[0];
}

function liqMetrics(
  position: HLPosition,
  livePrice: string | undefined,
) {
  if (!position.liquidationPx) return null;
  const liqPx = parseFloat(position.liquidationPx);
  const markPx = parseFloat(livePrice || position.entryPx);
  const isLong = parseFloat(position.szi) > 0;
  if (!Number.isFinite(liqPx) || !Number.isFinite(markPx) || markPx === 0)
    return null;

  const distance = isLong
    ? (markPx - liqPx) / markPx
    : (liqPx - markPx) / markPx;
  const pct = Math.max(0, Math.min(100, distance * 100));
  return { liqPx, markPx, pct, isLong };
}

async function capturePositionShareImage(
  el: HTMLElement,
): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: 3,
    useCORS: true,
    logging: false,
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
    windowWidth: SHARE_POSTER_WIDTH,
    windowHeight: SHARE_POSTER_HEIGHT,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to capture position image'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shareFilename(coin: string) {
  const slug =
    coin
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'position';
  return `swop-perps-${slug}.png`;
}

function isShareCancel(err: unknown) {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * PerpsCard
 *
 * Two-card bento (1.45fr / 1fr) matching the wallet design:
 *  - Open Position: primary position with size/entry/mark/margin + liq bar
 *  - Account: account value + Unrealized PnL / Margin used / Withdrawable / Buying power
 *
 * Falls back to clean empty / loading / connect-wallet states when there's no
 * master address or no open positions.
 */
export function PerpsCard({
  masterAddress,
  isReconnecting = false,
  onOpenTrading,
  onBridgeToArbitrum,
  onDepositSubmitted,
}: PerpsCardProps) {
  // Aggregate across the main DEX + every builder (HIP-3) DEX so this summary
  // reflects ALL positions and the combined balance — one perps wallet.
  const { data: markets = [] } = useHyperliquidMarkets();
  const builderDexes = useMemo(() => {
    const set = new Set<string>();
    for (const m of markets) {
      const d = (m as { dex?: string }).dex?.trim();
      if (d) set.add(d);
    }
    return Array.from(set);
  }, [markets]);
  const { data, isLoading } = useHyperliquidPortfolio(
    masterAddress ?? null,
    builderDexes,
    { refetchInterval: 30_000 },
  );
  const { mids } = useAllMids(!!masterAddress);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTab, setActionsTab] =
    useState<PerpsActionTab>('deposit');

  const positions = useMemo(
    () => data?.positions ?? [],
    [data?.positions],
  );
  const primaryPosition = useMemo(
    () => pickPrimaryPosition(positions),
    [positions],
  );
  const accountValue = parseFloat(data?.accountValue ?? '0');
  const unrealizedPnl = parseFloat(data?.unrealizedPnl ?? '0');
  const marginUsed = parseFloat(data?.marginUsed ?? '0');
  const withdrawable = parseFloat(data?.withdrawable ?? '0');

  // Use the primary position's leverage for the buying-power label, default
  // to a conservative 5× when no position is open so the line still has
  // something meaningful to say. Buying power is based on FREE collateral
  // (withdrawable) — not total account value, which includes margin already
  // locked in open positions.
  const accountLeverage = primaryPosition?.leverage.value ?? 5;
  const accountLeverageType = primaryPosition?.leverage.type ?? 'cross';
  const buyingPower = withdrawable * accountLeverage;

  const hasDanger = positions.some(
    (p) => getLiquidationRisk(p) === 'danger',
  );

  const openActions = (tab: PerpsActionTab) => {
    setActionsTab(tab);
    setActionsOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-3.5">
        <OpenPositionCard
          position={primaryPosition}
          livePrice={
            primaryPosition ? mids[primaryPosition.coin] : undefined
          }
          isLoading={isLoading}
          isReconnecting={isReconnecting}
          masterAddress={masterAddress}
          extraPositions={Math.max(positions.length - 1, 0)}
          hasDanger={hasDanger}
          onOpenTrading={onOpenTrading}
          onDeposit={() => openActions('deposit')}
        />
        <AccountCard
          accountValue={accountValue}
          unrealizedPnl={unrealizedPnl}
          marginUsed={marginUsed}
          withdrawable={withdrawable}
          buyingPower={buyingPower}
          accountLeverage={accountLeverage}
          accountLeverageType={accountLeverageType}
          isLoading={isLoading}
          masterAddress={masterAddress}
          onDeposit={() => openActions('deposit')}
          onWithdraw={() => openActions('withdraw')}
        />
      </div>

      <PerpsActionsModal
        isOpen={actionsOpen}
        initialTab={actionsTab}
        onClose={() => setActionsOpen(false)}
        masterAddress={masterAddress ?? null}
        onBridgeToArbitrum={onBridgeToArbitrum}
        onDepositSubmitted={onDepositSubmitted}
      />
    </>
  );
}

// ─── Open Position Card ──────────────────────────────────────────────────────

function OpenPositionCard({
  position,
  livePrice,
  isLoading,
  isReconnecting,
  masterAddress,
  extraPositions,
  hasDanger,
  onOpenTrading,
  onDeposit,
}: {
  position: HLPosition | null;
  livePrice: string | undefined;
  isLoading: boolean;
  isReconnecting: boolean;
  masterAddress: string | undefined;
  extraPositions: number;
  hasDanger: boolean;
  onOpenTrading: (coin?: string) => void;
  onDeposit: () => void;
}) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  // ── Empty / connect / loading states ─────────────────────────────────────
  if (!masterAddress) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open position</Tag>
        <EmptyState
          icon={<Zap className="w-4 h-4" />}
          title="Set up perps trading"
          subtitle="Initialize a trading agent to open positions."
          ctaLabel="Enable Trading"
          onClick={() => onOpenTrading()}
        />
      </BentoShell>
    );
  }

  if (isLoading || isReconnecting) {
    return (
      <BentoShell padding="p-5">
        <Tag>Open position</Tag>
        <PositionSkeleton />
      </BentoShell>
    );
  }

  if (!position) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open position</Tag>
        <EmptyState
          icon={<TrendingUp className="w-4 h-4" />}
          title="No open positions"
          subtitle="Trade a market to open your first position."
          ctaLabel="Trade →"
          onClick={() => onOpenTrading()}
          secondary={
            <button
              type="button"
              onClick={onDeposit}
              className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition"
            >
              or deposit USDC
            </button>
          }
        />
      </BentoShell>
    );
  }

  // ── Populated state ──────────────────────────────────────────────────────
  const sz = parseFloat(position.szi);
  const isLong = sz > 0;
  const sizeAbs = Math.abs(sz);
  const pnlNum = parseFloat(position.unrealizedPnl || '0');
  const roeNum = parseFloat(position.returnOnEquity || '0') * 100;
  const positive = pnlNum >= 0;
  const liq = liqMetrics(position, livePrice);
  const markPx = liq?.markPx ?? parseFloat(livePrice || position.entryPx);
  const shareDetails: PositionShareDetails = {
    coin: position.coin,
    side: isLong ? 'LONG' : 'SHORT',
    leverage: position.leverage.value,
    pnlLabel: formatSignedUsd(pnlNum),
    roeLabel: Number.isFinite(roeNum)
      ? `${roeNum >= 0 ? '+' : ''}${roeNum.toFixed(2)}%`
      : '—',
    pnlPositive: positive,
    sizeLabel: `${formatTokenSize(String(sizeAbs))} ${position.coin}`,
    entryLabel: `$${formatPrice(position.entryPx)}`,
    markLabel: Number.isFinite(markPx)
      ? `$${formatPrice(String(markPx))}`
      : '—',
    marginLabel: `$${formatBalance(parseFloat(position.marginUsed), 2)}`,
    liqDistanceLabel: liq ? `${liq.pct.toFixed(1)}% away` : 'No liq',
    liqPriceLabel: liq ? `$${formatPrice(String(liq.liqPx))}` : '—',
    markPriceLabel: liq ? `$${formatPrice(String(liq.markPx))}` : '—',
    liqPercent: liq?.pct ?? null,
  };

  const handleSharePosition = async () => {
    if (!shareCardRef.current || isSharing) return;

    setIsSharing(true);
    const filename = shareFilename(position.coin);
    let capturedBlob: Blob | null = null;
    try {
      capturedBlob = await capturePositionShareImage(
        shareCardRef.current,
      );
      const file = new File([capturedBlob], filename, {
        type: 'image/png',
      });
      const shareTitle = 'Swop perps position';
      const shareText = 'View on Swop';

      if (
        typeof navigator.share === 'function' &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: SWOP_SHARE_URL,
          files: [file],
        });
      } else {
        downloadBlob(capturedBlob, filename);
        toast({
          title: 'Position image downloaded',
          description:
            'Your astronaut-to-the-moon share card is ready. Link: swopme.app',
        });
      }
    } catch (err) {
      if (!isShareCancel(err)) {
        if (capturedBlob) {
          downloadBlob(capturedBlob, filename);
          toast({
            title: 'Position image downloaded',
            description:
              'Sharing was blocked, so Swop saved the PNG instead. Link: swopme.app',
          });
        } else {
          console.error('Failed to share perps position:', err);
          toast({
            title: 'Could not share position',
            description: 'Try again in a moment.',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <BentoShell padding="p-5">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <Tag>Open position</Tag>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[22px] font-bold tracking-[-0.6px] text-gray-900">
              {position.coin}
            </span>
            <LeveragePill
              leverage={position.leverage.value}
              isLong={isLong}
            />
            {hasDanger && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.4px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(229,72,77,0.10)',
                  color: NEG_RED,
                  fontFamily: MONO,
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                liq risk
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-start gap-2">
          <div className="text-right">
            <div
              className="text-[22px] font-semibold tabular-nums"
              style={{
                fontFamily: MONO,
                letterSpacing: -0.4,
                color: positive ? POS_GREEN : NEG_RED,
              }}
            >
              {formatSignedUsd(pnlNum)}
            </div>
            <div
              className="text-[11.5px] text-gray-500 mt-0.5 font-medium"
              style={{ fontFamily: MONO }}
            >
              {Number.isFinite(roeNum)
                ? `${roeNum >= 0 ? '+' : ''}${roeNum.toFixed(2)}% ROE`
                : '—'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSharePosition()}
            disabled={isSharing}
            aria-label="Share position"
            title="Share position"
            className="w-8 h-8 rounded-xl border border-black/[0.06] bg-[#fafafa] flex items-center justify-center text-gray-700 hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isSharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div
        className="my-4"
        style={{ height: 1, background: HAIR }}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            l: 'size',
            v: `${formatTokenSize(String(sizeAbs))} ${position.coin}`,
          },
          { l: 'entry', v: `$${formatPrice(position.entryPx)}` },
          {
            l: 'mark',
            v: Number.isFinite(markPx)
              ? `$${formatPrice(String(markPx))}`
              : '—',
          },
          {
            l: 'margin',
            v: `$${formatBalance(parseFloat(position.marginUsed), 2)}`,
          },
        ].map((s) => (
          <div key={s.l} className="min-w-0">
            <div
              className="text-[9.5px] font-bold uppercase tracking-[1.2px] text-gray-500"
              style={{ fontFamily: MONO }}
            >
              {s.l}
            </div>
            <div
              className="text-[13.5px] font-semibold tracking-[-0.2px] text-gray-900 mt-1 tabular-nums truncate"
              style={{ fontFamily: MONO }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Liquidation distance */}
      {liq && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] text-gray-500 font-medium">
              Liq distance
            </span>
            <span
              className="text-[12px] text-gray-900 font-medium"
              style={{ fontFamily: MONO }}
            >
              <span className="font-semibold">
                {liq.pct.toFixed(1)}%
              </span>{' '}
              away · ${formatPrice(String(liq.liqPx))}
            </span>
          </div>
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              height: 7,
              background: '#f2f2f0',
              border: `1px solid ${HAIR}`,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${liq.pct}%`,
                background:
                  'linear-gradient(90deg, #19a974 0%, #b6c52d 50%, #e87b1f 100%)',
              }}
            />
            <div
              className="absolute"
              style={{
                top: -3,
                left: `${liq.pct}%`,
                width: 3,
                height: 13,
                background: '#0a0a0c',
                borderRadius: 2,
                transform: 'translateX(-1px)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span
              className="text-[10.5px] text-gray-400"
              style={{ fontFamily: MONO }}
            >
              ${formatPrice(String(liq.liqPx))} liq
            </span>
            <span
              className="text-[10.5px] text-gray-400"
              style={{ fontFamily: MONO }}
            >
              ${formatPrice(String(liq.markPx))} mark
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <button
          type="button"
          onClick={() => onOpenTrading(position.coin)}
          className="py-3 rounded-xl border border-black/[0.06] bg-[#fafafa] text-gray-900 text-[13.5px] font-semibold hover:bg-gray-100 transition"
        >
          Add margin
        </button>
        <button
          type="button"
          onClick={() => onOpenTrading(position.coin)}
          className="py-3 rounded-xl bg-gray-900 text-white text-[13.5px] font-semibold hover:bg-gray-800 transition"
        >
          Close position
        </button>
      </div>

      {extraPositions > 0 && (
        <button
          type="button"
          onClick={() => onOpenTrading()}
          className="mt-3 w-full text-[11.5px] text-gray-500 hover:text-gray-900 transition"
        >
          +{extraPositions} more{' '}
          {extraPositions === 1 ? 'position' : 'positions'} →
        </button>
      )}

      <div
        aria-hidden="true"
        className="fixed left-[-9999px] top-0 pointer-events-none"
      >
        <div ref={shareCardRef}>
          <PositionSharePoster details={shareDetails} />
        </div>
      </div>
    </BentoShell>
  );
}

function PositionSharePoster({
  details,
}: {
  details: PositionShareDetails;
}) {
  const accent = details.pnlPositive ? POS_GREEN : NEG_RED;
  const liqWidth =
    details.liqPercent === null
      ? 0
      : Math.max(3, Math.min(100, details.liqPercent));
  const stats = [
    { label: 'Size', value: details.sizeLabel },
    { label: 'Entry', value: details.entryLabel },
    { label: 'Mark', value: details.markLabel },
    { label: 'Margin', value: details.marginLabel },
  ];

  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        width: SHARE_POSTER_WIDTH,
        height: SHARE_POSTER_HEIGHT,
        borderRadius: 34,
        background:
          'radial-gradient(circle at 78% 16%, rgba(255,255,255,0.38) 0, rgba(255,255,255,0.16) 16%, transparent 30%), linear-gradient(160deg, #050713 0%, #101833 48%, #2d3144 100%)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <AstronautMoonBackdrop />

      <div className="relative z-10 flex h-full flex-col justify-between p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[21px] font-black leading-none">
              SWOP
            </div>
            <div className="mt-1 text-[12px] font-semibold text-white/68">
              Perps position snapshot
            </div>
          </div>
          <div className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/78 shadow-[0_10px_32px_rgba(0,0,0,0.18)]">
            To the moon
          </div>
        </div>

        <div className="mb-2 max-w-[250px]">
          <div className="text-[12px] font-semibold text-white/60">
            Astronaut mode
          </div>
          <div className="mt-1 text-[30px] font-black leading-[1.04]">
            Position ready for orbit.
          </div>
        </div>

        <div className="rounded-[28px] bg-white/95 p-5 text-gray-950 shadow-[0_22px_64px_rgba(0,0,0,0.34)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="text-[10px] font-bold uppercase text-gray-500"
                style={{ fontFamily: MONO }}
              >
                Open position
              </div>
              <div
                className="mt-1 text-[26px] font-black leading-tight text-gray-950"
                style={{ wordBreak: 'break-word' }}
              >
                {details.coin}
              </div>
              <div
                className="mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
                style={{
                  color: details.side === 'LONG' ? POS_GREEN : NEG_RED,
                  background:
                    details.side === 'LONG'
                      ? POS_GREEN_SOFT
                      : 'rgba(229,72,77,0.10)',
                  border: `1px solid ${
                    details.side === 'LONG'
                      ? 'rgba(25,169,116,0.18)'
                      : 'rgba(229,72,77,0.18)'
                  }`,
                  fontFamily: MONO,
                }}
              >
                {details.side} · {details.leverage}x
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="text-[28px] font-black tabular-nums leading-none"
                style={{ color: accent, fontFamily: MONO }}
              >
                {details.pnlLabel}
              </div>
              <div
                className="mt-1 text-[12px] font-bold text-gray-500"
                style={{ fontFamily: MONO }}
              >
                {details.roeLabel} ROE
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-black/[0.07]" />

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-black/[0.06] bg-gray-50 px-3 py-2.5"
              >
                <div
                  className="text-[10px] font-bold uppercase text-gray-500"
                  style={{ fontFamily: MONO }}
                >
                  {stat.label}
                </div>
                <div
                  className="mt-1 text-[12.5px] font-black text-gray-950 tabular-nums"
                  style={{
                    fontFamily: MONO,
                    lineHeight: 1.22,
                    wordBreak: 'break-word',
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-gray-500">
                Liq distance
              </span>
              <span
                className="text-[12px] font-black text-gray-950"
                style={{ fontFamily: MONO }}
              >
                {details.liqDistanceLabel} · {details.liqPriceLabel}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-black/[0.06] bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${liqWidth}%`,
                  background:
                    'linear-gradient(90deg, #19a974 0%, #b6c52d 52%, #e87b1f 100%)',
                }}
              />
            </div>
            <div
              className="mt-2 flex items-center justify-between text-[10.5px] font-bold text-gray-400"
              style={{ fontFamily: MONO }}
            >
              <span>{details.liqPriceLabel} liq</span>
              <span>{details.markPriceLabel} mark</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-black/[0.07] pt-3">
            <span className="text-[11px] font-semibold text-gray-400">
              Shared from Swop
            </span>
            <span
              className="text-[11px] font-black text-gray-950"
              style={{ fontFamily: MONO }}
            >
              swopme.app
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AstronautMoonBackdrop() {
  const stars = [
    [30, 58, 2],
    [86, 34, 1],
    [146, 88, 2],
    [206, 42, 1],
    [286, 112, 2],
    [362, 72, 1],
    [54, 256, 1],
    [332, 236, 2],
    [382, 184, 1],
  ];

  return (
    <div className="absolute inset-0 z-0">
      {stars.map(([left, top, size]) => (
        <span
          key={`${left}-${top}`}
          className="absolute rounded-full bg-white/80"
          style={{
            left,
            top,
            width: size,
            height: size,
            boxShadow: '0 0 12px rgba(255,255,255,0.8)',
          }}
        />
      ))}

      <div className="absolute left-[102px] top-[145px] h-px w-[210px] origin-left rotate-[-18deg] border-t-2 border-dashed border-white/24" />

      <div className="absolute right-[-42px] top-[-34px] h-[178px] w-[178px] rounded-full bg-[#f4edd3] shadow-[0_0_68px_rgba(255,238,178,0.48)]">
        <div className="absolute left-[34px] top-[52px] h-5 w-5 rounded-full bg-[#ded4b8]/70" />
        <div className="absolute left-[82px] top-[84px] h-8 w-8 rounded-full bg-[#ded4b8]/55" />
        <div className="absolute left-[72px] top-[30px] h-3 w-3 rounded-full bg-[#ded4b8]/60" />
      </div>

      <div
        className="absolute left-[44px] top-[128px] h-[124px] w-[92px]"
        style={{ transform: 'rotate(-16deg)' }}
      >
        <div className="absolute left-[24px] top-[8px] h-[54px] w-[54px] rounded-full border-[5px] border-white bg-[#eef3ff] shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <div className="absolute left-[9px] top-[16px] h-[18px] w-[30px] rounded-full bg-[#16203d] shadow-inner" />
          <div className="absolute left-[16px] top-[12px] h-1.5 w-3 rounded-full bg-white/70" />
        </div>
        <div className="absolute left-[32px] top-[58px] h-[48px] w-[40px] rounded-[20px] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
          <div className="absolute left-[10px] top-[13px] h-3 w-5 rounded-md bg-[#ff6b6b]" />
          <div className="absolute bottom-[8px] left-[12px] h-2 w-4 rounded-full bg-[#c7d2fe]" />
        </div>
        <div className="absolute left-[15px] top-[66px] h-[14px] w-[30px] rounded-full bg-white" />
        <div className="absolute left-[65px] top-[66px] h-[14px] w-[30px] rounded-full bg-white" />
        <div className="absolute left-[30px] top-[101px] h-[34px] w-[15px] rounded-full bg-white" />
        <div className="absolute left-[61px] top-[101px] h-[34px] w-[15px] rounded-full bg-white" />
        <div className="absolute left-[3px] top-[61px] h-[18px] w-[18px] rounded-full bg-white" />
        <div className="absolute left-[86px] top-[61px] h-[18px] w-[18px] rounded-full bg-white" />
      </div>
    </div>
  );
}

// ─── Account Card ────────────────────────────────────────────────────────────

function AccountCard({
  accountValue,
  unrealizedPnl,
  marginUsed,
  withdrawable,
  buyingPower,
  accountLeverage,
  accountLeverageType,
  isLoading,
  masterAddress,
  onDeposit,
  onWithdraw,
}: {
  accountValue: number;
  unrealizedPnl: number;
  marginUsed: number;
  withdrawable: number;
  buyingPower: number;
  accountLeverage: number;
  accountLeverageType: 'cross' | 'isolated';
  isLoading: boolean;
  masterAddress: string | undefined;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const noWallet = !masterAddress;
  const showSkeleton = !noWallet && isLoading;

  return (
    <BentoShell padding="p-5">
      <div className="flex items-start justify-between gap-2">
        <Tag>Account</Tag>
        {!noWallet && (
          <button
            type="button"
            onClick={onDeposit}
            aria-label="Deposit or withdraw"
            title="Deposit or withdraw"
            className="w-7 h-7 rounded-lg border border-black/[0.06] bg-[#fafafa] flex items-center justify-center text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-[13px] text-gray-500 font-medium mt-2">
        Account value
      </div>
      {showSkeleton ? (
        <div className="h-8 w-32 mt-1 bg-gray-100 rounded animate-pulse" />
      ) : (
        <div
          className="text-[32px] font-semibold tabular-nums leading-none mt-1 text-gray-900"
          style={{ letterSpacing: -1.2 }}
        >
          ${formatBalance(accountValue, 2)}
        </div>
      )}

      <div
        className="mt-4 mb-1"
        style={{ height: 1, background: HAIR }}
      />

      {[
        {
          k: 'Unrealized PnL',
          v: formatSignedUsd(unrealizedPnl),
          color: unrealizedPnl >= 0 ? POS_GREEN : NEG_RED,
        },
        {
          k: 'Margin used',
          v: `$${formatBalance(marginUsed, 2)}`,
          color: '#0a0a0c',
        },
        {
          k: 'Withdrawable',
          v: `$${formatBalance(withdrawable, 2)}`,
          color: '#0a0a0c',
        },
      ].map((row) => (
        <div
          key={row.k}
          className="flex items-center justify-between py-3"
          style={{ borderBottom: `1px solid ${HAIR}` }}
        >
          <span className="text-[13px] text-gray-500 font-medium">
            {row.k}
          </span>
          <span
            className="text-[14px] font-semibold tabular-nums"
            style={{
              fontFamily: MONO,
              color: row.color,
              letterSpacing: -0.2,
            }}
          >
            {showSkeleton ? '—' : row.v}
          </span>
        </div>
      ))}

      <div className="flex items-start justify-between pt-3.5">
        <div>
          <div className="text-[13px] text-gray-500 font-medium">
            Buying power
          </div>
          <div className="text-[11px] text-gray-400 font-medium mt-0.5">
            at {accountLeverage}× {accountLeverageType}
          </div>
        </div>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{
            fontFamily: MONO,
            letterSpacing: -0.2,
            color: '#0a0a0c',
          }}
        >
          {showSkeleton
            ? '—'
            : `$${formatBalance(Math.round(buyingPower), 0)}`}
        </span>
      </div>

      {noWallet && (
        <button
          type="button"
          onClick={onDeposit}
          className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 transition"
        >
          Deposit USDC
        </button>
      )}
      {!noWallet && withdrawable > 0 && (
        <button
          type="button"
          onClick={onWithdraw}
          className="mt-4 w-full py-2.5 rounded-xl border border-black/[0.06] bg-[#fafafa] text-gray-900 text-[13px] font-semibold hover:bg-gray-100 transition"
        >
          Withdraw
        </button>
      )}
    </BentoShell>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function BentoShell({
  children,
  className = '',
  padding = '',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`bg-white rounded-[22px] border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-gray-500"
      style={{ fontFamily: MONO }}
    >
      {children}
    </span>
  );
}

function LeveragePill({
  leverage,
  isLong,
}: {
  leverage: number;
  isLong: boolean;
}) {
  const color = isLong ? POS_GREEN : NEG_RED;
  const bg = isLong ? POS_GREEN_SOFT : 'rgba(229,72,77,0.10)';
  const border = isLong
    ? 'rgba(25,169,116,0.18)'
    : 'rgba(229,72,77,0.18)';
  return (
    <span
      className="text-[11px] font-bold tabular-nums tracking-[0.4px] px-2.5 py-1 rounded-full inline-flex items-center"
      style={{
        fontFamily: MONO,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {isLong ? 'LONG' : 'SHORT'} · {leverage}×
    </span>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onClick,
  secondary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClick: () => void;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-700"
        style={{ background: SURFACE_2, border: `1px solid ${HAIR}` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[13.5px] font-semibold text-gray-900">
          {title}
        </div>
        <div className="text-[11.5px] text-gray-500 mt-0.5">
          {subtitle}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition"
        >
          {ctaLabel}
          <ArrowRight className="w-3 h-3" />
        </button>
        {secondary}
      </div>
    </div>
  );
}

function PositionSkeleton() {
  return (
    <div className="mt-3">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-6 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
        </div>
      </div>
      <div
        className="my-3"
        style={{ height: 1, background: HAIR }}
      />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-12 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full animate-pulse mt-5" />
    </div>
  );
}

// Export needed to keep the component reference stable through HMR.
export default PerpsCard;
