'use client';

type GoldmanPanelTone = 'positive' | 'warning' | 'danger' | 'neutral';

type GoldmanStrategyRuntimeLike = {
  state?: string | null;
  executionMode?: string | null;
  lastHeartbeatAt?: string | null;
  lastActivity?: string | null;
  lastError?: string | null;
};

type GoldmanTradingStrategyLike = {
  title?: string | null;
  status?: string | null;
  venues?: string[] | null;
  limits?: Record<string, unknown> | null;
  rules?: Record<string, unknown> | null;
  runtime?: GoldmanStrategyRuntimeLike | null;
  metadata?: Record<string, unknown> | null;
};

type GoldmanStrategyStatusBlock = {
  label: string;
  tone: GoldmanPanelTone;
  detail: string;
};

export type GoldmanStrategyPrimaryAction =
  | {
      intent: 'ideas' | 'run' | 'stop' | 'fund';
      label: string;
      disabled: boolean;
      disabledReason?: string;
    }
  | {
      intent: 'blocked';
      label: string;
      disabled: true;
      disabledReason: string;
    };

export type GoldmanStrategyStatusViewModel = {
  state: GoldmanStrategyStatusBlock;
  heartbeat: GoldmanStrategyStatusBlock;
  boundary: GoldmanStrategyStatusBlock;
  nextStep: string;
  primaryAction: GoldmanStrategyPrimaryAction;
  issue?: GoldmanStrategyStatusBlock | null;
};

export const GOLDMAN_STRATEGY_EXPECTED_HEARTBEAT_MS = 3 * 60 * 1000;
export const GOLDMAN_STRATEGY_STALE_HEARTBEAT_MS =
  GOLDMAN_STRATEGY_EXPECTED_HEARTBEAT_MS * 2;

function positiveNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

function expectedHeartbeatMs(strategy?: GoldmanTradingStrategyLike | null) {
  const cooldownSeconds = Math.max(
    positiveNumber(strategy?.limits?.cooldownSeconds),
    positiveNumber(strategy?.rules?.cooldownSeconds)
  );
  if (!cooldownSeconds) return GOLDMAN_STRATEGY_EXPECTED_HEARTBEAT_MS;
  return Math.max(cooldownSeconds * 1000, 15 * 1000);
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toHeartbeatAgeMs(value?: string | null, now = Date.now()) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, now - timestamp);
}

