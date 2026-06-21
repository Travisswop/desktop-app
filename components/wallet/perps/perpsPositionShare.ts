'use client';

import type { toast as showToast } from '@/hooks/use-toast';
import { formatPrice } from '@/services/hyperliquid/types';
import type { HLPosition } from '@/services/hyperliquid/types';

type ToastFn = typeof showToast;

const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SHARE_POSTER_WIDTH = 420;
const SHARE_POSTER_HEIGHT = 640;
const SHARE_CANVAS_SCALE = 2;

export interface PositionShareDetails {
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

export function buildPositionShareDetails(
  position: HLPosition,
  markPx: number | null,
): PositionShareDetails {
  const size = parseFloat(position.szi);
  const isLong = size > 0;
  const sizeAbs = Math.abs(size);
  const pnlNum = parseFloat(position.unrealizedPnl || '0');
  const roeNum = parseFloat(position.returnOnEquity || '0') * 100;
  const liq = liqMetrics(position, markPx);

  return {
    coin: position.coin,
    side: isLong ? 'LONG' : 'SHORT',
    leverage: position.leverage.value,
    pnlLabel: formatSignedUsd(pnlNum),
    roeLabel: Number.isFinite(roeNum)
      ? `${roeNum >= 0 ? '+' : ''}${roeNum.toFixed(2)}%`
      : '-',
    pnlPositive: pnlNum >= 0,
    sizeLabel: `${formatTokenSize(String(sizeAbs))} ${position.coin}`,
    entryLabel: `$${formatPrice(position.entryPx)}`,
    markLabel:
      markPx !== null && Number.isFinite(markPx)
        ? `$${formatPrice(String(markPx))}`
        : '-',
    marginLabel: `$${formatBalance(parseFloat(position.marginUsed), 2)}`,
    liqDistanceLabel: liq ? `${liq.pct.toFixed(1)}% away` : 'No liq',
    liqPriceLabel: liq ? `$${formatPrice(String(liq.liqPx))}` : '-',
    markPriceLabel: liq ? `$${formatPrice(String(liq.markPx))}` : '-',
    liqPercent: liq?.pct ?? null,
  };
}

export async function sharePerpsPositionImage(
  details: PositionShareDetails,
  toast: ToastFn,
) {
  const filename = shareFilename(details.coin);
  let capturedBlob: Blob | null = null;

  try {
    capturedBlob = capturePositionShareImage(details);
    const file = new File([capturedBlob], filename, {
      type: 'image/png',
    });
    const shareTitle = 'Swop perps position';
    const shareText = 'Follow my trades on https://swopme.app/';

    if (
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ files: [file] })
    ) {
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
    if (isShareCancel(err)) return;

    if (capturedBlob) {
      downloadBlob(capturedBlob, filename);
      toast({
        title: 'Position image downloaded',
        description:
          'Sharing was blocked, so Swop saved the PNG instead. Link: swopme.app',
      });
      return;
    }

    console.error('Failed to share perps position:', err);
    toast({
      title: 'Could not share position',
      description: 'Try again in a moment.',
      variant: 'destructive',
    });
  }
}

const formatBalance = (n: number, frac = 2): string =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const formatSignedUsd = (raw: string | number): string => {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return '$0.00';
  const sign = n >= 0 ? '+' : '-';
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

function liqMetrics(position: HLPosition, markPx: number | null) {
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
  return { liqPx, markPx, pct };
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

  const bg = ctx.createLinearGradient(
    0,
    0,
    SHARE_POSTER_WIDTH,
    SHARE_POSTER_HEIGHT,
  );
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
    const gradient = ctx.createLinearGradient(
      0,
      rain.top,
      0,
      rain.top + rain.height,
    );
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
    drawFittedText(
      ctx,
      stat.label.toUpperCase(),
      cellX + 14,
      cellY + 9,
      132,
      8.8,
      7,
      '800',
      '#6b7280',
    );
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
