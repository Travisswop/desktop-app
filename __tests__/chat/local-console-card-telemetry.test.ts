import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';
import {
  LOCAL_CONSOLE_CARD_PROPOSAL_PREFIX,
  buildLocalConsoleCardTelemetryProposalId,
  queueLocalConsoleCardClientEvent,
} from '@/lib/chat/localConsoleCardTelemetry';

jest.mock('@/lib/chat/agentActionTelemetry', () => ({
  queueAgentActionClientEvent: jest.fn(),
}));

describe('local console card telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds stable local telemetry proposal ids', () => {
    expect(
      buildLocalConsoleCardTelemetryProposalId({
        action: 'portfolio.pnl',
        eventKind: 'rehydrated',
        sourceMessageId: 'temp-message-1',
      }),
    ).toBe(
      `${LOCAL_CONSOLE_CARD_PROPOSAL_PREFIX}rehydrated-portfolio-pnl-temp-message-1`,
    );
  });

  test('queues sanitized generated card telemetry', () => {
    const proposalId = queueLocalConsoleCardClientEvent({
      accessToken: 'access-token',
      action: 'wallet.portfolio',
      eventKind: 'generated',
      groupId: 'group-1',
      invocationId: 'local-portfolio-temp-1',
      sourceMessageId: 'temp-1',
      threadType: 'group',
    });

    expect(proposalId).toBe(
      `${LOCAL_CONSOLE_CARD_PROPOSAL_PREFIX}generated-wallet-portfolio-temp-1`,
    );
    expect(queueAgentActionClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId,
        invocationId: 'local-portfolio-temp-1',
        groupId: 'group-1',
        stage: 'execution_succeeded',
        action: 'wallet.portfolio',
        toolType: 'wallet.read',
        provider: 'swop',
        uiSurface: 'astro_local_console_card',
        status: 'succeeded',
        context: {
          cardAction: 'wallet.portfolio',
          eventKind: 'generated',
          sourceMessageId: 'temp-1',
          threadType: 'group',
        },
        metadata: {
          capturedBy: 'astro_local_console_card_telemetry',
        },
      }),
      'access-token',
    );
  });
});
