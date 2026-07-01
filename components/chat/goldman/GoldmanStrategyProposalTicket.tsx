import { Ban, Check, Loader2, ShieldCheck } from 'lucide-react';
import type {
  AgentActionProposal,
  AgentActionResultPayload,
} from '@/hooks/useGroupAgents';
import { buildGoldmanStrategyProposalSummary } from '@/lib/chat/goldmanStrategyProposal';
import {
  AGENT_PANEL_CLASS,
  TICKET_LABEL_CLASS,
  TICKET_PRIMARY_BUTTON_CLASS,
  TICKET_REJECT_BUTTON_CLASS,
} from '@/lib/chat/ticketStyles';
import { formatCompactUsd, toFiniteNumber } from '@/lib/chat/ticketFormat';

function strategyString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
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

function joinStrategyScope(parts: string[]) {
  return parts.filter(Boolean).join(' ');
}

function strategyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function strategyUsd(value: unknown) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number <= 0) return '--';
  return formatCompactUsd(number);
}

function strategyPercent(value: unknown) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number <= 0) return '--';
  return `${number.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}%`;
}

function strategyDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function proposalStatusClass(status: string) {
  if (status === 'approved' || status === 'executed') {
    return 'bg-[#3fe08f]/15 text-[#dfffee]';
  }
  if (status === 'rejected' || status === 'failed' || status === 'expired') {
    return 'bg-[#ff5d63]/15 text-[#ffb2b6]';
  }
  return 'bg-[#e8920f]/15 text-[#ffd08a]';
}

function getApprovalNextStep(result: unknown) {
  if (!result || typeof result !== 'object') return null;
  const nextStep = (result as { nextStep?: string }).nextStep;
  if (
    nextStep === 'frontend_signing_required' ||
    nextStep === 'hyperliquid_frontend_signing_required' ||
    nextStep === 'polymarket_frontend_signing_required' ||
    nextStep === 'swap_frontend_signing_required'
  ) {
    return 'Ready for wallet signing';
  }
  if (nextStep === 'hyperliquid_order_form_required') {
    return 'Open Perps to review the missing trade details before signing.';
  }
  if (nextStep === 'strategy_funding_required') {
    return 'Strategy approved. Fund the Goldman Sacks vault to activate it.';
  }
  if (nextStep === 'strategy_review_required') {
    return 'Review the missing strategy fields before activating.';
  }
  return nextStep || null;
}

export type GoldmanStrategyProposalTicketProps = {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  actionResult?: AgentActionResultPayload;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onApprove: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onReject: (proposalId: string) => void;
};

