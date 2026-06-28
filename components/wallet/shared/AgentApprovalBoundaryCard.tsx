'use client';

import type { AgentActionRiskBoundary } from '@/lib/chat/agentActionHandoff';

type AgentApprovalBoundaryCardProps = {
  boundary?: AgentActionRiskBoundary | null;
  className?: string;
};

function formatUsd(value?: string) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: number >= 1000 ? 0 : 2,
  });
}

function formatCount(value?: string) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

function formatCooldown(seconds?: number) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return null;
  if (seconds % 3600 === 0) return `${seconds / 3600}h cooldown`;
  if (seconds % 60 === 0) return `${seconds / 60}m cooldown`;
  return `${seconds}s cooldown`;
}

function formatExpiry(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatExecutionMode(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'execute') return 'Live execution approved';
  if (normalized === 'monitor') return 'Monitor-only';
  if (normalized === 'proposal') return 'Proposal-only';
  return normalized.replace(/[_-]+/g, ' ');
}

function buildSummary(boundary: AgentActionRiskBoundary) {
  const base =
    boundary.reviewRequirement === 'user_signature_required'
      ? 'Goldman approved this setup, but Swop still needs your signature before anything executes.'
      : boundary.executionMode?.toLowerCase() === 'monitor'
        ? 'Goldman can monitor this market, but it cannot place trades from this screen without a new approval.'
        : boundary.executionMode?.toLowerCase() === 'proposal'
          ? 'This stays proposal-only until you explicitly approve and launch a live action.'
          : 'Review the approved execution boundary before confirming this order.';

  if (
    boundary.maxOrderUsd ||
    boundary.maxDailyLossUsd ||
    boundary.maxDailySpendUsd ||
    boundary.maxOpenPositions ||
    boundary.cooldownSeconds ||
    boundary.expiry
  ) {
    return `${base} The limits below remain the approved boundary until expiry or manual stop.`;
  }

  return base;
}

export function hasAgentApprovalBoundary(
  boundary?: AgentActionRiskBoundary | null,
) {
  if (!boundary) return false;
  return Boolean(
    boundary.riskControls?.length ||
      boundary.maxOrderUsd ||
      boundary.maxDailySpendUsd ||
      boundary.maxDailyLossUsd ||
      boundary.maxOpenPositions ||
      boundary.cooldownSeconds ||
      boundary.expiry ||
      boundary.executionMode ||
      boundary.reviewRequirement,
  );
}

export function AgentApprovalBoundaryCard({
  boundary,
  className = '',
}: AgentApprovalBoundaryCardProps) {
  if (!boundary || !hasAgentApprovalBoundary(boundary)) return null;
  const activeBoundary: AgentActionRiskBoundary = boundary;

  const items = [
    {
      label: 'Execution',
      value: formatExecutionMode(activeBoundary.executionMode),
    },
    {
      label: 'Max order',
      value: formatUsd(activeBoundary.maxOrderUsd),
    },
    {
      label: 'Daily loss',
      value: formatUsd(activeBoundary.maxDailyLossUsd),
    },
    {
      label: 'Daily spend',
      value: formatUsd(activeBoundary.maxDailySpendUsd),
    },
    {
      label: 'Open positions',
      value: formatCount(activeBoundary.maxOpenPositions),
    },
    {
      label: 'Cooldown',
      value: formatCooldown(activeBoundary.cooldownSeconds),
    },
    {
      label: 'Expiry',
      value: formatExpiry(activeBoundary.expiry),
    },
  ].filter((item) => item.value);

  return (
    <div
      className={`rounded-[18px] border border-blue-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-3.5 py-3 text-left text-[#16324f] shadow-[0_10px_30px_-22px_rgba(37,99,235,0.55)] ${className}`.trim()}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
        Approved Boundary
      </div>
      <p className="mt-1 text-[12.5px] font-medium leading-5 text-[#22405f]">
        {buildSummary(activeBoundary)}
      </p>

      {items.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600/80">
                {item.label}
              </div>
              <div className="mt-1 text-[12.5px] font-semibold text-[#17314c]">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeBoundary.riskControls?.length ? (
        <div className="mt-3 rounded-xl border border-blue-100 bg-white/80 px-3 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600/80">
            Risk Controls
          </div>
          <div className="mt-2 space-y-1.5">
            {activeBoundary.riskControls.map((item, index) => (
              <div
                key={`${index}-${item}`}
                className="text-[11.5px] leading-5 text-[#274763]"
              >
                {index + 1}. {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
