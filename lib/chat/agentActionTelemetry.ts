type UnknownRecord = Record<string, unknown>;

const MAX_STRING_LENGTH = 500;

export interface AgentActionClientEvent {
  proposalId?: string | null;
  stage:
    | 'button_clicked'
    | 'blocked'
    | 'approval_requested'
    | 'approval_succeeded'
    | 'approval_failed'
    | 'handoff_persisted'
    | 'execution_started'
    | 'execution_succeeded'
    | 'execution_failed'
    | 'completion_report_started'
    | 'completion_report_succeeded'
    | 'completion_report_failed'
    | 'completion_skipped';
  action?: string;
  toolType?: string;
  provider?: string;
  groupId?: string;
  invocationId?: string;
  agentId?: string;
  route?: string;
  panel?: string;
  uiSurface?: string;
  source?: string;
  status?: string;
  reason?: string;
  error?: unknown;
  context?: UnknownRecord;
  metadata?: UnknownRecord;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') || ''
  );
}

function swopApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(
    /\/$/,
    '',
  );
}

function truncate(value: unknown, maxLength = MAX_STRING_LENGTH) {
  if (value === undefined || value === null) return undefined;
  return String(value).slice(0, maxLength);
}

export function serializeClientActionError(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncate(error.message),
    };
  }
  if (typeof error === 'object') {
    const record = error as UnknownRecord;
    return {
      name: truncate(record.name),
      message: truncate(record.message || record.error || String(error)),
      code: truncate(record.code),
      status: record.status,
    };
  }
  return { message: truncate(error) };
}

export async function reportAgentActionClientEvent(
  event: AgentActionClientEvent,
  accessToken?: string | null,
) {
  if (!event.proposalId) return null;
  const token = accessToken || decodeURIComponent(readCookie('access-token'));
  if (!token) return null;

  const response = await fetch(
    `${swopApiBase()}/api/v5/messages/agent-actions/${encodeURIComponent(
      event.proposalId,
    )}/client-event`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...event,
        error: serializeClientActionError(event.error),
        clientTimestamp: new Date().toISOString(),
        source: event.source || 'desktop',
      }),
      keepalive: true,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to report agent action event (${response.status})`);
  }

  return response.json();
}

export function queueAgentActionClientEvent(
  event: AgentActionClientEvent,
  accessToken?: string | null,
) {
  void reportAgentActionClientEvent(event, accessToken).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to report agent action client event:', error);
    }
  });
}