export function GoldmanStrategyProposalTicket({
  proposal,
  proposalId,
  status,
  actionResult,
  canAct,
  isOpen,
  isPending,
  onApprove,
  onReject,
}: GoldmanStrategyProposalTicketProps) {
  const params = proposal?.normalizedParams || {};
  const venues = strategyList(params.venues);
  const assets = strategyList(params.assets);
  const executionPlan = strategyList(params.executionPlan).slice(0, 4);
  const riskControls = strategyList(params.riskControls).slice(0, 4);
  const idleDeployment = strategyRecord(params.idleDeployment);
  const nextStep = getApprovalNextStep(actionResult?.result);
  const title = strategyString(params.title, 'Strategy draft');
  const brief = strategyString(
    params.strategyBrief,
    'Goldman Sacks prepared a concrete strategy for review.'
  );
  const expiry = strategyDate(params.expiry || proposal?.expiresAt);
  const idleVenue = strategyString(idleDeployment.venue, '');
  const idleAsset = strategyString(idleDeployment.asset, '');
  const idleChain = strategyString(idleDeployment.chain, '');
  const idleCondition = strategyString(idleDeployment.condition, '');
  const idleDeploymentSummary = joinStrategyScope([
    idleAsset,
    idleVenue ? `to ${idleVenue}` : '',
    idleChain ? `on ${idleChain}` : '',
  ]);
  const canSubmit = isOpen && canAct && !isPending;
  const proposalSummary = buildGoldmanStrategyProposalSummary(params, {
    assets,
    venues,
    expiryLabel: expiry ? `Expires ${expiry}` : null,
  });

  return (
    <div className={`mt-2 w-full max-w-[500px] overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-[#3fe08f]/15">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
            strategy.write · {proposalId}
          </div>
        </div>
        <span
          className={`dm-mono shrink-0 rounded-[5px] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] ${proposalStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <div>
          <div className={TICKET_LABEL_CLASS}>strategy brief</div>
          <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[#d7dae2]">
            {brief}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>target</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.targetProfitUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              {strategyPercent(params.targetProfitPct)}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>max order</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.maxOrderUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              est {strategyUsd(params.estimatedOrderUsd)}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>daily loss</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.maxDailyLossUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              cap {strategyUsd(params.maxDailySpendUsd)}
            </div>
          </div>
        </div>

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
          {expiry && (
            <span className="dm-mono rounded-[7px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9396a0]">
              expires {expiry}
            </span>
          )}
        </div>

        <div className="rounded-[10px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2.5">
          <div className={TICKET_LABEL_CLASS}>approval boundary</div>
          <p className="mt-1 text-[12px] leading-relaxed text-[#dfffee]">
            {proposalSummary.approvalBoundary}
          </p>
        </div>

        {proposalSummary.metrics.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {proposalSummary.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2"
              >
                <div className={TICKET_LABEL_CLASS}>{metric.label}</div>
                <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
                  {metric.value}
                </div>
                {metric.detail ? (
                  <div className="mt-0.5 text-[10px] text-[#5a5e69]">
                    {metric.detail}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>entry</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#d7dae2]">
              {strategyString(
                params.entryCondition,
                'Wait for a qualified market entry.'
              )}
            </p>
          </div>
          <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>exit</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#d7dae2]">
              {strategyString(
                params.exitCondition,
                'Exit at the approved target or risk limit.'
              )}
            </p>
          </div>
        </div>

        {(idleDeploymentSummary || idleCondition) && (
          <div className="rounded-[10px] border border-[#6b9bff]/20 bg-[#6b9bff]/10 px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>idle deployment</div>
            <div className="mt-1 text-[12px] font-semibold text-[#eceef2]">
              {idleDeploymentSummary || 'Declared idle deployment'}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#b8c8ff]">
              {strategyString(
                idleCondition,
                'Use idle funds only when no qualifying live market is available.'
              )}
            </p>
          </div>
        )}

        {(executionPlan.length > 0 || riskControls.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {executionPlan.length > 0 && (
              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
                <div className={TICKET_LABEL_CLASS}>execution</div>
                <div className="mt-2 space-y-1.5">
                  {executionPlan.map((item, index) => (
                    <div
                      key={`execution-${index}-${item}`}
                      className="text-[11.5px] leading-snug text-[#d7dae2]"
                    >
                      {index + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {riskControls.length > 0 && (
              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
                <div className={TICKET_LABEL_CLASS}>risk controls</div>
                <div className="mt-2 space-y-1.5">
                  {riskControls.map((item, index) => (
                    <div
                      key={`risk-${index}-${item}`}
                      className="text-[11.5px] leading-snug text-[#d7dae2]"
                    >
                      {index + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {nextStep && (
          <div className="rounded-[9px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2 text-[11.5px] text-[#dfffee]">
            {nextStep}
          </div>
        )}

        {isOpen && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onApprove(proposalId)}
              disabled={!canSubmit}
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
              onClick={() => onReject(proposalId)}
              disabled={!canAct || isPending}
              className={`${TICKET_REJECT_BUTTON_CLASS} flex-1`}
            >
              <Ban className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        )}

        {!canAct && isOpen && (
          <p className="text-[11px] text-[#ffd08a]">
            Only the user who asked Goldman Sacks to draft this strategy can approve it.
          </p>
        )}
      </div>
    </div>
  );
}
