import type { ApprovedActionBoundary } from '@/lib/chat/agentActionHandoff';
import { safeSessionStorage } from '@/lib/browserStorage';

const APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX =
  'swop:prediction-approved-boundary:';

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
    proposalId
      ? `${APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX}proposal:${proposalId}`
      : null,
    marketId
      ? `${APPROVED_PREDICTION_BOUNDARY_STORAGE_PREFIX}market:${marketId}`
      : null,
  ].filter((value): value is string => Boolean(value));
}

export function persistApprovedPredictionBoundary(
  lookup: {
    marketId?: string | null;
    proposalId?: string | null;
  },
  boundary?: ApprovedActionBoundary | null,
) {
  const serialized = serializeApprovedActionBoundary(boundary);
  if (!serialized) return;

  approvedPredictionBoundaryStorageKeys(lookup).forEach((key) => {
    safeSessionStorage.setItem(key, serialized);
  });
}

export function readApprovedPredictionBoundary(lookup: {
  marketId?: string | null;
  proposalId?: string | null;
}) {
  for (const key of approvedPredictionBoundaryStorageKeys(lookup)) {
    const raw = safeSessionStorage.getItem(key);
    const boundary = parseApprovedActionBoundary(raw);
    if (boundary) return boundary;
    if (raw) safeSessionStorage.removeItem(key);
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
