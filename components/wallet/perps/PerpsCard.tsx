'use client';

import { useMemo, useRef, useState } from 'react';
import type * as hl from '@nktkas/hyperliquid';
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
import {
  buildHyperliquidMarketPriceMap,
  lookupHyperliquidPositionPrice,
  resolveHyperliquidPositionMarkPrice,
} from '@/lib/perps/hyperliquidPositionPricing';

interface PerpsCardProps {
  /** Selected EVM wallet address used as the Hyperliquid master account. */
  masterAddress: string | undefined;
  /** Master-signed client for account-level actions like withdrawals. */
  masterClient: hl.ExchangeClient | null;
  /** Lazily creates the master signer from an explicit account-level action. */
  ensureMasterClient?: () => Promise<hl.ExchangeClient | null>;
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
  /** Called after a perps withdrawal intended for Predictions is submitted. */
  onPredictionWithdrawSubmitted?: (amountUsd: number) => void;
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
const SHARE_CANVAS_SCALE = 2;

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

const toFiniteBalance = (value: string | undefined): number => {
  const parsed = parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

function sortPositionsByExposure(positions: HLPosition[]): HLPosition[] {
  // Highest absolute notional value first, then largest |unrealized PnL|.
  return [...positions].sort((a, b) => {
    const av = Math.abs(parseFloat(a.positionValue || '0'));
    const bv = Math.abs(parseFloat(b.positionValue || '0'));
    const ap = Math.abs(parseFloat(a.unrealizedPnl || '0'));
    const bp = Math.abs(parseFloat(b.unrealizedPnl || '0'));
    return bv - av || bp - ap;
  });
}

function positionKey(position: HLPosition, index: number) {
  return [
    position.dex || 'main',
    position.coin,
    position.szi,
    position.entryPx,
    index,
  ].join(':');
}

function liqMetrics(
  position: HLPosition,
  markPx: number | null,
) {
  if (!position.liquidationPx) return null;
  const liqPx = parseFloat(position.liquidationPx);
  const isLong = parseFloat(position.szi) > 0;
  if (
    markPx === null ||
    !Number.isFinite(liqPx) ||
    !Number.isFinite(markPx) ||
    markPx === 0
  )
    return null;

  const distance = isLong
    ? (markPx - liqPx) / markPx
    : (liqPx - markPx) / markPx;
  const pct = Math.max(0, Math.min(100, distance * 100));
  return { liqPx, markPx, pct, isLong };
}

function capturePositionShareImage(details: PositionShareDetails): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_POSTER_WIDTH * SHARE_CANVAS_SCALE;
  canvas.height = SHARE_POSTER_HEIGHT * SHARE_CANVAS_SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.scale(SHARE_CANVAS_SCALE, SHARE_CANVAS_SCALE);
  drawPositionSharePoster(ctx, details);

  return dataUrlToBlob(canvas.toDataURL('image/png'));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, encoded] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

function drawPositionSharePoster(
  ctx: CanvasRenderingContext2D,
  details: PositionShareDetails,
) {
  const accent = details.pnlPositive ? '#3fe08f' : '#ff5d63';
  const sideTone =
    details.side === 'LONG'
      ? {
          color: '#9ef7c8',
          border: 'rgba(63,224,143,0.42)',
          background: 'rgba(63,224,143,0.11)',
        }
      : {
          color: '#ffb2b6',
          border: 'rgba(255,93,99,0.42)',
          background: 'rgba(255,93,99,0.11)',
        };
  const panelX = 24;
  const panelY = 86;
  const liqWidth =
    details.liqPercent === null
      ? 0
      : Math.max(3, Math.min(100, details.liqPercent));

  const bg = ctx.createLinearGradient(0, 0, SHARE_POSTER_WIDTH, SHARE_POSTER_HEIGHT);
  bg.addColorStop(0, '#040605');
  bg.addColorStop(0.54, '#07120e');
  bg.addColorStop(1, '#010302');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SHARE_POSTER_WIDTH, SHARE_POSTER_HEIGHT);

