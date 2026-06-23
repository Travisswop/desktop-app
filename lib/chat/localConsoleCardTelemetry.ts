import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';

export const LOCAL_CONSOLE_CARD_PROPOSAL_PREFIX = 'local-console-card-';

export type LocalConsoleCardAction = 'portfolio.pnl' | 'wallet.portfolio';
export type LocalConsoleCardEventKind = 'generated' | 'rehydrated';

function normalizeSegment(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, '-');
}

export function buildLocalConsoleCardTelemetryProposalId(params: {
  action: LocalConsoleCardAction;
  eventKind: LocalConsoleCardEventKind;
  sourceMessageId: string;
}) {
  return [
    LOCAL_CONSOLE_CARD_PROPOSAL_PREFIX,
    normalizeSegment(params.eventKind),
    '-',
    normalizeSegment(params.action),
    '-',
    normalizeSegment(params.sourceMessageId),
  ].join('');
}

export function queueLocalConsoleCardClientEvent(
  params: {
    accessToken?: string | null;
    action: LocalConsoleCardAction;
    eventKind: LocalConsoleCardEventKind;
    groupId?: string | null;
    invocationId?: string | null;
    route?: string;
    sourceMessageId: string;
    threadType: 'direct' | 'group';
  },
) {
  const proposalId = buildLocalConsoleCardTelemetryProposalId(params);

  queueAgentActionClientEvent(
    {
      proposalId,
      invocationId: params.invocationId || undefined,
      groupId: params.groupId || undefined,
      stage: 'execution_succeeded',
      action: params.action,
      toolType: 'wallet.read',
      provider: 'swop',
      route: params.route || '/dashboard/chat',
      uiSurface: 'astro_local_console_card',
      status: 'succeeded',
      reason:
        params.eventKind === 'generated'
          ? 'Client-generated Astro console card rendered.'
          : 'Rehydrated Astro console card rendered after chat history load.',
      context: {
        cardAction: params.action,
        eventKind: params.eventKind,
        sourceMessageId: params.sourceMessageId,
        threadType: params.threadType,
      },
      metadata: {
        capturedBy: 'astro_local_console_card_telemetry',
      },
    },
    params.accessToken,
  );

  return proposalId;
}