function formatRelativeAge(ageMs: number | null) {
  if (ageMs === null) return 'not started';
  if (ageMs < 60 * 1000) return 'just now';

  const totalMinutes = Math.round(ageMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min ago`;
  }

  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hr ago`;
  }

  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} day${totalDays === 1 ? '' : 's'} ago`;
}

function toneClassName(tone: GoldmanPanelTone) {
  switch (tone) {
    case 'positive':
      return 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#3fe08f]';
    case 'warning':
      return 'border-[#f4c95d]/35 bg-[#f4c95d]/10 text-[#f4c95d]';
    case 'danger':
      return 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]';
    default:
      return 'border-white/[0.08] bg-black/20 text-[#c9ccd4]';
  }
}

function buildHeartbeatBlock(
  strategy?: GoldmanTradingStrategyLike | null,
  now = Date.now()
): GoldmanStrategyStatusBlock {
  const expectedMs = expectedHeartbeatMs(strategy);
  const staleMs = expectedMs * 2;
  const ageMs = toHeartbeatAgeMs(strategy?.runtime?.lastHeartbeatAt, now);

  if (ageMs === null) {
    return {
      label: 'Heartbeat pending',
      tone: 'neutral',
      detail:
        `Goldman has not emitted a strategy heartbeat yet. The runtime loop is expected about every ${Math.round(
          expectedMs / 60000
        )} min once it starts.`,
    };
  }

  if (ageMs >= staleMs) {
    return {
      label: 'Heartbeat stale',
      tone: 'danger',
      detail: `Last heartbeat ${formatRelativeAge(ageMs)}. Goldman normally checks in about every ${Math.round(
        expectedMs / 60000
      )} min.`,
    };
  }

  if (ageMs >= expectedMs) {
    return {
      label: 'Heartbeat delayed',
      tone: 'warning',
      detail: `Last heartbeat ${formatRelativeAge(ageMs)}. Goldman is slower than the expected ${Math.round(
        expectedMs / 60000
      )} min cadence.`,
    };
  }

  return {
    label: 'Heartbeat fresh',
    tone: 'positive',
    detail: `Last heartbeat ${formatRelativeAge(ageMs)}. Goldman is checking in on the expected ${Math.round(
      expectedMs / 60000
    )} min cadence.`,
  };
}

function joinReadable(values: string[]) {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function venueLabel(strategy?: GoldmanTradingStrategyLike | null) {
  const venues = Array.isArray(strategy?.venues)
    ? strategy.venues
        .map((venue) => String(venue || '').trim())
        .filter(Boolean)
    : [];
  return venues.length > 0 ? joinReadable(venues) : 'approved venues';
}

function buildBoundaryBlock({
  strategy,
  executionMode,
  pendingAuthorization,
  awaitingFunding,
  blocked,
  running,
}: {
  strategy?: GoldmanTradingStrategyLike | null;
  executionMode: string;
  pendingAuthorization: boolean;
  awaitingFunding: boolean;
  blocked: boolean;
  running: boolean;
}): GoldmanStrategyStatusBlock {
  const venues = venueLabel(strategy);
  if (executionMode === 'execute') {
    if (pendingAuthorization) {
      return {
        label: 'Approval gated',
        tone: 'warning',
        detail: `Goldman is configured for live execution on ${venues}, but it cannot trade until the strategy is explicitly approved and then started.`,
      };
    }

    if (awaitingFunding) {
      return {
        label: 'Live execution blocked',
        tone: 'warning',
        detail: `Goldman is configured for live execution on ${venues}, but it cannot trade until the vault is funded and Run is pressed.`,
      };
    }

    if (blocked) {
      return {
        label: 'Execution blocked',
        tone: 'danger',
        detail: `Live execution is configured for ${venues}, but Goldman is paused until the runtime block is cleared.`,
      };
    }

    return {
      label: running ? 'Live execution active' : 'Live execution armed',
      tone: running ? 'positive' : 'warning',
      detail: running
        ? `Goldman may trade autonomously on ${venues} within the approved caps and expiry while this run stays healthy.`
        : `Goldman may trade on ${venues} within the approved caps after you press Run.`,
    };
  }

  if (executionMode === 'monitor') {
    return {
      label: 'Monitor only',
      tone: 'neutral',
      detail: `Goldman can scan ${venues} and report changes, but it will not place live trades autonomously in this mode.`,
    };
  }

  return {
    label: 'Proposal only',
    tone: 'neutral',
    detail: `Goldman can draft and explain strategies for ${venues} here, but live trading still requires clear approval, vault funding, and an explicit Run step.`,
  };
}

export function buildGoldmanStrategyStatusViewModel(
  strategy?: GoldmanTradingStrategyLike | null,
  options: { hasQuickCommand?: boolean; now?: number } = {}
): GoldmanStrategyStatusViewModel {
  const hasQuickCommand = options.hasQuickCommand !== false;
  const now = options.now ?? Date.now();

  if (!strategy) {
    return {
      state: {
        label: 'No approved strategy',
        tone: 'neutral',
        detail:
          'Ask Goldman for ideas or approve a strategy before live controls appear in this panel.',
      },
      heartbeat: {
        label: 'No runtime',
        tone: 'neutral',
        detail:
          'The Goldman runtime only starts sending heartbeats after a strategy is approved and started.',
      },
      boundary: {
        label: 'Approval gated',
        tone: 'neutral',
        detail:
          'Goldman can discuss ideas, but the user must still approve any live trading plan before it reaches the vault.',
      },
      nextStep: 'Ask Goldman for ideas, then approve a bounded strategy before using Run.',
      primaryAction: {
        intent: 'ideas',
        label: 'Ideas',
        disabled: !hasQuickCommand,
        disabledReason: hasQuickCommand
          ? undefined
          : 'Quick Goldman prompts are not available in this panel.',
      },
      issue: null,
    };
  }

  const status = strategy.status || 'draft';
  const runtimeState = strategy.runtime?.state || 'idle';
  const executionMode = strategy.runtime?.executionMode || 'proposal';
  const approvalState = readMetadataString(strategy.metadata, 'approvalState');
  const resumeBlockedReason = readMetadataString(
    strategy.metadata,
    'runtimeResumeBlockedReason'
  );
  const lastError = strategy.runtime?.lastError?.trim() || null;
  const issueDetail = resumeBlockedReason || lastError;
  const running = runtimeState === 'running';
  const pendingAuthorization = status === 'pending_authorization';
  const awaitingFunding = approvalState === 'approved_waiting_for_funding';
  const blocked =
    approvalState === 'resume_blocked' ||
    runtimeState === 'error' ||
    (status === 'paused' && Boolean(issueDetail));

  let state: GoldmanStrategyStatusBlock;
  let nextStep: string;
  let primaryAction: GoldmanStrategyPrimaryAction;

  if (running) {
    state = {
      label: 'Running',
      tone: 'positive',
      detail:
        'Goldman is actively scanning this strategy and may act inside the execution boundary shown below.',
    };
    nextStep =
      buildHeartbeatBlock(strategy, now).tone === 'danger'
        ? 'Watch the stale heartbeat closely and stop Goldman if the runtime does not recover quickly.'
        : 'Keep monitoring heartbeat freshness, fills, and warnings while Goldman is live.';
    primaryAction = {
      intent: 'stop',
      label: 'Stop',
      disabled: false,
    };
  } else if (blocked) {
    state = {
      label: 'Blocked',
      tone: 'danger',
      detail:
        'Goldman paused because the runtime reported a block or resume failure. It should not look like a cleanly runnable strategy.',
    };
    nextStep =
      'Clear the runtime issue, confirm the strategy boundary is still valid, then press Run again.';
    primaryAction = {
      intent: 'blocked',
      label: 'Resolve block',
      disabled: true,
      disabledReason:
        issueDetail || 'Goldman is blocked until the runtime issue is cleared.',
    };
  } else if (pendingAuthorization) {
    state = {
      label: 'Pending authorization',
      tone: 'warning',
      detail:
        'The strategy is drafted for live use, but Goldman still needs explicit approval before the runtime should start.',
    };
    nextStep =
      'Review the strategy assumptions, caps, venue, and expiry in chat, then approve it before using Run.';
    primaryAction = {
      intent: 'blocked',
      label: 'Approve first',
      disabled: true,
      disabledReason:
        'This strategy still needs explicit approval before Goldman can run it.',
    };
  } else if (awaitingFunding) {
    state = {
      label: 'Awaiting funding',
      tone: 'warning',
      detail:
        'The strategy is approved, but Goldman still needs funded vault capital before the live loop should start.',
    };
    nextStep =
      'Fund the Goldman vault first, then press Run when the capital and limits look correct.';
    primaryAction = {
      intent: 'fund',
      label: 'Fund vault',
      disabled: false,
    };
  } else if (status === 'paused' || runtimeState === 'stopped') {
    state = {
      label: 'Paused',
      tone: 'warning',
      detail:
        'The strategy is approved and idle. Goldman will not scan or trade again until Run is pressed.',
    };
    nextStep =
      'Review the last activity and execution boundary, then press Run when you want Goldman to resume.';
    primaryAction = {
      intent: 'run',
      label: 'Resume',
      disabled: false,
    };
  } else {
    state = {
      label: 'Ready to run',
      tone: 'warning',
      detail:
        'The strategy is approved but not active yet. Run is the final step that starts Goldman monitoring or execution.',
    };
    nextStep =
      'Confirm the approval boundary, funding, and heartbeat expectations before starting Goldman.';
    primaryAction = {
      intent: 'run',
      label: 'Run',
      disabled: false,
    };
  }

  return {
    state,
    heartbeat: buildHeartbeatBlock(strategy, now),
    boundary: buildBoundaryBlock({
      strategy,
      executionMode,
      pendingAuthorization,
      awaitingFunding,
      blocked,
      running,
    }),
    nextStep,
    primaryAction,
    issue: issueDetail
      ? {
          label: blocked ? 'Blocked reason' : 'Last issue',
          tone: blocked ? 'danger' : 'warning',
          detail: issueDetail,
        }
      : null,
  };
}

function GoldmanStatusTile({
  heading,
  block,
}: {
  heading: string;
  block: GoldmanStrategyStatusBlock;
}) {
  return (
    <div className="rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
        {heading}
      </div>
      <div className="mt-1.5 flex items-start gap-2">
        <span
          className={`dm-mono inline-flex shrink-0 rounded-[5px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${toneClassName(
            block.tone
          )}`}
        >
          {block.label}
        </span>
        <p className="text-[10.5px] font-semibold leading-snug text-[#cfd3db]">
          {block.detail}
        </p>
      </div>
    </div>
  );
}

export function GoldmanStrategyStatusPanel({
  viewModel,
}: {
  viewModel: GoldmanStrategyStatusViewModel;
}) {
  return (
    <div className="mt-3 grid gap-2" data-testid="goldman-strategy-status-panel">
      <div className="grid gap-2 sm:grid-cols-2">
        <GoldmanStatusTile heading="state" block={viewModel.state} />
        <GoldmanStatusTile heading="heartbeat" block={viewModel.heartbeat} />
      </div>
      <GoldmanStatusTile heading="execution boundary" block={viewModel.boundary} />
      {viewModel.issue ? (
        <GoldmanStatusTile heading="operator issue" block={viewModel.issue} />
      ) : null}
      <div className="rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2.5">
        <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#737783]">
          next step
        </div>
        <p className="mt-1.5 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
          {viewModel.nextStep}
        </p>
      </div>
    </div>
  );
}
