import React from 'react';

const GOLDMAN_STRATEGY_LOOP_INTERVAL_MS = 180000;
const GOLDMAN_STRATEGY_HEARTBEAT_TICK_MS = 30000;

type GoldmanStrategyRuntimeState =
  | 'idle'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

type GoldmanStrategyRuntime = {
  state?: GoldmanStrategyRuntimeState | string | null;
  executionMode?: 'monitor' | 'proposal' | 'execute' | string | null;
  lastHeartbeatAt?: string | null;
  lastActivity?: string | null;
  lastError?: string | null;
};

export type GoldmanStrategyPanelStrategy = {
  title?: string | null;
  status?: string | null;
  runtime?: GoldmanStrategyRuntime | null;
  metadata?: Record<string, unknown> | null;
};

type GoldmanStrategyControlState = {
  statusLabel: string;
  statusToneClass: string;
  summaryLine: string;
  modeLabel: string;
  heartbeatLabel: string;
  heartbeatToneClass: string;
  heartbeatDetail: string;
  boundaryDetail: string;
  nextAction: string;
  blockerReason: string | null;
  runLabel: string;
  runToneClass: string;
  runDisabled: boolean;
  primaryAction: 'run' | 'stop' | 'none';
  lastActivity: string | null;
};

type GoldmanStrategyExecutionMode = 'proposal' | 'monitor' | 'execute';
type GoldmanFundingGuidance = {
  assetHint?: string | null;
  networkLabel?: string | null;
};

type GoldmanStrategyPendingCopy = Pick<
  GoldmanStrategyControlState,
  'boundaryDetail' | 'nextAction' | 'blockerReason' | 'runLabel'
>;

function normalizeModeKey(mode?: string | null): GoldmanStrategyExecutionMode {
  const normalized = String(mode || 'proposal').toLowerCase();
  if (normalized === 'execute') return 'execute';
  if (normalized === 'monitor') return 'monitor';
  return 'proposal';
}

function normalizeMode(mode?: string | null) {
  const normalized = normalizeModeKey(mode);
  if (normalized === 'execute') return 'live execute';
  if (normalized === 'monitor') return 'monitor only';
  return 'proposal only';
}

function describeFundingRequirement(guidance?: GoldmanFundingGuidance | null) {
  const assetHint = guidance?.assetHint?.trim();
  const networkLabel = guidance?.networkLabel?.trim();
  if (assetHint && networkLabel) return `${assetHint} on ${networkLabel}`;
  if (assetHint) return assetHint;
  if (networkLabel) return `the required asset on ${networkLabel}`;
  return 'the required asset';
}

