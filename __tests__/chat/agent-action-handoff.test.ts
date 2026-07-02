import { completeAgentActionFromHandoff } from '@/lib/chat/agentActionHandoff';
import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';

jest.mock('@/lib/chat/agentActionTelemetry', () => ({
  queueAgentActionClientEvent: jest.fn(),
}));

describe('agent action handoff', () => {
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
    Object.defineProperty(global, 'CustomEvent', {
      configurable: true,
      value: class CustomEvent {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    });
  });

  test('reports proposal-bound diagnostics when a wallet swap handoff is missing', async () => {
    await expect(
      completeAgentActionFromHandoff({
        proposalId: 'prop_swap_missing',
        status: 'executed',
        provider: 'swop',
        title: 'Swap confirmed',
        subtitle: 'SWOP to USDC',
        subject: 'SWOP -> USDC',
      }),
    ).resolves.toBeNull();

    expect(queueAgentActionClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop_swap_missing',
        stage: 'completion_skipped',
        provider: 'swop',
        uiSurface: 'agent_action_completion',
        status: 'blocked',
        reason: 'Missing approved action handoff',
        context: expect.objectContaining({
          handoffState: 'missing',
          completionProposalId: 'prop_swap_missing',
        }),
      }),
      undefined,
    );
  });
});