  const topGlow = ctx.createRadialGradient(294, 26, 0, 294, 26, 210);
  topGlow.addColorStop(0, 'rgba(63,224,143,0.18)');
  topGlow.addColorStop(1, 'rgba(63,224,143,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, SHARE_POSTER_WIDTH, SHARE_POSTER_HEIGHT);

  const lowGlow = ctx.createRadialGradient(28, 550, 0, 28, 550, 170);
  lowGlow.addColorStop(0, 'rgba(63,224,143,0.08)');
  lowGlow.addColorStop(1, 'rgba(63,224,143,0)');
  ctx.fillStyle = lowGlow;
  ctx.fillRect(0, 0, SHARE_POSTER_WIDTH, SHARE_POSTER_HEIGHT);

  ctx.strokeStyle = 'rgba(63,224,143,0.026)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= SHARE_POSTER_HEIGHT; y += 28) {
    line(ctx, 0, y, SHARE_POSTER_WIDTH, y);
  }
  ctx.strokeStyle = 'rgba(63,224,143,0.018)';
  for (let x = 0; x <= SHARE_POSTER_WIDTH; x += 36) {
    line(ctx, x, 0, x, SHARE_POSTER_HEIGHT);
  }

  [
    { left: 42, top: -36, height: 188, opacity: 0.26 },
    { left: 112, top: 24, height: 138, opacity: 0.18 },
    { left: 188, top: -18, height: 166, opacity: 0.23 },
    { left: 270, top: 42, height: 128, opacity: 0.16 },
    { left: 352, top: -48, height: 198, opacity: 0.24 },
  ].forEach((rain) => {
    const gradient = ctx.createLinearGradient(0, rain.top, 0, rain.top + rain.height);
    gradient.addColorStop(0, 'rgba(63,224,143,0)');
    gradient.addColorStop(0.5, `rgba(63,224,143,${rain.opacity})`);
    gradient.addColorStop(1, 'rgba(63,224,143,0)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    line(ctx, rain.left, rain.top, rain.left, rain.top + rain.height);
  });

  fillRoundRect(ctx, 96, 22, 228, 52, 14, 'rgba(0,0,0,0.48)');
  strokeRoundRect(ctx, 96, 22, 228, 52, 14, 'rgba(63,224,143,0.25)', 1);
  drawFittedText(ctx, 'SWOP', 210, 37, 190, 25, 18, '900', '#f3f7f5', 'center');
  drawFittedText(ctx, 'PERPS', 210, 57, 190, 8.5, 7, '900', '#3fe08f', 'center');

  const panelGradient = ctx.createLinearGradient(0, panelY, 0, panelY + 552);
  panelGradient.addColorStop(0, 'rgba(20,23,30,0.98)');
  panelGradient.addColorStop(1, 'rgba(11,13,18,0.98)');
  fillRoundRect(ctx, panelX, panelY, 372, 552, 22, panelGradient);
  strokeRoundRect(ctx, panelX, panelY, 372, 552, 22, 'rgba(63,224,143,0.16)', 1);

  ctx.fillStyle = '#3fe08f';
  ctx.shadowColor = 'rgba(63,224,143,0.58)';
  ctx.shadowBlur = 18;
  ctx.fillRect(panelX + 22, panelY + 24, 2, 190);
  ctx.shadowBlur = 0;

  drawFittedText(ctx, 'OPEN POSITION', panelX + 38, panelY + 26, 160, 10, 8, '900', '#3fe08f');
  drawFittedText(
    ctx,
    details.coin,
    panelX + 38,
    panelY + 56,
    292,
    details.coin.length > 14 ? 18 : details.coin.length > 10 ? 21 : 25,
    16,
    '900',
    '#f3f7f5',
  );
  fillRoundRect(ctx, panelX + 38, panelY + 98, 108, 26, 7, sideTone.background);
  strokeRoundRect(ctx, panelX + 38, panelY + 98, 108, 26, 7, sideTone.border, 1);
  drawFittedText(
    ctx,
    `${details.side} · ${details.leverage}x`,
    panelX + 92,
    panelY + 105,
    94,
    10,
    8,
    '900',
    sideTone.color,
    'center',
  );

  fillRoundRect(ctx, panelX + 38, panelY + 146, 292, 88, 14, 'rgba(0,0,0,0.28)');
  strokeRoundRect(ctx, panelX + 38, panelY + 146, 292, 88, 14, 'rgba(63,224,143,0.18)', 1);
  drawFittedText(ctx, 'UNREALIZED PNL', panelX + 54, panelY + 157, 160, 9, 7, '900', '#6b7280');
  drawFittedText(
    ctx,
    details.pnlLabel,
    panelX + 54,
    panelY + 175,
    260,
    details.pnlLabel.length > 9 ? 25 : details.pnlLabel.length > 7 ? 28 : 32,
    21,
    '900',
    accent,
  );
  drawFittedText(
    ctx,
    `${details.roeLabel} ROE`,
    panelX + 314,
    panelY + 214,
    150,
    10.5,
    8,
    '800',
    '#9ca3af',
    'right',
  );

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  line(ctx, panelX + 24, panelY + 246, panelX + 348, panelY + 246);

  drawStatsFrame(ctx, panelX + 24, panelY + 260, details);
  drawLiquidationRail(ctx, panelX + 24, panelY + 478, details, liqWidth);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  line(ctx, panelX + 24, panelY + 530, panelX + 348, panelY + 530);
  drawFittedText(ctx, 'FOLLOW MY TRADES', panelX + 24, panelY + 538, 210, 9.5, 8, '900', '#6b7280');
  drawFittedText(ctx, 'swopme.app', panelX + 348, panelY + 538, 120, 10.5, 8, '900', '#3fe08f', 'right');
}

function drawStatsFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  details: PositionShareDetails,
) {
  const stats = [
    { label: 'Size', value: details.sizeLabel },
    { label: 'Entry', value: details.entryLabel },
    { label: 'Mark', value: details.markLabel },
    { label: 'Margin', value: details.marginLabel },
    { label: 'Liq distance', value: details.liqDistanceLabel },
    { label: 'Liq price', value: details.liqPriceLabel },
  ];

  fillRoundRect(ctx, x, y, 324, 198, 14, 'rgba(0,0,0,0.44)');
  strokeRoundRect(ctx, x, y, 324, 198, 14, 'rgba(63,224,143,0.30)', 1);
  ctx.strokeStyle = 'rgba(63,224,143,0.14)';
  line(ctx, x + 162, y, x + 162, y + 198);
  line(ctx, x, y + 66, x + 324, y + 66);
  line(ctx, x, y + 132, x + 324, y + 132);

  stats.forEach((stat, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cellX = x + col * 162;
    const cellY = y + row * 66;
    drawFittedText(ctx, stat.label.toUpperCase(), cellX + 14, cellY + 9, 132, 8.8, 7, '800', '#6b7280');
    drawFittedText(
      ctx,
      stat.value,
      cellX + 14,
      cellY + 34,
      132,
      stat.value.length > 17 ? 11.5 : 12.5,
      9,
      '900',
      '#f3f7f5',
    );
  });
}

