'use client';

// Full-screen review modal shown before a Goldman Sacks strategy proposal is
// approved. This is the primary trust surface: it lays out everything the
// strategy is allowed to do (rules, limits, per-venue autonomy, brain
// reasoning) before the approve_agent_action socket event fires.

import { useMemo } from 'react';
import { Ban, BrainCircuit, Check, Loader2, ShieldCheck, X } from 'lucide-react';
import type { AgentActionProposal } from '@/hooks/useGroupAgents';
import type { GoldmanAccessStation } from '@/hooks/useGroupAgents';
import {
  TICKET_LABEL_CLASS,
  TICKET_PRIMARY_BUTTON_CLASS,
  TICKET_REJECT_BUTTON_CLASS,
} from '@/lib/chat/ticketStyles';
import { formatCompactUsd } from '@/lib/chat/ticketFormat';
import type { GoldmanTakeProfitRung } from './goldmanTypes';
import {
  AUTONOMY_GATE_EXPLAINER,
  deriveVenueAutonomy,
  venueAutonomyClass,
  venueAutonomyLabel,
} from './goldmanAutonomy';

const KNOWN_LIMIT_KEYS = [
  'maxOrderUsd',
  'maxDailySpendUsd',
  'maxDailyLossUsd',
  'leverage',
  'maxLeverage',
  'reserveUsd',
  'reserve',
] as const;

const RULE_EXCLUDED_KEYS = new Set<string>([
  ...KNOWN_LIMIT_KEYS,
  'title',
  'prompt',
  'strategyBrief',
  'venues',
  'assets',
  'executionMode',
  'metadata',
  'rules',
  'limits',
  'brain',
  'brainReasoning',
  'brainConfidence',
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

function isTakeProfitLadder(value: unknown): value is GoldmanTakeProfitRung[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((rung) => rung && typeof rung === 'object')
  );
}

function formatGenericValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) {
    const items = value.map((item) =>
      typeof item === 'object' && item !== null
        ? JSON.stringify(item)
        : String(item ?? '').trim()
    );
    return items.filter(Boolean).join(' · ') || '--';
  }
  if (typeof value === 'object') return JSON.stringify(value);

  const number = Number(value);
  if (Number.isFinite(number)) {
    if (/usd$/i.test(key)) return formatCompactUsd(number);
    if (/bps$/i.test(key)) {
      return `${(number / 100).toLocaleString('en-US', {
        maximumFractionDigits: 2,
      })}%`;
    }
    if (/pct|percent/i.test(key)) {
      return `${number.toLocaleString('en-US', {
        maximumFractionDigits: 2,
      })}%`;
    }
    if (/leverage/i.test(key)) return `${number}x`;
  }
  return String(value).trim();
}

type ReviewRow = { key: string; label: string; value: string };

function buildRows(
  record: Record<string, unknown>,
  excludedKeys?: Set<string>
): ReviewRow[] {
  return Object.entries(record)
    .filter(([key, value]) => {
      if (excludedKeys?.has(key)) return false;
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value: formatGenericValue(key, value),
    }));
}

