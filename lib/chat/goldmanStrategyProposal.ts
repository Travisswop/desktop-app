import { formatCompactUsd, toFiniteNumber } from '@/lib/chat/ticketFormat';

type StrategyParams = Record<string, unknown>;

type GoldmanProposalMetric = {
  label: string;
  value: string;
  detail?: string;
};

type GoldmanProposalSummary = {
  approvalBoundary: string;
  metrics: GoldmanProposalMetric[];
};

type GoldmanProposalSummaryOptions = {
  assets?: string[];
  venues?: string[];
  expiryLabel?: string | null;
};

function strategyString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function strategyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function positiveWholeNumber(value: unknown) {
  const number = Math.trunc(toFiniteNumber(value));
  return number > 0 ? number : 0;
}

function positiveUsdLabel(value: unknown) {
  const number = toFiniteNumber(value);
  return number > 0 ? formatCompactUsd(number) : '';
}

function positivePercentLabel(value: unknown) {
  const number = toFiniteNumber(value);
  if (number <= 0) return '';
  return `${number.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}%`;
}

export function formatGoldmanCooldownLabel(value: unknown) {
  const seconds = positiveWholeNumber(value);
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function readAllocationLabel(allocation: Record<string, unknown>) {
  const usd = positiveUsdLabel(
    allocation.maxUsd ||
      allocation.usdCap ||
      allocation.amountUsd ||
      allocation.usd ||
      allocation.allocationUsd
  );
  const percent = positivePercentLabel(
    allocation.percent ||
      allocation.pct ||
      allocation.allocationPct ||
      allocation.sharePct
  );

  if (usd && percent) return `${usd} / ${percent} allocation`;
  if (usd) return `${usd} allocation`;
  if (percent) return `${percent} allocation`;
  return '';
}

export function buildGoldmanStrategyProposalSummary(
  params: StrategyParams,
  options: GoldmanProposalSummaryOptions = {}
): GoldmanProposalSummary {
  const assets = (options.assets || []).filter(Boolean);
  const venues = (options.venues || []).filter(Boolean);
  const fundingAsset = strategyString(params.fundingAsset, '');
  const maxOrderUsd = positiveUsdLabel(params.maxOrderUsd);
  const maxDailySpendUsd = positiveUsdLabel(params.maxDailySpendUsd);
  const maxDailyLossUsd = positiveUsdLabel(params.maxDailyLossUsd);
  const maxOpenPositions = positiveWholeNumber(params.maxOpenPositions);
  const cooldown = formatGoldmanCooldownLabel(params.cooldownSeconds);
  const allocationLabel = readAllocationLabel(strategyRecord(params.allocation));
  const assetLabel = assets.length > 0 ? assets.join(', ') : '';
  const venueLabel = venues.length > 0 ? venues.join(', ') : 'approved venues';
  const expiryLabel = strategyString(options.expiryLabel, '');
  const normalizedFundingAsset = fundingAsset.trim().toLowerCase();
  const normalizedAssets = assets.map((asset) => asset.trim().toLowerCase());
  const shouldShowAssetScope =
    Boolean(assetLabel) &&
    (!normalizedFundingAsset ||
      normalizedAssets.length !== 1 ||
      normalizedAssets[0] !== normalizedFundingAsset);

  const metrics: GoldmanProposalMetric[] = [];
  if (fundingAsset) {
    metrics.push({
      label: 'funding asset',
      value: fundingAsset,
      detail:
        allocationLabel ||
        (maxDailySpendUsd ? `Daily cap ${maxDailySpendUsd}` : undefined),
    });
  } else if (allocationLabel) {
    metrics.push({
      label: 'allocation',
      value: allocationLabel,
      detail: maxDailySpendUsd ? `Daily cap ${maxDailySpendUsd}` : undefined,
    });
  }
  if (maxOpenPositions > 0) {
    metrics.push({
      label: 'open positions',
      value: String(maxOpenPositions),
      detail: 'concurrent markets max',
    });
  }
  if (cooldown) {
    metrics.push({
      label: 'cooldown',
      value: cooldown,
      detail: 'minimum re-entry wait',
    });
  }

  const constraints = [
    maxOrderUsd ? `${maxOrderUsd} per order` : '',
    maxDailySpendUsd ? `${maxDailySpendUsd} daily spend` : '',
    maxDailyLossUsd ? `${maxDailyLossUsd} daily loss` : '',
    maxOpenPositions > 0 ? `${maxOpenPositions} open positions max` : '',
    cooldown ? `${cooldown} cooldown between entries` : '',
  ].filter(Boolean);

  const boundaryScope = [
    fundingAsset ? `using ${fundingAsset} as funding` : '',
    shouldShowAssetScope ? `only for the declared asset scope (${assetLabel})` : '',
    constraints.length > 0 ? 'within the displayed caps' : '',
  ].filter(Boolean);
  const approvalBoundaryBase = boundaryScope.length
    ? `Approval lets Goldman trade on ${venueLabel} ${boundaryScope.join(' and ')}.`
    : `Approval lets Goldman trade on ${venueLabel}.`;
  const constraintsSentence =
    constraints.length > 0 ? ` It still cannot exceed ${constraints.join(', ')}.` : '';
  const stopSentence = expiryLabel
    ? ` ${expiryLabel} remains the outer stop unless you stop it sooner.`
    : ' Without an explicit expiry, it stays active until you stop it or the strategy hits its own exit or risk limit.';

  return {
    approvalBoundary: `${approvalBoundaryBase}${constraintsSentence}${stopSentence}`,
    metrics,
  };
}