function drawLiquidationRail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  details: PositionShareDetails,
  liqWidth: number,
) {
  drawFittedText(ctx, 'LIQUIDATION RAIL', x, y, 128, 10, 8, '900', '#6b7280');
  drawFittedText(
    ctx,
    `${details.liqDistanceLabel} · ${details.liqPriceLabel}`,
    x + 324,
    y,
    190,
    11,
    8,
    '900',
    '#f3f7f5',
    'right',
  );
  fillRoundRect(ctx, x, y + 24, 324, 8, 999, '#070809');
  strokeRoundRect(ctx, x, y + 24, 324, 8, 999, 'rgba(255,255,255,0.08)', 1);

  if (liqWidth > 0) {
    const gradient = ctx.createLinearGradient(x, 0, x + 324, 0);
    gradient.addColorStop(0, '#3fe08f');
    gradient.addColorStop(0.52, '#d8d438');
    gradient.addColorStop(1, '#e8920f');
    fillRoundRect(ctx, x, y + 24, (324 * liqWidth) / 100, 8, 999, gradient);
  }

  drawFittedText(ctx, `${details.liqPriceLabel} liq`, x, y + 40, 140, 9.5, 7, '800', '#6b7280');
  drawFittedText(ctx, `${details.markPriceLabel} mark`, x + 324, y + 40, 140, 9.5, 7, '800', '#6b7280', 'right');
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  weight: string,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  let size = fontSize;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  do {
    ctx.font = `${weight} ${size}px ${MONO}`;
    if (ctx.measureText(text).width <= maxWidth || size <= minFontSize) break;
    size -= 1;
  } while (size > minFontSize);
  ctx.fillText(text, x, y);
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth: number,
) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
 *  - Open Positions: scrollable stack with size/entry/mark/margin + liq bar
 *  - Account: account value + Unrealized PnL / Margin used / Withdrawable / Buying power
 *
 * Falls back to clean empty / loading / connect-wallet states when there's no
 * master address or no open positions.
 */
