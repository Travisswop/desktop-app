import { formatCompactUsd, toFiniteNumber } from '@/lib/chat/ticketFormat';

type UnknownRecord = Record<string, unknown>;

function strategyString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function strategyRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function strategyList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatPercent(value: number) {
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toLocaleString('en-US', {
    maximumFractionDigits: percent % 1 === 0 ? 0 : 2,
  })}%`;
}

function joinReadable(parts: string[]) {
  if (parts.length <= 1) return parts[0] || '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

function firstPositiveNumber(values: unknown[]) {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

export function formatGoldmanCooldownLabel(value: unknown) {
  const seconds = Math.round(toFiniteNumber(value));
  if (seconds <= 0) return null;
  if (seconds % 86400 === 0) {
    return `${formatCount(seconds / 86400, 'day')} cooldown`;
  }
  if (seconds % 3600 === 0) {
    return `${formatCount(seconds / 3600, 'hour')} cooldown`;
  }
  if (seconds % 60 === 0) {
    return `${formatCount(seconds / 60, 'minute')} cooldown`;
  }
  return `${formatCount(seconds, 'second')} cooldown`;
}

export function formatGoldmanOpenPositionsLabel(value: unknown) {
  const positions = Math.round(toFiniteNumber(value));
  if (positions <= 0) return null;
  return `Max ${formatCount(positions, 'open position')}`;
}

export function formatGoldmanFundingSummary(params: UnknownRecord) {
  const allocation = strategyRecord(params.allocation);
  const fundingAsset = strategyString(
    params.fundingAsset,
    strategyString(allocation.asset, '')
  );
  const allocationUsd = firstPositiveNumber([
    allocation.amountUsd,
    allocation.usd,
    allocation.maxCapitalUsd,
    allocation.maxAllocationUsd,
    allocation.capUsd,
  ]);
  const allocationPercent = firstPositiveNumber([
    allocation.percent,
    allocation.allocationPct,
    allocation.maxAllocationPct,
    allocation.sharePct,
  ]);
  const allocationLabel = strategyString(
    allocation.summary,
    strategyString(allocation.label, strategyString(allocation.name, ''))
  );
  const detailParts = [
    allocationUsd > 0 ? `${formatCompactUsd(allocationUsd)} budget` : '',
    allocationPercent > 0 ? `${formatPercent(allocationPercent)} allocation` : '',
    allocationLabel,
  ].filter(Boolean);

  if (!fundingAsset && detailParts.length === 0) return null;

  return {
    assetLabel: fundingAsset || 'Approved funding source',
    detailLabel: detailParts.join(' · ') || null,
  };
}

export function buildGoldmanApprovalBoundarySummary(
  params: UnknownRecord,
  expiryLabel?: string | null
) {
  const venues = strategyList(params.venues, ['approved venues']);
  const assets = strategyList(params.assets);
  const fundingSummary = formatGoldmanFundingSummary(params);
  const venueLabel = joinReadable(venues);
  const assetLabel =
    fundingSummary?.assetLabel || joinReadable(assets) || 'approved assets';
  const guardrails = [
    toFiniteNumber(params.maxOrderUsd) > 0
      ? `${formatCompactUsd(params.maxOrderUsd)} max per order`
      : '',
    formatGoldmanOpenPositionsLabel(params.maxOpenPositions),
    toFiniteNumber(params.maxDailySpendUsd) > 0
      ? `${formatCompactUsd(params.maxDailySpendUsd)} daily spend cap`
      : '',
    toFiniteNumber(params.maxDailyLossUsd) > 0
      ? `${formatCompactUsd(params.maxDailyLossUsd)} daily loss limit`
      : '',
    formatGoldmanCooldownLabel(params.cooldownSeconds),
  ].filter(Boolean);
  const timeBoundary = expiryLabel
    ? `until ${expiryLabel}`
    : 'until expiry, rejection, or manual stop';

  return `Approval lets Goldman trade on ${venueLabel} using ${assetLabel} within the displayed caps: ${joinReadable(
    guardrails
  )} ${timeBoundary}.`;
}