function getPendingAuthorizationCopy(
  mode: GoldmanStrategyExecutionMode,
  fundingBlocked: boolean,
  approvedWaitingForFunding: boolean,
  fundingGuidance?: GoldmanFundingGuidance | null
): GoldmanStrategyPendingCopy {
  const fundingRequirement = describeFundingRequirement(fundingGuidance);
  if (mode === 'execute') {
    if (approvedWaitingForFunding) {
      return {
        boundaryDetail:
          'This strategy is already approved for live execution, but Goldman cannot trade until the strategy vault is funded and wallet setup is complete.',
        nextAction:
          `Fund the strategy vault with ${fundingRequirement}, then press Run to start Goldman within the saved caps.`,
        blockerReason:
          `Vault funding or wallet readiness is still blocking the approved live strategy. Required funding: ${fundingRequirement}.`,
        runLabel: 'Fund first',
      };
    }

    return {
      boundaryDetail:
        'This strategy is configured for live execution, but Goldman cannot trade until approval and funding are both complete.',
      nextAction: fundingBlocked
        ? `Fund the strategy vault with ${fundingRequirement}, then approve the strategy before pressing Run.`
        : 'Approve this strategy before Goldman can run within the saved caps.',
      blockerReason: fundingBlocked
        ? `Vault funding or wallet readiness is still blocking live execution. Required funding: ${fundingRequirement}.`
        : 'Goldman is still waiting on explicit user approval.',
      runLabel: fundingBlocked ? 'Fund first' : 'Approve first',
    };
  }

  if (mode === 'monitor') {
    if (approvedWaitingForFunding) {
      return {
        boundaryDetail:
          'This strategy is already approved to monitor and report. Goldman stays read-only in this mode, but the remaining setup blocker still has to clear before monitoring can start.',
        nextAction:
          `Fund the strategy vault with ${fundingRequirement}, then press Run to start monitoring from the saved rules.`,
        blockerReason:
          `A wallet or vault setup blocker is still preventing Goldman from starting the approved monitor-only runtime. Required funding: ${fundingRequirement}.`,
        runLabel: 'Setup blocked',
      };
    }

    return {
      boundaryDetail: fundingBlocked
        ? 'This strategy is configured to monitor and report. Goldman stays read-only in this mode, but the remaining setup blocker still has to clear before monitoring can start.'
        : 'This strategy is configured to monitor and report. Approval unlocks read-only monitoring, and Goldman will not place live trades in this mode.',
      nextAction: fundingBlocked
        ? `Fund the strategy vault with ${fundingRequirement}, then approve the strategy before pressing Run.`
        : 'Approve this strategy before Goldman starts monitoring from the saved rules.',
      blockerReason: fundingBlocked
        ? `A wallet or vault setup blocker is still preventing Goldman from starting monitor-only runtime. Required funding: ${fundingRequirement}.`
        : 'Goldman is still waiting on explicit user approval before it can start monitoring.',
      runLabel: fundingBlocked ? 'Setup blocked' : 'Approve first',
    };
  }

  if (approvedWaitingForFunding) {
    return {
      boundaryDetail:
        'This strategy is already approved, but it is still proposal-only. Goldman will not monitor or place live trades until the mode changes, and the remaining setup blocker still needs to clear before it can move forward.',
      nextAction:
        `Fund the strategy vault with ${fundingRequirement}, then switch this strategy to monitor or live execute before pressing Run.`,
      blockerReason:
        `A setup blocker is still preventing this approved proposal from moving into an active Goldman runtime. Required funding: ${fundingRequirement}.`,
      runLabel: 'Setup blocked',
    };
  }

  return {
    boundaryDetail: fundingBlocked
      ? 'This strategy is still proposal-only. Goldman will not monitor or place live trades from this mode, and the remaining setup blocker still needs to clear before it can move forward.'
      : 'This strategy is still proposal-only. Approval keeps the reviewed plan available, but Goldman will not monitor or place live trades until the mode changes.',
    nextAction: fundingBlocked
      ? `Fund the strategy vault with ${fundingRequirement}, then switch this strategy to monitor or live execute before pressing Run.`
      : 'Approve this proposal if you want to keep it, then switch to monitor or live execute before expecting Goldman to run.',
    blockerReason: fundingBlocked
      ? `A setup blocker is still preventing this proposal from moving into an active Goldman runtime. Required funding: ${fundingRequirement}.`
      : 'Goldman is still waiting on explicit user approval, and proposal mode does not authorize live automation.',
    runLabel: fundingBlocked ? 'Setup blocked' : 'Proposal only',
  };
}

function relativeAgeLabel(ageMs: number) {
  const minutes = Math.max(1, Math.round(ageMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
}

function describeHeartbeat(lastHeartbeatAt?: string | null, now = Date.now()) {
  if (!lastHeartbeatAt) {
    return {
      label: 'no heartbeat',
      toneClass: 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]',
      detail: 'No Goldman runtime heartbeat has been recorded yet.',
      stale: true,
    };
  }
  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return {
      label: 'heartbeat unknown',
      toneClass: 'border-white/[0.08] bg-black/25 text-[#cfd3dd]',
      detail: 'Goldman reported an unreadable heartbeat timestamp.',
      stale: true,
    };
  }

  const ageMs = Math.max(0, now - timestamp);
  if (ageMs > GOLDMAN_STRATEGY_LOOP_INTERVAL_MS * 2) {
    return {
      label: 'stale heartbeat',
      toneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      detail: `Last Goldman heartbeat ${relativeAgeLabel(ageMs)}. The backend loop normally checks about every 3 minutes.`,
      stale: true,
    };
  }
  if (ageMs > GOLDMAN_STRATEGY_LOOP_INTERVAL_MS) {
    return {
      label: 'heartbeat delayed',
      toneClass: 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]',
      detail: `Last Goldman heartbeat ${relativeAgeLabel(ageMs)}. Runtime looks delayed versus the normal backend loop.`,
      stale: false,
    };
  }
  return {
    label: 'heartbeat live',
    toneClass: 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]',
    detail: `Last Goldman heartbeat ${relativeAgeLabel(ageMs)}.`,
    stale: false,
  };
}

function getStringMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isClientConnectionBlocked(message?: string | null) {
  return /client must be connected before running operations/i.test(
    message || ''
  );
}

export function isGoldmanStrategyRunningState(
  strategy?: GoldmanStrategyPanelStrategy | null
) {
  const status = String(strategy?.status || '').toLowerCase();
  const runtimeState = String(strategy?.runtime?.state || '').toLowerCase();
  if (runtimeState === 'running') return true;
  return (
    status === 'active' &&
    runtimeState.length === 0 &&
    normalizeModeKey(strategy?.runtime?.executionMode) !== 'proposal'
  );
}

export function getGoldmanStrategyControlState(
  strategy?: GoldmanStrategyPanelStrategy | null,
  options?: {
    isStrategyRunning?: boolean;
    now?: number;
    fundingGuidance?: GoldmanFundingGuidance | null;
  }
): GoldmanStrategyControlState {
  const runtime = strategy?.runtime || null;
  const metadata = strategy?.metadata || null;
  const modeKey = normalizeModeKey(runtime?.executionMode);
  const modeLabel = normalizeMode(runtime?.executionMode);
  const isStrategyRunning =
    options?.isStrategyRunning ?? isGoldmanStrategyRunningState(strategy);
  const heartbeat = describeHeartbeat(runtime?.lastHeartbeatAt, options?.now);
  const approvalState = getStringMetadataValue(metadata, 'approvalState');
  const walletStatus = getStringMetadataValue(metadata, 'walletStatus');
  const resumeBlockedReason = getStringMetadataValue(
    metadata,
    'runtimeResumeBlockedReason'
  );
  const runtimeError = runtime?.lastError?.trim() || null;
  const status = String(strategy?.status || '').toLowerCase();
  const runtimeState = String(runtime?.state || '').toLowerCase();
  const revoked = status === 'revoked';
  const expired = status === 'expired';
  const pendingAuthorization = status === 'pending_authorization';
  const approvedWaitingForFunding =
    approvalState === 'approved_waiting_for_funding';
  const fundingBlocked =
    approvedWaitingForFunding ||
    (pendingAuthorization && Boolean(walletStatus) && walletStatus !== 'active');
  const resumeBlocked =
    approvalState === 'resume_blocked' || Boolean(resumeBlockedReason);
  const hasRuntimeError = runtimeState === 'error';
  const clientConnectionBlocked = isClientConnectionBlocked(
    resumeBlockedReason || (hasRuntimeError ? runtimeError : null)
  );

  if (!strategy) {
    return {
      statusLabel: 'No approved strategy',
      statusToneClass: 'border-white/[0.08] bg-black/25 text-[#cfd3dd]',
      summaryLine: 'approve a strategy to unlock Goldman runtime controls',
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail:
        'Goldman can draft and explain ideas here, but no live strategy is approved yet.',
      nextAction: 'Publish and approve a strategy before expecting Goldman to run.',
      blockerReason: null,
      runLabel: 'Need strategy',
      runToneClass: 'border-white/[0.08] bg-black/25 text-[#cfd3dd]',
      runDisabled: false,
      primaryAction: 'none',
      lastActivity: null,
    };
  }

  if (revoked || expired) {
    const terminalLabel = revoked ? 'Revoked' : 'Expired';
    return {
      statusLabel: terminalLabel,
      statusToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      summaryLine: `${terminalLabel.toLowerCase()} · ${modeLabel}`,
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail: revoked
        ? 'This Goldman strategy approval was revoked. Goldman cannot restart monitoring or live trading from this saved strategy.'
        : 'This Goldman strategy has expired. Goldman cannot restart monitoring or live trading until the strategy is refreshed.',
      nextAction: revoked
        ? 'Review the strategy, publish a new approval if you still want Goldman active, and only then press Run from the refreshed panel.'
        : 'Refresh or republish this strategy before expecting Goldman to run again from this panel.',
      blockerReason: revoked
        ? 'This Goldman strategy is revoked and cannot be restarted.'
        : 'This Goldman strategy expired and must be refreshed before it can run again.',
      runLabel: terminalLabel,
      runToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      runDisabled: true,
      primaryAction: 'none',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  if (resumeBlocked) {
    return {
      statusLabel: 'Resume blocked',
      statusToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      summaryLine: `resume blocked · ${modeLabel}`,
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail: clientConnectionBlocked
        ? 'Goldman keeps the saved approval boundary, but live automation is blocked until the connected client session is restored.'
        : 'Goldman keeps the saved approval boundary, but live automation is blocked until the runtime issue is cleared.',
      nextAction: clientConnectionBlocked
        ? 'Reconnect the client session, confirm wallet and vault access are back, then press Run again from this panel.'
        : 'Fix the runtime or vault blocker, then try Run again from this panel.',
      blockerReason:
        resumeBlockedReason ||
        runtimeError ||
        'Goldman could not safely resume the runtime.',
      runLabel: 'Blocked',
      runToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      runDisabled: true,
      primaryAction: 'none',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  if (pendingAuthorization) {
    const pendingCopy = getPendingAuthorizationCopy(
      modeKey,
      fundingBlocked,
      approvedWaitingForFunding,
      options?.fundingGuidance
    );
    return {
      statusLabel: fundingBlocked ? 'Funding blocked' : 'Waiting for approval',
      statusToneClass: 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]',
      summaryLine: `${fundingBlocked ? 'funding blocked' : 'pending approval'} · ${modeLabel}`,
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail: pendingCopy.boundaryDetail,
      nextAction: pendingCopy.nextAction,
      blockerReason: pendingCopy.blockerReason,
      runLabel: pendingCopy.runLabel,
      runToneClass: 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]',
      runDisabled: true,
      primaryAction: 'none',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  if (hasRuntimeError) {
    return {
      statusLabel: 'Runtime issue',
      statusToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      summaryLine: `runtime issue · ${modeLabel}`,
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail: clientConnectionBlocked
        ? 'Goldman keeps the same approval boundary, but the connected client session dropped before another autonomous cycle could start.'
        : 'Goldman keeps the same approval boundary, but the runtime needs attention before another autonomous cycle starts.',
      nextAction: clientConnectionBlocked
        ? 'Reconnect the client session, then restart Goldman only after wallet and vault access are restored.'
        : 'Review the runtime error, then restart only after the blocker is understood.',
      blockerReason: runtimeError,
      runLabel: 'Blocked',
      runToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      runDisabled: true,
      primaryAction: 'none',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  if (isStrategyRunning) {
    return {
      statusLabel: heartbeat.stale ? 'Running with stale monitor' : 'Running',
      statusToneClass: heartbeat.stale
        ? 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]'
        : 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]',
      summaryLine: `${heartbeat.stale ? 'running stale' : 'running'} · ${modeLabel}`,
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail:
        modeLabel === 'live execute'
          ? 'Goldman can trade only within the saved caps, venues, and approval boundary shown in the strategy.'
          : 'Goldman can monitor and report from this strategy without placing live trades.',
      nextAction: heartbeat.stale
        ? 'Check the Goldman backend/runtime health before trusting the live monitor state.'
        : 'Goldman is currently operating within the saved strategy caps.',
      blockerReason: null,
      runLabel: 'Stop',
      runToneClass: 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]',
      runDisabled: false,
      primaryAction: 'stop',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  if (modeKey === 'proposal') {
    return {
      statusLabel: 'Proposal only',
      statusToneClass: 'border-white/[0.08] bg-black/25 text-[#cfd3dd]',
      summaryLine: 'proposal only · switch mode to run',
      modeLabel,
      heartbeatLabel: heartbeat.label,
      heartbeatToneClass: heartbeat.toneClass,
      heartbeatDetail: heartbeat.detail,
      boundaryDetail:
        'This strategy is saved as a proposal only. Goldman will not start monitoring or live trading from this mode, even if the rest of the runtime looks healthy.',
      nextAction:
        'Switch this strategy to monitor only or live execute, then press Run when the saved rules and funding look correct.',
      blockerReason:
        'Proposal mode keeps the reviewed plan available, but it does not authorize a Goldman runtime.',
      runLabel: 'Switch mode',
      runToneClass: 'border-white/[0.08] bg-black/25 text-[#cfd3dd]',
      runDisabled: true,
      primaryAction: 'none',
      lastActivity: runtime?.lastActivity || null,
    };
  }

  return {
    statusLabel: 'Paused',
    statusToneClass: 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]',
    summaryLine: `paused · ${modeLabel}`,
    modeLabel,
    heartbeatLabel: heartbeat.label,
    heartbeatToneClass: heartbeat.toneClass,
    heartbeatDetail: heartbeat.detail,
    boundaryDetail:
      modeLabel === 'live execute'
        ? 'Approval lets Goldman trade only inside the saved caps once you press Run.'
        : 'Goldman stays read-only until you press Run, and this mode still avoids live trading.',
    nextAction:
      'Goldman is paused. Press Run when the strategy, funding, and runtime health all look correct.',
    blockerReason: null,
    runLabel: 'Run',
    runToneClass: 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#3fe08f]',
    runDisabled: false,
    primaryAction: 'run',
    lastActivity: runtime?.lastActivity || null,
  };
}

export function useGoldmanStrategyHeartbeatNow(lastHeartbeatAt?: string | null) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    setNow(Date.now());
    if (!lastHeartbeatAt) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, GOLDMAN_STRATEGY_HEARTBEAT_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [lastHeartbeatAt]);

  return now;
}

export function GoldmanStrategyStatusPanel({
  strategy,
  isStrategyRunning = false,
  now,
  fundingGuidance,
}: {
  strategy?: GoldmanStrategyPanelStrategy | null;
  isStrategyRunning?: boolean;
  now?: number;
  fundingGuidance?: GoldmanFundingGuidance | null;
}) {
  const control = getGoldmanStrategyControlState(strategy, {
    isStrategyRunning,
    now,
    fundingGuidance,
  });

  return (
    <div className="mt-2 grid gap-2" data-testid="goldman-strategy-status-panel">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
            status
          </div>
          <div
            className={`dm-mono mt-1 inline-flex rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${control.statusToneClass}`}
          >
            {control.statusLabel}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
            heartbeat
          </div>
          <div
            className={`dm-mono mt-1 inline-flex rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${control.heartbeatToneClass}`}
          >
            {control.heartbeatLabel}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
            run control
          </div>
          <div
            className={`dm-mono mt-1 inline-flex rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${control.runToneClass}`}
          >
            {control.runLabel}
          </div>
        </div>
      </div>

      <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
        <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
          execution boundary
        </div>
        <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
          {control.boundaryDetail}
        </div>
      </div>

      {control.blockerReason && (
        <div className="rounded-[8px] border border-[#ff5d63]/20 bg-[#ff5d63]/10 px-2.5 py-2 text-[10.5px] font-semibold leading-snug text-[#ffb0b3]">
          {control.blockerReason}
        </div>
      )}

      <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
        <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
          next action
        </div>
        <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#d7dae2]">
          {control.nextAction}
        </div>
      </div>

      <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
        <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
          runtime notes
        </div>
        <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#d7dae2]">
          {control.lastActivity || control.heartbeatDetail}
        </div>
      </div>
    </div>
  );
}
