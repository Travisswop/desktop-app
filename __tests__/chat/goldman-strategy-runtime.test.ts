import { summarizeGoldmanStrategyPanel } from '@/lib/chat/goldmanStrategyRuntime';

describe('goldman strategy panel summary', () => {
  const now = new Date('2026-06-24T16:00:00.000Z').getTime();

  test('marks pending approval strategies as not runnable', () => {
    const summary = summarizeGoldmanStrategyPanel(
      {
        status: 'pending_authorization',
        runtime: {
          executionMode: 'execute',
        },
      },
      now
    );

    expect(summary.stateLabel).toBe('Pending approval');
    expect(summary.actionKind).toBe('approve');
    expect(summary.actionLabel).toBe('Approve first');
    expect(summary.actionDisabled).toBe(true);
    expect(summary.boundaryDetail).toContain('cannot start until you approve');
  });

  test('surfaces resume-blocked errors and stale heartbeats', () => {
    const summary = summarizeGoldmanStrategyPanel(
      {
        status: 'paused',
        runtime: {
          state: 'stopped',
          executionMode: 'execute',
          lastHeartbeatAt: '2026-06-24T15:52:30.000Z',
          lastError: 'Vault health check failed.',
        },
        metadata: {
          approvalState: 'resume_blocked',
          runtimeResumeBlockedReason: 'Vault health check failed.',
        },
      },
      now
    );

    expect(summary.stateLabel).toBe('Resume blocked');
    expect(summary.actionKind).toBe('blocked');
    expect(summary.actionDisabled).toBe(true);
    expect(summary.actionDetail).toContain('Vault health check failed.');
    expect(summary.heartbeatLabel).toBe('Stale heartbeat');
  });

  test('keeps running strategies stoppable with fresh heartbeat context', () => {
    const summary = summarizeGoldmanStrategyPanel(
      {
        status: 'active',
        runtime: {
          state: 'running',
          executionMode: 'monitor',
          lastHeartbeatAt: '2026-06-24T15:58:40.000Z',
        },
      },
      now
    );

    expect(summary.stateLabel).toBe('Running');
    expect(summary.actionKind).toBe('stop');
    expect(summary.actionLabel).toBe('Stop');
    expect(summary.actionDisabled).toBe(false);
    expect(summary.heartbeatLabel).toBe('Heartbeat fresh');
    expect(summary.boundaryLabel).toBe('Monitoring only');
  });

  test('keeps paused approved strategies runnable', () => {
    const summary = summarizeGoldmanStrategyPanel(
      {
        status: 'paused',
        runtime: {
          state: 'stopped',
          executionMode: 'execute',
          lastHeartbeatAt: '2026-06-24T15:57:15.000Z',
        },
      },
      now
    );

    expect(summary.stateLabel).toBe('Paused');
    expect(summary.actionKind).toBe('run');
    expect(summary.actionLabel).toBe('Run');
    expect(summary.actionDisabled).toBe(false);
  });
});
