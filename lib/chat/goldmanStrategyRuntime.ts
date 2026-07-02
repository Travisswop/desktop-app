const GOLDMAN_STRATEGY_LOOP_INTERVAL_MS = 180000;
const GOLDMAN_HEARTBEAT_STALE_AFTER_MS =
  GOLDMAN_STRATEGY_LOOP_INTERVAL_MS * 2;

export type GoldmanPanelTone = 'positive' | 'warning' | 'danger' | 'neutral';

export type GoldmanPanelActionKind =
  | 'run'
  | 'stop'
  | 'approve'
  | 'blocked'
  | 'idle';

export type GoldmanStrategyRuntimeLike = {
  state?: string | null;
  executionMode?: string | null;
  lastHeartbeatAt?: string | null;
  lastActivity?: string | null;
  lastError?: string | null;
};

export type GoldmanTradingStrategyLike = {
  status?: string | null;
  runtime?: GoldmanStrategyRuntimeLike | null;
  metadata?: Record<string, unknown> | null;
};

export type GoldmanStrategyPanelSummary = {
  actionDetail: string;
  actionDisabled: boolean;
  actionKind: GoldmanPanelActionKind;
  actionLabel: string;
  actionTone: GoldmanPanelTone;
  boundaryDetail: string;
  boundaryLabel: string;
  heartbeatDetail: string;
  heartbeatLabel: string;
  heartbeatTone: GoldmanPanelTone;
  modeLabel: string;
  stateDetail: string;
  stateLabel: string;
  stateTone: GoldmanPanelTone;
  statusLine: string;
};

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeToken(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function titleCaseWords(value: string) {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRelativeAge(deltaMs: number) {
  const seconds = Math.max(0, Math.round(deltaMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function describeExecutionMode(mode?: string | null) {
  const normalized = normalizeToken(mode);
  if (normalized === 'execute') {
    return {
      label: 'Live execution',
      detail:
        'Goldman may trade only within the approved caps while the runtime is healthy and the vault stays funded.',
    };
  }
  if (normalized === 'monitor') {
    return {
      label: 'Monitoring only',
      detail:
        'Goldman can scan markets and report opportunities, but it will not place live orders from this runtime.',
    };
  }
  return {
    label: 'Proposal only',
    detail:
      'Goldman can explain ideas and draft approval requests, but live execution stays gated until you approve and publish an executable strategy.',
  };
}

function describeHeartbeat(
  strategy: GoldmanTradingStrategyLike,
  nowMs: number
): Pick<
  GoldmanStrategyPanelSummary,
  'heartbeatDetail' | 'heartbeatLabel' | 'heartbeatTone'
> {
  const lastHeartbeatAt = strategy.runtime?.lastHeartbeatAt;
  const isPendingApproval =
    normalizeToken(strategy.status) === 'pending_authorization';

  if (!lastHeartbeatAt) {
    return {
      heartbeatLabel: isPendingApproval ? 'Awaiting first run' : 'No heartbeat yet',
      heartbeatTone: 'neutral',
      heartbeatDetail: isPendingApproval
        ? 'Heartbeats begin only after the strategy is approved and Goldman is allowed to run.'
        : 'Goldman has not reported a runtime heartbeat yet.',
    };
  }

  const heartbeatMs = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(heartbeatMs)) {
    return {
      heartbeatLabel: 'Heartbeat unknown',
      heartbeatTone: 'warning',
      heartbeatDetail:
        'The runtime reported an unreadable heartbeat timestamp, so freshness cannot be confirmed.',
    };
  }

  const ageMs = Math.max(0, nowMs - heartbeatMs);
  if (ageMs > GOLDMAN_HEARTBEAT_STALE_AFTER_MS) {
    return {
      heartbeatLabel: 'Stale heartbeat',
      heartbeatTone: 'danger',
      heartbeatDetail: `Last heartbeat ${formatRelativeAge(
        ageMs
      )}. Goldman usually checks in about every 3m, so this runtime should be treated as stalled until it resumes.`,
    };
  }

  if (ageMs > GOLDMAN_STRATEGY_LOOP_INTERVAL_MS) {
    return {
      heartbeatLabel: 'Heartbeat delayed',
      heartbeatTone: 'warning',
      heartbeatDetail: `Last heartbeat ${formatRelativeAge(
        ageMs
      )}. Goldman usually checks in about every 3m, so monitor for a pause or backend restart.`,
    };
  }

  return {
    heartbeatLabel: 'Heartbeat fresh',
    heartbeatTone: 'positive',
    heartbeatDetail: `Last heartbeat ${formatRelativeAge(
      ageMs
    )}. Goldman is checking in on the expected ~3m loop cadence.`,
  };
}

export function summarizeGoldmanStrategyPanel(
  strategy?: GoldmanTradingStrategyLike | null,
  nowMs = Date.now()
): GoldmanStrategyPanelSummary {
  const mode = describeExecutionMode(strategy?.runtime?.executionMode);
  const status = normalizeToken(strategy?.status);
  const runtimeState = normalizeToken(strategy?.runtime?.state);
  const approvalState = normalizeToken(
    readMetadataString(strategy?.metadata || null, 'approvalState')
  );
  const blockedReason =
    readMetadataString(strategy?.metadata || null, 'runtimeResumeBlockedReason') ||
    (strategy?.runtime?.lastError || '').trim() ||
    null;
  const heartbeat = describeHeartbeat(strategy || {}, nowMs);

  if (!strategy) {
    return {
      actionDetail: 'Ask Goldman for ideas or publish a strategy before the runtime can start.',
      actionDisabled: false,
      actionKind: 'idle',
      actionLabel: 'Ideas',
      actionTone: 'neutral',
      boundaryDetail:
        'No active Goldman strategy is published yet, so there is no execution boundary to inspect.',
      boundaryLabel: 'No strategy',
      heartbeatDetail: 'No Goldman strategy runtime is active yet.',
      heartbeatLabel: 'No heartbeat',
      heartbeatTone: 'neutral',
      modeLabel: 'Proposal only',
      stateDetail:
        'Goldman can brainstorm and draft strategy approvals, but it cannot run without a published strategy.',
      stateLabel: 'No approved strategy',
      stateTone: 'neutral',
      statusLine: 'No approved strategy · proposal only',
    };
  }

  if (runtimeState === 'running' || status === 'active') {
    return {
      actionDetail:
        'Stop pauses Goldman before the next monitoring or execution cycle.',
      actionDisabled: false,
      actionKind: runtimeState === 'running' ? 'stop' : 'run',
      actionLabel: runtimeState === 'running' ? 'Stop' : 'Run',
      actionTone: runtimeState === 'running' ? 'danger' : 'positive',
      boundaryDetail:
        mode.label === 'Live execution'
          ? 'Goldman can keep trading only within the approved caps until you stop it or the strategy expires.'
          : mode.detail,
      boundaryLabel: mode.label,
      heartbeatDetail: heartbeat.heartbeatDetail,
      heartbeatLabel: heartbeat.heartbeatLabel,
      heartbeatTone: heartbeat.heartbeatTone,
      modeLabel: mode.label,
      stateDetail:
        runtimeState === 'running'
          ? 'Goldman is actively scanning and updating this strategy runtime.'
          : 'The strategy is approved and ready to resume on the next run command.',
      stateLabel: runtimeState === 'running' ? 'Running' : 'Ready to run',
      stateTone:
        runtimeState === 'running'
          ? heartbeat.heartbeatTone === 'danger'
            ? 'danger'
            : 'positive'
          : 'positive',
      statusLine: `${runtimeState === 'running' ? 'running' : 'ready'} · ${mode.label.toLowerCase()}`,
    };
  }

  if (status === 'pending_authorization' || approvalState === 'pending_authorization') {
    return {
      actionDetail:
        'Approve the Goldman proposal in chat before the runtime can start.',
      actionDisabled: true,
      actionKind: 'approve',
      actionLabel: 'Approve first',
      actionTone: 'warning',
      boundaryDetail:
        mode.label === 'Live execution'
          ? 'This strategy requests live execution, but Goldman cannot start until you approve it and keep the vault funded.'
          : mode.detail,
      boundaryLabel: mode.label,
      heartbeatDetail: heartbeat.heartbeatDetail,
      heartbeatLabel: heartbeat.heartbeatLabel,
      heartbeatTone: heartbeat.heartbeatTone,
      modeLabel: mode.label,
      stateDetail:
        'Goldman has a strategy draft, but the runtime is still approval-gated and should not look runnable yet.',
      stateLabel: 'Pending approval',
      stateTone: 'warning',
      statusLine: `pending approval · ${mode.label.toLowerCase()}`,
    };
  }

  if (blockedReason || approvalState === 'resume_blocked') {
    return {
      actionDetail: blockedReason || 'Resolve the runtime blocker before Goldman can resume.',
      actionDisabled: true,
      actionKind: 'blocked',
      actionLabel: 'Fix runtime',
      actionTone: 'danger',
      boundaryDetail:
        mode.label === 'Live execution'
          ? 'Goldman is configured for live execution, but runtime health is currently blocking it from resuming safely.'
          : mode.detail,
      boundaryLabel: mode.label,
      heartbeatDetail: heartbeat.heartbeatDetail,
      heartbeatLabel: heartbeat.heartbeatLabel,
      heartbeatTone: heartbeat.heartbeatTone,
      modeLabel: mode.label,
      stateDetail: blockedReason || 'Goldman paused itself because the runtime could not safely resume.',
      stateLabel: 'Resume blocked',
      stateTone: 'danger',
      statusLine: `resume blocked · ${mode.label.toLowerCase()}`,
    };
  }

  if (status === 'paused' || runtimeState === 'stopped') {
    return {
      actionDetail:
        'Run resumes Goldman monitoring and any allowed execution within the published boundary.',
      actionDisabled: false,
      actionKind: 'run',
      actionLabel: 'Run',
      actionTone: 'positive',
      boundaryDetail: mode.detail,
      boundaryLabel: mode.label,
      heartbeatDetail: heartbeat.heartbeatDetail,
      heartbeatLabel: heartbeat.heartbeatLabel,
      heartbeatTone: heartbeat.heartbeatTone,
      modeLabel: mode.label,
      stateDetail:
        'Goldman is paused. The runtime can resume when you press Run again.',
      stateLabel: 'Paused',
      stateTone: heartbeat.heartbeatTone === 'danger' ? 'danger' : 'warning',
      statusLine: `paused · ${mode.label.toLowerCase()}`,
    };
  }

  const fallbackStatus = titleCaseWords(status || runtimeState || 'idle');
  return {
    actionDetail:
      'Goldman needs a healthy approved strategy before the runtime can start again.',
    actionDisabled: true,
    actionKind: 'blocked',
    actionLabel: 'Unavailable',
    actionTone: 'neutral',
    boundaryDetail: mode.detail,
    boundaryLabel: mode.label,
    heartbeatDetail: heartbeat.heartbeatDetail,
    heartbeatLabel: heartbeat.heartbeatLabel,
    heartbeatTone: heartbeat.heartbeatTone,
    modeLabel: mode.label,
    stateDetail: `Goldman reported an unsupported runtime state: ${fallbackStatus}.`,
    stateLabel: fallbackStatus,
    stateTone: 'neutral',
    statusLine: `${fallbackStatus.toLowerCase()} · ${mode.label.toLowerCase()}`,
  };
}