export function PerpsCard({
  masterAddress,
  masterClient,
  ensureMasterClient,
  isReconnecting = false,
  onOpenTrading,
  onBridgeToArbitrum,
  onDepositSubmitted,
  onPredictionWithdrawSubmitted,
}: PerpsCardProps) {
  // Load builder DEX metadata too so HIP-3 positions such as SPCX/SpaceX are
  // included in the wallet summary, not only in the full trading panel.
  const { data: markets = [] } = useHyperliquidMarkets({
    includeBuilderDexes: true,
  });
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
  const marketMarks = useMemo(
    () => buildHyperliquidMarketPriceMap(markets),
    [markets],
  );
  const { mids } = useAllMids(!!masterAddress);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTab, setActionsTab] =
    useState<PerpsActionTab>('deposit');

  const positions = useMemo(
    () => sortPositionsByExposure(data?.positions ?? []),
    [data?.positions],
  );
  const primaryPosition = positions[0] ?? null;
  const accountValue = toFiniteBalance(data?.accountValue);
  const unrealizedPnl = toFiniteBalance(data?.unrealizedPnl);
  const marginUsed = toFiniteBalance(data?.marginUsed);
  const withdrawable = toFiniteBalance(data?.withdrawable);
  const dexWithdrawables = useMemo(() => {
    const perDex = data?.perDex ?? {};
    const entries = Object.entries(perDex).map(([dex, summary]) => [
      dex,
      toFiniteBalance(summary.withdrawable),
    ]);

    if (!entries.some(([dex]) => dex === '')) {
      entries.push(['', withdrawable]);
    }

    return Object.fromEntries(entries) as Record<string, number>;
  }, [data?.perDex, withdrawable]);

  // Use the primary position's leverage for the buying-power label, default
  // to a conservative 5× when no position is open so the line still has
  // something meaningful to say. Buying power is based on FREE collateral
  // (withdrawable) — not total account value, which includes margin already
  // locked in open positions.
  const accountLeverage = primaryPosition?.leverage.value ?? 5;
  const accountLeverageType = primaryPosition?.leverage.type ?? 'cross';
  const buyingPower = withdrawable * accountLeverage;

  const openActions = (tab: PerpsActionTab) => {
    setActionsTab(tab);
    setActionsOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-3.5">
        <OpenPositionsCard
          positions={positions}
          livePrices={mids}
          marketPrices={marketMarks}
          isLoading={isLoading}
          isReconnecting={isReconnecting}
          masterAddress={masterAddress}
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
        masterClient={masterClient}
        ensureMasterClient={ensureMasterClient}
        withdrawable={withdrawable}
        dexWithdrawables={dexWithdrawables}
        onBridgeToArbitrum={onBridgeToArbitrum}
        onDepositSubmitted={onDepositSubmitted}
        onPredictionWithdrawSubmitted={onPredictionWithdrawSubmitted}
      />
    </>
  );
}

// ─── Open Position Card ──────────────────────────────────────────────────────

