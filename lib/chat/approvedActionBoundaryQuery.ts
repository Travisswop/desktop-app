import type { ApprovedActionBoundary } from '@/lib/chat/agentActionHandoff';
import { safeSessionStorage } from '@/lib/browserStorage';

const APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX =
  'swop:prediction-approved-boundary:';

function approvedPredictionBoundaryProposalStorageKey(
  proposalId?: string | null,
) {
  return proposalId
    ? `${APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX}proposal:${proposalId}`
    : null;
}

function approvedPredictionBoundaryLegacyMarketStorageKey(
  marketId?: string | null,
) {
  return marketId
    ? `${APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX}market:${marketId}`
    : null;
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function serializeApprovedActionBoundary(
  boundary?: ApprovedActionBoundary | null,
) {
  if (!boundary) return null;

  const normalized: ApprovedActionBoundary = {
    reviewStateLabel: stringOrUndefined(boundary.reviewStateLabel),
    maxOrderUsd: stringOrUndefined(boundary.maxOrderUsd),
    maxDailySpendUsd: stringOrUndefined(boundary.maxDailySpendUsd),
    maxDailyLossUsd: stringOrUndefined(boundary.maxDailyLossUsd),
    maxOpenPositions: stringOrUndefined(boundary.maxOpenPositions),
    expiry: stringOrUndefined(boundary.expiry),
    riskControls: stringList(boundary.riskControls),
  };

  if (
    !normalized.reviewStateLabel &&
    !normalized.maxOrderUsd &&
    !normalized.maxDailySpendUsd &&
    !normalized.maxDailyLossUsd &&
    !normalized.maxOpenPositions &&
    !normalized.expiry &&
    !normalized.riskControls?.length
  ) {
    return null;
  }

  return JSON.stringify(normalized);
}

function approvedPredictionBoundaryStorageKeys({
  marketId,
  proposalId,
}: {
  marketId?: string | null;
  proposalId?: string | null;
}) {
  return [
    approvedPredictionBoundaryProposalStorageKey(proposalId),
    approvedPredictionBoundaryLegacyMarketStorageKey(marketId),
  ].filter((value): value is string => Boolean(value));
}

export function clearApprovedPredictionBoundary(lookup: {
  marketId?: string | null;
  proposalId?: string | null;
}) {
  approvedPredictionBoundaryStorageKeys(lookup).forEach((key) => {
    safeSessionStorage.removeItem(key);
  });
}

export function persistApprovedPredictionBoundary(
  lookup: {
    marketId?: string | null;
    proposalId?: string | null;
  },
  boundary?: ApprovedActionBoundary | null,
) {
  const serialized = serializeApprovedActionBoundary(boundary);
  const proposalStorageKey = approvedPredictionBoundaryProposalStorageKey(
    lookup.proposalId,
  );
  const legacyMarketStorageKey =
    approvedPredictionBoundaryLegacyMarketStorageKey(lookup.marketId);

  if (!serialized || !proposalStorageKey) {
    clearApprovedPredictionBoundary(lookup);
    return;
  }

  safeSessionStorage.setItem(proposalStorageKey, serialized);

  if (legacyMarketStorageKey) {
    safeSessionStorage.removeItem(legacyMarketStorageKey);
  }
}

export function readApprovedPredictionBoundary(lookup: {
  marketId?: string | null;
  proposalId?: string | null;
}) {
  const proposalStorageKey = approvedPredictionBoundaryProposalStorageKey(
    lookup.proposalId,
  );
  const legacyMarketStorageKey =
    approvedPredictionBoundaryLegacyMarketStorageKey(lookup.marketId);

  if (!proposalStorageKey) {
    if (legacyMarketStorageKey) {
      safeSessionStorage.removeItem(legacyMarketStorageKey);
    }
    return null;
  }

  const raw = safeSessionStorage.getItem(proposalStorageKey);
  const boundary = parseApprovedActionBoundary(raw);
  if (boundary) {
    if (legacyMarketStorageKey) {
      safeSessionStorage.removeItem(legacyMarketStorageKey);
    }
    return boundary;
  }

  if (raw) {
    safeSessionStorage.removeItem(proposalStorageKey);
  }

  if (legacyMarketStorageKey) {
    safeSessionStorage.removeItem(legacyMarketStorageKey);
  }

  return null;
}

export function parseApprovedActionBoundary(
  raw?: string | null,
): ApprovedActionBoundary | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const boundary: ApprovedActionBoundary = {
      reviewStateLabel: stringOrUndefined(parsed.reviewStateLabel),
      maxOrderUsd: stringOrUndefined(parsed.maxOrderUsd),
      maxDailySpendUsd: stringOrUndefined(parsed.maxDailySpendUsd),
      maxDailyLossUsd: stringOrUndefined(parsed.maxDailyLossUsd),
      maxOpenPositions: stringOrUndefined(parsed.maxOpenPositions),
      expiry: stringOrUndefined(parsed.expiry),
      riskControls: stringList(parsed.riskControls),
    };

    return serializeApprovedActionBoundary(boundary) ? boundary : null;
  } catch {
    return null;
  }
}
