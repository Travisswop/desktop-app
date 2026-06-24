import { renderToStaticMarkup } from 'react-dom/server';
import { GoldmanStrategyPanelStatus } from '@/components/chat/GoldmanStrategyPanelStatus';
import { summarizeGoldmanStrategyPanel } from '@/lib/chat/goldmanStrategyRuntime';

describe('GoldmanStrategyPanelStatus', () => {
  const now = new Date('2026-06-24T16:00:00.000Z').getTime();

  test('renders approval-gated guidance', () => {
    const html = renderToStaticMarkup(
      <GoldmanStrategyPanelStatus
        summary={summarizeGoldmanStrategyPanel(
          {
            status: 'pending_authorization',
            runtime: {
              executionMode: 'execute',
            },
          },
          now
        )}
      />
    );

    expect(html).toContain('Pending approval');
    expect(html).toContain('Approve the Goldman proposal in chat before the runtime can start.');
    expect(html).toContain('This strategy requests live execution');
  });

  test('renders blocked runtime guidance', () => {
    const html = renderToStaticMarkup(
      <GoldmanStrategyPanelStatus
        summary={summarizeGoldmanStrategyPanel(
          {
            status: 'paused',
            runtime: {
              state: 'stopped',
              executionMode: 'execute',
              lastHeartbeatAt: '2026-06-24T15:52:30.000Z',
              lastError: 'Vault heartbeat is stale.',
            },
            metadata: {
              approvalState: 'resume_blocked',
              runtimeResumeBlockedReason: 'Vault heartbeat is stale.',
            },
          },
          now
        )}
      />
    );

    expect(html).toContain('Resume blocked');
    expect(html).toContain('Stale heartbeat');
    expect(html).toContain('Vault heartbeat is stale.');
  });
});