function OpenPositionsCard({
  positions,
  livePrices,
  marketPrices,
  isLoading,
  isReconnecting,
  masterAddress,
  onOpenTrading,
  onDeposit,
}: {
  positions: HLPosition[];
  livePrices: Record<string, string>;
  marketPrices: Record<string, string>;
  isLoading: boolean;
  isReconnecting: boolean;
  masterAddress: string | undefined;
  onOpenTrading: (coin?: string) => void;
  onDeposit: () => void;
}) {
  // ── Empty / connect / loading states ─────────────────────────────────────
  if (!masterAddress) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open positions</Tag>
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
        <Tag>Open positions</Tag>
        <PositionSkeleton />
      </BentoShell>
    );
  }

  if (!positions.length) {
    return (
      <BentoShell padding="p-5" className="flex flex-col">
        <Tag>Open positions</Tag>
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

  const isScrollable = positions.length > 1;
  const positionCountLabel = `${positions.length} position${
    positions.length === 1 ? '' : 's'
  }`;

  return (
    <BentoShell padding="p-5" className="flex flex-col min-h-[390px]">
      <div className="flex items-center justify-between gap-3">
        <Tag>{positions.length === 1 ? 'Open position' : 'Open positions'}</Tag>
        {positions.length > 1 && (
          <span
            className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.8px] text-gray-500 tabular-nums"
            style={{ fontFamily: MONO }}
          >
            {positionCountLabel}
          </span>
        )}
      </div>

      <div
        role="list"
        aria-label="Open perps positions"
        className={
          isScrollable
            ? 'mt-3 -mr-1 pr-1 space-y-4 overflow-y-auto overscroll-contain'
            : 'mt-1.5'
        }
        style={isScrollable ? { maxHeight: 'min(70vh, 560px)' } : undefined}
      >
        {positions.map((position, index) => (
          <OpenPositionDetails
            key={positionKey(position, index)}
            position={position}
            markPriceHint={
              lookupHyperliquidPositionPrice(position, livePrices) ??
              lookupHyperliquidPositionPrice(position, marketPrices)
            }
            hasDivider={index > 0}
            hasDanger={getLiquidationRisk(position) === 'danger'}
            onOpenTrading={onOpenTrading}
          />
        ))}
      </div>
    </BentoShell>
  );
}

function OpenPositionDetails({
  position,
  markPriceHint,
  hasDivider,
  hasDanger,
  onOpenTrading,
}: {
  position: HLPosition;
  markPriceHint: string | undefined;
  hasDivider: boolean;
  hasDanger: boolean;
  onOpenTrading: (coin?: string) => void;
}) {
  const shareInFlightRef = useRef(false);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const sz = parseFloat(position.szi);
  const isLong = sz > 0;
  const sizeAbs = Math.abs(sz);
  const pnlNum = parseFloat(position.unrealizedPnl || '0');
  const roeNum = parseFloat(position.returnOnEquity || '0') * 100;
  const positive = pnlNum >= 0;
  const markPx = resolveHyperliquidPositionMarkPrice(
    position,
    markPriceHint,
  );
  const liq = liqMetrics(position, markPx);
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
    markLabel: markPx !== null && Number.isFinite(markPx)
      ? `$${formatPrice(String(markPx))}`
      : '—',
    marginLabel: `$${formatBalance(parseFloat(position.marginUsed), 2)}`,
    liqDistanceLabel: liq ? `${liq.pct.toFixed(1)}% away` : 'No liq',
    liqPriceLabel: liq ? `$${formatPrice(String(liq.liqPx))}` : '—',
    markPriceLabel: liq ? `$${formatPrice(String(liq.markPx))}` : '—',
    liqPercent: liq?.pct ?? null,
  };

  const handleSharePosition = async () => {
    if (shareInFlightRef.current) return;

    shareInFlightRef.current = true;
    setIsSharing(true);
    const filename = shareFilename(position.coin);
    let capturedBlob: Blob | null = null;
    try {
      capturedBlob = capturePositionShareImage(shareDetails);
      const file = new File([capturedBlob], filename, {
        type: 'image/png',
      });
      const shareTitle = 'Swop perps position';
      const shareText = 'Follow my trades on https://swopme.app/';

      if (
        typeof navigator.share === 'function' &&
        navigator.canShare?.({ files: [file] })
      ) {
        setIsSharing(false);
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
      } else {
        downloadBlob(capturedBlob, filename);
        toast({
          title: 'Position image downloaded',
          description:
            'Your Matrix terminal share card is ready. Link: swopme.app',
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
      shareInFlightRef.current = false;
      setIsSharing(false);
    }
  };

  return (
    <div
      role="listitem"
      className={hasDivider ? 'border-t border-black/[0.06] pt-4' : ''}
    >
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="block max-w-[11rem] sm:max-w-[16rem] text-[22px] font-bold tracking-[-0.6px] text-gray-900 truncate">
              {position.coin}
            </span>
            <LeveragePill leverage={position.leverage.value} isLong={isLong} />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            l: 'size',
            v: `${formatTokenSize(String(sizeAbs))} ${position.coin}`,
          },
          { l: 'entry', v: `$${formatPrice(position.entryPx)}` },
          {
            l: 'mark',
            v: markPx !== null && Number.isFinite(markPx)
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