export function StrategyApprovalModal({
  proposal,
  accessStation,
  isPending,
  onApprove,
  onReject,
  onClose,
}: {
  proposal: AgentActionProposal;
  accessStation?: GoldmanAccessStation | null;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const params = useMemo(
    () => asRecord(proposal.normalizedParams),
    [proposal.normalizedParams]
  );
  const metadata = asRecord(params.metadata);
  const rules = asRecord(params.rules);
  const limits = asRecord(params.limits);
  // Brain review data may arrive at normalizedParams.brain,
  // normalizedParams.brainReasoning (flat), or metadata.brain depending on
  // the backend branch — check all three.
  const brain = asRecord(metadata.brain || params.brain);

  const title = asText(params.title, 'Strategy draft');
  const prompt = asText(params.prompt, asText(params.strategyBrief));
  const venues = asList(params.venues);
  const assets = asList(params.assets);
  const executionMode = asText(params.executionMode, 'proposal');

  const takeProfitLadder = isTakeProfitLadder(rules.takeProfitLadder)
    ? rules.takeProfitLadder
    : isTakeProfitLadder(params.takeProfitLadder)
    ? (params.takeProfitLadder as GoldmanTakeProfitRung[])
    : null;

  const ruleRows = useMemo(() => {
    // Merge the structured rules record with flat draft params so every rule
    // the backend sends is visible, whichever shape it arrives in.
    const merged: Record<string, unknown> = { ...params, ...rules };
    const excluded = new Set(RULE_EXCLUDED_KEYS);
    excluded.add('takeProfitLadder');
    return buildRows(merged, excluded);
  }, [params, rules]);

  const limitRows = useMemo(() => {
    const merged: Record<string, unknown> = {};
    for (const key of KNOWN_LIMIT_KEYS) {
      if (params[key] !== undefined && params[key] !== null) {
        merged[key] = params[key];
      }
    }
    Object.assign(merged, limits);
    return buildRows(merged);
  }, [limits, params]);

  const venueAutonomy = useMemo(
    () => deriveVenueAutonomy(venues, accessStation?.access),
    [accessStation?.access, venues]
  );

  const brainReasoning = asText(
    brain.reasoning,
    asText(params.brainReasoning, asText(metadata.brainReasoning))
  );
  const brainConfidence = Number(
    brain.confidence ?? params.brainConfidence ?? metadata.brainConfidence
  );
  const hasBrainReview = Boolean(brainReasoning) || Number.isFinite(brainConfidence);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goldman-strategy-approval-title"
      data-testid="goldman-strategy-approval-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#101217] text-xs shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#eceef2]">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-[#f4c95d]/15">
                <ShieldCheck className="h-4 w-4 text-[#f4c95d]" />
              </span>
              <span id="goldman-strategy-approval-title" className="truncate">
                {title}
              </span>
            </div>
            <div className="dm-mono mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#737783]">
              strategy review · runs in {executionMode} mode until you change it
            </div>
          </div>
          <button
            type="button"
            title="Close review"
            onClick={onClose}
            disabled={isPending}
            className="dm-btn grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[#eceef2] disabled:cursor-default disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dm-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {prompt && (
            <div>
              <div className={TICKET_LABEL_CLASS}>what this strategy does</div>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#d7dae2]">
                {prompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {venues.map((venue) => (
              <span
                key={`venue-${venue}`}
                className="dm-mono rounded-[7px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9af7c4]"
              >
                {venue}
              </span>
            ))}
            {assets.map((asset) => (
              <span
                key={`asset-${asset}`}
                className="dm-mono rounded-[7px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#cfd3dd]"
              >
                {asset}
              </span>
            ))}
            <span className="dm-mono rounded-[7px] border border-[#6b9bff]/25 bg-[#6b9bff]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#b8c8ff]">
              {executionMode} mode
            </span>
          </div>

          {venueAutonomy.length > 0 && (
            <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
              <div className={TICKET_LABEL_CLASS}>autonomy per venue</div>
              <div className="mt-2 space-y-1.5">
                {venueAutonomy.map((item) => (
                  <div
                    key={`autonomy-${item.venue}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="dm-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#d7dae2]">
                      {item.venue}
                    </span>
                    <span
                      className={`dm-mono rounded-[6px] border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${venueAutonomyClass(
                        item.state
                      )}`}
                    >
                      {venueAutonomyLabel(item.state)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-snug text-[#737783]">
                Approving activates the strategy, but it stays in proposal mode —
                {' '}{AUTONOMY_GATE_EXPLAINER} Change these anytime from the Access
                Station toggles.
              </p>
            </div>
          )}

          {limitRows.length > 0 && (
            <div className="rounded-[10px] border border-[#f4c95d]/20 bg-[#f4c95d]/[0.06] px-3 py-2.5">
              <div className={TICKET_LABEL_CLASS}>hard limits</div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {limitRows.map((row) => (
                  <div
                    key={`limit-${row.key}`}
                    className="flex items-center justify-between gap-3 rounded-[8px] border border-white/[0.06] bg-black/25 px-2.5 py-1.5"
                  >
                    <span className="dm-mono truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9396a0]">
                      {row.label}
                    </span>
                    <span className="dm-mono text-[11.5px] font-bold text-[#eceef2]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(ruleRows.length > 0 || takeProfitLadder) && (
            <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
              <div className={TICKET_LABEL_CLASS}>rules</div>
              <div className="mt-2 space-y-1.5">
                {ruleRows.map((row) => (
                  <div
                    key={`rule-${row.key}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="dm-mono flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9396a0]">
                      {row.label}
                    </span>
                    <span className="min-w-0 text-right text-[11.5px] font-medium leading-snug text-[#d7dae2]">
                      {row.value}
                    </span>
                  </div>
                ))}
                {takeProfitLadder && (
                  <div>
                    <span className="dm-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9396a0]">
                      take profit ladder
                    </span>
                    <div className="mt-1 space-y-1">
                      {takeProfitLadder.map((rung, index) => (
                        <div
                          key={`tp-rung-${index}`}
                          className="dm-mono flex items-center justify-between rounded-[7px] border border-white/[0.06] bg-[#101217] px-2 py-1 text-[10.5px] font-semibold text-[#d7dae2]"
                        >
                          <span>rung {index + 1}</span>
                          <span>
                            at +{formatGenericValue('profitPct', rung.profitPct)}{' '}
                            close{' '}
                            {formatGenericValue(
                              'closePercent',
                              rung.closePercent
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasBrainReview && (
            <div className="rounded-[10px] border border-[#b893ff]/25 bg-[#b893ff]/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 text-[#b893ff]" />
                  <span className={TICKET_LABEL_CLASS}>brain reasoning</span>
                </div>
                {Number.isFinite(brainConfidence) && (
                  <span className="dm-mono rounded-[6px] border border-[#b893ff]/25 bg-black/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#d9c6ff]">
                    confidence{' '}
                    {Math.round(
                      brainConfidence <= 1
                        ? brainConfidence * 100
                        : brainConfidence
                    )}
                    %
                  </span>
                )}
              </div>
              {brainReasoning && (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#e4d9ff]">
                  {brainReasoning}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.07] px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="goldman-approval-modal-approve"
              onClick={onApprove}
              disabled={isPending}
              className={TICKET_PRIMARY_BUTTON_CLASS}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve strategy
            </button>
            <button
              type="button"
              data-testid="goldman-approval-modal-reject"
              onClick={onReject}
              disabled={isPending}
              className={`${TICKET_REJECT_BUTTON_CLASS} flex-1`}
            >
              <Ban className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-snug text-[#5a5e69]">
            Approving authorizes Goldman Sacks to run this strategy inside the
            limits above.
          </p>
        </div>
      </div>
    </div>
  );
}
