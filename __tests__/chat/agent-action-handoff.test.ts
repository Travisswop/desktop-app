import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';
import { completeAgentActionFromHandoff } from '@/lib/chat/agentActionHandoff';

jest.mock('@/lib/chat/agentActionTelemetry', () => ({
  queueAgentActionClientEvent: jest.fn(),
}));

describe('agent action handoff diagnostics', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        sessionStorage: {
          clear: () => storage.clear(),
          getItem: (key: string) => storage.get(key) || null,
          removeItem: (key: string) => storage.delete(key),
          setItem: (key: string, value: string) => storage.set(key, value),
        },
        dispatchEvent: jest.fn(),
      },
    });
  });

  test('reports a proposal-bound diagnostic when an approved wallet swap handoff is missing', async () => {
    await expect(
      completeAgentActionFromHandoff(
        {
          proposalId: 'prop_swap_missing',
          status: 'executed',
          action: 'wallet.swap',
          toolType: 'wallet.write',
          provider: 'swop',
          title: 'Swap confirmed',
        },
        'access-token',
      ),
    ).resolves.toBeNull();

    expect(queueAgentActionClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop_swap_missing',
        stage: 'completion_skipped',
        action: 'wallet.swap',
        toolType: 'wallet.write',
        provider: 'swop',
        uiSurface: 'agent_action_completion',
        status: 'blocked',
        reason: 'Missing approved action handoff',
        context: expect.objectContaining({
          handoffState: 'missing',
          completionProposalId: 'prop_swap_missing',
        }),
      }),
      'access-token',
    );
  });
});
