'use client';

export interface FeedSharePayload {
  title: string;
  text: string;
  url: string;
  clipboardText: string;
  shareData: ShareData;
}

type FeedLike = {
  _id?: string;
  postType?: string;
  content?: Record<string, unknown> | null;
  smartsiteDetails?: Record<string, unknown> | null;
  smartsiteId?: Record<string, unknown> | null;
  smartsiteUserName?: string | null;
  smartsiteEnsName?: string | null;
  createdAt?: string;
};

const DEFAULT_PUBLIC_APP_URL = 'https://www.swopme.app';

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return '';
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatAmount(value: unknown, maxDigits = 4) {
  const number = finiteNumber(value);
  if (number === null) return '';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDigits,
  }).format(number);
}

function formatUsd(value: unknown) {
  const number = finiteNumber(value);
  if (number === null) return '';
  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Math.abs(number) >= 1000 ? 0 : 2,
  }).format(number)}`;
}

function formatSignedPercent(value: unknown) {
  const number = finiteNumber(value);
  if (number === null) return '';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(2)}%`;
}

function formatPredictionPrice(value: unknown) {
  const number = finiteNumber(value);
  if (number === null) return '';
  const cents = number <= 1 ? number * 100 : number;
  return `${Math.round(cents)}c`;
}

function shareOrigin() {
  const configured = cleanText(process.env.NEXT_PUBLIC_APP_URL).replace(
    /\/+$/,
    '',
  );
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.origin) {
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    ) {
      return DEFAULT_PUBLIC_APP_URL;
    }
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_APP_URL;
}

export function buildFeedShareUrl(path: string) {
  const origin = shareOrigin();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function buildFeedSharePath(path: string, feed?: FeedLike | null) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const type = cleanText(feed?.postType) || 'post';
  const separator = normalizedPath.includes('?') ? '&' : '?';
  return `${normalizedPath}${separator}share=card&type=${encodeURIComponent(type)}`;
}

function feedAuthor(feed?: FeedLike | null) {
  return (
    firstText(
      feed?.smartsiteDetails?.name,
      feed?.smartsiteId?.name,
      feed?.smartsiteUserName,
      feed?.smartsiteDetails?.ens,
      feed?.smartsiteId?.ens,
      feed?.smartsiteEnsName,
    ) || 'Someone'
  );
}

function predictionText(feed: FeedLike, author: string) {
  const content = feed.content || {};
  const outcome = firstText(content.outcome, content.pickedOutcome) || 'a side';
  const marketTitle =
    firstText(content.marketTitle, content.question, content.title) ||
    'a prediction market';
  const side = cleanText(content.side).toUpperCase();
  const verb = side === 'SELL' ? 'sold' : 'picked';
  const price = formatPredictionPrice(
    content.executedPrice ?? content.acceptedPrice ?? content.price,
  );
  const stake = formatUsd(
    content.executedCost ?? content.executedProceeds ?? content.cost,
  );
  const pnl = formatUsd(
    content.realizedPnl ??
      content.cashPnl ??
      content.sellPnl ??
      content.pnl ??
      content.profitAmount,
  );

  return [
    `${author} ${verb} ${outcome} on "${marketTitle}"`,
    price ? `at ${price}` : '',
    stake ? `${stake} stake` : '',
    pnl ? `${pnl} P/L` : '',
    'on Swop.',
  ]
    .filter(Boolean)
    .join(' ');
}

function perpsText(feed: FeedLike, author: string) {
  const content = feed.content || {};
  const coin = firstText(content.coin) || 'crypto';
  const side = firstText(content.side) || 'perps';
  const leverage = formatAmount(content.leverage, 0);
  const status = firstText(content.status, content.event).toLowerCase();
  const verb =
    status === 'liquidated' || status === 'liquidate'
      ? 'was liquidated on'
      : status === 'closed' || status === 'close'
        ? 'closed'
        : status === 'cancelled' || status === 'canceled' || status === 'cancel'
          ? 'cancelled a limit order for'
        : status === 'limit'
          ? 'set a limit order for'
        : 'opened';
  const entry = formatUsd(content.entryPrice);
  const exitOrMark = formatUsd(content.exitPrice ?? content.markPrice);
  const returnPct = formatSignedPercent(content.returnPct);
  const position = `${leverage ? `${leverage}x ` : ''}${coin.toUpperCase()} ${side.toUpperCase()}`;

  return [
    `${author} ${verb} a ${position} perps position`,
    entry ? `from ${entry}` : '',
    exitOrMark ? `to ${exitOrMark}` : '',
    returnPct ? `(${returnPct})` : '',
    'on Swop.',
  ]
    .filter(Boolean)
    .join(' ');
}

function swapText(feed: FeedLike, author: string) {
  const content = feed.content || {};
  const inputToken = (content.inputToken || {}) as Record<string, unknown>;
  const outputToken = (content.outputToken || {}) as Record<string, unknown>;
  const inputAmount = formatAmount(inputToken.amount);
  const outputAmount = formatAmount(outputToken.amount);
  const inputSymbol = firstText(inputToken.symbol) || 'token';
  const outputSymbol = firstText(outputToken.symbol) || 'token';

  return `${author} swapped ${inputAmount} ${inputSymbol} for ${outputAmount} ${outputSymbol} on Swop.`;
}

function genericText(feed: FeedLike | null | undefined, author: string) {
  const content = feed?.content || {};
  const title = firstText(
    content.title,
    (content.quote as Record<string, unknown> | undefined)?.title,
  );
  return title
    ? `${author} shared "${title}" on Swop.`
    : `${author} shared a post on Swop.`;
}

function feedShareText(feed?: FeedLike | null) {
  const author = feedAuthor(feed);
  if (!feed) return `${author} shared a post on Swop.`;

  if (feed.postType === 'prediction') return predictionText(feed, author);
  if (feed.postType === 'perpsPosition') return perpsText(feed, author);
  if (feed.postType === 'swapTransaction') return swapText(feed, author);
  return genericText(feed, author);
}

export function buildFeedSharePayload({
  feed,
  path,
}: {
  feed?: FeedLike | null;
  path: string;
}): FeedSharePayload {
  const url = buildFeedShareUrl(buildFeedSharePath(path, feed));
  const text = feedShareText(feed);
  const title =
    feed?.postType === 'prediction'
      ? 'Swop prediction'
      : feed?.postType === 'perpsPosition'
        ? 'Swop perps position'
        : feed?.postType === 'swapTransaction'
          ? 'Swop swap'
          : 'Swop post';

  return {
    title,
    text,
    url,
    clipboardText: `${text}\n${url}`,
    shareData: {
      title,
      text,
      url,
    },
  };
}

export async function writeTextToClipboard(text: string) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea copy path for restricted webviews.
    }
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard API is unavailable.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('Copy command failed.');
  } finally {
    document.body.removeChild(textarea);
  }
}
